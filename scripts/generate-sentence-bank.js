#!/usr/bin/env node
/**
 * Sentence Bank Generator
 *
 * Generates annotated example sentences for every vocabulary word across all languages.
 * Uses Claude API (Sonnet) in batches, with checkpoint-based resumability.
 *
 * Usage:
 *   node scripts/generate-sentence-bank.js                    # Generate all languages
 *   node scripts/generate-sentence-bank.js --lang uk          # Single language
 *   node scripts/generate-sentence-bank.js --lang uk --category colors  # Single category (test)
 *   node scripts/generate-sentence-bank.js --validate         # Validate existing files only
 *   node scripts/generate-sentence-bank.js --dry-run          # Show plan without calling API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildPrompt } from './sentence-bank-prompts.js';
import { validateBatch } from './sentence-bank-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VOCAB_DIR = path.join(ROOT, 'src', 'data', 'vocabulary');
const OUTPUT_DIR = path.join(ROOT, 'src', 'data', 'sentence-bank');
const CHECKPOINT_FILE = path.join(__dirname, '.sentence-bank-progress.json');
const FAILURES_FILE = path.join(__dirname, '.sentence-bank-failures.json');

const BATCH_SIZE = 40;          // Words per API call
const MAX_RETRIES = 2;          // Retries per failed batch
const DELAY_MS = 600;           // Delay between API calls
const MODEL = 'claude-sonnet-4-20250514';

const ALL_LANGS = ['uk', 'ru', 'de', 'es', 'fr', 'el', 'hi', 'ar', 'ko', 'zh', 'ja'];

// Language-specific field names in the dictionary files
const LANG_TARGET_FIELDS = {
  uk: 'uk', ru: 'ru', de: 'de', es: 'es', fr: 'fr',
  el: 'el', hi: 'hi', ar: 'ar', ko: 'ko', zh: 'zh', ja: 'ja',
};

// --- Dictionary loading ---

const DICT_FILES = [
  'comprehensive-dictionary.json',
  'comprehensive-dictionary-ext.json',
  ...Array.from({ length: 11 }, (_, i) => `comprehensive-dictionary-ext${i + 2}.json`),
];

function loadAllWords() {
  const allWords = [];
  for (const file of DICT_FILES) {
    const filepath = path.join(VOCAB_DIR, file);
    if (!fs.existsSync(filepath)) continue;
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    if (data.words) allWords.push(...data.words);
  }
  return allWords;
}

/**
 * Deduplicate words for a target language (matching dictionaryBuilder.js logic).
 * Returns { category: [{ target, en }] } grouped by category.
 */
function getWordsByCategory(allWords, langCode) {
  const targetField = LANG_TARGET_FIELDS[langCode];
  const seen = new Set();
  const byCategory = {};

  for (const word of allWords) {
    const targetWord = word[targetField];
    if (!targetWord) continue;
    const key = targetWord.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const category = word.category || 'misc';
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push({ target: targetWord, en: word.en });
  }

  return byCategory;
}

// --- Checkpoint management ---

function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
  }
  return {};
}

function saveCheckpoint(checkpoint) {
  fs.writeFileSync(CHECKPOINT_FILE + '.tmp', JSON.stringify(checkpoint, null, 2));
  fs.renameSync(CHECKPOINT_FILE + '.tmp', CHECKPOINT_FILE);
}

function loadFailures() {
  if (fs.existsSync(FAILURES_FILE)) {
    return JSON.parse(fs.readFileSync(FAILURES_FILE, 'utf-8'));
  }
  return [];
}

function saveFailures(failures) {
  fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2));
}

// --- Output file management ---

function loadOutputFile(langCode) {
  const filepath = path.join(OUTPUT_DIR, `${langCode}.json`);
  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  }
  return {
    meta: { lang: langCode, version: 1, generated: new Date().toISOString().split('T')[0], wordCount: 0 },
    sentences: {},
  };
}

function saveOutputFile(langCode, data) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  data.meta.wordCount = Object.keys(data.sentences).length;
  data.meta.generated = new Date().toISOString().split('T')[0];
  const filepath = path.join(OUTPUT_DIR, `${langCode}.json`);
  fs.writeFileSync(filepath + '.tmp', JSON.stringify(data));
  fs.renameSync(filepath + '.tmp', filepath);
}

// --- API calling ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callAPI(client, langCode, category, wordBatch) {
  const { system, user } = buildPrompt(langCode, category, wordBatch);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const text = response.content[0]?.text || '';

  // Parse JSON — handle potential markdown fences
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(jsonStr);
}

// --- Main generation logic ---

async function generateForLanguage(client, langCode, allWords, options = {}) {
  const { categoryFilter, dryRun } = options;
  const checkpoint = loadCheckpoint();
  const failures = loadFailures();

  if (!checkpoint[langCode]) {
    checkpoint[langCode] = { completed: [], inProgress: null };
  }

  const byCategory = getWordsByCategory(allWords, langCode);
  const categories = Object.keys(byCategory).sort();

  // Filter to single category if specified
  const targetCategories = categoryFilter
    ? categories.filter(c => c === categoryFilter)
    : categories;

  if (targetCategories.length === 0) {
    console.log(`  No categories found${categoryFilter ? ` matching "${categoryFilter}"` : ''}`);
    return;
  }

  const output = loadOutputFile(langCode);
  let totalGenerated = 0;
  let totalCalls = 0;

  for (const category of targetCategories) {
    // Skip completed categories
    if (checkpoint[langCode].completed.includes(category)) {
      const wordCount = byCategory[category].length;
      console.log(`  [${langCode}] Skip "${category}" (${wordCount} words) — already completed`);
      continue;
    }

    const words = byCategory[category];
    const batches = [];
    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      batches.push(words.slice(i, i + BATCH_SIZE));
    }

    console.log(`  [${langCode}] Category "${category}": ${words.length} words in ${batches.length} batch(es)`);

    if (dryRun) continue;

    checkpoint[langCode].inProgress = category;
    saveCheckpoint(checkpoint);

    let categorySuccess = true;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      let success = false;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`    Retry ${attempt}/${MAX_RETRIES} for batch ${batchIdx + 1}...`);
          }

          const result = await callAPI(client, langCode, category, batch);
          totalCalls++;

          // Validate
          const validation = validateBatch(result, batch, langCode);

          if (validation.errors.length > 0) {
            const criticalErrors = validation.errors.filter(e =>
              e.includes('not found in sentence') || e.includes('not in expected script') || e.includes('Missing word')
            );
            if (criticalErrors.length > 5) {
              console.log(`    Batch ${batchIdx + 1}: ${criticalErrors.length} critical errors, retrying...`);
              if (attempt < MAX_RETRIES) continue;
            }
          }

          // Merge valid words into output
          for (const [word, sentences] of Object.entries(validation.validWords)) {
            output.sentences[word] = sentences;
            totalGenerated++;
          }

          // Log warnings
          if (validation.warnings.length > 0) {
            console.log(`    Batch ${batchIdx + 1}: ${validation.stats.valid}/${validation.stats.expected} valid, ${validation.warnings.length} warnings`);
          } else {
            console.log(`    Batch ${batchIdx + 1}: ${validation.stats.valid}/${validation.stats.expected} valid`);
          }

          // Log failures for manual review
          if (validation.stats.invalid > 0 || validation.stats.missing > 0) {
            failures.push({
              lang: langCode,
              category,
              batch: batchIdx,
              errors: validation.errors.slice(0, 20), // Cap logged errors
              timestamp: new Date().toISOString(),
            });
          }

          success = true;
          break;
        } catch (err) {
          console.error(`    Batch ${batchIdx + 1} error: ${err.message}`);
          if (attempt === MAX_RETRIES) {
            failures.push({
              lang: langCode,
              category,
              batch: batchIdx,
              error: err.message,
              words: batch.map(w => w.target),
              timestamp: new Date().toISOString(),
            });
            categorySuccess = false;
          }
        }
      }

      // Save after each batch
      saveOutputFile(langCode, output);
      saveFailures(failures);

      // Rate limiting delay
      if (batchIdx < batches.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    if (categorySuccess) {
      checkpoint[langCode].completed.push(category);
      checkpoint[langCode].inProgress = null;
      saveCheckpoint(checkpoint);
    }
  }

  console.log(`  [${langCode}] Done: ${totalGenerated} words generated, ${totalCalls} API calls`);
  return { generated: totalGenerated, calls: totalCalls };
}

// --- Validation-only mode ---

async function validateExisting(langCode) {
  const filepath = path.join(OUTPUT_DIR, `${langCode}.json`);
  if (!fs.existsSync(filepath)) {
    console.log(`  [${langCode}] No file found`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  const sentences = data.sentences || {};
  let totalWords = 0;
  let totalSentences = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const [word, entries] of Object.entries(sentences)) {
    totalWords++;
    totalSentences += entries.length;
    for (const entry of entries) {
      const { validateEntry } = await import('./sentence-bank-validator.js');
      const result = validateEntry(entry, word, langCode);
      if (!result.valid) totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
    }
  }

  console.log(`  [${langCode}] ${totalWords} words, ${totalSentences} sentences, ${totalErrors} errors, ${totalWarnings} warnings`);
}

// --- CLI entry point ---

async function main() {
  const args = process.argv.slice(2);
  const langIdx = args.indexOf('--lang');
  const catIdx = args.indexOf('--category');
  const validateOnly = args.includes('--validate');
  const dryRun = args.includes('--dry-run');

  const targetLangs = langIdx >= 0 && args[langIdx + 1]
    ? [args[langIdx + 1]]
    : ALL_LANGS;

  const categoryFilter = catIdx >= 0 ? args[catIdx + 1] : null;

  console.log('=== Sentence Bank Generator ===');
  console.log(`Languages: ${targetLangs.join(', ')}`);
  if (categoryFilter) console.log(`Category filter: ${categoryFilter}`);
  if (dryRun) console.log('DRY RUN — no API calls');
  if (validateOnly) console.log('VALIDATE ONLY');
  console.log('');

  if (validateOnly) {
    for (const lang of targetLangs) {
      await validateExisting(lang);
    }
    return;
  }

  // Check for API key
  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set.');
    console.error('Set it with: export ANTHROPIC_API_KEY=sk-...');
    process.exit(1);
  }

  let client = null;
  if (!dryRun) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    client = new Anthropic();
  }
  const allWords = loadAllWords();
  console.log(`Loaded ${allWords.length} total word entries from ${DICT_FILES.length} dictionary files\n`);

  let totalGenerated = 0;
  let totalCalls = 0;

  for (const lang of targetLangs) {
    console.log(`\n--- ${lang.toUpperCase()} ---`);
    const result = await generateForLanguage(client, lang, allWords, {
      categoryFilter,
      dryRun,
    });
    if (result) {
      totalGenerated += result.generated;
      totalCalls += result.calls;
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Total: ${totalGenerated} words generated across ${targetLangs.length} language(s), ${totalCalls} API calls`);

  if (fs.existsSync(FAILURES_FILE)) {
    const failures = JSON.parse(fs.readFileSync(FAILURES_FILE, 'utf-8'));
    if (failures.length > 0) {
      console.log(`\nWarning: ${failures.length} failure(s) logged in ${FAILURES_FILE}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

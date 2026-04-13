#!/usr/bin/env node
/**
 * Merge Sentence Bank
 *
 * Combines all batch files (.{lang}-N.json) into the final {lang}.json.
 * Runs validation on each entry during merge.
 *
 * Usage:
 *   node scripts/merge-sentence-bank.js --lang uk
 *   node scripts/merge-sentence-bank.js --lang all
 *   node scripts/merge-sentence-bank.js --lang all --status  (show word counts only)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateEntry } from './sentence-bank-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'src', 'data', 'sentence-bank');

const ALL_LANGS = ['uk', 'ru', 'de', 'es', 'fr', 'el', 'hi', 'ar', 'ko', 'zh', 'ja'];

function mergeLanguage(langCode, statusOnly = false) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.log(`  [${langCode}] No sentence-bank directory`);
    return;
  }

  // Find all batch files for this language
  const allFiles = fs.readdirSync(OUTPUT_DIR);
  const batchFiles = allFiles.filter(f =>
    f.startsWith(`.${langCode}-`) && f.endsWith('.json') && !f.includes('failures')
  ).sort();

  if (batchFiles.length === 0) {
    console.log(`  [${langCode}] No batch files found`);
    return;
  }

  const merged = {};
  let totalEntries = 0;
  let totalValid = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of batchFiles) {
    const filepath = path.join(OUTPUT_DIR, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    } catch (err) {
      console.log(`  [${langCode}] Error parsing ${file}: ${err.message}`);
      continue;
    }

    for (const [word, sentences] of Object.entries(data)) {
      if (!Array.isArray(sentences)) continue;

      if (statusOnly) {
        merged[word] = sentences;
        totalEntries += sentences.length;
        continue;
      }

      // Validate each sentence
      const validSentences = [];
      for (const entry of sentences) {
        const result = validateEntry(entry, word, langCode);
        if (result.valid) {
          validSentences.push(entry);
          totalValid++;
        } else {
          totalErrors++;
        }
        totalWarnings += result.warnings.length;
        totalEntries++;
      }

      if (validSentences.length > 0) {
        // Don't overwrite if we already have more sentences from a previous batch
        if (!merged[word] || merged[word].length < validSentences.length) {
          merged[word] = validSentences;
        }
      }
    }
  }

  const wordCount = Object.keys(merged).length;
  const sentenceCount = Object.values(merged).reduce((s, arr) => s + arr.length, 0);

  if (statusOnly) {
    console.log(`  [${langCode}] ${batchFiles.length} batch files, ${wordCount} words, ${sentenceCount} sentences`);
    return;
  }

  console.log(`  [${langCode}] Merged ${batchFiles.length} files: ${wordCount} words, ${sentenceCount} sentences (${totalValid} valid, ${totalErrors} errors, ${totalWarnings} warnings)`);

  // Write merged file
  const output = {
    meta: {
      lang: langCode,
      version: 1,
      generated: new Date().toISOString().split('T')[0],
      wordCount,
      sentenceCount,
    },
    sentences: merged,
  };

  const outPath = path.join(OUTPUT_DIR, `${langCode}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output));
  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`  [${langCode}] Written to ${langCode}.json (${sizeKB} KB)`);
}

// --- CLI ---
const args = process.argv.slice(2);
const langArg = args.find((_, i) => args[i - 1] === '--lang') || 'all';
const statusOnly = args.includes('--status');

const targetLangs = langArg === 'all' ? ALL_LANGS : [langArg];

console.log(statusOnly ? '=== Sentence Bank Status ===' : '=== Merging Sentence Bank ===');

for (const lang of targetLangs) {
  mergeLanguage(lang, statusOnly);
}

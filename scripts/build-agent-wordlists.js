#!/usr/bin/env node
/**
 * Build Agent Wordlists
 *
 * Generates prompt-ready word batches for sentence bank generation agents.
 * Groups words into batches of N by category proximity, outputs prompt text.
 *
 * Usage:
 *   node scripts/build-agent-wordlists.js --lang uk --batch-size 200
 *   node scripts/build-agent-wordlists.js --lang uk --batch-size 200 --batch 3  (show batch 3 only)
 *   node scripts/build-agent-wordlists.js --lang all --batch-size 200 --status   (show completion status)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VOCAB_DIR = path.join(ROOT, 'src', 'data', 'vocabulary');
const OUTPUT_DIR = path.join(ROOT, 'src', 'data', 'sentence-bank');

const ALL_LANGS = ['uk', 'ru', 'de', 'es', 'fr', 'el', 'hi', 'ar', 'ko', 'zh', 'ja'];

const LANG_NAMES = {
  uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French',
  el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese',
};

const GRAMMAR_INSTRUCTIONS = {
  uk: 'Grammar fields for Ukrainian: tense (present/past/future), aspect (pf/impf), person (1s/2s/3s/1p/2p/3p), gender (m/f/n), case (nom/gen/dat/acc/inst/loc/voc), number (sg/pl). Use Ukrainian vocabulary, not Russian cognates. Include both perfective and imperfective where applicable.',
  ru: 'Grammar fields for Russian: tense (present/past/future), aspect (pf/impf), person (1s/2s/3s/1p/2p/3p), gender (m/f/n), case (nom/gen/dat/acc/inst/loc), number (sg/pl). Vary formal (вы) and informal (ты).',
  de: 'Grammar fields for German: tense (present/past/perfect/future), case (nom/acc/dat/gen), gender (m/f/n), person, mood (ind/subj/imp). Capitalize all nouns. For separable verbs show prefix separated. Vary du/Sie.',
  es: 'Grammar fields for Spanish: tense (present/preterite/imperfect/future/cond), mood (ind/subj/imp), gender (m/f), person (1s/2s/3s/1p/2p/3p), number (sg/pl). Use Castilian Spanish. Vary tú/usted.',
  fr: 'Grammar fields for French: tense (present/preterite/imperfect/future/cond), mood (ind/subj/imp), gender (m/f), person, number (sg/pl). Use Metropolitan French. Vary tu/vous.',
  el: 'Grammar fields for Greek: tense (present/past/future), aspect (pf/impf), case (nom/gen/acc/voc), gender (m/f/n), person. Use Modern Greek with proper accent marks.',
  hi: 'Grammar fields for Hindi: tense (present/past/future), case (direct/oblique/voc), gender (m/f), number (sg/pl), formality (informal/formal/honorific). Use standard Hindi in Devanagari only. Include all formality levels (तू/तुम/आप).',
  ar: 'Grammar fields for Arabic: form (I-X), tense (past/present/future/imp), case (nom/acc/gen), gender (m/f), number (sg/dual/pl), definiteness (def/indef/construct). Use Modern Standard Arabic. Include diacritics on target word.',
  ko: 'Grammar fields for Korean: formality (casual/polite/formal), tense (present/past/future), particle (은는/이가/을를/에/에서/으로). Use Seoul Korean in Hangul only. Include polite (-요) and formal (-습니다) forms.',
  zh: 'Grammar fields for Chinese: aspect (completed/ongoing/experiential/none), particle (了/着/过/的/得/null), structure (SVO/BA/BEI/topic-comment). Use Simplified Chinese. 5-15 characters per sentence.',
  ja: 'Grammar fields for Japanese: formality (plain/polite/honorific/humble), tense (present/past), particle (は/が/を/に/で/へ/と), form (te/potential/causative/passive). Mix hiragana/katakana/common kanji. Include polite and plain forms.',
};

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

function getUniqueWords(allWords, langCode) {
  const seen = new Set();
  const words = [];
  for (const w of allWords) {
    const target = w[langCode];
    if (!target) continue;
    const key = target.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    words.push({ target, en: w.en, category: w.category || 'misc' });
  }
  return words;
}

function getCompletedWords(langCode) {
  const completed = new Set();
  // Check all batch files for this language
  if (!fs.existsSync(OUTPUT_DIR)) return completed;
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith(`.${langCode}-`) && f.endsWith('.json') && !f.includes('failures'));
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, f), 'utf-8'));
      for (const word of Object.keys(data)) {
        completed.add(word.toLowerCase());
      }
    } catch { /* skip invalid files */ }
  }
  // Also check merged file
  const mergedFile = path.join(OUTPUT_DIR, `${langCode}.json`);
  if (fs.existsSync(mergedFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(mergedFile, 'utf-8'));
      const sentences = data.sentences || data;
      for (const word of Object.keys(sentences)) {
        completed.add(word.toLowerCase());
      }
    } catch { /* skip */ }
  }
  return completed;
}

function buildBatches(words, batchSize) {
  // Group by category for coherent batches
  const byCategory = {};
  for (const w of words) {
    if (!byCategory[w.category]) byCategory[w.category] = [];
    byCategory[w.category].push(w);
  }

  const batches = [];
  let current = [];
  for (const [cat, catWords] of Object.entries(byCategory).sort((a, b) => a[0].localeCompare(b[0]))) {
    for (const w of catWords) {
      current.push(w);
      if (current.length >= batchSize) {
        batches.push([...current]);
        current = [];
      }
    }
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function buildPrompt(langCode, batchIdx, words) {
  const lang = LANG_NAMES[langCode];
  const grammar = GRAMMAR_INSTRUCTIONS[langCode];
  const wordList = words.map(w => `"${w.target}" (${w.en})`).join(', ');
  const filePath = `C:\\Users\\michael\\Desktop\\ukrainian typing game\\src\\data\\sentence-bank\\.${langCode}-${batchIdx}.json`;

  return `Generate exactly 5 ${lang} example sentences for EACH of these ${words.length} words. Requirements: natural and grammatically correct, target word MUST appear (conjugated/declined as appropriate), A1-B1 difficulty, vary subjects/tenses/contexts across the 5 sentences, include English translation and grammar annotations (2-3 most relevant per sentence). ${grammar} Output ONLY valid JSON object. Keys: "s" for sentence, "en" for English, "g" for grammar. Format: { "word": [{ "s": "...", "en": "...", "g": {...} }, ...4 more], ... }. Write the JSON directly to a new file at ${filePath}

Words (${words.length}):
${wordList}`;
}

// --- CLI ---
const args = process.argv.slice(2);
const langArg = args.find((_, i) => args[i - 1] === '--lang') || 'uk';
const batchSize = parseInt(args.find((_, i) => args[i - 1] === '--batch-size') || '200');
const batchFilter = args.includes('--batch') ? parseInt(args.find((_, i) => args[i - 1] === '--batch')) : null;
const showStatus = args.includes('--status');

const targetLangs = langArg === 'all' ? ALL_LANGS : [langArg];
const allWords = loadAllWords();

for (const lang of targetLangs) {
  const words = getUniqueWords(allWords, lang);
  const completed = getCompletedWords(lang);
  const remaining = words.filter(w => !completed.has(w.target.toLowerCase()));

  if (showStatus) {
    console.log(`${lang}: ${completed.size}/${words.length} words done (${remaining.length} remaining)`);
    continue;
  }

  const batches = buildBatches(remaining, batchSize);
  console.log(`\n=== ${LANG_NAMES[lang]} (${lang}) ===`);
  console.log(`Total: ${words.length} words, ${completed.size} done, ${remaining.length} remaining`);
  console.log(`Batches: ${batches.length} (${batchSize} words each)\n`);

  for (let i = 0; i < batches.length; i++) {
    if (batchFilter !== null && batchFilter !== i) continue;
    const batch = batches[i];
    const categories = [...new Set(batch.map(w => w.category))];
    console.log(`--- Batch ${i} (${batch.length} words, categories: ${categories.slice(0, 5).join(', ')}${categories.length > 5 ? '...' : ''}) ---`);
    if (batchFilter !== null) {
      console.log('\nAgent prompt:\n');
      console.log(buildPrompt(lang, i + Math.floor(completed.size / batchSize), batch));
    }
    console.log('');
  }
}

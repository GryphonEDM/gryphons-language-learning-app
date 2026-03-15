// Merges English translations from scripts/translated/ back into dictionary files.
// Usage: node scripts/merge-english.js
// Reads: scripts/translated/chunk-NNN.json
// Writes: src/data/vocabulary/comprehensive-dictionary*.json

import fs from 'fs';
import path from 'path';

const VOCAB_DIR = './src/data/vocabulary';
const TRANSLATED_DIR = './scripts/translated';

if (!fs.existsSync(TRANSLATED_DIR)) {
  console.error(`No ${TRANSLATED_DIR} directory found. Run the translation agents first.`);
  process.exit(1);
}

// Load all translated chunks
const translatedFiles = fs.readdirSync(TRANSLATED_DIR)
  .filter(f => f.endsWith('.json'))
  .sort();

console.log(`Found ${translatedFiles.length} translated chunk files.`);

// Build a lookup: file -> ukWord -> exIndex -> englishTranslation
const translations = {};
let totalTranslations = 0;

for (const tf of translatedFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(TRANSLATED_DIR, tf), 'utf-8'));
  for (const entry of data) {
    if (!entry.enSentence) continue;
    const key = entry.file;
    if (!translations[key]) translations[key] = {};
    if (!translations[key][entry.ukWord]) translations[key][entry.ukWord] = {};
    translations[key][entry.ukWord][entry.exIndex] = entry.enSentence;
    totalTranslations++;
  }
}

console.log(`Loaded ${totalTranslations} English translations.`);

// Apply to dictionary files
let totalApplied = 0;
let totalMissed = 0;

for (const [dictFile, wordMap] of Object.entries(translations)) {
  const dictPath = path.join(VOCAB_DIR, dictFile);
  if (!fs.existsSync(dictPath)) {
    console.error(`Dictionary not found: ${dictPath}`);
    continue;
  }

  const dictData = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));

  for (const word of dictData.words) {
    if (wordMap[word.uk]) {
      if (!word.examples) continue;
      if (!word.examples.en) word.examples.en = [];

      const exTranslations = wordMap[word.uk];
      for (const [idxStr, enSentence] of Object.entries(exTranslations)) {
        const idx = parseInt(idxStr);
        word.examples.en[idx] = enSentence;
        totalApplied++;
      }

      // Clean up: ensure en array has no holes
      word.examples.en = word.examples.en.map(s => s || '');
    }
  }

  fs.writeFileSync(dictPath, JSON.stringify(dictData, null, 2) + '\n', 'utf-8');
  console.log(`  Updated ${dictFile}`);
}

console.log(`\nDone! Applied ${totalApplied} translations.`);
if (totalTranslations > totalApplied) {
  console.log(`  ${totalTranslations - totalApplied} translations could not be matched.`);
}

#!/usr/bin/env node
// Extracts all English words from vocabulary files into numbered batch files (50 words each)
// Usage: node scripts/extract-word-batches.js
// Output: scripts/batches/batch-NNN.json  (array of {en, uk} objects)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BATCH_SIZE = 25;
const OUT_DIR = path.join(__dirname, 'batches');

const VOCAB_FILES = [
  'src/data/vocabulary/comprehensive-dictionary.json',
  'src/data/vocabulary/comprehensive-dictionary-ext.json',
  'src/data/vocabulary/comprehensive-dictionary-ext2.json',
  'src/data/vocabulary/comprehensive-dictionary-ext3.json',
  'src/data/vocabulary/comprehensive-dictionary-ext4.json',
  'src/data/vocabulary/comprehensive-dictionary-ext5.json',
  'src/data/vocabulary/comprehensive-dictionary-ext6.json',
  'src/data/vocabulary/comprehensive-dictionary-ext7.json',
  'src/data/vocabulary/comprehensive-dictionary-ext8.json',
  'src/data/vocabulary/comprehensive-dictionary-ext9.json',
  'src/data/vocabulary/comprehensive-dictionary-ext10.json',
  'src/data/vocabulary/comprehensive-dictionary-ext11.json',
  'src/data/vocabulary/comprehensive-dictionary-ext12.json',
];

const THEME_FILES = [
  'src/data/vocabulary/themes/colors.json',
  'src/data/vocabulary/themes/animals.json',
  'src/data/vocabulary/themes/family.json',
  'src/data/vocabulary/themes/emotions.json',
  'src/data/vocabulary/themes/weather.json',
  'src/data/vocabulary/themes/travel.json',
  'src/data/vocabulary/themes/body.json',
  'src/data/vocabulary/themes/house.json',
];

fs.mkdirSync(OUT_DIR, { recursive: true });

const allWords = [];
const seenEn = new Set();

// Collect from comp dicts
for (const rel of VOCAB_FILES) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  for (const w of (data.words || [])) {
    if (w.en && !seenEn.has(w.en.toLowerCase())) {
      seenEn.add(w.en.toLowerCase());
      allWords.push({ en: w.en, uk: w.uk || '', category: w.category || '' });
    }
  }
}

// Collect from themes
for (const rel of THEME_FILES) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  for (const w of (data.words || [])) {
    if (w.en && !seenEn.has(w.en.toLowerCase())) {
      seenEn.add(w.en.toLowerCase());
      allWords.push({ en: w.en, uk: w.uk || '', category: 'theme' });
    }
  }
}

// Split into batches
const batches = [];
for (let i = 0; i < allWords.length; i += BATCH_SIZE) {
  batches.push(allWords.slice(i, i + BATCH_SIZE));
}

// Write batch files
for (let i = 0; i < batches.length; i++) {
  const fname = `batch-${String(i + 1).padStart(3, '0')}.json`;
  fs.writeFileSync(path.join(OUT_DIR, fname), JSON.stringify(batches[i], null, 2));
}

console.log(`Extracted ${allWords.length} unique words into ${batches.length} batches of ${BATCH_SIZE}`);
console.log(`Batch files written to scripts/batches/`);

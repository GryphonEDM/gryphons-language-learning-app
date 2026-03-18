#!/usr/bin/env node
// Applies vocabulary patch files to all vocabulary JSON files
// Usage: node scripts/apply-vocab-patch.js <langCode>
// Example: node scripts/apply-vocab-patch.js es
// Reads: scripts/patches/<langCode>/batch-NNN.json (objects: {"english word": {es: "...", phoneticEs: "..."}})
// Writes: adds new fields to every matching word in all vocab files

const fs = require('fs');
const path = require('path');

const langCode = process.argv[2];
if (!langCode) { console.error('Usage: node apply-vocab-patch.js <langCode>'); process.exit(1); }

const ROOT = path.join(__dirname, '..');
const PATCH_DIR = path.join(__dirname, 'patches', langCode);

if (!fs.existsSync(PATCH_DIR)) {
  console.error(`No patch directory: ${PATCH_DIR}`);
  process.exit(1);
}

// Merge all patch files into one map keyed by lowercase English word
const patchMap = {};
const patchFiles = fs.readdirSync(PATCH_DIR).filter(f => f.endsWith('.json') && !f.startsWith('stories-') && f !== 'theme-names.json').sort();
let patchedCount = 0;

for (const fname of patchFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(PATCH_DIR, fname), 'utf8'));
  for (const [enKey, fields] of Object.entries(data)) {
    patchMap[enKey.toLowerCase()] = fields;
  }
}
console.log(`Loaded ${Object.keys(patchMap).length} patch entries from ${patchFiles.length} files`);

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
  'src/data/vocabulary/themes/colors.json',
  'src/data/vocabulary/themes/animals.json',
  'src/data/vocabulary/themes/family.json',
  'src/data/vocabulary/themes/emotions.json',
  'src/data/vocabulary/themes/weather.json',
  'src/data/vocabulary/themes/travel.json',
  'src/data/vocabulary/themes/body.json',
  'src/data/vocabulary/themes/house.json',
];

for (const rel of VOCAB_FILES) {
  const fpath = path.join(ROOT, rel);
  const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
  let modified = 0;

  for (const w of (data.words || [])) {
    if (!w.en) continue;
    const patch = patchMap[w.en.toLowerCase()];
    if (patch) {
      // Handle examples_XX → examples.XX nesting
      const exKey = `examples_${langCode}`;
      if (patch[exKey]) {
        w.examples = w.examples || {};
        w.examples[langCode] = patch[exKey];
        const { [exKey]: _, ...rest } = patch;
        Object.assign(w, rest);
      } else {
        Object.assign(w, patch);
      }
      // Also skip story patches
      modified++;
      patchedCount++;
    }
  }

  if (modified > 0) {
    fs.writeFileSync(fpath, JSON.stringify(data, null, 2));
    console.log(`  ${rel}: patched ${modified} words`);
  }
}

console.log(`\nDone. Total words patched: ${patchedCount}`);

// Apply theme set names if theme-names.json exists
const themeNamesPath = path.join(PATCH_DIR, 'theme-names.json');
if (fs.existsSync(themeNamesPath)) {
  const themeNames = JSON.parse(fs.readFileSync(themeNamesPath, 'utf8'));
  const capCode = langCode.charAt(0).toUpperCase() + langCode.slice(1);
  const nameKey = `name${capCode}`;
  const THEME_FILES_ONLY = [
    'src/data/vocabulary/themes/colors.json',
    'src/data/vocabulary/themes/animals.json',
    'src/data/vocabulary/themes/family.json',
    'src/data/vocabulary/themes/emotions.json',
    'src/data/vocabulary/themes/weather.json',
    'src/data/vocabulary/themes/travel.json',
    'src/data/vocabulary/themes/body.json',
    'src/data/vocabulary/themes/house.json',
  ];
  for (const rel of THEME_FILES_ONLY) {
    const fpath = path.join(ROOT, rel);
    const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    if (data.setId && themeNames[data.setId]) {
      data[nameKey] = themeNames[data.setId];
      fs.writeFileSync(fpath, JSON.stringify(data, null, 2));
      console.log(`  ${rel}: ${nameKey} = ${themeNames[data.setId]}`);
    }
  }
}

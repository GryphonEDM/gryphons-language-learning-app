#!/usr/bin/env node
// Applies story translation patch files to story JSON files
// Usage: node scripts/apply-story-patch.cjs <langCode>
// Reads: scripts/patches/<langCode>/stories-*.json  (objects: {"storyId": "translated text"})
// Writes: adds langCode field to matching stories in all 3 story files

const fs = require('fs');
const path = require('path');

const langCode = process.argv[2];
if (!langCode) { console.error('Usage: node apply-story-patch.cjs <langCode>'); process.exit(1); }

const ROOT = path.join(__dirname, '..');
const PATCH_DIR = path.join(__dirname, 'patches', langCode);
const STORY_FILES = [
  'src/data/stories/very-beginner.json',
  'src/data/stories/beginner.json',
  'src/data/stories/early-intermediate.json',
];

// Merge all story patch files
const merged = {};
if (fs.existsSync(PATCH_DIR)) {
  for (const f of fs.readdirSync(PATCH_DIR).filter(f => f.startsWith('stories-'))) {
    const patch = JSON.parse(fs.readFileSync(path.join(PATCH_DIR, f), 'utf8'));
    Object.assign(merged, patch);
  }
}
console.log(`Loaded ${Object.keys(merged).length} story translations for ${langCode}`);

let patched = 0;
for (const rel of STORY_FILES) {
  const fpath = path.join(ROOT, rel);
  const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
  for (const story of (data.stories || [])) {
    if (merged[story.id]) {
      story[langCode] = merged[story.id];
      patched++;
    }
  }
  fs.writeFileSync(fpath, JSON.stringify(data, null, 2));
  console.log(`  Patched ${rel}`);
}
console.log(`Done. ${patched} stories updated.`);

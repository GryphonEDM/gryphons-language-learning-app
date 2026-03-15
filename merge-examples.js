import fs from 'fs';
import path from 'path';

const VOCAB_DIR = './src/data/vocabulary';
const PROMPTS_DIR = '.';

// Check which example files exist
const exampleFiles = [];
for (let i = 1; i <= 6; i++) {
  const filepath = path.join(PROMPTS_DIR, `examples-${i}.json`);
  if (fs.existsSync(filepath)) {
    exampleFiles.push(filepath);
  } else {
    console.warn(`Warning: ${filepath} not found, skipping.`);
  }
}

if (exampleFiles.length === 0) {
  console.error('No example files found! Save Claude outputs as prompts/examples-1.json through examples-6.json');
  process.exit(1);
}

console.log(`Found ${exampleFiles.length} example file(s) to merge.\n`);

// Track stats
let totalMerged = 0;
let totalMissed = 0;
const updatedFiles = new Set();

for (const exFile of exampleFiles) {
  console.log(`Processing ${exFile}...`);

  let exData;
  try {
    const raw = fs.readFileSync(exFile, 'utf-8');
    // Strip markdown code fences if Claude wrapped the output
    const cleaned = raw.replace(/^```json?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
    exData = JSON.parse(cleaned);
  } catch (e) {
    console.error(`  Error parsing ${exFile}: ${e.message}`);
    console.error(`  Tip: Make sure the file contains valid JSON (Claude's raw output).`);
    continue;
  }

  // exData is keyed by dictionary filename
  for (const [dictFilename, wordExamples] of Object.entries(exData)) {
    const dictPath = path.join(VOCAB_DIR, dictFilename);

    if (!fs.existsSync(dictPath)) {
      console.error(`  Dictionary file not found: ${dictPath}`);
      continue;
    }

    const dictData = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
    let merged = 0;
    let missed = 0;

    // Build a lookup map by Ukrainian word for faster matching
    const wordMap = new Map();
    for (const word of dictData.words) {
      // Handle potential duplicates by storing as array
      if (!wordMap.has(word.uk)) {
        wordMap.set(word.uk, []);
      }
      wordMap.get(word.uk).push(word);
    }

    for (const [ukWord, examples] of Object.entries(wordExamples)) {
      const matches = wordMap.get(ukWord);
      if (matches) {
        for (const word of matches) {
          word.examples = examples;
          merged++;
        }
      } else {
        // Try normalized matching (trim whitespace, normalize unicode)
        const normalizedKey = ukWord.trim().normalize('NFC');
        let found = false;
        for (const word of dictData.words) {
          if (word.uk.trim().normalize('NFC') === normalizedKey) {
            word.examples = examples;
            merged++;
            found = true;
            break;
          }
        }
        if (!found) {
          missed++;
          if (missed <= 5) {
            console.warn(`    Could not find "${ukWord}" in ${dictFilename}`);
          }
        }
      }
    }

    // Write updated dictionary
    fs.writeFileSync(dictPath, JSON.stringify(dictData, null, 2) + '\n', 'utf-8');
    updatedFiles.add(dictFilename);

    totalMerged += merged;
    totalMissed += missed;
    console.log(`  ${dictFilename}: merged ${merged} examples` + (missed > 0 ? `, ${missed} missed` : ''));
  }
}

console.log(`\nDone!`);
console.log(`  Total examples merged: ${totalMerged}`);
console.log(`  Total missed: ${totalMissed}`);
console.log(`  Files updated: ${[...updatedFiles].join(', ')}`);

if (totalMissed > 0) {
  console.log(`\nNote: Some words were missed. This can happen if Claude used a slightly different`);
  console.log(`spelling or unicode character for the Ukrainian word key. You can manually fix these.`);
}

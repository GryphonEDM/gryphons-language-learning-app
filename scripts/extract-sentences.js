// Extracts all Ukrainian example sentences from dictionaries into numbered chunks for translation.
// Usage: node scripts/extract-sentences.js
// Output: scripts/chunks/chunk-NNN.json files

import fs from 'fs';
import path from 'path';

const VOCAB_DIR = './src/data/vocabulary';
const CHUNKS_DIR = './scripts/chunks';
const CHUNK_SIZE = 80; // sentences per chunk — small enough for a sub-agent to translate without token overflow

// Ensure output dir exists
if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });

// Collect all sentences
const allSentences = [];
const dictFiles = fs.readdirSync(VOCAB_DIR)
  .filter(f => f.startsWith('comprehensive-dictionary') && f.endsWith('.json'))
  .sort();

for (const filename of dictFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(VOCAB_DIR, filename), 'utf-8'));
  for (const word of data.words) {
    if (word.examples && word.examples.uk && word.examples.uk.length > 0) {
      for (let i = 0; i < word.examples.uk.length; i++) {
        allSentences.push({
          file: filename,
          ukWord: word.uk,
          exIndex: i,
          ukSentence: word.examples.uk[i],
          ruSentence: (word.examples.ru && word.examples.ru[i]) || '',
          enWordMeaning: word.en
        });
      }
    }
  }
}

console.log(`Total sentences: ${allSentences.length}`);

// Split into chunks
const totalChunks = Math.ceil(allSentences.length / CHUNK_SIZE);
for (let c = 0; c < totalChunks; c++) {
  const chunk = allSentences.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
  const chunkFile = path.join(CHUNKS_DIR, `chunk-${String(c).padStart(3, '0')}.json`);
  fs.writeFileSync(chunkFile, JSON.stringify(chunk, null, 2), 'utf-8');
}

console.log(`Created ${totalChunks} chunk files in ${CHUNKS_DIR}/`);
console.log(`Chunk size: ${CHUNK_SIZE} sentences each`);

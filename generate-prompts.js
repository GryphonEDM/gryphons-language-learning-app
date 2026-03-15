import fs from 'fs';
import path from 'path';

const VOCAB_DIR = './src/data/vocabulary';

// All comprehensive dictionary files (the ones WITHOUT examples)
const DICT_FILES = [
  'comprehensive-dictionary.json',
  'comprehensive-dictionary-ext.json',
  'comprehensive-dictionary-ext2.json',
  'comprehensive-dictionary-ext3.json',
  'comprehensive-dictionary-ext4.json',
  'comprehensive-dictionary-ext5.json',
  'comprehensive-dictionary-ext6.json',
  'comprehensive-dictionary-ext7.json',
  'comprehensive-dictionary-ext8.json',
  'comprehensive-dictionary-ext9.json',
  'comprehensive-dictionary-ext10.json',
  'comprehensive-dictionary-ext11.json',
  'comprehensive-dictionary-ext12.json',
];

// Split into 6 groups, balanced by word count
const GROUPS = [
  ['comprehensive-dictionary.json', 'comprehensive-dictionary-ext11.json'],
  ['comprehensive-dictionary-ext.json', 'comprehensive-dictionary-ext10.json'],
  ['comprehensive-dictionary-ext2.json', 'comprehensive-dictionary-ext9.json'],
  ['comprehensive-dictionary-ext12.json', 'comprehensive-dictionary-ext8.json'],
  ['comprehensive-dictionary-ext5.json', 'comprehensive-dictionary-ext4.json'],
  ['comprehensive-dictionary-ext3.json', 'comprehensive-dictionary-ext6.json', 'comprehensive-dictionary-ext7.json'],
];

function loadWords(filename) {
  const data = JSON.parse(fs.readFileSync(path.join(VOCAB_DIR, filename), 'utf-8'));
  return data.words;
}

function formatWordList(words, filename) {
  let lines = [`\n### File: ${filename} (${words.length} words)\n`];
  lines.push('```');
  for (const w of words) {
    lines.push(`${w.uk} | ${w.ru} | ${w.en} | ${w.category}`);
  }
  lines.push('```');
  return lines.join('\n');
}

function buildPrompt(groupIndex, filenames) {
  let allWordLists = '';
  let totalWords = 0;
  const fileWordCounts = [];

  for (const filename of filenames) {
    const words = loadWords(filename);
    totalWords += words.length;
    fileWordCounts.push(`${filename}: ${words.length} words`);
    allWordLists += formatWordList(words, filename);
  }

  return `# Task: Generate Ukrainian & Russian Example Sentences

You are a fluent Ukrainian and Russian language expert. Your task is to generate **one simple example sentence** for each word below — one sentence in Ukrainian and one in Russian.

## Files you are processing (Group ${groupIndex + 1} of 6)
${fileWordCounts.map(f => `- ${f}`).join('\n')}
- **Total: ${totalWords} words**

## Rules

1. **One Ukrainian sentence and one Russian sentence per word.** The sentences should be simple (A1-B1 level), natural, and clearly demonstrate the meaning of the word.
2. **The Ukrainian sentence MUST use the exact Ukrainian word** (\`uk\` column) in context.
3. **The Russian sentence MUST use the exact Russian word** (\`ru\` column) in context.
4. **Keep sentences short** — ideally 3-8 words each. These are for flashcard learners, not literature.
5. **Vary sentence structures.** Don't just repeat "Я люблю [word]" for everything. Use different subjects, tenses, and contexts appropriate to the word's category (verb, noun, adjective, etc.).
6. **For verbs**, conjugate naturally — don't just use the infinitive. Example: for "робити" (to do), write "Що ти робиш?" not "Я хочу робити."
7. **For nouns**, use them in natural contexts with articles, possessives, or prepositions as appropriate.
8. **For adjectives/adverbs**, pair them with relevant nouns or verbs.

## Output Format

You MUST output valid JSON and nothing else — no markdown code fences, no commentary, no explanations. Just the raw JSON.

The output must be a JSON object organized **by source filename**, so I can merge them back:

{
  "comprehensive-dictionary-XXXX.json": {
    "українське_слово": {
      "uk": ["Ukrainian example sentence here."],
      "ru": ["Russian example sentence here."]
    },
    "інше_слово": {
      "uk": ["Друге речення тут."],
      "ru": ["Другое предложение здесь."]
    }
  },
  "comprehensive-dictionary-YYYY.json": {
    ...
  }
}

The top-level keys are the exact filenames listed below. Inside each, the keys are the Ukrainian words (the \`uk\` column), and the values are objects with \`uk\` and \`ru\` arrays each containing exactly 1 sentence string.

## Word Lists

Below are the words, formatted as: **uk | ru | en | category**
${allWordLists}

## Reminder
- Output ONLY the JSON object. No markdown fences. No explanation text.
- Every single word in the lists above MUST have an entry in the output.
- Use the EXACT Ukrainian word as the key (matching the \`uk\` column exactly, including apostrophes like ʼ).
- Sentences should feel natural, like something a native speaker would actually say.

Begin generating the JSON now.`;
}

// Generate all 6 prompts
const outputDir = './prompts';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

for (let i = 0; i < GROUPS.length; i++) {
  const prompt = buildPrompt(i, GROUPS[i]);
  const filename = path.join(outputDir, `prompt-${i + 1}.txt`);
  fs.writeFileSync(filename, prompt, 'utf-8');

  // Count words for summary
  let wordCount = 0;
  for (const f of GROUPS[i]) {
    wordCount += loadWords(f).length;
  }
  console.log(`Generated ${filename} (${GROUPS[i].join(' + ')}) — ${wordCount} words`);
}

console.log('\nAll 6 prompts generated in ./prompts/');
console.log('\nNext steps:');
console.log('1. Open each prompt-N.txt and paste its contents into a Claude Sonnet window');
console.log('2. Save each Claude response as prompts/examples-N.json');
console.log('3. Run: node merge-examples.js');

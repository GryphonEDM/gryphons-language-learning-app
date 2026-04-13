/**
 * Sentence Bank Prompt Templates
 * Per-language-family prompt builders for generating annotated example sentences.
 */

// Grammar annotation schemas per language family
export const GRAMMAR_SCHEMAS = {
  slavic: {
    langs: ['uk', 'ru'],
    fields: {
      tense: ['present', 'past', 'future'],
      aspect: ['pf', 'impf'],
      person: ['1s', '2s', '3s', '1p', '2p', '3p'],
      gender: ['m', 'f', 'n'],
      case: ['nom', 'gen', 'dat', 'acc', 'inst', 'loc', 'voc'],
      number: ['sg', 'pl'],
    },
  },
  germanic: {
    langs: ['de'],
    fields: {
      tense: ['present', 'past', 'perfect', 'future'],
      case: ['nom', 'acc', 'dat', 'gen'],
      gender: ['m', 'f', 'n'],
      person: ['1s', '2s', '3s', '1p', '2p', '3p'],
      mood: ['ind', 'subj', 'imp'],
    },
  },
  romance: {
    langs: ['es', 'fr'],
    fields: {
      tense: ['present', 'preterite', 'imperfect', 'future', 'cond'],
      mood: ['ind', 'subj', 'imp'],
      gender: ['m', 'f'],
      person: ['1s', '2s', '3s', '1p', '2p', '3p'],
      number: ['sg', 'pl'],
    },
  },
  greek: {
    langs: ['el'],
    fields: {
      tense: ['present', 'past', 'future'],
      aspect: ['pf', 'impf'],
      case: ['nom', 'gen', 'acc', 'voc'],
      gender: ['m', 'f', 'n'],
      person: ['1s', '2s', '3s', '1p', '2p', '3p'],
    },
  },
  semitic: {
    langs: ['ar'],
    fields: {
      form: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'],
      tense: ['past', 'present', 'future', 'imp'],
      case: ['nom', 'acc', 'gen'],
      gender: ['m', 'f'],
      number: ['sg', 'dual', 'pl'],
      definiteness: ['def', 'indef', 'construct'],
    },
  },
  indic: {
    langs: ['hi'],
    fields: {
      tense: ['present', 'past', 'future'],
      case: ['direct', 'oblique', 'voc'],
      gender: ['m', 'f'],
      number: ['sg', 'pl'],
      formality: ['informal', 'formal', 'honorific'],
    },
  },
  chinese: {
    langs: ['zh'],
    fields: {
      aspect: ['completed', 'ongoing', 'experiential', 'none'],
      particle: ['了', '着', '过', '的', '得', null],
      structure: ['SVO', 'BA', 'BEI', 'topic-comment'],
    },
  },
  japanese: {
    langs: ['ja'],
    fields: {
      formality: ['plain', 'polite', 'honorific', 'humble'],
      tense: ['present', 'past'],
      particle: ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'から', 'まで'],
      form: ['te', 'potential', 'causative', 'passive', 'volitional', 'conditional'],
    },
  },
  korean: {
    langs: ['ko'],
    fields: {
      formality: ['casual', 'polite', 'formal'],
      tense: ['present', 'past', 'future'],
      particle: ['은/는', '이/가', '을/를', '에', '에서', '으로'],
      ending: null, // free-form string
    },
  },
};

// Map language code to family
export function getFamily(langCode) {
  for (const [family, schema] of Object.entries(GRAMMAR_SCHEMAS)) {
    if (schema.langs.includes(langCode)) return family;
  }
  return null;
}

// Language display names and config
const LANG_NAMES = {
  uk: { name: 'Ukrainian', native: 'Українська', script: 'Cyrillic' },
  ru: { name: 'Russian', native: 'Русский', script: 'Cyrillic' },
  de: { name: 'German', native: 'Deutsch', script: 'Latin' },
  es: { name: 'Spanish', native: 'Español', script: 'Latin' },
  fr: { name: 'French', native: 'Français', script: 'Latin' },
  el: { name: 'Greek', native: 'Ελληνικά', script: 'Greek' },
  hi: { name: 'Hindi', native: 'हिन्दी', script: 'Devanagari' },
  ar: { name: 'Arabic', native: 'العربية', script: 'Arabic' },
  ko: { name: 'Korean', native: '한국어', script: 'Hangul' },
  zh: { name: 'Chinese', native: '中文', script: 'Simplified Chinese characters' },
  ja: { name: 'Japanese', native: '日本語', script: 'Hiragana/Katakana/Kanji mix' },
};

// Language-specific generation instructions
const LANG_SPECIFIC_INSTRUCTIONS = {
  uk: `- Use Ukrainian vocabulary, not Russian cognates (e.g. "вживати" not "використовувати" where more natural)
- Include both perfective and imperfective usage where the word has aspect pairs
- Use the vocative case in at least one sentence when applicable (e.g. "Друже!", "Мамо!")`,
  ru: `- Use standard modern Russian
- Include both perfective and imperfective usage where the word has aspect pairs
- Vary between formal (вы) and informal (ты) registers`,
  de: `- Use standard Hochdeutsch
- For separable verbs, include at least one sentence showing the prefix separated
- Include proper noun capitalization for all nouns
- Vary between du/Sie registers`,
  es: `- Use standard Castilian Spanish (not regional dialect)
- Include ser/estar distinction where relevant
- Vary between tú and usted registers
- Use subjunctive mood in at least one sentence where natural`,
  fr: `- Use standard Metropolitan French
- Include proper liaison and elision patterns
- Vary between tu and vous registers
- Use subjunctive mood in at least one sentence where natural`,
  el: `- Use Modern Greek (Dimotiki), not Katharevousa
- Include accent marks (τόνος) on all polysyllabic words
- Use final sigma (ς) correctly at word endings`,
  hi: `- Use standard Hindi (Khariboli), not Urdu-heavy vocabulary
- Include all three formality levels across the 5 sentences (तू/तुम/आप)
- Write in Devanagari script only, no Romanization`,
  ar: `- Use Modern Standard Arabic (فصحى), not dialect
- Include full diacritics (tashkeel) on the target word at minimum
- Use proper hamza placement (أ إ ؤ ئ)
- Vary definiteness (with/without ال)`,
  ko: `- Use standard Seoul Korean
- Include at least one polite (-요) and one formal (-습니다) sentence
- Use Hangul only, no Hanja
- Include proper spacing between particles and words`,
  zh: `- Use Simplified Chinese characters
- Keep sentences natural and conversational (not literary/classical)
- Include at least one sentence with 了 for completed aspect
- Sentences should be 5-15 characters`,
  ja: `- Use a natural mix of hiragana, katakana, and common kanji
- Include at least one polite (です/ます) and one plain form sentence
- Use appropriate particles correctly
- For katakana loan words, use katakana`,
};

/**
 * Build the grammar schema description for the prompt.
 */
function grammarSchemaForPrompt(langCode) {
  const family = getFamily(langCode);
  const schema = GRAMMAR_SCHEMAS[family];
  if (!schema) return '';

  const lines = ['Grammar annotation object "g" — annotate the 2-3 most relevant features per sentence:'];
  for (const [key, values] of Object.entries(schema.fields)) {
    if (values === null) {
      lines.push(`  "${key}": free-form string`);
    } else {
      lines.push(`  "${key}": one of ${JSON.stringify(values)}`);
    }
  }
  lines.push('Only include fields that are relevant to the sentence. Omit fields that do not apply.');
  return lines.join('\n');
}

/**
 * Build a generation prompt for a batch of words in a given language.
 *
 * @param {string} langCode - Language code (uk, de, etc.)
 * @param {string} category - Word category (verbs, adjectives, etc.)
 * @param {Array<{target: string, en: string}>} words - Batch of words
 * @returns {{ system: string, user: string }}
 */
export function buildPrompt(langCode, category, words) {
  const lang = LANG_NAMES[langCode];
  const grammarSchema = grammarSchemaForPrompt(langCode);
  const specificInstructions = LANG_SPECIFIC_INSTRUCTIONS[langCode] || '';

  const system = `You are a native ${lang.name} language expert and experienced language teacher. You generate natural, grammatically correct ${lang.name} sentences for language learners. You always respond with valid JSON only.`;

  const wordList = words.map(w => `  "${w.target}" (${w.en})`).join('\n');

  const user = `Generate exactly 5 example sentences for EACH of the following ${lang.name} vocabulary words.

Category: ${category}
Words:
${wordList}

Requirements for each sentence:
- Natural and grammatically correct — something a native speaker would actually say
- The target word MUST appear in the sentence (conjugated/declined/inflected as appropriate)
- Difficulty: A1-B1 level (3-12 words for alphabetic languages, 5-20 characters for CJK)
- All 5 sentences for a word must be DIFFERENT in structure: vary subjects, tenses, contexts
- Include an accurate English translation
- Include grammar annotations for the target word as used in that sentence

${lang.name}-specific instructions:
${specificInstructions}

${grammarSchema}

Output format — valid JSON object, no markdown, no commentary:
{
  "${words[0]?.target || 'word'}": [
    { "s": "${lang.name} sentence here", "en": "English translation", "g": { ... } },
    { "s": "...", "en": "...", "g": { ... } },
    { "s": "...", "en": "...", "g": { ... } },
    { "s": "...", "en": "...", "g": { ... } },
    { "s": "...", "en": "...", "g": { ... } }
  ],
  ...one entry per word above
}

CRITICAL: Output ONLY the JSON object. No markdown fences, no explanation, no preamble.`;

  return { system, user };
}

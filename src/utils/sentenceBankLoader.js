/*  sentenceBankLoader.js
 *  Builds a word→sentences index from the per-language sentence JSON files
 *  so that modes can look up example sentences for any vocabulary word.
 */

const LANG_CODE_MAP = {
  uk: () => import('../data/sentences.json'),
  ar: () => import('../data/ar/sentences.json'),
  de: () => import('../data/de/sentences.json'),
  el: () => import('../data/el/sentences.json'),
  es: () => import('../data/es/sentences.json'),
  fr: () => import('../data/fr/sentences.json'),
  hi: () => import('../data/hi/sentences.json'),
  ja: () => import('../data/ja/sentences.json'),
  ko: () => import('../data/ko/sentences.json'),
  ru: () => import('../data/ru/sentences.json'),
  zh: () => import('../data/zh/sentences.json'),
};

/**
 * Load sentence data for a language and build a word→sentences index.
 * @param {string} langCode  e.g. 'uk', 'de', 'es'
 * @returns {Promise<Map<string, Array<{s:string, en:string, g:string|null}>>>}
 */
export async function loadSentenceBank(langCode) {
  const loader = LANG_CODE_MAP[langCode];
  if (!loader) return new Map();

  try {
    const mod = await loader();
    const data = mod.default || mod;
    const sentences = data.sentences || [];
    const index = new Map();

    for (const entry of sentences) {
      const targetText = entry[langCode] || '';
      if (!targetText) continue;

      const record = {
        s: targetText,
        en: entry.en || '',
        g: entry.difficulty || null,
      };

      // Index by each word (case-insensitive, stripped of trailing punctuation)
      const words = entry.words || targetText.split(/\s+/);
      for (const raw of words) {
        const key = raw.replace(/[.,!?;:]+$/, '').toLowerCase();
        if (!key) continue;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(record);
      }
    }

    return index;
  } catch (e) {
    console.warn(`[sentenceBankLoader] Failed to load sentences for "${langCode}":`, e);
    return new Map();
  }
}

/**
 * Pick a single sentence containing a given word.
 * Uses `index` to rotate through available sentences for variety.
 * @returns {{ s:string, en:string, g:string|null } | null}
 */
export function pickSentence(bank, word, index = 0) {
  if (!bank || !word) return null;
  const key = word.replace(/[.,!?;:]+$/, '').toLowerCase();
  const entries = bank.get(key);
  if (!entries || entries.length === 0) return null;
  return entries[index % entries.length];
}

/**
 * Get all sentences containing a given word.
 * @returns {Array<{ s:string, en:string, g:string|null }>}
 */
export function getSentences(bank, word) {
  if (!bank || !word) return [];
  const key = word.replace(/[.,!?;:]+$/, '').toLowerCase();
  return bank.get(key) || [];
}

/**
 * Turn a grammar / difficulty label into a displayable array of strings.
 * @param {*} g  grammar data from a sentence entry (may be falsy)
 * @returns {string[]}
 */
export function formatGrammarLabels(g) {
  if (!g) return [];
  if (Array.isArray(g)) return g.map(String);
  if (typeof g === 'string') return [g];
  return [];
}

/**
 * Sentence Bank Loader
 *
 * Lazy-loads per-language sentence bank files via Vite dynamic imports.
 * Provides rotation logic for showing different sentences across reviews.
 */

const cache = {};
let loading = {};

/**
 * Lazy-load the sentence bank for a given language.
 * Uses Vite's dynamic import for automatic code splitting.
 * Returns the sentences object (word → array of sentence entries).
 */
export async function loadSentenceBank(langCode) {
  if (cache[langCode]) return cache[langCode];

  // Prevent duplicate concurrent loads
  if (loading[langCode]) return loading[langCode];

  loading[langCode] = (async () => {
    try {
      // Vite recognizes this glob pattern and creates separate chunks per file
      const modules = import.meta.glob('../data/sentence-bank/*.json');
      const key = `../data/sentence-bank/${langCode}.json`;

      if (!modules[key]) {
        cache[langCode] = null;
        return null;
      }

      const module = await modules[key]();
      const sentences = module.default?.sentences || module.sentences || null;
      cache[langCode] = sentences;
      return sentences;
    } catch {
      // File doesn't exist yet or failed to load — not an error, just no data
      cache[langCode] = null;
      return null;
    } finally {
      delete loading[langCode];
    }
  })();

  return loading[langCode];
}

/**
 * Get all sentences for a word from the loaded bank.
 * @param {object|null} bank - The loaded sentence bank (from loadSentenceBank)
 * @param {string} word - The target-language word
 * @returns {Array<{ s: string, en: string, g: object }>}
 */
export function getSentences(bank, word) {
  if (!bank || !word) return [];
  return bank[word] || bank[word.toLowerCase()] || [];
}

/**
 * Pick a single sentence for a word, rotating based on review count.
 * Uses the review index (typically `reps` from SRS) to cycle through sentences.
 *
 * @param {object|null} bank - The loaded sentence bank
 * @param {string} word - The target-language word
 * @param {number} reviewIndex - Rotation index (e.g., reps count, session index)
 * @returns {{ s: string, en: string, g: object } | null}
 */
export function pickSentence(bank, word, reviewIndex = 0) {
  const sentences = getSentences(bank, word);
  if (sentences.length === 0) return null;
  return sentences[Math.abs(reviewIndex) % sentences.length];
}

/**
 * Format grammar annotations as human-readable labels.
 * E.g., { tense: "present", aspect: "impf" } → ["present", "imperfective"]
 *
 * @param {object} g - Grammar annotation object
 * @returns {string[]} Array of display labels
 */
export function formatGrammarLabels(g) {
  if (!g || typeof g !== 'object') return [];

  const LABEL_MAP = {
    // Tense
    present: 'present', past: 'past', future: 'future',
    perfect: 'perfect', preterite: 'preterite', imperfect: 'imperfect',
    cond: 'conditional',
    // Aspect
    pf: 'perfective', impf: 'imperfective',
    completed: 'completed', ongoing: 'ongoing', experiential: 'experiential',
    // Case
    nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative',
    inst: 'instrumental', loc: 'locative', voc: 'vocative',
    direct: 'direct', oblique: 'oblique', construct: 'construct',
    // Mood
    ind: 'indicative', subj: 'subjunctive', imp: 'imperative',
    // Gender
    m: 'masculine', f: 'feminine', n: 'neuter',
    // Number
    sg: 'singular', pl: 'plural', dual: 'dual',
    // Formality
    informal: 'informal', formal: 'formal', honorific: 'honorific',
    humble: 'humble', plain: 'plain', polite: 'polite', casual: 'casual',
    // Structures
    SVO: 'SVO', BA: 'bǎ-structure', BEI: 'passive (bèi)',
    'topic-comment': 'topic-comment',
    // Verb forms
    te: 'て-form', potential: 'potential', causative: 'causative',
    passive: 'passive', volitional: 'volitional', conditional: 'conditional',
  };

  const labels = [];
  for (const [key, value] of Object.entries(g)) {
    if (value === null || value === undefined) continue;
    // Skip person annotations (too noisy for display)
    if (key === 'person') continue;
    const mapped = LABEL_MAP[value] || value;
    labels.push(mapped);
  }
  return labels;
}

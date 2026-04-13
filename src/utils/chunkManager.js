/**
 * Chunk/Collocation Manager — manages multi-word units as SRS items.
 *
 * Research: Usage-based linguistics shows fluency depends on large stores
 * of memorized multi-word sequences. "Як справи?" should be taught and
 * reviewed as a single unit, not two separate words.
 *
 * Chunks are stored in vocabularyMastery with "chunk:" prefix to distinguish
 * from individual words. Component words are tracked independently.
 */

const CHUNK_PREFIX = 'chunk:';

/**
 * Check if a vocabularyMastery key is a chunk.
 * @param {string} key
 * @returns {boolean}
 */
export function isChunk(key) {
  return key?.startsWith(CHUNK_PREFIX);
}

/**
 * Get the display text of a chunk key.
 * @param {string} key - e.g., "chunk:Як справи?"
 * @returns {string} e.g., "Як справи?"
 */
export function getChunkText(key) {
  return isChunk(key) ? key.slice(CHUNK_PREFIX.length) : key;
}

/**
 * Create a chunk key from text.
 * @param {string} text
 * @returns {string}
 */
export function makeChunkKey(text) {
  return `${CHUNK_PREFIX}${text}`;
}

/**
 * Load chunk data for a language.
 * @param {string} langCode
 * @returns {Promise<Array>}
 */
export async function loadChunks(langCode) {
  try {
    const data = (await import(`../data/chunks/${langCode}.json`)).default;
    return data.chunks || [];
  } catch {
    return [];
  }
}

/**
 * Get chunks that are due for review from vocabularyMastery.
 * @param {object} vocabularyMastery
 * @param {number} now - Current timestamp
 * @param {number} limit - Max chunks to return
 * @returns {Array<{ word: string, ...srsFields }>}
 */
export function getDueChunks(vocabularyMastery, now = Date.now(), limit = 5) {
  const due = [];
  for (const [key, data] of Object.entries(vocabularyMastery || {})) {
    if (!isChunk(key)) continue;
    if (!data.nextReview) continue;
    const reviewTime = new Date(data.nextReview).getTime();
    if (reviewTime <= now) {
      due.push({
        word: key,
        displayText: getChunkText(key),
        ...data,
        overdueDays: (now - reviewTime) / 86400000,
        isChunk: true,
      });
    }
  }
  due.sort((a, b) => b.overdueDays - a.overdueDays);
  return due.slice(0, limit);
}

/**
 * Get new (unreviewed) chunks for introduction.
 * @param {Array} allChunks - All available chunks from data
 * @param {object} vocabularyMastery
 * @param {number} limit
 * @returns {Array}
 */
export function getNewChunks(allChunks, vocabularyMastery, limit = 3) {
  const mastered = vocabularyMastery || {};
  return allChunks
    .filter(c => !mastered[makeChunkKey(c[Object.keys(c).find(k => k !== 'en' && k !== 'phonetic' && k !== 'type' && k !== 'difficulty' && k !== 'componentWords' && k !== 'examples' && k !== 'id') || 'uk'])])
    .slice(0, limit);
}

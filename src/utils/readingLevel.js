/**
 * Reading Level Utility — computes word coverage for graded reading.
 *
 * Research: Extensive reading at 98% known-word density is optimal for
 * acquisition. Below 95%, comprehension breaks down. The 98% threshold
 * means only ~1 unknown word per 50, which is enough context to infer
 * meaning without disrupting reading flow.
 */

/**
 * Compute the set of words the user "knows" based on SRS state.
 *
 * @param {object} vocabularyMastery
 * @param {object} opts
 * @param {number} opts.stabilityThreshold - Min stability to count as "known" (default 7 days)
 * @param {number} opts.minCorrect - Min correct answers (default 2)
 * @returns {Set<string>} Set of known word forms (lowercase)
 */
export function computeKnownWords(vocabularyMastery, { stabilityThreshold = 7, minCorrect = 2 } = {}) {
  const known = new Set();

  for (const [word, data] of Object.entries(vocabularyMastery || {})) {
    if (word.startsWith('chunk:')) continue;
    const isKnown = (data.stability >= stabilityThreshold) ||
      (data.timesCorrect >= minCorrect && data.masteryLevel >= 0.6);
    if (isKnown) {
      known.add(word.toLowerCase());
      // Also add common inflected forms (rough heuristic for Slavic languages)
      if (word.length > 3) {
        known.add(word.toLowerCase().slice(0, -1)); // drop last letter
        known.add(word.toLowerCase().slice(0, -2)); // drop last 2 letters
      }
    }
  }

  // Add universal function words that don't need to be "learned"
  const functionWords = ['і', 'в', 'у', 'на', 'з', 'до', 'від', 'за', 'по', 'як', 'що',
    'це', 'той', 'та', 'але', 'а', 'не', 'ні', 'так', 'ще', 'вже', 'де', 'коли',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
    'of', 'and', 'or', 'but', 'not', 'with', 'this', 'that', 'it', 'I', 'you', 'he',
    'she', 'we', 'they', 'my', 'your', 'his', 'her'];
  functionWords.forEach(w => known.add(w.toLowerCase()));

  return known;
}

/**
 * Tokenize a text into words for coverage analysis.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"""''«»()[\]{}\-–—…\d]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Grade a text for readability based on the user's known vocabulary.
 *
 * @param {string} text
 * @param {Set<string>} knownWords
 * @returns {{ totalWords: number, knownCount: number, unknownWords: string[], coveragePercent: number, isReadable: boolean }}
 */
export function gradeText(text, knownWords) {
  const words = tokenize(text);
  if (words.length === 0) {
    return { totalWords: 0, knownCount: 0, unknownWords: [], coveragePercent: 100, isReadable: true };
  }

  const unknownWords = [];
  let knownCount = 0;

  for (const word of words) {
    // Check exact match, or stem match (drop 1-2 chars)
    const isKnown = knownWords.has(word) ||
      (word.length > 3 && knownWords.has(word.slice(0, -1))) ||
      (word.length > 4 && knownWords.has(word.slice(0, -2)));

    if (isKnown) {
      knownCount++;
    } else {
      if (!unknownWords.includes(word)) unknownWords.push(word);
    }
  }

  const coveragePercent = Math.round((knownCount / words.length) * 100);

  return {
    totalWords: words.length,
    knownCount,
    unknownWords,
    coveragePercent,
    isReadable: coveragePercent >= 95, // 95% is functional; 98% is ideal
  };
}

/**
 * Highlight words in a text as known or unknown.
 *
 * @param {string} text
 * @param {Set<string>} knownWords
 * @returns {Array<{ word: string, known: boolean, original: string }>}
 */
export function highlightText(text, knownWords) {
  // Split preserving whitespace and punctuation
  const tokens = text.split(/(\s+)/);
  return tokens.map(token => {
    const cleaned = token.toLowerCase().replace(/[.,!?;:"""''«»()[\]{}\-–—…]/g, '');
    if (!cleaned || /^\s+$/.test(token)) {
      return { word: token, known: true, original: token };
    }
    const isKnown = knownWords.has(cleaned) ||
      (cleaned.length > 3 && knownWords.has(cleaned.slice(0, -1))) ||
      (cleaned.length > 4 && knownWords.has(cleaned.slice(0, -2)));
    return { word: cleaned, known: isKnown, original: token };
  });
}

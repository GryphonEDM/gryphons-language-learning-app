/**
 * Sentence-level diff utility using word-level edit distance.
 * Used by ListeningMode (sentence dictation), chunks, and bidirectional translation.
 */

/**
 * Normalize a string for comparison: lowercase, strip punctuation, collapse whitespace.
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[.,!?;:"""''«»()[\]{}\-–—…]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize a string into words for comparison.
 * @param {string} str
 * @returns {string[]}
 */
function tokenize(str) {
  return normalize(str).split(' ').filter(Boolean);
}

/**
 * Compute the edit distance matrix between two word arrays.
 * Returns the full DP table for backtracking.
 * @param {string[]} source
 * @param {string[]} target
 * @returns {number[][]}
 */
function editDistanceMatrix(source, target) {
  const m = source.length;
  const n = target.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (source[i - 1] === target[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1], // substitution
        );
      }
    }
  }

  return dp;
}

/**
 * Backtrack through the DP matrix to produce an aligned diff.
 * @param {string[]} expected - The target/correct words
 * @param {string[]} actual - The user's input words
 * @param {number[][]} dp - The edit distance matrix
 * @returns {Array<{ word: string, type: 'correct'|'wrong'|'missing'|'extra', expected?: string }>}
 */
function backtrack(expected, actual, dp) {
  const result = [];
  let i = expected.length;
  let j = actual.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && expected[i - 1] === actual[j - 1]) {
      // Match
      result.unshift({ word: expected[i - 1], type: 'correct' });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      // Substitution
      result.unshift({ word: actual[j - 1], type: 'wrong', expected: expected[i - 1] });
      i--;
      j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      // Insertion (extra word in user input)
      result.unshift({ word: actual[j - 1], type: 'extra' });
      j--;
    } else {
      // Deletion (missing word from expected)
      result.unshift({ word: expected[i - 1], type: 'missing' });
      i--;
    }
  }

  return result;
}

/**
 * Compute a word-level diff between expected and actual sentences.
 *
 * @param {string} expected - The correct sentence
 * @param {string} actual - The user's typed sentence
 * @returns {{
 *   diff: Array<{ word: string, type: 'correct'|'wrong'|'missing'|'extra', expected?: string }>,
 *   correct: number,
 *   total: number,
 *   accuracy: number,
 *   isExactMatch: boolean,
 * }}
 */
export function computeSentenceDiff(expected, actual) {
  const expectedWords = tokenize(expected);
  const actualWords = tokenize(actual);

  if (expectedWords.length === 0) {
    return {
      diff: actualWords.map(w => ({ word: w, type: 'extra' })),
      correct: 0,
      total: 0,
      accuracy: 0,
      isExactMatch: actualWords.length === 0,
    };
  }

  const dp = editDistanceMatrix(expectedWords, actualWords);
  const diff = backtrack(expectedWords, actualWords, dp);

  const correctCount = diff.filter(d => d.type === 'correct').length;
  const totalExpected = expectedWords.length;

  return {
    diff,
    correct: correctCount,
    total: totalExpected,
    accuracy: totalExpected > 0 ? Math.round((correctCount / totalExpected) * 100) : 0,
    isExactMatch: normalize(expected) === normalize(actual),
  };
}

/**
 * Extract individual words from a sentence diff that were wrong or missing,
 * useful for feeding into the struggle engine per-word.
 *
 * @param {Array<{ word: string, type: string, expected?: string }>} diff
 * @returns {{ correct: string[], incorrect: string[] }}
 */
export function extractWordResults(diff) {
  const correct = [];
  const incorrect = [];

  for (const entry of diff) {
    if (entry.type === 'correct') {
      correct.push(entry.word);
    } else if (entry.type === 'wrong' && entry.expected) {
      incorrect.push(entry.expected);
    } else if (entry.type === 'missing') {
      incorrect.push(entry.word);
    }
    // 'extra' words are ignored for tracking — they're user additions
  }

  return { correct, incorrect };
}

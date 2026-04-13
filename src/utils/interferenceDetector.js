/**
 * Interference Detector — detects when similar words co-occur on the
 * struggle list and prevents co-scheduling in sessions.
 *
 * Research: Interference theory shows similar items compete during retrieval.
 * Orthographic, phonological, and semantic similarity between struggling
 * words exacerbates confusion. Separating them in review prevents this.
 */

/**
 * Compute Levenshtein distance between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Detect interference pairs among struggling words.
 *
 * @param {object} vocabularyMastery
 * @param {object} opts
 * @param {number} opts.orthographicThreshold - Max Levenshtein distance for orthographic similarity (default 2)
 * @param {number} opts.minStruggleScore - Min struggle score to consider (default 0.25)
 * @returns {Array<{ wordA: string, wordB: string, types: string[], severity: number }>}
 */
export function detectInterference(vocabularyMastery, { orthographicThreshold = 2, minStruggleScore = 0.25 } = {}) {
  const pairs = [];
  const struggleWords = [];

  // Collect words with struggle data
  for (const [word, data] of Object.entries(vocabularyMastery || {})) {
    if (word.startsWith('chunk:')) continue;
    const score = data.struggle?.score || 0;
    if (score >= minStruggleScore) {
      struggleWords.push({
        word,
        score,
        source: data.source || '',
        confusionPairs: data.struggle?.confusionPairs || [],
      });
    }
  }

  // Check all pairs
  for (let i = 0; i < struggleWords.length; i++) {
    for (let j = i + 1; j < struggleWords.length; j++) {
      const a = struggleWords[i];
      const b = struggleWords[j];
      const types = [];
      let severity = 0;

      // Orthographic similarity
      const dist = levenshtein(a.word.toLowerCase(), b.word.toLowerCase());
      if (dist <= orthographicThreshold && dist > 0) {
        types.push('orthographic');
        severity += (orthographicThreshold - dist + 1) * 0.3;
      }

      // Empirical confusion (already confused in practice)
      if (a.confusionPairs.includes(b.word) || b.confusionPairs.includes(a.word)) {
        types.push('empirical');
        severity += 0.5;
      }

      // Semantic overlap (same source/category)
      if (a.source && a.source === b.source) {
        types.push('semantic');
        severity += 0.2;
      }

      if (types.length > 0) {
        pairs.push({
          wordA: a.word,
          wordB: b.word,
          types,
          severity: Math.min(1, severity),
        });
      }
    }
  }

  // Sort by severity descending
  pairs.sort((a, b) => b.severity - a.severity);
  return pairs;
}

/**
 * Filter a word list to avoid co-scheduling interference pairs.
 * When both words of a pair appear, remove the one with the lower struggle score.
 *
 * @param {Array<{ word: string }>} wordList
 * @param {Array<{ wordA: string, wordB: string }>} interferencePairs
 * @param {object} vocabularyMastery
 * @returns {Array<{ word: string }>}
 */
export function filterSessionForInterference(wordList, interferencePairs, vocabularyMastery) {
  if (!interferencePairs || interferencePairs.length === 0) return wordList;

  const toRemove = new Set();
  const wordSet = new Set(wordList.map(w => w.word?.toLowerCase()));

  for (const pair of interferencePairs) {
    const aPresent = wordSet.has(pair.wordA.toLowerCase());
    const bPresent = wordSet.has(pair.wordB.toLowerCase());

    if (aPresent && bPresent) {
      // Remove the one with lower struggle score
      const aScore = vocabularyMastery[pair.wordA]?.struggle?.score || 0;
      const bScore = vocabularyMastery[pair.wordB]?.struggle?.score || 0;
      const toRemoveWord = aScore < bScore ? pair.wordA : pair.wordB;
      toRemove.add(toRemoveWord.toLowerCase());
    }
  }

  return wordList.filter(w => !toRemove.has(w.word?.toLowerCase()));
}

/**
 * Generate user-friendly alert for an interference pair.
 * @param {string} wordA
 * @param {string} wordB
 * @param {string[]} types
 * @returns {string}
 */
export function getInterferenceAlert(wordA, wordB, types) {
  const reasons = [];
  if (types.includes('orthographic')) reasons.push('look similar');
  if (types.includes('empirical')) reasons.push('you\'ve confused them before');
  if (types.includes('semantic')) reasons.push('have related meanings');
  return `"${wordA}" and "${wordB}" ${reasons.join(' and ')} — we'll practice them in separate sessions.`;
}

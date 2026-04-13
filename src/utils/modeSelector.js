/**
 * Mode Selector — picks the optimal review mode for each word based on
 * its error profile and recency of testing in different modes.
 *
 * Research: Transfer-appropriate processing means practice must match
 * the target use case. A word reviewed only as flashcards is retrievable
 * only in flashcard-like contexts. Cross-mode review creates multiple
 * retrieval pathways.
 */

const REVIEW_MODES = ['flashcard', 'listening', 'translation', 'typing'];

/**
 * Select the best review mode for a single word.
 *
 * @param {object} wordData - The word's vocabularyMastery entry
 * @param {object} opts
 * @param {boolean} opts.ttsEnabled - Whether TTS is available
 * @param {boolean} opts.hasMinimalPairs - Whether this word has minimal pair data
 * @returns {string} One of 'flashcard', 'listening', 'translation', 'typing', 'minimal-pairs'
 */
export function selectReviewMode(wordData, { ttsEnabled = true, hasMinimalPairs = false } = {}) {
  if (!wordData) return 'flashcard';

  const errors = wordData.recentErrors || [];
  const struggleCategories = wordData.struggle?.categories || [];
  const lastModeTested = wordData.lastModeTested || {};

  // 1. Check dominant error category
  if (errors.length >= 2 || struggleCategories.length > 0) {
    const typeCounts = {};
    for (const err of errors) {
      const t = err.type || 'unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
    for (const cat of struggleCategories) {
      typeCounts[cat] = (typeCounts[cat] || 0) + 2; // Weight struggle categories higher
    }

    const dominant = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    if (dominant === 'listening' && ttsEnabled) return 'listening';
    if (dominant === 'confusion' && ttsEnabled && hasMinimalPairs) return 'minimal-pairs';
    if (dominant === 'spelling') return 'typing';
    if (dominant === 'meaning') return 'translation';
  }

  // 2. Fall back to least-recently-used mode
  const availableModes = ttsEnabled
    ? ['flashcard', 'listening', 'translation', 'typing']
    : ['flashcard', 'translation', 'typing'];

  let lruMode = availableModes[0];
  let lruTime = Infinity;

  for (const mode of availableModes) {
    const lastUsed = lastModeTested[mode];
    const time = lastUsed ? new Date(lastUsed).getTime() : 0;
    if (time < lruTime) {
      lruTime = time;
      lruMode = mode;
    }
  }

  return lruMode;
}

/**
 * Assign review modes to a batch of review cards.
 * Ensures mode diversity within the session (no more than 40% in one mode).
 *
 * @param {Array<{ word: string, ...srsFields }>} reviewCards
 * @param {object} vocabularyMastery
 * @param {object} opts
 * @param {boolean} opts.ttsEnabled
 * @param {object} opts.minimalPairsLookup - Set of words that have minimal pair data
 * @returns {Array<{ ...card, reviewMode: string }>}
 */
export function assignReviewModes(reviewCards, vocabularyMastery, { ttsEnabled = true, minimalPairsLookup = new Set() } = {}) {
  const maxPerMode = Math.ceil(reviewCards.length * 0.4);
  const modeCounts = {};

  const assigned = reviewCards.map(card => {
    const wordData = vocabularyMastery[card.word] || {};
    let mode = selectReviewMode(wordData, {
      ttsEnabled,
      hasMinimalPairs: minimalPairsLookup.has(card.word.toLowerCase()),
    });

    // Cap per mode
    if ((modeCounts[mode] || 0) >= maxPerMode) {
      // Find the least-used available mode
      const availableModes = ttsEnabled
        ? ['flashcard', 'listening', 'translation', 'typing']
        : ['flashcard', 'translation', 'typing'];
      mode = availableModes.reduce((best, m) =>
        (modeCounts[m] || 0) < (modeCounts[best] || 0) ? m : best
      );
    }

    modeCounts[mode] = (modeCounts[mode] || 0) + 1;

    return { ...card, reviewMode: mode };
  });

  // Shuffle to interleave modes (don't cluster same modes)
  return interleaveModes(assigned);
}

/**
 * Reorder cards so consecutive cards have different review modes where possible.
 */
function interleaveModes(cards) {
  if (cards.length <= 2) return cards;

  const result = [];
  const remaining = [...cards];

  // Start with a random card
  const startIdx = Math.floor(Math.random() * remaining.length);
  result.push(remaining.splice(startIdx, 1)[0]);

  while (remaining.length > 0) {
    const prev = result[result.length - 1];
    // Find the best next card (different mode from previous)
    let bestIdx = 0;
    let bestScore = -1;

    for (let i = 0; i < remaining.length; i++) {
      let score = 0;
      if (remaining[i].reviewMode !== prev.reviewMode) score += 2;
      if (result.length >= 2 && remaining[i].reviewMode !== result[result.length - 2].reviewMode) score += 1;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    result.push(remaining.splice(bestIdx, 1)[0]);
  }

  return result;
}

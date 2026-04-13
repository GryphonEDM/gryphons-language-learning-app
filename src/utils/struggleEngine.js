/**
 * Struggle Words Engine — identifies and tracks words the learner struggles with.
 * Pure functions, no React dependencies. Follows srs.js pattern.
 */

const MS_PER_DAY = 86400000;
const MAX_RECENT_ERRORS = 10;
const STRUGGLE_THRESHOLD = 0.25;
const GRADUATION_THRESHOLD = 0.25;
const CONFUSION_MIN_COUNT = 2;
const CONFUSION_WINDOW_DAYS = 30;

// --- Levenshtein distance (for spelling classification) ---

function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// --- Error Classification ---

/**
 * Classify an error into a category based on available context.
 * @param {object} params
 * @param {string} params.mode - The learning mode where the error occurred
 * @param {string} [params.userAnswer] - What the user typed/chose
 * @param {string} [params.expected] - The correct answer
 * @param {string} [params.confusedWith] - Another word (e.g. from MinimalPairs)
 * @param {string} [params.errorType] - Pre-classified type from the mode
 * @returns {'spelling'|'confusion'|'listening'|'meaning'|'grammar'|'unknown'}
 */
export function classifyError({ mode, userAnswer, expected, confusedWith, errorType }) {
  if (errorType) return errorType;
  if (confusedWith) return 'confusion';
  if (mode === 'listening' || mode === 'speech' || mode === 'minimal-pairs') return 'listening';
  if (mode === 'sentences' || mode === 'grammar') return 'grammar';

  if (userAnswer && expected) {
    const dist = levenshtein(userAnswer.toLowerCase(), expected.toLowerCase());
    if (dist > 0 && dist <= 2) return 'spelling';
  }

  if (mode === 'translation' || mode === 'flashcards' || mode === 'daily-review') return 'meaning';
  return 'unknown';
}

// --- Error Recording ---

/**
 * Append an error to a word's recentErrors ring buffer (immutable).
 * @param {object} wordData - Current word mastery data
 * @param {object} errorEntry - { ts, mode, type, userAnswer, expected, confusedWith, responseMs }
 * @returns {object} New wordData with error appended
 */
export function addErrorToWord(wordData, errorEntry) {
  const existing = wordData.recentErrors || [];
  const updated = [...existing, errorEntry];
  // Keep only the most recent MAX_RECENT_ERRORS entries
  const trimmed = updated.length > MAX_RECENT_ERRORS
    ? updated.slice(updated.length - MAX_RECENT_ERRORS)
    : updated;
  return { ...wordData, recentErrors: trimmed };
}

/**
 * Update rolling average response time (immutable).
 * @param {object} wordData
 * @param {number} responseMs
 * @returns {object} Updated wordData
 */
export function updateResponseTime(wordData, responseMs) {
  if (!responseMs || responseMs <= 0) return wordData;
  const prevAvg = wordData.avgResponseMs || 0;
  const prevCount = wordData.responseCount || 0;
  const newCount = prevCount + 1;
  const newAvg = (prevAvg * prevCount + responseMs) / newCount;
  return { ...wordData, avgResponseMs: Math.round(newAvg), responseCount: newCount };
}

// --- Struggle Score ---

/**
 * Compute a struggle score for a single word (0-1, higher = more struggle).
 * Returns 0 for words with fewer than 2 total attempts.
 * @param {object} wordData - Full mastery data for this word
 * @param {number} [now=Date.now()] - Current time
 * @returns {number} 0-1
 */
export function computeStruggleScore(wordData, now = Date.now()) {
  const {
    timesCorrect = 0, timesWrong = 0,
    recentErrors = [], modesUsed = [],
    lapses = 0, stability = 0, difficulty = 0.3,
    avgResponseMs = null
  } = wordData || {};

  const totalAttempts = timesCorrect + timesWrong;
  if (totalAttempts < 2) return 0;

  // Signal 1: Error rate — weighted toward recent (14 day window)
  const recentWindow = recentErrors.filter(e => now - e.ts < 14 * MS_PER_DAY);
  const recentErrorRate = recentWindow.length > 0
    ? recentWindow.length / Math.max(recentWindow.length + 1, 3)
    : 0;
  const overallErrorRate = timesWrong / totalAttempts;
  const errorSignal = recentErrorRate * 0.7 + overallErrorRate * 0.3;

  // Signal 2: SRS lapse rate (high lapses = keeps forgetting)
  const lapseSignal = Math.min(1, lapses / 5);

  // Signal 3: Low stability (SRS thinks this card is fragile)
  const stabilitySignal = stability > 0 ? Math.max(0, 1 - stability / 21) : 0.5;

  // Signal 4: High SRS difficulty
  const difficultySignal = difficulty;

  // Signal 5: Cross-mode failure (errors in 2+ modes = deeper issue)
  const errorModes = new Set(recentWindow.map(e => e.mode));
  const crossModeSignal = Math.min(1, errorModes.size / 3);

  // Signal 6: Slow response time (hesitation = uncertainty)
  const responseSignal = avgResponseMs
    ? Math.min(1, Math.max(0, (avgResponseMs - 3000) / 12000))
    : 0;

  const score =
    errorSignal      * 0.30 +
    lapseSignal      * 0.20 +
    stabilitySignal  * 0.15 +
    difficultySignal * 0.10 +
    crossModeSignal  * 0.15 +
    responseSignal   * 0.10;

  return Math.min(1, Math.max(0, score));
}

// --- Struggle Categorization ---

/**
 * Return the dominant error categories for a word.
 * @param {object} wordData
 * @returns {string[]} e.g. ['spelling', 'listening']
 */
export function categorizeStruggle(wordData) {
  const errors = wordData?.recentErrors || [];
  if (errors.length === 0) return [];

  const counts = {};
  for (const e of errors) {
    counts[e.type] = (counts[e.type] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type)
    .filter(t => t !== 'unknown');
}

// --- Graduation ---

/**
 * Check if a word should graduate out of the struggle list.
 * Requires: score below threshold, last 3 attempts correct in past 14 days, reviewed in 2+ modes since last error.
 * @param {object} wordData
 * @param {number} [now=Date.now()]
 * @returns {boolean}
 */
export function shouldGraduate(wordData, now = Date.now()) {
  const score = computeStruggleScore(wordData, now);
  if (score >= GRADUATION_THRESHOLD) return false;

  const {
    timesCorrect = 0, timesWrong = 0,
    recentErrors = [], modesUsed = [],
    lastReviewed
  } = wordData || {};

  if (timesCorrect + timesWrong < 4) return false;

  // Last error must be > 3 days ago
  const lastError = recentErrors.length > 0 ? recentErrors[recentErrors.length - 1] : null;
  if (lastError && now - lastError.ts < 3 * MS_PER_DAY) return false;

  // Must have been reviewed recently (within 14 days)
  if (!lastReviewed) return false;
  const lastReviewTime = new Date(lastReviewed).getTime();
  if (now - lastReviewTime > 14 * MS_PER_DAY) return false;

  // Need at least 2 modes used overall
  if ((modesUsed || []).length < 2) return false;

  // Recent record should show improvement: more correct than wrong in last few
  const recentRatio = timesCorrect / (timesCorrect + timesWrong);
  if (recentRatio < 0.7) return false;

  return true;
}

// --- Struggle Word Lists ---

/**
 * Get all current struggle words, sorted by score descending.
 * @param {object} vocabularyMastery - Full mastery object
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.25] - Minimum score to qualify
 * @param {number} [opts.limit=50] - Max words to return
 * @param {number} [opts.now=Date.now()]
 * @returns {Array<{ word: string, score: number, categories: string[], confusionPairs: string[], ...wordData }>}
 */
export function getStruggleWords(vocabularyMastery, opts = {}) {
  const { threshold = STRUGGLE_THRESHOLD, limit = 50, now = Date.now() } = opts;
  const results = [];

  for (const [word, data] of Object.entries(vocabularyMastery || {})) {
    // Skip if manually graduated and score is still low
    if (data.struggle?.graduated) {
      const currentScore = computeStruggleScore(data, now);
      if (currentScore < threshold) continue;
      // If score rose again, un-graduate (handled by caller via recomputeStruggle)
    }

    const score = computeStruggleScore(data, now);
    if (score >= threshold) {
      const categories = categorizeStruggle(data);
      const confusionPairs = (data.recentErrors || [])
        .filter(e => e.confusedWith)
        .map(e => e.confusedWith);
      const uniquePairs = [...new Set(confusionPairs)];

      results.push({
        word,
        score,
        categories,
        confusionPairs: uniquePairs,
        ...data,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Detect confusion pairs across all vocabulary.
 * Two words are a pair if either has been confused with the other 2+ times in the last 30 days.
 * @param {object} vocabularyMastery
 * @param {number} [now=Date.now()]
 * @returns {Array<{ wordA: string, wordB: string, count: number }>}
 */
export function getConfusionPairs(vocabularyMastery, now = Date.now()) {
  const pairCounts = {};
  const cutoff = now - CONFUSION_WINDOW_DAYS * MS_PER_DAY;

  for (const [word, data] of Object.entries(vocabularyMastery || {})) {
    for (const err of (data.recentErrors || [])) {
      if (!err.confusedWith || err.ts < cutoff) continue;
      // Normalize pair key (alphabetical order)
      const pair = [word, err.confusedWith].sort();
      const key = pair.join('|');
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    }
  }

  return Object.entries(pairCounts)
    .filter(([, count]) => count >= CONFUSION_MIN_COUNT)
    .map(([key, count]) => {
      const [wordA, wordB] = key.split('|');
      return { wordA, wordB, count };
    })
    .sort((a, b) => b.count - a.count);
}

// --- Recompute Struggle Cache ---

/**
 * Recompute the cached struggle analysis for a single word.
 * @param {object} wordData
 * @param {number} [now=Date.now()]
 * @returns {object} The struggle sub-object
 */
export function recomputeStruggle(wordData, now = Date.now()) {
  const score = computeStruggleScore(wordData, now);
  const categories = categorizeStruggle(wordData);
  const confusionPairs = [...new Set(
    (wordData.recentErrors || [])
      .filter(e => e.confusedWith)
      .map(e => e.confusedWith)
  )];
  const graduated = score < GRADUATION_THRESHOLD && shouldGraduate(wordData, now);

  return {
    score,
    categories,
    confusionPairs,
    lastUpdated: now,
    graduated,
  };
}

// --- AI Tutor Context ---

/**
 * Build a concise text summary of struggle words for injection into AI system prompts.
 * @param {object} vocabularyMastery
 * @param {number} [limit=8] - Max words to include
 * @returns {string|null} Text block, or null if no struggle words
 */
export function buildStruggleContext(vocabularyMastery, limit = 8) {
  const struggles = getStruggleWords(vocabularyMastery, { limit });
  if (struggles.length === 0) return null;

  const lines = struggles.map(s => {
    const parts = [`"${s.word}"`];
    if (s.en) parts.push(`(${s.en})`);
    const details = [];
    if (s.categories.length > 0) details.push(s.categories.join('/') + ' difficulty');
    if (s.confusionPairs.length > 0) details.push(`confused with: ${s.confusionPairs.join(', ')}`);
    if (s.score >= 0.7) details.push('high struggle');
    if (details.length > 0) parts.push('— ' + details.join('; '));
    return '- ' + parts.join(' ');
  });

  return lines.join('\n');
}

// --- Drill Session Builder ---

/**
 * Build a targeted drill session from struggle words.
 * Items are interleaved by drill type for optimal learning.
 * @param {object} vocabularyMastery
 * @param {object} [opts]
 * @param {number} [opts.limit=10] - Max items
 * @param {string[]} [opts.focusWords] - Specific words to drill (overrides auto-selection)
 * @returns {Array<{ type: string, word: string, wordData: object, pairWord?: string }>}
 */
export function buildStruggleDrillSession(vocabularyMastery, opts = {}) {
  const { limit = 10, focusWords } = opts;

  let struggles;
  if (focusWords && focusWords.length > 0) {
    struggles = focusWords
      .filter(w => vocabularyMastery[w])
      .map(w => ({
        word: w,
        score: computeStruggleScore(vocabularyMastery[w]),
        categories: categorizeStruggle(vocabularyMastery[w]),
        confusionPairs: [...new Set(
          (vocabularyMastery[w].recentErrors || [])
            .filter(e => e.confusedWith)
            .map(e => e.confusedWith)
        )],
        ...vocabularyMastery[w],
      }));
  } else {
    struggles = getStruggleWords(vocabularyMastery, { limit: limit * 2 });
  }

  const items = [];

  for (const s of struggles) {
    if (items.length >= limit) break;
    const dominant = s.categories[0] || 'meaning';

    switch (dominant) {
      case 'spelling':
        items.push({ type: 'spelling', word: s.word, wordData: s });
        break;
      case 'confusion':
        items.push({
          type: 'confusion',
          word: s.word,
          wordData: s,
          pairWord: s.confusionPairs[0] || null,
        });
        break;
      case 'listening':
        items.push({ type: 'listening', word: s.word, wordData: s });
        break;
      case 'grammar':
        items.push({ type: 'meaning', word: s.word, wordData: s });
        break;
      default:
        items.push({ type: 'meaning', word: s.word, wordData: s });
    }
  }

  // Interleave by type — don't cluster same drill types together
  return interleave(items);
}

/**
 * Interleave items so that consecutive items have different drill types when possible.
 */
function interleave(items) {
  if (items.length <= 2) return items;

  const byType = {};
  for (const item of items) {
    (byType[item.type] = byType[item.type] || []).push(item);
  }

  const queues = Object.values(byType).sort((a, b) => b.length - a.length);
  const result = [];
  let lastType = null;

  while (queues.some(q => q.length > 0)) {
    let placed = false;
    // Try to pick a queue with a different type than the last placed item
    for (const queue of queues) {
      if (queue.length > 0 && queue[0].type !== lastType) {
        const item = queue.shift();
        result.push(item);
        lastType = item.type;
        placed = true;
        break;
      }
    }
    // If all remaining are same type, just take from longest queue
    if (!placed) {
      for (const queue of queues) {
        if (queue.length > 0) {
          const item = queue.shift();
          result.push(item);
          lastType = item.type;
          break;
        }
      }
    }
    // Re-sort queues by length
    queues.sort((a, b) => b.length - a.length);
  }

  return result;
}

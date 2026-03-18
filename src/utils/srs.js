/**
 * Spaced Repetition System (SRS) — simplified FSRS-inspired algorithm
 * Pure functions, no React dependencies.
 */

// --- Constants ---

const INITIAL_STABILITY = {
  again: 0.4,   // ~10 hours
  hard:  1.0,   // 1 day
  good:  2.5,   // 2.5 days
  easy:  5.0,   // 5 days
};

const INITIAL_DIFFICULTY = 0.3;
const STABILITY_GROWTH = 1.9;
const MINIMUM_STABILITY = 0.1;    // ~2.4 hours floor
const LAPSE_MULTIPLIER = 0.5;
const EASY_BONUS = 1.3;
const HARD_PENALTY = 0.8;
const MAX_INTERVAL = 365;  // Cap at 1 year

const DIFFICULTY_DELTA = {
  again: 0.15,
  hard:  0.05,
  good: -0.02,
  easy: -0.08,
};

const MS_PER_DAY = 86400000;

// --- Core Functions ---

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Returns default SRS fields for a new card.
 */
export function initSRSCard() {
  return {
    stability: 0,
    difficulty: INITIAL_DIFFICULTY,
    nextReview: null,
    interval: 0,
    reps: 0,
    lapses: 0,
    lastRating: null,
  };
}

/**
 * Core scheduling function. Takes current card state + rating, returns updated SRS fields.
 * @param {object} card - Current SRS fields (or partial — missing fields treated as new card)
 * @param {'again'|'hard'|'good'|'easy'} rating
 * @param {number} now - Current timestamp in ms (default: Date.now())
 * @returns {object} Updated SRS fields (stability, difficulty, nextReview, interval, reps, lapses, lastRating)
 */
export function reviewCard(card, rating, now = Date.now()) {
  const reps = card.reps || 0;
  const currentDifficulty = card.difficulty ?? INITIAL_DIFFICULTY;
  const currentStability = card.stability || 0;
  const currentLapses = card.lapses || 0;

  let stability, difficulty, newReps, lapses;

  if (reps === 0) {
    // First review (new card or lapsed card restarting)
    stability = INITIAL_STABILITY[rating] || INITIAL_STABILITY.good;
    difficulty = clamp(currentDifficulty + (DIFFICULTY_DELTA[rating] || 0), 0.1, 1.0);
    newReps = 1; // Always advance to reps=1 after first review, even on failure
    lapses = rating === 'again' ? currentLapses + 1 : currentLapses;
  } else {
    // Subsequent review
    if (rating === 'again') {
      // Lapse: drastically reduce stability
      stability = Math.max(
        MINIMUM_STABILITY,
        currentStability * LAPSE_MULTIPLIER * (1 - currentDifficulty * 0.5)
      );
      difficulty = clamp(currentDifficulty + DIFFICULTY_DELTA.again, 0.1, 1.0);
      newReps = 0;
      lapses = currentLapses + 1;
    } else {
      // Success: grow stability
      let growthFactor = 1.0 + (STABILITY_GROWTH - 1.0) * (1.1 - currentDifficulty);
      if (rating === 'hard') growthFactor *= HARD_PENALTY;
      if (rating === 'easy') growthFactor *= EASY_BONUS;

      stability = currentStability * growthFactor;
      difficulty = clamp(currentDifficulty + (DIFFICULTY_DELTA[rating] || 0), 0.1, 1.0);
      newReps = reps + 1;
      lapses = currentLapses;
    }
  }

  const interval = Math.min(stability, MAX_INTERVAL);
  const nextReview = new Date(now + interval * MS_PER_DAY).toISOString();

  return {
    stability,
    difficulty,
    nextReview,
    interval,
    reps: newReps,
    lapses,
    lastRating: rating,
  };
}

/**
 * Returns words due for review, sorted by urgency (most overdue first).
 * @param {object} vocabularyMastery - The full mastery object { [word]: { ...srsFields } }
 * @param {number} now - Current timestamp in ms
 * @returns {Array<{ word: string, overdueDays: number, ...srsFields }>}
 */
export function getDueCards(vocabularyMastery, now = Date.now()) {
  const due = [];
  for (const [word, data] of Object.entries(vocabularyMastery || {})) {
    if (!data.nextReview) continue;
    const reviewTime = new Date(data.nextReview).getTime();
    if (reviewTime <= now) {
      due.push({
        word,
        ...data,
        overdueDays: (now - reviewTime) / MS_PER_DAY,
      });
    }
  }
  // Most overdue first, then fragile cards (lower stability) first
  due.sort((a, b) => b.overdueDays - a.overdueDays || a.stability - b.stability);
  return due;
}

/**
 * Returns words that have never been reviewed (not in vocabularyMastery).
 * @param {string[]} allWords - All available words
 * @param {object} vocabularyMastery - Current mastery data
 * @param {number} limit - Max words to return
 * @returns {string[]}
 */
export function getNewCards(allWords, vocabularyMastery, limit = 20) {
  const mastered = vocabularyMastery || {};
  return allWords.filter(w => !mastered[w]).slice(0, limit);
}

/**
 * Returns summary stats for the SRS state.
 * @param {object} vocabularyMastery
 * @param {number} now
 * @returns {{ due: number, learning: number, mature: number, total: number }}
 */
export function getReviewStats(vocabularyMastery, now = Date.now()) {
  let due = 0, learning = 0, mature = 0, total = 0;
  for (const data of Object.values(vocabularyMastery || {})) {
    if (!data.nextReview) continue;
    total++;
    if (data.stability >= 21) {
      mature++;
    } else {
      learning++;
    }
    if (new Date(data.nextReview).getTime() <= now) {
      due++;
    }
  }
  return { due, learning, mature, total };
}

/**
 * Returns the earliest upcoming review time (for "next review in ~Xh" display).
 * @param {object} vocabularyMastery
 * @param {number} now
 * @returns {number|null} Hours until next review, or null if no scheduled reviews
 */
export function getNextDueHours(vocabularyMastery, now = Date.now()) {
  let earliest = Infinity;
  for (const data of Object.values(vocabularyMastery || {})) {
    if (!data.nextReview) continue;
    const reviewTime = new Date(data.nextReview).getTime();
    if (reviewTime > now && reviewTime < earliest) {
      earliest = reviewTime;
    }
  }
  if (earliest === Infinity) return null;
  return Math.round((earliest - now) / (1000 * 60 * 60));
}

/**
 * Formats an interval in days to a human-readable string.
 * @param {number} days
 * @returns {string}
 */
export function formatInterval(days) {
  if (days < 1 / 24) return '< 1 min';
  if (days < 1) return `~${Math.round(days * 24)} hours`;
  if (days < 1.5) return '~1 day';
  if (days < 30) return `~${Math.round(days)} days`;
  if (days < 365) return `~${Math.round(days / 30)} months`;
  return '~1 year';
}

/**
 * Maps a binary correct/wrong result (+ optional response time) to a 4-point SRS rating.
 * @param {boolean} correct
 * @param {number|null} responseTimeMs - Optional: time taken to answer
 * @returns {'again'|'hard'|'good'|'easy'}
 */
export function mapCorrectToRating(correct, responseTimeMs = null) {
  if (!correct) return 'again';
  if (responseTimeMs === null) return 'good';
  if (responseTimeMs < 3000) return 'easy';
  if (responseTimeMs > 15000) return 'hard';
  return 'good';
}

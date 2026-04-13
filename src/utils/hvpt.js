/**
 * High Variability Phonetic Training (HVPT) — adaptive difficulty for minimal pairs.
 *
 * Research: Meta-analysis of 79 studies shows 10-15% accuracy improvement.
 * Key: multiple speakers, multiple contexts, trial-by-trial feedback,
 * adaptive difficulty (retire mastered contrasts, intensify weak ones).
 */

const MASTERY_THRESHOLD = 0.85;  // >85% accuracy over 20+ trials = mastered
const STRUGGLE_THRESHOLD = 0.60; // <60% accuracy = needs more practice
const MIN_TRIALS = 5;            // Minimum trials before making adaptive decisions

/**
 * Track per-contrast accuracy and compute adaptive recommendations.
 *
 * @param {object} contrastAccuracy - { [categoryId]: { correct: number, total: number } }
 * @returns {object} Adaptive state per category
 */
export function computeAdaptiveState(contrastAccuracy) {
  const state = {};

  for (const [catId, data] of Object.entries(contrastAccuracy || {})) {
    const accuracy = data.total > 0 ? data.correct / data.total : 0;
    const hasEnoughData = data.total >= MIN_TRIALS;

    let status;
    if (!hasEnoughData) {
      status = 'learning';
    } else if (accuracy >= MASTERY_THRESHOLD) {
      status = 'mastered';
    } else if (accuracy < STRUGGLE_THRESHOLD) {
      status = 'struggling';
    } else {
      status = 'learning';
    }

    state[catId] = {
      accuracy: Math.round(accuracy * 100),
      total: data.total,
      correct: data.correct,
      status,
    };
  }

  return state;
}

/**
 * Select pairs for the next round using adaptive difficulty.
 * Struggling categories get more pairs; mastered ones get fewer.
 *
 * @param {Array} allPairs - All available minimal pairs for the language
 * @param {object} contrastAccuracy - Per-category accuracy data
 * @param {number} count - Target number of pairs
 * @returns {Array} Selected pairs, weighted toward struggling categories
 */
export function selectAdaptivePairs(allPairs, contrastAccuracy, count = 10) {
  if (!allPairs || allPairs.length === 0) return [];

  const state = computeAdaptiveState(contrastAccuracy);

  // Group pairs by category
  const byCategory = {};
  for (const pair of allPairs) {
    const cat = pair.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(pair);
  }

  const categories = Object.keys(byCategory);
  if (categories.length === 0) return allPairs.slice(0, count);

  // Assign weights: struggling = 3x, learning = 2x, mastered = 0.5x, unknown = 1x
  const weights = {};
  let totalWeight = 0;
  for (const cat of categories) {
    const catState = state[cat];
    if (!catState || catState.total < MIN_TRIALS) {
      weights[cat] = 1.0;
    } else if (catState.status === 'struggling') {
      weights[cat] = 3.0;
    } else if (catState.status === 'learning') {
      weights[cat] = 2.0;
    } else {
      weights[cat] = 0.5; // mastered — still include some for maintenance
    }
    totalWeight += weights[cat];
  }

  // Allocate pairs per category proportionally
  const selected = [];
  for (const cat of categories) {
    const proportion = weights[cat] / totalWeight;
    const catCount = Math.max(1, Math.round(proportion * count));
    const shuffled = [...byCategory[cat]].sort(() => Math.random() - 0.5);
    selected.push(...shuffled.slice(0, catCount));
  }

  // Shuffle final selection and trim to count
  return selected.sort(() => Math.random() - 0.5).slice(0, count);
}

/**
 * Get a display-friendly summary of contrast mastery.
 *
 * @param {object} contrastAccuracy
 * @param {Array} categories - Language's category definitions [{id, name, icon}]
 * @returns {Array<{ id, name, icon, accuracy, status, total }>}
 */
export function getContrastSummary(contrastAccuracy, categories) {
  const state = computeAdaptiveState(contrastAccuracy);
  return (categories || []).map(cat => ({
    ...cat,
    accuracy: state[cat.id]?.accuracy || 0,
    status: state[cat.id]?.status || 'unknown',
    total: state[cat.id]?.total || 0,
  }));
}

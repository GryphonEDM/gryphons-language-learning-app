/**
 * Success Rate Calibration — tracks rolling accuracy and computes
 * difficulty adjustments to keep the learner in the 70-85% zone
 * of proximal learning.
 *
 * Research: Below 60% accuracy = frustration (undesirable difficulty).
 * Above 90% = not learning (too easy). 70-85% is the sweet spot where
 * desirable difficulties produce maximum durable learning.
 */

const WINDOW_SIZE = 20;
const ZONE_TOO_HARD = 0.60;
const ZONE_OPTIMAL_LOW = 0.70;
const ZONE_OPTIMAL_HIGH = 0.85;
const ZONE_TOO_EASY = 0.90;
const LOCKOUT_ITEMS = 10; // Don't re-adjust for this many items after a change

/**
 * Create initial calibration state.
 * @returns {object}
 */
export function initCalibration() {
  return {
    rollingWindow: [],     // last N results (1 = correct, 0 = wrong)
    rollingAccuracy: null, // 0-1, null until enough data
    difficultyZone: 'unknown', // 'too-hard' | 'optimal' | 'too-easy' | 'unknown'
    adjustments: {
      cefrShift: 0,          // -1, 0, or +1
      batchSizeMultiplier: 1.0,
      hintAvailability: true,
      playbackRateAdjust: 0, // added to base playback rate
      newCardMultiplier: 1.0,
    },
    itemsSinceAdjust: 0,
    totalItems: 0,
  };
}

/**
 * Update calibration with a new result.
 * @param {object} current - Current calibration state
 * @param {boolean} correct - Whether the user got it right
 * @returns {object} Updated calibration state
 */
export function updateCalibration(current, correct) {
  const window = [...current.rollingWindow, correct ? 1 : 0];
  if (window.length > WINDOW_SIZE) window.shift();

  const sum = window.reduce((a, b) => a + b, 0);
  const accuracy = window.length >= 5 ? sum / window.length : null;
  const totalItems = current.totalItems + 1;
  const itemsSinceAdjust = current.itemsSinceAdjust + 1;

  let zone = current.difficultyZone;
  let adjustments = { ...current.adjustments };

  if (accuracy !== null) {
    // Determine zone
    if (accuracy < ZONE_TOO_HARD) {
      zone = 'too-hard';
    } else if (accuracy < ZONE_OPTIMAL_LOW) {
      zone = 'borderline-hard';
    } else if (accuracy <= ZONE_OPTIMAL_HIGH) {
      zone = 'optimal';
    } else if (accuracy <= ZONE_TOO_EASY) {
      zone = 'borderline-easy';
    } else {
      zone = 'too-easy';
    }

    // Apply adjustments only after lockout period
    if (itemsSinceAdjust >= LOCKOUT_ITEMS) {
      if (zone === 'too-hard') {
        adjustments = {
          cefrShift: Math.max(-1, current.adjustments.cefrShift - 1),
          batchSizeMultiplier: 0.7,
          hintAvailability: true,
          playbackRateAdjust: -0.15,
          newCardMultiplier: 0.5,
        };
        return { rollingWindow: window, rollingAccuracy: accuracy, difficultyZone: zone, adjustments, itemsSinceAdjust: 0, totalItems };
      } else if (zone === 'too-easy') {
        adjustments = {
          cefrShift: Math.min(1, current.adjustments.cefrShift + 1),
          batchSizeMultiplier: 1.3,
          hintAvailability: false,
          playbackRateAdjust: 0.1,
          newCardMultiplier: 1.5,
        };
        return { rollingWindow: window, rollingAccuracy: accuracy, difficultyZone: zone, adjustments, itemsSinceAdjust: 0, totalItems };
      } else if (zone === 'optimal') {
        // Reset to neutral adjustments gradually
        adjustments = {
          cefrShift: 0,
          batchSizeMultiplier: 1.0,
          hintAvailability: true,
          playbackRateAdjust: 0,
          newCardMultiplier: 1.0,
        };
      }
    }
  }

  return {
    rollingWindow: window,
    rollingAccuracy: accuracy,
    difficultyZone: zone,
    adjustments,
    itemsSinceAdjust,
    totalItems,
  };
}

/**
 * Get a display-friendly zone indicator.
 * @param {string} zone
 * @returns {{ label: string, color: string }}
 */
export function getZoneDisplay(zone) {
  switch (zone) {
    case 'too-hard':
      return { label: 'Too Hard', color: '#f87171' };
    case 'borderline-hard':
      return { label: 'Challenging', color: '#fbbf24' };
    case 'optimal':
      return { label: 'Optimal', color: '#4ade80' };
    case 'borderline-easy':
      return { label: 'Getting Easy', color: '#4dabf7' };
    case 'too-easy':
      return { label: 'Too Easy', color: '#4dabf7' };
    default:
      return { label: 'Calibrating', color: 'rgba(255,255,255,0.4)' };
  }
}

/**
 * Adjust a CEFR level by a shift value.
 * @param {string} currentCefr - e.g., 'A2'
 * @param {number} shift - -1, 0, or 1
 * @returns {string}
 */
export function adjustCefr(currentCefr, shift) {
  const levels = ['A1', 'A2', 'B1', 'B2'];
  const idx = levels.indexOf(currentCefr);
  if (idx < 0) return currentCefr;
  const newIdx = Math.max(0, Math.min(levels.length - 1, idx + shift));
  return levels[newIdx];
}

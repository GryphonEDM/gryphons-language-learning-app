/**
 * Daily Review session builder — pure functions, no React.
 * Assembles a personalized session from SRS state + vocabulary data.
 */
import { getDueCards, getNewCards, getReviewStats } from './srs.js';
import { getAllVocabularyWords } from './dictionaryBuilder.js';
import { MINIMAL_PAIRS } from '../data/minimalPairs.js';
import { computeStruggleScore, getStruggleWords } from './struggleEngine.js';
import { assignReviewModes } from './modeSelector.js';
import { getDueChunks, getChunkText, isChunk } from './chunkManager.js';
import { detectInterference, filterSessionForInterference } from './interferenceDetector.js';

// Base limits (adjusted by time-of-day)
const BASE_MAX_REVIEWS = 20;
const BASE_MAX_NEW_CARDS = 5;
const DAILY_NEW_CAP = 10;
const EXERCISE_ITEMS = 5;

/**
 * Time-of-day profiles for session composition.
 * Research: New vocabulary before sleep consolidates better (sleep consolidation).
 * Morning reviews leverage overnight consolidation.
 */
const TIME_PROFILES = {
  morning:   { maxReview: 25, maxNew: 2,  label: 'Morning Review Focus' },
  afternoon: { maxReview: 20, maxNew: 5,  label: 'Balanced Practice' },
  evening:   { maxReview: 10, maxNew: 8,  label: 'New Vocabulary Focus' },
};

function getTimeProfile(hour) {
  if (hour === null || hour === undefined) return TIME_PROFILES.afternoon;
  if (hour < 12) return TIME_PROFILES.morning;
  if (hour < 19) return TIME_PROFILES.afternoon;
  return TIME_PROFILES.evening;
}

/**
 * Build a lookup map from word text → full word object.
 */
function buildWordLookup(allWords, langCode) {
  const targetField = langCode === 'en' ? 'en' : langCode;
  const map = {};
  for (const w of allWords) {
    const key = (w[targetField] || w.uk || '').toLowerCase();
    if (key) map[key] = w;
  }
  return map;
}

/**
 * Enrich an SRS due card with vocabulary data (translation, phonetic, examples).
 */
function enrichCard(dueCard, lookup) {
  const wordObj = lookup[dueCard.word.toLowerCase()];
  if (!wordObj) return null; // orphaned — skip
  return {
    ...dueCard,
    en: wordObj.en || '',
    phonetic: wordObj.phonetic || '',
    source: wordObj.source || '',
    difficulty: wordObj.difficulty || 'B2',
    examples: wordObj.examples || [],
    examplesEn: wordObj.examplesEn || [],
  };
}

/**
 * Get today's date string (YYYY-MM-DD) in user's local timezone.
 */
export function getTodayStr() {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Get yesterday's date string.
 */
export function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA');
}

/**
 * Build the daily review session plan.
 * @param {object} params
 * @param {object} params.vocabularyMastery - Current mastery data with SRS fields
 * @param {object} params.modeProgress - Progress data for all modes
 * @param {string} params.langCode - Current language code
 * @param {boolean} params.ttsEnabled - Whether TTS is available
 * @returns {object} Session plan
 */
export function buildDailySession({ vocabularyMastery, modeProgress, langCode, ttsEnabled, calibration }) {
  const allWords = getAllVocabularyWords(langCode);
  const lookup = buildWordLookup(allWords, langCode);
  const targetField = langCode === 'en' ? 'en' : langCode;
  const allWordKeys = allWords.map(w => (w[targetField] || w.uk || ''));

  const now = Date.now();
  const currentHour = new Date(now).getHours();
  const stats = getReviewStats(vocabularyMastery, now);
  const today = getTodayStr();
  const dailyProgress = modeProgress['daily-review'] || {};

  // --- Time-of-day optimization ---
  const timeProfile = getTimeProfile(currentHour);
  let MAX_REVIEWS = timeProfile.maxReview;
  let MAX_NEW_CARDS = timeProfile.maxNew;

  // Apply calibration adjustments if available
  if (calibration?.adjustments) {
    MAX_NEW_CARDS = Math.max(1, Math.round(MAX_NEW_CARDS * (calibration.adjustments.newCardMultiplier || 1)));
  }

  // --- Review cards (struggle words prioritized) ---
  const dueRaw = getDueCards(vocabularyMastery, now);
  // Sort: struggle words (score >= 0.5) first, then by overdue
  dueRaw.sort((a, b) => {
    const aStruggle = computeStruggleScore(vocabularyMastery[a.word] || {}, now);
    const bStruggle = computeStruggleScore(vocabularyMastery[b.word] || {}, now);
    if (aStruggle >= 0.5 && bStruggle < 0.5) return -1;
    if (bStruggle >= 0.5 && aStruggle < 0.5) return 1;
    return b.overdueDays - a.overdueDays;
  });
  const reviewCards = [];
  for (const card of dueRaw) {
    if (reviewCards.length >= MAX_REVIEWS) break;
    const enriched = enrichCard(card, lookup);
    if (enriched) reviewCards.push(enriched);
  }
  const remainingDue = Math.max(0, dueRaw.length - reviewCards.length);

  // --- Include due chunks (max 5) ---
  const dueChunks = getDueChunks(vocabularyMastery, now, 5);
  for (const chunk of dueChunks) {
    if (reviewCards.length >= MAX_REVIEWS) break;
    reviewCards.push({
      ...chunk,
      en: chunk.en || '',
      phonetic: chunk.phonetic || '',
      source: 'chunk',
      difficulty: chunk.difficulty || 'A2',
      examples: chunk.examples || [],
      examplesEn: [],
      isChunk: true,
      displayText: getChunkText(chunk.word),
    });
  }

  // --- Cross-mode review assignment ---
  // Build lookup of words that have minimal pair data
  const minimalPairsLookup = new Set();
  const langPairs = MINIMAL_PAIRS[langCode]?.pairs || [];
  for (const pair of langPairs) {
    if (pair.wordA) minimalPairsLookup.add(pair.wordA.toLowerCase());
    if (pair.wordB) minimalPairsLookup.add(pair.wordB.toLowerCase());
  }
  const reviewCardsWithModes = assignReviewModes(reviewCards, vocabularyMastery, {
    ttsEnabled,
    minimalPairsLookup,
  });

  // --- Interference filtering ---
  const interferencePairs = detectInterference(vocabularyMastery);
  const filteredReviewCards = filterSessionForInterference(reviewCardsWithModes, interferencePairs, vocabularyMastery);

  // --- New cards ---
  let newCards = [];
  const reviewWordSet = new Set(filteredReviewCards.map(c => c.word.toLowerCase()));

  if (reviewCardsWithModes.length < MAX_REVIEWS) {
    // Check daily cap
    const usedToday = (dailyProgress.newCardsDate === today) ? (dailyProgress.newCardsToday || 0) : 0;
    const remaining = Math.max(0, DAILY_NEW_CAP - usedToday);
    const limit = Math.min(MAX_NEW_CARDS, remaining);

    if (limit > 0) {
      const newWordKeys = getNewCards(allWordKeys, vocabularyMastery, limit * 3); // get extras for filtering
      for (const key of newWordKeys) {
        if (newCards.length >= limit) break;
        if (reviewWordSet.has(key.toLowerCase())) continue;
        const wordObj = lookup[key.toLowerCase()];
        if (wordObj) {
          newCards.push({
            word: key,
            en: wordObj.en || '',
            phonetic: wordObj.phonetic || '',
            source: wordObj.source || '',
            difficulty: wordObj.difficulty || 'A2',
            examples: wordObj.examples || [],
            examplesEn: wordObj.examplesEn || [],
          });
        }
      }
    }
  }

  // --- Focused exercise ---
  let exercise = null;
  const hasContent = filteredReviewCards.length > 0 || newCards.length > 0;

  if (hasContent) {
    const candidates = ['translation'];
    if (ttsEnabled) {
      candidates.push('listening');
      if (MINIMAL_PAIRS[langCode]?.pairs?.length > 0) {
        candidates.push('minimal-pairs');
      }
    }

    // Pick exercise mode — bias toward dominant struggle type, fall back to least-recently-used
    let bestMode = candidates[0];

    // Check if struggle words suggest a specific exercise type
    const struggles = getStruggleWords(vocabularyMastery, { limit: 10, now });
    if (struggles.length > 0) {
      const typeCounts = {};
      for (const s of struggles) {
        for (const cat of (s.categories || [])) {
          typeCounts[cat] = (typeCounts[cat] || 0) + 1;
        }
      }
      const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (dominantType === 'listening' && candidates.includes('listening')) {
        bestMode = 'listening';
      } else if (dominantType === 'confusion' && candidates.includes('minimal-pairs')) {
        bestMode = 'minimal-pairs';
      }
    }

    // Fall back to least-recently-used if no struggle bias picked
    if (bestMode === candidates[0] && struggles.length === 0) {
      let oldestTime = Infinity;
      for (const mode of candidates) {
        const lastStudied = modeProgress[mode]?.lastStudied;
        const time = lastStudied ? new Date(lastStudied).getTime() : 0;
        if (time < oldestTime) {
          oldestTime = time;
          bestMode = mode;
        }
      }
    }

    // Build exercise words from review cards (or new cards if no reviews)
    const sourceCards = filteredReviewCards.length > 0 ? filteredReviewCards : newCards;
    const exerciseWords = [...sourceCards]
      .sort(() => Math.random() - 0.5)
      .slice(0, EXERCISE_ITEMS);

    if (exerciseWords.length >= 2) {
      exercise = { mode: bestMode, words: exerciseWords };
    }
  }

  const totalSteps = filteredReviewCards.length + newCards.length + (exercise ? exercise.words.length : 0);

  return {
    reviewCards: filteredReviewCards,
    newCards,
    exercise,
    remainingDue,
    stats,
    timeProfile: { label: timeProfile.label, hour: currentHour },
    summary: {
      reviewCount: filteredReviewCards.length,
      newCount: newCards.length,
      exerciseMode: exercise?.mode || null,
      exerciseCount: exercise?.words?.length || 0,
      totalSteps,
    },
  };
}

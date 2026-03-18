import { useCallback } from 'react';
import { reviewCard, initSRSCard, mapCorrectToRating } from '../utils/srs.js';

/**
 * Custom hook for managing learning progress across all modes
 * Handles XP, achievements, and localStorage persistence
 */
export const useProgress = (state, setState) => {
  const addXP = useCallback((amount) => {
    setState(prev => ({
      ...prev,
      xp: prev.xp + amount
    }));
  }, [setState]);

  const trackModeProgress = useCallback((mode, data) => {
    setState(prev => ({
      ...prev,
      modeProgress: {
        ...prev.modeProgress,
        [mode]: {
          ...(prev.modeProgress?.[mode] || {}),
          ...data,
          lastStudied: new Date().toISOString()
        }
      }
    }));
  }, [setState]);

  const trackVocabularyMastery = useCallback((word, correct, mode) => {
    setState(prev => {
      const wordData = prev.vocabularyMastery?.[word] || {
        timesCorrect: 0,
        timesWrong: 0,
        lastReviewed: null,
        masteryLevel: 0,
        modesUsed: []
      };

      // Update legacy fields
      const newTimesCorrect = correct ? wordData.timesCorrect + 1 : wordData.timesCorrect;
      const newTimesWrong = correct ? wordData.timesWrong : wordData.timesWrong + 1;
      const totalAttempts = newTimesCorrect + newTimesWrong;
      const masteryLevel = totalAttempts > 0 ? newTimesCorrect / totalAttempts : 0;
      const modesUsed = mode && !wordData.modesUsed?.includes(mode)
        ? [...(wordData.modesUsed || []), mode]
        : (wordData.modesUsed || []);

      // Compute SRS update
      const rating = mapCorrectToRating(correct);
      const srsCard = wordData.stability !== undefined ? wordData : { ...wordData, ...initSRSCard() };
      const updatedSRS = reviewCard(srsCard, rating);

      return {
        ...prev,
        vocabularyMastery: {
          ...(prev.vocabularyMastery || {}),
          [word]: {
            timesCorrect: newTimesCorrect,
            timesWrong: newTimesWrong,
            lastReviewed: new Date().toISOString(),
            masteryLevel,
            modesUsed,
            ...updatedSRS
          }
        }
      };
    });
  }, [setState]);

  const checkAchievement = useCallback((achievementId, condition) => {
    if (condition && !state.achievements?.includes(achievementId)) {
      setState(prev => ({
        ...prev,
        achievements: [...(prev.achievements || []), achievementId]
      }));
      return true; // Achievement unlocked
    }
    return false;
  }, [state.achievements, setState]);

  return {
    addXP,
    trackModeProgress,
    trackVocabularyMastery,
    checkAchievement
  };
};

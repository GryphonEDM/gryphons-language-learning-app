import { useState, useCallback, useRef } from 'react';

/**
 * Self-Correction Hook
 *
 * Research shows prompts forcing self-correction (d=0.81) dramatically
 * outperform just showing the answer (d=0.70). This hook wraps the
 * submit/feedback flow with a retry loop before revealing the correct answer.
 *
 * Flow:
 * - Attempt 1 wrong → "Not quite — try again!" + clear input
 * - Attempt 2 wrong → show hint (auto-escalated) + clear input
 * - Attempt 3 wrong OR correct at any point → reveal answer
 *
 * @param {object} opts
 * @param {number} opts.maxAttempts - Max attempts before revealing (default 3)
 * @returns {object} Self-correction state and handlers
 */
export default function useSelfCorrection({ maxAttempts = 3 } = {}) {
  const [attempt, setAttempt] = useState(0);        // 0 = hasn't tried yet, 1+ = attempt number
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);     // 0 = no hint, 1 = mild, 2 = strong
  const [retryMessage, setRetryMessage] = useState('');
  const startTimeRef = useRef(Date.now());

  /**
   * Submit an attempt. checkFn should return { correct: boolean }.
   * Returns { resolved: boolean, correct: boolean } so the caller knows
   * whether to proceed or wait for retry.
   */
  const handleAttempt = useCallback((userInput, checkFn) => {
    const result = checkFn(userInput);
    const nextAttempt = attempt + 1;
    setAttempt(nextAttempt);

    if (result.correct) {
      setIsCorrect(true);
      setIsRevealed(true);
      setRetryMessage('');
      return {
        resolved: true,
        correct: true,
        attemptsUsed: nextAttempt,
        responseMs: Date.now() - startTimeRef.current,
        selfCorrected: nextAttempt > 1,
      };
    }

    // Wrong answer
    if (nextAttempt >= maxAttempts) {
      // Final attempt exhausted — reveal
      setIsCorrect(false);
      setIsRevealed(true);
      setRetryMessage('');
      return {
        resolved: true,
        correct: false,
        attemptsUsed: nextAttempt,
        responseMs: Date.now() - startTimeRef.current,
        selfCorrected: false,
      };
    }

    // Still have retries left
    if (nextAttempt === 1) {
      setRetryMessage('Not quite — try again!');
      setHintLevel(0);
    } else {
      setRetryMessage('One more try — here\'s a hint:');
      setHintLevel(nextAttempt - 1); // 1 on attempt 2, 2 on attempt 3, etc.
    }

    return {
      resolved: false,
      correct: false,
      attemptsUsed: nextAttempt,
      responseMs: null,
      selfCorrected: false,
    };
  }, [attempt, maxAttempts]);

  /**
   * Reset for the next word/item.
   */
  const reset = useCallback(() => {
    setAttempt(0);
    setIsRevealed(false);
    setIsCorrect(false);
    setHintLevel(0);
    setRetryMessage('');
    startTimeRef.current = Date.now();
  }, []);

  /**
   * Generate a hint for a given answer string.
   * Level 0: no hint
   * Level 1: first letter + underscores (e.g., "п _ _ _ _ _")
   * Level 2: first + last letter + underscores (e.g., "п _ _ _ _ т")
   */
  const getHintFor = useCallback((answer, level = hintLevel) => {
    if (!answer || level === 0) return '';
    const chars = answer.split('');
    if (level === 1) {
      // Show first letter
      return chars.map((c, i) => {
        if (c === ' ') return '  ';
        if (i === 0) return c;
        return '_';
      }).join(' ');
    }
    if (level >= 2) {
      // Show first + last letter
      const lastIdx = chars.length - 1;
      return chars.map((c, i) => {
        if (c === ' ') return '  ';
        if (i === 0 || i === lastIdx) return c;
        return '_';
      }).join(' ');
    }
    return '';
  }, [hintLevel]);

  return {
    attempt,          // Current attempt number (0 = hasn't tried)
    isRevealed,       // Whether the answer should be shown
    isCorrect,        // Whether the final result was correct
    hintLevel,        // Current hint level (0, 1, 2)
    retryMessage,     // Message to show on retry ("Not quite — try again!")
    handleAttempt,    // (input, checkFn) => { resolved, correct, attemptsUsed, responseMs, selfCorrected }
    reset,            // Reset for next item
    getHintFor,       // (answer, level?) => hint string
  };
}

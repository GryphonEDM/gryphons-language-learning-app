import React, { useState, useCallback, useEffect, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { getAllVocabularyWords } from '../../utils/dictionaryBuilder.js';
import { getStruggleWords } from '../../utils/struggleEngine.js';
import useNextShortcut from '../../hooks/useNextShortcut.js';

/**
 * Sentence Production Mode — Deepest level of processing.
 *
 * Research: Depth of processing (Craik & Lockhart) shows that using a word
 * in a self-generated sentence is the deepest encoding level, producing
 * the strongest and most durable memories. This is 2-4x more effective
 * than recognition-based practice.
 *
 * Flow: Show target word + meaning → user types a complete sentence →
 * validate (AI if available, basic check otherwise) → feedback
 */
export default function SentenceProductionMode({
  langCode = 'uk', vocabularyMastery = {}, onSpeak, ttsEnabled, ttsVolume,
  onExit, onComplete, onAddXP, onTrackProgress, struggleContext
}) {
  const langNames = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' };
  const langName = langNames[langCode] || 'Ukrainian';

  const [phase, setPhase] = useState('loading');
  const [words, setWords] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userSentence, setUserSentence] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [validating, setValidating] = useState(false);
  const inputRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Build word list: mix struggle words + recently learned + random
  useEffect(() => {
    const allWords = getAllVocabularyWords(langCode);
    const struggles = getStruggleWords(vocabularyMastery, { limit: 3 });
    const targetField = langCode === 'en' ? 'en' : langCode;

    // Get recently learned words (have some mastery but not mature)
    const recentlyLearned = [];
    for (const [word, data] of Object.entries(vocabularyMastery)) {
      if (data.stability > 0 && data.stability < 21 && data.reps >= 2) {
        const wordObj = allWords.find(w => (w[targetField] || w.uk) === word);
        if (wordObj) recentlyLearned.push(wordObj);
      }
    }
    const shuffledRecent = recentlyLearned.sort(() => Math.random() - 0.5).slice(0, 3);

    // Random words for variety
    const shuffledAll = [...allWords].sort(() => Math.random() - 0.5).slice(0, 5);

    // Build struggle word objects
    const struggleWordObjs = struggles.map(s => {
      const wordObj = allWords.find(w => (w[targetField] || w.uk) === s.word);
      return wordObj || { [langCode]: s.word, en: '' };
    });

    // Combine and deduplicate
    const seen = new Set();
    const combined = [];
    for (const w of [...struggleWordObjs, ...shuffledRecent, ...shuffledAll]) {
      const key = (w[targetField] || w.uk || '').toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        combined.push({
          [langCode]: w[langCode] || w.uk,
          en: w.en,
          phonetic: w.phonetic || '',
        });
      }
      if (combined.length >= 8) break;
    }

    setWords(combined);
    setPhase(combined.length > 0 ? 'playing' : 'nodata');
  }, [langCode, vocabularyMastery]);

  const currentWord = words[currentIdx];

  useEffect(() => {
    if (phase === 'playing') {
      setUserSentence('');
      setFeedback(null);
      setValidating(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIdx, phase]);

  // Auto-speak word when it appears
  useEffect(() => {
    if (phase === 'playing' && currentWord && ttsEnabled && onSpeak) {
      setTimeout(() => {
        if (mountedRef.current) onSpeak(currentWord[langCode] || currentWord.uk, 0.8, ttsVolume);
      }, 300);
    }
  }, [currentIdx, phase]);

  const validateSentence = useCallback(async (sentence, targetWord) => {
    // First: basic validation (does the target word appear?)
    const target = (targetWord[langCode] || targetWord.uk || '').toLowerCase();
    const sentenceLower = sentence.toLowerCase();

    // Check if any form of the word stem appears (handle inflection loosely)
    const stem = target.length > 3 ? target.slice(0, -2) : target; // rough stem
    const wordPresent = sentenceLower.includes(target) || sentenceLower.includes(stem);

    if (!wordPresent) {
      return {
        wordUsed: false,
        grammatical: null,
        meaningCorrect: null,
        feedback: `The target word "${target}" wasn't found in your sentence. Try using it!`,
        corrected: null,
      };
    }

    // Try AI validation if available
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a ${langName} language teacher. Validate this student's sentence. Respond in JSON only: {"wordUsed": true/false, "grammatical": true/false, "meaningCorrect": true/false, "feedback": "brief explanation (1-2 sentences)", "corrected": "corrected sentence if needed, or null"}`
        },
        {
          role: 'user',
          content: `Target word: "${target}" (${targetWord.en})\nStudent wrote: "${sentence}"\n\nIs the target word used correctly in a grammatical ${langName} sentence?`
        }
      ];

      const res = await fetch('/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages,
          temperature: 0.1,
          max_tokens: 200,
          stream: false,
        }),
      });

      if (!res.ok) throw new Error('LLM not available');
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // AI not available — fall back to basic check
    }

    // Basic fallback: word is present, assume it's ok
    return {
      wordUsed: true,
      grammatical: null,
      meaningCorrect: null,
      feedback: 'Word used! (AI teacher unavailable for grammar check)',
      corrected: null,
    };
  }, [langCode, langName]);

  const handleSubmit = useCallback(async () => {
    if (!userSentence.trim() || feedback || validating || !currentWord) return;

    setValidating(true);
    const result = await validateSentence(userSentence.trim(), currentWord);
    if (!mountedRef.current) return;
    setValidating(false);

    const isCorrect = result.wordUsed && (result.grammatical !== false);
    setFeedback({ ...result, isCorrect });

    const points = isCorrect ? (result.grammatical === true ? 25 : 15) : 5;
    if (isCorrect) setScore(prev => prev + 1);
    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);

    if (onTrackProgress) {
      onTrackProgress('sentence-production', {
        word: currentWord[langCode] || currentWord.uk,
        correct: isCorrect,
        userAnswer: userSentence.trim(),
        expected: currentWord[langCode] || currentWord.uk,
      });
    }
  }, [userSentence, feedback, validating, currentWord, langCode, validateSentence, onAddXP, onTrackProgress]);

  const handleNext = useCallback(() => {
    if (!feedback) return;
    if (currentIdx < words.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({ mode: 'sentence-production', score, total: words.length, xpEarned });
      }
    }
  }, [feedback, currentIdx, words.length, score, xpEarned, onComplete]);

  useNextShortcut(handleNext, !!feedback);

  if (phase === 'loading') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Use It in a Sentence" subtitle="Deep vocabulary practice" icon="✍️" onExit={onExit} />
        <div style={styles.card}><p style={styles.instruction}>Loading...</p></div>
      </div>
    );
  }

  if (phase === 'nodata') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Use It in a Sentence" subtitle="Deep vocabulary practice" icon="✍️" onExit={onExit} />
        <div style={styles.card}>
          <p style={styles.instruction}>Learn some vocabulary first, then come back for deep practice!</p>
          <button style={styles.actionBtn} onClick={onExit}>Back to Menu</button>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    const accuracy = words.length > 0 ? Math.round((score / words.length) * 100) : 0;
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{ title: 'Sentence Production Complete!', score, total: words.length, xpEarned, accuracy }}
          onRetry={() => { setCurrentIdx(0); setScore(0); setXpEarned(0); setFeedback(null); setUserSentence(''); setPhase('playing'); }}
          onExit={onExit}
        />
      </div>
    );
  }

  const progress = ((currentIdx + 1) / words.length) * 100;

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title="Use It in a Sentence"
        subtitle={`Word ${currentIdx + 1} of ${words.length}`}
        icon="✍️"
        onExit={onExit}
      />

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>

      <div style={styles.card}>
        <p style={styles.instruction}>
          Write a sentence in {langName} using this word:
        </p>

        <div style={styles.targetWord}>{currentWord[langCode] || currentWord.uk}</div>
        {currentWord.phonetic && <div style={styles.phonetic}>({currentWord.phonetic})</div>}
        <div style={styles.meaning}>{currentWord.en}</div>

        {ttsEnabled && onSpeak && (
          <button
            style={styles.ttsBtn}
            onClick={() => onSpeak(currentWord[langCode] || currentWord.uk, 0.8, ttsVolume)}
          >
            🔊 Hear it
          </button>
        )}

        {!feedback ? (
          <>
            <textarea
              ref={inputRef}
              style={styles.textarea}
              value={userSentence}
              onChange={e => setUserSentence(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={`Type a ${langName} sentence using "${currentWord[langCode] || currentWord.uk}"...`}
              rows={3}
              disabled={validating}
            />
            <button
              style={{ ...styles.submitBtn, opacity: validating ? 0.6 : 1 }}
              onClick={handleSubmit}
              disabled={validating || !userSentence.trim()}
            >
              {validating ? 'Checking...' : 'Check Sentence'}
            </button>
          </>
        ) : (
          <div style={styles.feedbackArea}>
            <div style={{
              fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.75rem',
              color: feedback.isCorrect ? '#4ade80' : '#f87171',
            }}>
              {feedback.isCorrect
                ? (feedback.grammatical === true ? 'Excellent!' : 'Good!')
                : (feedback.wordUsed === false ? 'Word not found' : 'Needs work')}
            </div>

            <div style={styles.userSentenceDisplay}>
              "{userSentence}"
            </div>

            {feedback.feedback && (
              <p style={styles.feedbackText}>{feedback.feedback}</p>
            )}

            {feedback.corrected && (
              <div style={styles.correctedBox}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Suggested: </span>
                <span style={{ color: '#4ade80', fontWeight: '600' }}>{feedback.corrected}</span>
              </div>
            )}

            <button style={styles.nextBtn} onClick={handleNext}>
              {currentIdx < words.length - 1 ? 'Next Word →' : 'Finish'}
            </button>
          </div>
        )}
      </div>

      <div style={styles.scoreBar}>
        <span>Score: {score}/{currentIdx + (feedback ? 1 : 0)}</span>
        <span>XP: +{xpEarned}</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  progressBar: {
    width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden', maxWidth: '600px', margin: '0 auto 2rem',
  },
  progressFill: {
    height: '100%', background: 'linear-gradient(90deg, #ffd700, #ffed4e)', transition: 'width 0.3s ease',
  },
  card: {
    maxWidth: '600px', margin: '0 auto', background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px', padding: '2rem', textAlign: 'center',
    border: '1px solid rgba(255,215,0,0.2)',
  },
  instruction: { fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' },
  targetWord: { fontSize: '2.2rem', fontWeight: '700', color: '#ffd700', marginBottom: '0.25rem' },
  phonetic: { fontSize: '1rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' },
  meaning: { fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' },
  ttsBtn: {
    background: 'rgba(77,171,247,0.2)', border: '1px solid rgba(77,171,247,0.4)',
    color: '#4dabf7', padding: '0.5rem 1rem', borderRadius: '10px',
    cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: '1.5rem',
  },
  textarea: {
    width: '100%', padding: '1rem', borderRadius: '12px',
    border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)',
    color: '#fff', fontSize: '1.1rem', fontFamily: 'inherit', outline: 'none',
    resize: 'vertical', boxSizing: 'border-box', marginBottom: '1rem',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none',
    color: '#1a1a2e', padding: '0.75rem 2rem', borderRadius: '12px',
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  },
  feedbackArea: {
    background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1.25rem', marginTop: '1rem',
  },
  userSentenceDisplay: {
    fontSize: '1.1rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.8)',
    marginBottom: '0.75rem', lineHeight: 1.4,
  },
  feedbackText: {
    fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem', lineHeight: 1.4,
  },
  correctedBox: {
    background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
    borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', fontSize: '1rem',
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #51cf66, #37b24d)', border: 'none',
    color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '12px',
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '0.5rem',
  },
  actionBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none',
    color: '#1a1a2e', padding: '0.75rem 1.5rem', borderRadius: '12px',
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '1rem',
  },
  scoreBar: {
    display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem',
    padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
    maxWidth: '600px', margin: '1.5rem auto 0', fontSize: '1rem', color: '#ffd700', fontWeight: '600',
  },
};

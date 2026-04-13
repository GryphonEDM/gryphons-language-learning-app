import React, { useState, useCallback, useEffect, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import useNextShortcut from '../../hooks/useNextShortcut.js';

/**
 * Prosody/Intonation Training Mode
 *
 * Research: Suprasegmental training (stress, rhythm, intonation) produces
 * superior gains in comprehensibility compared to segmental training.
 * Almost no app teaches this.
 *
 * Exercise types:
 * 1. Question vs Statement: same words, different intonation
 * 2. Stress Identification: which word carries primary stress?
 */
export default function ProsodyMode({ langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress }) {
  const langNames = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' };
  const langName = langNames[langCode] || 'Ukrainian';

  const [phase, setPhase] = useState('loading');
  const [exercises, setExercises] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [userAnswer, setUserAnswer] = useState(null);
  const [revealed, setRevealed] = useState(false);

  // For question/statement exercises
  const [playedAsQuestion, setPlayedAsQuestion] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load prosody data
  useEffect(() => {
    const load = async () => {
      try {
        const data = (await import(`../../data/prosody/${langCode}.json`)).default;
        const shuffled = [...(data.exercises || [])].sort(() => Math.random() - 0.5);
        setExercises(shuffled.slice(0, 10));
        setPhase('playing');
      } catch {
        setExercises([]);
        setPhase('nodata');
      }
    };
    load();
  }, [langCode]);

  const currentEx = exercises[currentIdx];

  // Auto-play on new exercise
  useEffect(() => {
    if (phase !== 'playing' || !currentEx || !ttsEnabled || !onSpeak) return;

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      if (currentEx.type === 'question-statement') {
        // Randomly play as question or statement
        const asQuestion = Math.random() < 0.5;
        setPlayedAsQuestion(asQuestion);
        const text = asQuestion ? `${currentEx.sentence}?` : `${currentEx.sentence}.`;
        onSpeak(text, 1, ttsVolume);
      } else if (currentEx.type === 'stress-identification') {
        onSpeak(currentEx.sentence, 1, ttsVolume);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phase, currentIdx]);

  const handleReplay = useCallback(() => {
    if (!currentEx || !ttsEnabled || !onSpeak) return;
    if (currentEx.type === 'question-statement') {
      const text = playedAsQuestion ? `${currentEx.sentence}?` : `${currentEx.sentence}.`;
      onSpeak(text, 1, ttsVolume);
    } else {
      onSpeak(currentEx.sentence, 1, ttsVolume);
    }
  }, [currentEx, playedAsQuestion, ttsEnabled, onSpeak, ttsVolume]);

  const handleAnswer = useCallback((answer) => {
    if (revealed || !currentEx) return;

    let isCorrect = false;
    if (currentEx.type === 'question-statement') {
      const correctAnswer = playedAsQuestion ? 'question' : 'statement';
      isCorrect = answer === correctAnswer;
    } else if (currentEx.type === 'stress-identification') {
      isCorrect = answer === currentEx.stressedWord;
    }

    setUserAnswer(answer);
    setRevealed(true);

    const points = isCorrect ? 15 : 3;
    if (isCorrect) setScore(prev => prev + 1);
    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);

    if (onTrackProgress) {
      onTrackProgress('prosody', {
        word: currentEx.sentence,
        correct: isCorrect,
        exerciseType: currentEx.type,
      });
    }
  }, [revealed, currentEx, playedAsQuestion, onAddXP, onTrackProgress]);

  const handleNext = useCallback(() => {
    if (!revealed) return;
    if (currentIdx < exercises.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setUserAnswer(null);
      setRevealed(false);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({ mode: 'prosody', score, total: exercises.length, xpEarned });
      }
    }
  }, [revealed, currentIdx, exercises.length, score, xpEarned, onComplete]);

  useNextShortcut(handleNext, revealed);

  if (phase === 'loading') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Prosody Training" subtitle="Learn stress and intonation patterns" icon="🎵" onExit={onExit} />
        <div style={styles.card}><p style={styles.instruction}>Loading...</p></div>
      </div>
    );
  }

  if (phase === 'nodata') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Prosody Training" subtitle="Learn stress and intonation patterns" icon="🎵" onExit={onExit} />
        <div style={styles.card}>
          <p style={styles.instruction}>Prosody exercises are not yet available for {langName}.</p>
          <button style={styles.actionBtn} onClick={onExit}>Back to Menu</button>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    const accuracy = exercises.length > 0 ? Math.round((score / exercises.length) * 100) : 0;
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{ title: 'Prosody Training Complete!', score, total: exercises.length, xpEarned, accuracy }}
          onRetry={() => { setCurrentIdx(0); setScore(0); setXpEarned(0); setUserAnswer(null); setRevealed(false); setPhase('playing'); }}
          onExit={onExit}
        />
      </div>
    );
  }

  const progress = ((currentIdx + 1) / exercises.length) * 100;

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title="Prosody Training"
        subtitle={`Exercise ${currentIdx + 1} of ${exercises.length}`}
        icon="🎵"
        onExit={onExit}
      />

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>

      <div style={styles.card}>
        {currentEx.type === 'question-statement' && (
          <>
            <p style={styles.instruction}>Is this a question or a statement?</p>
            <p style={styles.sentenceText}>{currentEx.sentence}</p>
            <p style={styles.translationSmall}>{currentEx.translation}</p>

            <button style={styles.playBtn} onClick={handleReplay}>🔊 Play Again</button>

            {!revealed ? (
              <div style={styles.choiceRow}>
                <button style={styles.choiceBtn} onClick={() => handleAnswer('question')}>
                  <span style={styles.choiceIcon}>❓</span> Question
                </button>
                <button style={styles.choiceBtn} onClick={() => handleAnswer('statement')}>
                  <span style={styles.choiceIcon}>📝</span> Statement
                </button>
              </div>
            ) : (
              <div style={styles.feedbackArea}>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: (userAnswer === (playedAsQuestion ? 'question' : 'statement')) ? '#4ade80' : '#f87171', marginBottom: '0.5rem' }}>
                  {(userAnswer === (playedAsQuestion ? 'question' : 'statement')) ? 'Correct!' : 'Not quite...'}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  It was a <strong style={{ color: '#ffd700' }}>{playedAsQuestion ? 'question' : 'statement'}</strong>
                  {' — '}{playedAsQuestion ? 'rising intonation at the end' : 'falling intonation at the end'}
                </p>
                {currentEx.tip && <p style={styles.tip}>{currentEx.tip}</p>}
                <button style={styles.nextBtn} onClick={handleNext}>
                  {currentIdx < exercises.length - 1 ? 'Next →' : 'Finish'}
                </button>
              </div>
            )}
          </>
        )}

        {currentEx.type === 'stress-identification' && (
          <>
            <p style={styles.instruction}>Which word carries the primary stress?</p>
            <p style={styles.translationSmall}>{currentEx.translation}</p>

            <button style={styles.playBtn} onClick={handleReplay}>🔊 Play Again</button>

            <div style={styles.wordChoiceRow}>
              {(currentEx.words || []).map((word, i) => {
                const isCorrectWord = i === currentEx.stressedWord;
                const isChosen = userAnswer === i;
                let bgColor = 'rgba(255,255,255,0.08)';
                let borderColor = 'rgba(255,255,255,0.15)';
                if (revealed) {
                  if (isCorrectWord) { bgColor = 'rgba(74,222,128,0.15)'; borderColor = '#4ade80'; }
                  else if (isChosen && !isCorrectWord) { bgColor = 'rgba(248,113,113,0.15)'; borderColor = '#f87171'; }
                }
                return (
                  <button
                    key={i}
                    style={{ ...styles.wordChoiceBtn, background: bgColor, borderColor }}
                    onClick={() => !revealed && handleAnswer(i)}
                    disabled={revealed}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <div style={styles.feedbackArea}>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: userAnswer === currentEx.stressedWord ? '#4ade80' : '#f87171', marginBottom: '0.5rem' }}>
                  {userAnswer === currentEx.stressedWord ? 'Correct!' : 'Not quite...'}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  The stressed word is <strong style={{ color: '#ffd700' }}>{currentEx.words[currentEx.stressedWord]}</strong>
                </p>
                {currentEx.tip && <p style={styles.tip}>{currentEx.tip}</p>}
                <button style={styles.nextBtn} onClick={handleNext}>
                  {currentIdx < exercises.length - 1 ? 'Next →' : 'Finish'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  progressBar: {
    width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', background: 'linear-gradient(90deg, #ffd700, #ffed4e)', transition: 'width 0.3s ease',
  },
  card: {
    maxWidth: '600px', margin: '0 auto', background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px', padding: '2rem', textAlign: 'center',
    border: '1px solid rgba(255,215,0,0.2)',
  },
  instruction: {
    fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem',
  },
  sentenceText: {
    fontSize: '1.8rem', fontWeight: '700', color: '#ffd700', marginBottom: '0.5rem', lineHeight: 1.3,
  },
  translationSmall: {
    fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem',
  },
  playBtn: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)', border: 'none',
    color: '#fff', padding: '0.75rem 2rem', borderRadius: '12px',
    fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    marginBottom: '1.5rem',
  },
  choiceRow: {
    display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap',
  },
  choiceBtn: {
    background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.15)',
    color: '#fff', padding: '1rem 2rem', borderRadius: '14px',
    fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.2s', minWidth: '150px',
  },
  choiceIcon: { fontSize: '1.5rem', display: 'block', marginBottom: '0.3rem' },
  wordChoiceRow: {
    display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem',
  },
  wordChoiceBtn: {
    background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.15)',
    color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '12px',
    fontSize: '1.2rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  feedbackArea: {
    background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1.25rem', marginTop: '1rem',
  },
  tip: {
    fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic',
    marginTop: '0.75rem', lineHeight: 1.4,
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #51cf66, #37b24d)', border: 'none',
    color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '12px',
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    marginTop: '1rem',
  },
  actionBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none',
    color: '#1a1a2e', padding: '0.75rem 1.5rem', borderRadius: '12px',
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    marginTop: '1rem',
  },
};

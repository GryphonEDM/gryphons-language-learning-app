import React, { useState, useCallback, useEffect, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import useNextShortcut from '../../hooks/useNextShortcut.js';
import useSelfCorrection from '../../hooks/useSelfCorrection.js';
import { CONNECTED_SPEECH } from '../../data/connectedSpeech.js';

/**
 * Connected Speech Training Mode
 *
 * Research: Connected speech is the #1 reason learners can read but not
 * understand spoken language. Words in fluent speech sound nothing like
 * their dictionary forms due to linking, reduction, and assimilation.
 *
 * Exercise types:
 * 1. Contrast: hear word-by-word vs natural speech, identify the phenomenon
 * 2. Dictation: hear natural speech, type what you hear
 */
export default function ConnectedSpeechMode({ langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress }) {
  const langNames = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' };
  const langName = langNames[langCode] || 'Ukrainian';
  const langData = CONNECTED_SPEECH[langCode];

  const [phase, setPhase] = useState('picker');
  const [exerciseType, setExerciseType] = useState('contrast'); // contrast, dictation
  const [items, setItems] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [userAnswer, setUserAnswer] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [dictationInput, setDictationInput] = useState('');
  const selfCorrection = useSelfCorrection({ maxAttempts: 3 });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const startExercise = useCallback((type) => {
    if (!langData) return;
    setExerciseType(type);
    const shuffled = [...langData.examples].sort(() => Math.random() - 0.5);
    setItems(shuffled.slice(0, 8));
    setCurrentIdx(0);
    setScore(0);
    setXpEarned(0);
    setUserAnswer(null);
    setRevealed(false);
    setDictationInput('');
    selfCorrection.reset();
    setPhase('playing');
  }, [langData, selfCorrection]);

  const currentItem = items[currentIdx];

  // Play citation form (word by word, slow)
  const playCitation = useCallback(() => {
    if (!currentItem || !ttsEnabled || !onSpeak) return;
    // Play each word with a pause between
    const words = currentItem.citationWords;
    words.forEach((word, i) => {
      setTimeout(() => {
        if (mountedRef.current) onSpeak(word, 0.7, ttsVolume);
      }, i * 800);
    });
  }, [currentItem, ttsEnabled, onSpeak, ttsVolume]);

  // Play connected form (natural speed, full phrase)
  const playConnected = useCallback(() => {
    if (!currentItem || !ttsEnabled || !onSpeak) return;
    onSpeak(currentItem.phrase, 1, ttsVolume);
  }, [currentItem, ttsEnabled, onSpeak, ttsVolume]);

  // Auto-play on new item
  useEffect(() => {
    if (phase !== 'playing' || !currentItem) return;
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      if (exerciseType === 'contrast') {
        // Play citation first, then connected
        playCitation();
        setTimeout(() => {
          if (mountedRef.current) playConnected();
        }, (currentItem.citationWords.length) * 800 + 500);
      } else {
        // Dictation: play connected form only
        playConnected();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [phase, currentIdx]);

  const handlePhenomenonChoice = useCallback((phenomenonId) => {
    if (revealed || !currentItem) return;
    const isCorrect = phenomenonId === currentItem.phenomenon;
    setUserAnswer(phenomenonId);
    setRevealed(true);

    const points = isCorrect ? 15 : 3;
    if (isCorrect) setScore(prev => prev + 1);
    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);

    if (onTrackProgress) {
      onTrackProgress('connected-speech', {
        word: currentItem.phrase,
        correct: isCorrect,
        exerciseType: 'contrast',
      });
    }
  }, [revealed, currentItem, onAddXP, onTrackProgress]);

  const handleDictationSubmit = useCallback(() => {
    if (!dictationInput.trim() || revealed || !currentItem) return;

    const result = selfCorrection.handleAttempt(dictationInput.trim(), (input) => {
      const target = currentItem.phrase.toLowerCase().replace(/[?!.,]/g, '').trim();
      const attempt = input.toLowerCase().replace(/[?!.,]/g, '').trim();
      return { correct: attempt === target };
    });

    if (!result.resolved) {
      setDictationInput('');
      // Replay at slower speed
      if (ttsEnabled && onSpeak) onSpeak(currentItem.phrase, 0.75, ttsVolume);
      return;
    }

    setRevealed(true);
    const points = result.correct ? 20 : 5;
    if (result.correct) setScore(prev => prev + 1);
    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);

    if (onTrackProgress) {
      onTrackProgress('connected-speech', {
        word: currentItem.phrase,
        correct: result.correct,
        userAnswer: dictationInput.trim(),
        expected: currentItem.phrase,
        exerciseType: 'dictation',
        selfCorrected: result.selfCorrected,
        attemptsBeforeCorrect: result.attemptsUsed,
      });
    }
  }, [dictationInput, revealed, currentItem, selfCorrection, ttsEnabled, onSpeak, ttsVolume, onAddXP, onTrackProgress]);

  const handleNext = useCallback(() => {
    if (!revealed) return;
    if (currentIdx < items.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setUserAnswer(null);
      setRevealed(false);
      setDictationInput('');
      selfCorrection.reset();
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({ mode: 'connected-speech', score, total: items.length, xpEarned });
      }
    }
  }, [revealed, currentIdx, items.length, score, xpEarned, onComplete, selfCorrection]);

  useNextShortcut(handleNext, revealed);

  if (!langData) {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Connected Speech" subtitle="Learn natural pronunciation" icon="🗣️" onExit={onExit} />
        <div style={styles.card}>
          <p style={styles.instruction}>Connected speech exercises are not yet available for {langName}.</p>
          <button style={styles.actionBtn} onClick={onExit}>Back to Menu</button>
        </div>
      </div>
    );
  }

  // --- Picker Phase ---
  if (phase === 'picker') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Connected Speech" subtitle="Learn how words flow in natural speech" icon="🗣️" onExit={onExit} />
        <div style={styles.pickerTitle}>Choose exercise type</div>
        <div style={styles.pickerGrid}>
          <div style={styles.pickerCard} onClick={() => startExercise('contrast')}>
            <div style={styles.pickerIcon}>🔊</div>
            <div style={styles.pickerName}>Contrast Listening</div>
            <div style={styles.pickerDesc}>Hear word-by-word vs natural speech, identify the phenomenon</div>
          </div>
          <div style={styles.pickerCard} onClick={() => startExercise('dictation')}>
            <div style={styles.pickerIcon}>✍️</div>
            <div style={styles.pickerName}>Connected Dictation</div>
            <div style={styles.pickerDesc}>Hear natural speech and type what you hear</div>
          </div>
        </div>

        <div style={{ maxWidth: '600px', margin: '2rem auto 0' }}>
          <div style={styles.pickerTitle}>Phenomena in {langName}</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {langData.phenomena.map(p => (
              <div key={p.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                <span style={{ marginRight: '0.4rem' }}>{p.icon}</span>
                <strong>{p.name}</strong>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '0.2rem' }}>{p.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    const accuracy = items.length > 0 ? Math.round((score / items.length) * 100) : 0;
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{ title: 'Connected Speech Complete!', score, total: items.length, xpEarned, accuracy }}
          onRetry={() => startExercise(exerciseType)}
          onExit={() => setPhase('picker')}
          exitLabel="Back to List"
        />
      </div>
    );
  }

  // --- Playing Phase ---
  const progress = ((currentIdx + 1) / items.length) * 100;

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title="Connected Speech"
        subtitle={`${exerciseType === 'contrast' ? 'Contrast' : 'Dictation'} ${currentIdx + 1} of ${items.length}`}
        icon="🗣️"
        onExit={() => setPhase('picker')}
      />

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>

      <div style={styles.card}>
        {exerciseType === 'contrast' ? (
          <>
            <p style={styles.instruction}>Listen to both versions. What happened to the natural speech?</p>
            <p style={styles.phraseText}>{currentItem.phrase}</p>
            <p style={styles.translationSmall}>{currentItem.translation}</p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button style={styles.playBtn} onClick={playCitation}>🔊 Word by Word</button>
              <button style={{ ...styles.playBtn, background: 'linear-gradient(135deg, #ff922b, #e8590c)' }} onClick={playConnected}>🗣️ Natural</button>
            </div>

            {!revealed ? (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {langData.phenomena.map(p => (
                  <button
                    key={p.id}
                    style={styles.phenomenonBtn}
                    onClick={() => handlePhenomenonChoice(p.id)}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            ) : (
              <div style={styles.feedbackArea}>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: userAnswer === currentItem.phenomenon ? '#4ade80' : '#f87171', marginBottom: '0.5rem' }}>
                  {userAnswer === currentItem.phenomenon ? 'Correct!' : 'Not quite...'}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  This is <strong style={{ color: '#ffd700' }}>
                    {langData.phenomena.find(p => p.id === currentItem.phenomenon)?.name || currentItem.phenomenon}
                  </strong>
                </p>
                {currentItem.tip && <p style={styles.tip}>{currentItem.tip}</p>}
                <button style={styles.nextBtn} onClick={handleNext}>
                  {currentIdx < items.length - 1 ? 'Next →' : 'Finish'}
                </button>
              </div>
            )}
          </>
        ) : (
          /* --- DICTATION MODE --- */
          <>
            <p style={styles.instruction}>Type what you hear in natural speech</p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <button style={{ ...styles.playBtn, background: 'linear-gradient(135deg, #ff922b, #e8590c)' }} onClick={playConnected}>🗣️ Play Natural</button>
              {revealed && <button style={styles.playBtn} onClick={playCitation}>🔊 Word by Word</button>}
            </div>

            {/* Retry message */}
            {selfCorrection.retryMessage && !revealed && (
              <div style={{ background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ color: '#ffa94d', fontWeight: '600' }}>{selfCorrection.retryMessage}</div>
                {selfCorrection.hintLevel > 0 && (
                  <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '2px', color: '#ffd700', marginTop: '0.3rem' }}>
                    {selfCorrection.getHintFor(currentItem.phrase)}
                  </div>
                )}
              </div>
            )}

            {!revealed ? (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  style={styles.dictInput}
                  value={dictationInput}
                  onChange={e => setDictationInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleDictationSubmit(); }}
                  placeholder={`Type the ${langName} phrase...`}
                  autoFocus
                />
                <button style={styles.submitBtn} onClick={handleDictationSubmit}>Check</button>
              </div>
            ) : (
              <div style={styles.feedbackArea}>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: score > (currentIdx > 0 ? score - 1 : -1) ? '#4ade80' : '#f87171', marginBottom: '0.5rem' }}>
                  {selfCorrection.isCorrect ? (selfCorrection.attempt > 1 ? 'Got it on retry!' : 'Correct!') : 'Not quite...'}
                </div>
                <p style={styles.phraseText}>{currentItem.phrase}</p>
                <p style={styles.translationSmall}>{currentItem.translation}</p>
                {currentItem.tip && <p style={styles.tip}>{currentItem.tip}</p>}
                <button style={styles.nextBtn} onClick={handleNext}>
                  {currentIdx < items.length - 1 ? 'Next →' : 'Finish'}
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
    color: '#fff', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif',
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
  instruction: { fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' },
  phraseText: { fontSize: '1.6rem', fontWeight: '700', color: '#ffd700', marginBottom: '0.5rem', lineHeight: 1.3 },
  translationSmall: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' },
  playBtn: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)', border: 'none',
    color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '12px',
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  },
  phenomenonBtn: {
    background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.15)',
    color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '12px',
    fontSize: '1rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
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
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '1rem',
  },
  dictInput: {
    flex: 1, padding: '0.75rem 1rem', borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)',
    color: '#fff', fontSize: '1.1rem', fontFamily: 'inherit', outline: 'none', textAlign: 'center',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none',
    color: '#1a1a2e', padding: '0.75rem 1.5rem', borderRadius: '10px',
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  },
  actionBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none',
    color: '#1a1a2e', padding: '0.75rem 1.5rem', borderRadius: '12px',
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '1rem',
  },
  // Picker styles
  pickerTitle: {
    textAlign: 'center', fontSize: '1.3rem', fontWeight: '600', color: '#ffd700',
    marginTop: '1.5rem', marginBottom: '1.5rem',
  },
  pickerGrid: {
    display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap',
  },
  pickerCard: {
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.15)',
    borderRadius: '16px', padding: '1.5rem', textAlign: 'center',
    cursor: 'pointer', transition: 'all 0.2s', minWidth: '200px', maxWidth: '280px',
  },
  pickerIcon: { fontSize: '2rem', marginBottom: '0.5rem' },
  pickerName: { fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.3rem' },
  pickerDesc: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' },
};

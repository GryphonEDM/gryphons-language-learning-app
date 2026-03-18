import React, { useState, useCallback, useEffect, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { WordToolbar } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';
import useNextShortcut from '../../hooks/useNextShortcut.js';
import { MINIMAL_PAIRS } from '../../data/minimalPairs.js';

export default function MinimalPairsMode({ langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress, onMarkMastered, masteredWordsList = [] }) {
  const langNames = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese', en: 'English' };
  const langName = langNames[langCode] || 'Ukrainian';
  const langData = MINIMAL_PAIRS[langCode];

  const [phase, setPhase] = useState('picker');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playedSide, setPlayedSide] = useState(null); // 'A' or 'B'
  const [userChoice, setUserChoice] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [categoryStats, setCategoryStats] = useState({});
  const mountedRef = useRef(true);

  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });
  const chat = useLessonChat({ langName, langCode, systemPrompt: `You are a helpful ${langName} language tutor. The student is practicing minimal pairs — distinguishing similar-sounding words. Help them understand pronunciation differences concisely. Keep responses under 150 words.`, onSpeak, ttsEnabled, ttsVolume });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const playWord = useCallback((pair, side) => {
    if (ttsEnabled && onSpeak) {
      const word = side === 'A' ? pair.wordA : pair.wordB;
      onSpeak(word.text, playbackRate, ttsVolume);
    }
  }, [ttsEnabled, onSpeak, playbackRate, ttsVolume]);

  const startRound = useCallback((category) => {
    if (!langData) return;
    let filtered = category
      ? langData.pairs.filter(p => p.category === category)
      : [...langData.pairs];
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));
    setPairs(selected);
    setCurrentIdx(0);
    setScore(0);
    setXpEarned(0);
    setUserChoice(null);
    setRevealed(false);
    setCategoryStats({});
    const side = Math.random() < 0.5 ? 'A' : 'B';
    setPlayedSide(side);
    setPhase('playing');
    // Auto-play after a brief delay to let state settle
    setTimeout(() => {
      if (mountedRef.current && selected.length > 0) {
        playWord(selected[0], side);
      }
    }, 300);
  }, [langData, playWord]);

  const handleChoice = useCallback((choice) => {
    if (revealed || !playedSide) return;
    const isCorrect = choice === playedSide;
    const points = isCorrect ? 20 : 5;

    setUserChoice(choice);
    setRevealed(true);
    if (isCorrect) setScore(prev => prev + 1);
    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);

    // Track per-category stats
    const pair = pairs[currentIdx];
    if (pair) {
      setCategoryStats(prev => {
        const cat = pair.category;
        const existing = prev[cat] || { correct: 0, total: 0 };
        return { ...prev, [cat]: { correct: existing.correct + (isCorrect ? 1 : 0), total: existing.total + 1 } };
      });
    }

    if (onTrackProgress) {
      onTrackProgress('minimal-pairs', {
        word: pair?.wordA?.text || '',
        correct: isCorrect
      });
    }
  }, [revealed, playedSide, pairs, currentIdx, onAddXP, onTrackProgress]);

  const handleNext = useCallback(() => {
    if (!revealed) return;
    if (currentIdx < pairs.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setUserChoice(null);
      setRevealed(false);
      const side = Math.random() < 0.5 ? 'A' : 'B';
      setPlayedSide(side);
      setTimeout(() => {
        if (mountedRef.current) playWord(pairs[nextIdx], side);
      }, 300);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({ mode: 'minimal-pairs', score, total: pairs.length, xpEarned, categoryStats });
      }
    }
  }, [revealed, currentIdx, pairs, score, xpEarned, categoryStats, onComplete, playWord]);

  const handleReplay = useCallback(() => {
    if (pairs[currentIdx] && playedSide) {
      playWord(pairs[currentIdx], playedSide);
    }
  }, [pairs, currentIdx, playedSide, playWord]);

  const handleHearBoth = useCallback(() => {
    const pair = pairs[currentIdx];
    if (!pair || !ttsEnabled || !onSpeak) return;
    onSpeak(pair.wordA.text, playbackRate, ttsVolume);
    setTimeout(() => {
      if (mountedRef.current) {
        onSpeak(pair.wordB.text, playbackRate, ttsVolume);
      }
    }, 1200);
  }, [pairs, currentIdx, ttsEnabled, onSpeak, playbackRate, ttsVolume]);

  const handleRetry = useCallback(() => {
    startRound(selectedCategory);
  }, [startRound, selectedCategory]);

  useNextShortcut(handleNext, revealed);

  // No data for this language
  if (!langData || langData.pairs.length === 0) {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Minimal Pairs" subtitle="Train your ear" icon="🎯" onExit={onExit} />
        <div style={styles.card}>
          <p style={styles.instruction}>Minimal pairs are not yet available for {langName}.</p>
          <button style={styles.playBtn} onClick={onExit}>Back to Menu</button>
        </div>
      </div>
    );
  }

  // --- Picker Phase ---
  if (phase === 'picker') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Minimal Pairs" subtitle="Train your ear to distinguish similar sounds" icon="🎯" onExit={onExit} />
        <div style={styles.pickerSectionTitle}>Choose a sound category</div>
        <div style={styles.categoryGrid}>
          <div
            style={{ ...styles.categoryCard, border: '2px solid #ffd700' }}
            onClick={() => { setSelectedCategory(null); startRound(null); }}
          >
            <div style={styles.categoryIcon}>🎲</div>
            <div style={styles.categoryName}>All Categories</div>
            <div style={styles.categoryMeta}>{langData.pairs.length} pairs</div>
          </div>

          {langData.categories.map(cat => {
            const count = langData.pairs.filter(p => p.category === cat.id).length;
            return (
              <div
                key={cat.id}
                style={styles.categoryCard}
                onClick={() => { setSelectedCategory(cat.id); startRound(cat.id); }}
              >
                <div style={styles.categoryIcon}>{cat.icon}</div>
                <div style={styles.categoryName}>{cat.name}</div>
                <div style={styles.categoryMeta}>{count} pairs</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- Complete Phase ---
  if (phase === 'complete') {
    const accuracy = pairs.length > 0 ? Math.round((score / pairs.length) * 100) : 0;
    const categories = langData.categories;
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{
            title: 'Minimal Pairs Complete!',
            score,
            total: pairs.length,
            xpEarned,
            accuracy
          }}
          onRetry={handleRetry}
          onExit={() => setPhase('picker')}
          exitLabel="Back to Categories"
        />
        {Object.keys(categoryStats).length > 1 && (
          <div style={styles.categoryBreakdown}>
            <h3 style={styles.breakdownTitle}>Per-Category Accuracy</h3>
            {categories.filter(c => categoryStats[c.id]).map(cat => {
              const s = categoryStats[cat.id];
              const pct = Math.round((s.correct / s.total) * 100);
              return (
                <div key={cat.id} style={styles.breakdownRow}>
                  <span>{cat.icon} {cat.name}</span>
                  <span style={{ color: pct >= 80 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#f87171' }}>
                    {s.correct}/{s.total} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- Playing Phase ---
  const pair = pairs[currentIdx];
  const progress = ((currentIdx + 1) / pairs.length) * 100;
  const isCorrect = userChoice === playedSide;

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title="Minimal Pairs"
        subtitle={`Pair ${currentIdx + 1} of ${pairs.length}${selectedCategory ? '' : ' (mixed)'}`}
        icon="🎯"
        onExit={() => setPhase('picker')}
      />

      <div className="content-row" style={styles.contentRow}>
        <div style={styles.main}>
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${progress}%`}} />
          </div>

          <div style={styles.card}>
            <p style={styles.instruction}>Which word did you hear?</p>

            <div style={styles.audioControls}>
              <button style={styles.playBtn} onClick={handleReplay}>
                🔊 Play Again
              </button>
              <div style={styles.speedControls}>
                {[0.5, 0.75, 1, 1.25].map(rate => (
                  <button
                    key={rate}
                    style={{
                      ...styles.speedBtn,
                      ...(playbackRate === rate ? styles.speedBtnActive : {})
                    }}
                    onClick={() => setPlaybackRate(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.pairGrid}>
              <button
                style={{
                  ...styles.wordCard,
                  ...(revealed && playedSide === 'A' ? styles.wordCardCorrectAnswer : {}),
                  ...(revealed && userChoice === 'A' && !isCorrect ? styles.wordCardWrong : {}),
                  ...(revealed && userChoice === 'A' && isCorrect ? styles.wordCardCorrect : {}),
                  ...(!revealed && !userChoice ? styles.wordCardHover : {}),
                }}
                onClick={() => handleChoice('A')}
                disabled={revealed}
              >
                <div style={styles.wordText}>{pair.wordA.text}</div>
                <div style={styles.wordPhonetic}>{pair.wordA.phonetic}</div>
                <div style={styles.wordEnglish}>{pair.wordA.english}</div>
                {revealed && playedSide === 'A' && <div style={styles.correctBadge}>✓ This one</div>}
              </button>

              <button
                style={{
                  ...styles.wordCard,
                  ...(revealed && playedSide === 'B' ? styles.wordCardCorrectAnswer : {}),
                  ...(revealed && userChoice === 'B' && !isCorrect ? styles.wordCardWrong : {}),
                  ...(revealed && userChoice === 'B' && isCorrect ? styles.wordCardCorrect : {}),
                  ...(!revealed && !userChoice ? styles.wordCardHover : {}),
                }}
                onClick={() => handleChoice('B')}
                disabled={revealed}
              >
                <div style={styles.wordText}>{pair.wordB.text}</div>
                <div style={styles.wordPhonetic}>{pair.wordB.phonetic}</div>
                <div style={styles.wordEnglish}>{pair.wordB.english}</div>
                {revealed && playedSide === 'B' && <div style={styles.correctBadge}>✓ This one</div>}
              </button>
            </div>

            {revealed && (
              <div style={styles.feedbackArea}>
                <div style={{
                  ...styles.feedbackHeader,
                  color: isCorrect ? '#4ade80' : '#f87171'
                }}>
                  {isCorrect ? 'Correct!' : 'Not quite...'}
                </div>
                <div style={styles.tip}>{pair.tip}</div>
                <div style={styles.revealActions}>
                  <button style={styles.hearBothBtn} onClick={handleHearBoth}>
                    🔊 Hear Both
                  </button>
                  <button style={styles.nextBtn} onClick={handleNext}>
                    {currentIdx < pairs.length - 1 ? 'Next →' : 'Finish'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={styles.scoreBar}>
            <span>Score: {score}/{currentIdx + (revealed ? 1 : 0)}</span>
            <span>XP: +{xpEarned}</span>
          </div>
        </div>
        <LessonChat {...chat} onWordClick={handleWordClick} activeWord={selectedWord?.word} onSpeak={onSpeak} />
      </div>
      <WordToolbar selectedWord={selectedWord} onDismiss={dismissWord} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} langName={langName} langCode={langCode} onMarkMastered={onMarkMastered} isMastered={masteredWordsList.some(m => m.word === selectedWord?.word)} />
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
  contentRow: { display: 'flex', gap: '1.5rem', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },

  // Picker styles
  pickerSectionTitle: {
    textAlign: 'center', fontSize: '1.3rem', fontWeight: '600', color: '#ffd700',
    marginTop: '1.5rem', marginBottom: '1.5rem',
  },
  categoryGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem', maxWidth: '900px', margin: '0 auto',
  },
  categoryCard: {
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.15)',
    borderRadius: '16px', padding: '1.25rem 1rem', textAlign: 'center',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  categoryIcon: { fontSize: '2rem', marginBottom: '0.5rem' },
  categoryName: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.3rem' },
  categoryMeta: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' },

  // Progress
  progressBar: {
    width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', background: 'linear-gradient(90deg, #ffd700, #ffed4e)',
    transition: 'width 0.3s ease',
  },

  // Card
  card: {
    maxWidth: '650px', margin: '0 auto', background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px', padding: '2rem', textAlign: 'center',
    border: '1px solid rgba(255,215,0,0.2)',
  },
  instruction: {
    fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem',
  },
  audioControls: { marginBottom: '1.5rem' },
  playBtn: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)', border: 'none',
    color: '#fff', padding: '0.8rem 2rem', borderRadius: '16px',
    fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.2s', marginBottom: '0.75rem',
  },
  speedControls: {
    display: 'flex', justifyContent: 'center', gap: '0.5rem',
  },
  speedBtn: {
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '8px',
    cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit', transition: 'all 0.2s',
  },
  speedBtnActive: {
    background: 'rgba(255,215,0,0.2)', borderColor: '#ffd700',
    color: '#ffd700', fontWeight: '600',
  },

  // Pair cards
  pairGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
    marginBottom: '1.5rem',
  },
  wordCard: {
    background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: '16px', padding: '1.5rem 1rem', textAlign: 'center',
    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
    color: '#fff', position: 'relative',
  },
  wordCardHover: {
    // Base hover-like state — actual hover handled by CSS if needed
  },
  wordCardCorrect: {
    borderColor: '#4ade80', background: 'rgba(74,222,128,0.15)',
  },
  wordCardWrong: {
    borderColor: '#f87171', background: 'rgba(248,113,113,0.15)',
  },
  wordCardCorrectAnswer: {
    borderColor: '#ffd700', background: 'rgba(255,215,0,0.1)',
  },
  wordText: {
    fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.4rem',
  },
  wordPhonetic: {
    fontSize: '1rem', color: '#4dabf7', marginBottom: '0.3rem', fontStyle: 'italic',
  },
  wordEnglish: {
    fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)',
  },
  correctBadge: {
    marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: '700', color: '#ffd700',
  },

  // Feedback
  feedbackArea: {
    background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1.25rem',
  },
  feedbackHeader: {
    fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.5rem',
  },
  tip: {
    fontSize: '0.95rem', color: 'rgba(255,255,255,0.75)', lineHeight: '1.5',
    marginBottom: '1rem',
  },
  revealActions: {
    display: 'flex', gap: '0.75rem', justifyContent: 'center',
  },
  hearBothBtn: {
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '10px',
    fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit',
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #51cf66, #37b24d)', border: 'none',
    color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '10px',
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  },

  // Score bar
  scoreBar: {
    display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem',
    padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
    maxWidth: '650px', margin: '1.5rem auto 0', fontSize: '1rem',
    color: '#ffd700', fontWeight: '600',
  },

  // Category breakdown on completion
  categoryBreakdown: {
    maxWidth: '500px', margin: '1.5rem auto 0', background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,215,0,0.15)',
  },
  breakdownTitle: {
    fontSize: '1.1rem', fontWeight: '600', color: '#ffd700',
    marginBottom: '1rem', textAlign: 'center',
  },
  breakdownRow: {
    display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem',
  },
};

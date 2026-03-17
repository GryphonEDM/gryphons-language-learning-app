import React, { useState } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { WordToolbar, ClickableText } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';

export default function SentenceMode({ langCode = 'uk', sentenceData, onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';
  const [phase, setPhase] = useState('pick-difficulty'); // pick-difficulty, playing, complete
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });
  const chat = useLessonChat({ langName, langCode, systemPrompt: `You are a helpful ${langName} language tutor. The student is doing a sentence-building exercise — arranging word tiles into correct ${langName} sentences. Answer questions about grammar, vocabulary, or word order concisely. Keep responses under 150 words.`, onSpeak, ttsEnabled, ttsVolume });
  const [sentences, setSentences] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [availableTiles, setAvailableTiles] = useState([]);
  const [placedTiles, setPlacedTiles] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);

  function initTilesFromSentence(sentence) {
    if (!sentence) return [];
    const allWords = [...sentence.words, ...sentence.distractors];
    return allWords.sort(() => Math.random() - 0.5).map((word, i) => ({ id: `${i}-${word}`, word }));
  }

  // Compute available difficulty levels and counts from sentenceData
  const difficultyLevels = React.useMemo(() => {
    const counts = {};
    sentenceData.forEach(s => {
      const d = s.difficulty || 'Unknown';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [sentenceData]);

  const startExercise = React.useCallback((diff) => {
    setSelectedDifficulty(diff);
    const filtered = diff ? sentenceData.filter(s => s.difficulty === diff) : sentenceData;
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 10);
    setSentences(selected);
    setCurrentIdx(0);
    setAvailableTiles(initTilesFromSentence(selected[0]));
    setPlacedTiles([]);
    setFeedback(null);
    setScore(0);
    setXpEarned(0);
    setMistakeCount(0);
    setConsecutiveCorrect(0);
    setPhase('playing');
  }, [sentenceData]);

  const currentSentence = sentences[currentIdx];

  const handleTileClick = (tile) => {
    if (feedback) return;
    setAvailableTiles(prev => prev.filter(t => t.id !== tile.id));
    setPlacedTiles(prev => [...prev, tile]);
    if (ttsEnabled) onSpeak(tile.word, 0.8, ttsVolume);
  };

  const handlePlacedClick = (tile) => {
    if (feedback) return;
    setPlacedTiles(prev => prev.filter(t => t.id !== tile.id));
    setAvailableTiles(prev => [...prev, tile]);
  };

  const handleSubmit = () => {
    if (feedback || placedTiles.length === 0) return;

    const placed = placedTiles.map(t => t.word);
    const isCorrect = currentSentence.validOrders.some(order => {
      if (order.length !== placed.length) return false;
      return order.every((w, i) => w.toLowerCase() === placed[i].toLowerCase());
    });

    const points = isCorrect ? 20 : 5;
    setFeedback({ correct: isCorrect });

    if (isCorrect) {
      setScore(prev => prev + 1);
      setConsecutiveCorrect(prev => prev + 1);
      if (ttsEnabled && onSpeak) {
        onSpeak(currentSentence[langCode], 0.8, ttsVolume);
      }
    } else {
      setConsecutiveCorrect(0);
      setMistakeCount(prev => prev + 1);
    }

    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);

    if (onTrackProgress) {
      onTrackProgress('sentences', {
        sentenceId: currentSentence.id,
        correct: isCorrect
      });
    }
  };

  const handleNext = () => {
    if (currentIdx < sentences.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setAvailableTiles(initTilesFromSentence(sentences[nextIdx]));
      setPlacedTiles([]);
      setFeedback(null);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({
          mode: 'sentences',
          score,
          total: sentences.length,
          xpEarned,
          consecutiveCorrect
        });
      }
    }
  };

  const handleClear = () => {
    if (feedback) return;
    setAvailableTiles(initTilesFromSentence(currentSentence));
    setPlacedTiles([]);
  };

  const handleRetry = () => {
    startExercise(selectedDifficulty);
  };

  // --- Difficulty Picker Phase ---
  if (phase === 'pick-difficulty') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Build Sentences" subtitle="Arrange words to build sentences" icon="🧱" onExit={onExit} />
        <div style={styles.pickerSectionTitle}>Choose difficulty level</div>
        <div style={styles.cefrGrid}>
          <div
            style={{ ...styles.cefrCard, border: '2px solid #ffd700' }}
            onClick={() => startExercise(null)}
          >
            <div style={styles.cefrLevel}>All Levels</div>
            <div style={styles.cefrDesc}>{sentenceData.length} sentences</div>
          </div>
          {difficultyLevels.map(([level, count]) => (
            <div
              key={level}
              style={styles.cefrCard}
              onClick={() => startExercise(level)}
            >
              <div style={styles.cefrLevel}>{level}</div>
              <div style={styles.cefrDesc}>
                {level === 'A1' ? 'Beginner' : level === 'A2' ? 'Elementary' : level === 'B1' ? 'Intermediate' : level === 'B2' ? 'Upper Intermediate' : level}
                {' · '}{count} sentences
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    const accuracy = sentences.length > 0 ? Math.round((score / sentences.length) * 100) : 0;
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{ title: 'Sentence Building Complete!', score, total: sentences.length, xpEarned, accuracy }}
          onRetry={handleRetry}
          onExit={onExit}
        />
      </div>
    );
  }

  const progress = ((currentIdx + 1) / sentences.length) * 100;

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title="Build Sentences"
        subtitle={`Sentence ${currentIdx + 1} of ${sentences.length}${selectedDifficulty ? ` · ${selectedDifficulty}` : ''}`}
        icon="🧱"
        onExit={onExit}
      />

      <div className="content-row" style={styles.contentRow}>
        <div style={styles.main}>
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${progress}%`}} />
          </div>

      <div style={styles.card}>
        <p style={styles.instruction}>Arrange the words to translate:</p>
        <div style={styles.englishSentence}>{currentSentence.en}</div>

        {/* Placed tiles area */}
        <div style={styles.placedArea}>
          {placedTiles.length === 0 ? (
            <span style={styles.placeholderText}>Tap words below to build the sentence</span>
          ) : (
            placedTiles.map(tile => (
              <button key={tile.id} style={styles.placedTile} onClick={() => handlePlacedClick(tile)}>
                {tile.word}
              </button>
            ))
          )}
        </div>

        {/* Available tiles */}
        <div style={styles.availableArea}>
          {availableTiles.map(tile => (
            <button key={tile.id} style={styles.availableTile} onClick={() => handleTileClick(tile)}>
              {tile.word}
            </button>
          ))}
        </div>

        <div style={styles.actions}>
          {!feedback && (
            <>
              <button style={styles.clearBtn} onClick={handleClear}>Clear</button>
              <button style={styles.submitBtn} onClick={handleSubmit}>Check</button>
            </>
          )}
          {feedback && (
            <button style={styles.nextBtn} onClick={handleNext}>
              {currentIdx < sentences.length - 1 ? 'Next →' : 'Finish'}
            </button>
          )}
        </div>

        {feedback && (
          <div style={{
            ...styles.feedbackBox,
            borderColor: feedback.correct ? '#4ade80' : '#f87171'
          }}>
            <div style={{ color: feedback.correct ? '#4ade80' : '#f87171', fontWeight: '700', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              {feedback.correct ? 'Correct!' : 'Not quite...'}
            </div>
            {!feedback.correct && (
              <div style={{ color: 'rgba(255,255,255,0.8)' }}>
                Correct: <strong style={{ color: '#ffd700' }}>
                  <ClickableText text={currentSentence[langCode]} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
                </strong>
              </div>
            )}
          </div>
        )}
      </div>

          <div style={styles.scoreBar}>
            <span>Score: {score}/{currentIdx + (feedback ? 1 : 0)}</span>
            <span>XP: +{xpEarned}</span>
          </div>
        </div>
        <LessonChat {...chat} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
      </div>
      <WordToolbar selectedWord={selectedWord} onDismiss={dismissWord} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} langName={langName} />
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
  cefrGrid: {
    display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem',
  },
  cefrCard: {
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px', padding: '1.5rem 2rem', textAlign: 'center',
    cursor: 'pointer', transition: 'all 0.2s', minWidth: '140px',
  },
  cefrLevel: { fontSize: '1.4rem', fontWeight: '700', color: '#ffd700', marginBottom: '0.3rem' },
  cefrDesc: { fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' },
  progressBar: {
    width: '100%',
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    marginBottom: '2rem',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ffd700, #ffed4e)',
    transition: 'width 0.3s ease'
  },
  card: {
    maxWidth: '650px',
    margin: '0 auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '2rem',
    textAlign: 'center',
    border: '1px solid rgba(255,215,0,0.2)'
  },
  instruction: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '0.5rem'
  },
  englishSentence: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#4dabf7',
    marginBottom: '1.5rem'
  },
  placedArea: {
    minHeight: '60px',
    background: 'rgba(255,215,0,0.05)',
    border: '2px dashed rgba(255,215,0,0.3)',
    borderRadius: '12px',
    padding: '0.75rem',
    marginBottom: '1rem',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.9rem'
  },
  placedTile: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  availableArea: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    justifyContent: 'center',
    marginBottom: '1.5rem'
  },
  availableTile: {
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  clearBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.6rem 1.5rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontFamily: 'inherit'
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '0.6rem 1.5rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #51cf66, #37b24d)',
    border: 'none',
    color: '#fff',
    padding: '0.6rem 1.5rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  feedbackBox: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '1rem',
    borderLeft: '4px solid'
  },
  scoreBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginTop: '1.5rem',
    padding: '0.75rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '10px',
    maxWidth: '650px',
    margin: '1.5rem auto 0',
    fontSize: '1rem',
    color: '#ffd700',
    fontWeight: '600'
  }
};

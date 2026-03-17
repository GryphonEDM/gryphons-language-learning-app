import React, { useState, useCallback } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { getAllVocabularyWords } from '../../utils/dictionaryBuilder.js';
import { WordToolbar, ClickableText } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';
import { cefrMatches } from '../../utils/speechUtils.js';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2'];

export default function ListeningMode({ langCode = 'uk', vocabularySets = [], onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress, onMarkMastered, masteredWordsList = [] }) {
  const langName = langCode === 'ru' ? 'Russian' : langCode === 'de' ? 'German' : 'Ukrainian';
  const [phase, setPhase] = useState('picker'); // picker, playing, complete
  const [pickerStep, setPickerStep] = useState('category'); // category, cefr
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cefrFilter, setCefrFilter] = useState('all');
  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });
  const chat = useLessonChat({ langName, langCode, systemPrompt: `You are a helpful ${langName} language tutor. The student is doing a listening and dictation exercise — they hear a ${langName} word and type what they hear. Answer questions about spelling, pronunciation, or vocabulary concisely. Keep responses under 150 words.`, onSpeak, ttsEnabled, ttsVolume });
  const [words, setWords] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null); // { correct, diff }
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [usedSlowSpeed, setUsedSlowSpeed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const getFilteredWords = useCallback((cat, cefr) => {
    if (cat) {
      // Specific category selected — use its words
      return (cat.words || []).map(w => ({
        uk: w.uk, en: w.en, phonetic: w.phonetic || '',
        source: w.source || cat.setId,
        examples: w.examples || [], examplesEn: w.examplesEn || [],
      }));
    }
    // All words mode
    if (cefr && cefr !== 'all' && vocabularySets.length > 0) {
      const filtered = [];
      const seen = new Set();
      vocabularySets.forEach(set => {
        if (!cefrMatches(set.difficulty || '', cefr)) return;
        (set.words || []).forEach(w => {
          const key = (w.uk || '').toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            filtered.push({
              uk: w.uk, en: w.en, phonetic: w.phonetic || '',
              source: w.source || set.setId,
              examples: w.examples || [], examplesEn: w.examplesEn || [],
            });
          }
        });
      });
      if (filtered.length >= 5) return filtered;
    }
    return getAllVocabularyWords(langCode);
  }, [langCode, vocabularySets]);

  const startExercise = useCallback((cat, cefr) => {
    const all = getFilteredWords(cat, cefr);
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    setWords(shuffled.slice(0, 10));
    setCurrentIdx(0);
    setUserInput('');
    setFeedback(null);
    setScore(0);
    setXpEarned(0);
    setSubmitted(false);
    setPhase('playing');
  }, [getFilteredWords]);

  const handleSelectCategory = useCallback((cat) => {
    setSelectedCategory(cat);
    const diff = cat ? cat.difficulty : 'Mixed';
    const hasMixedLevels = !diff || diff === 'Mixed' || diff.includes('-');
    if (hasMixedLevels) {
      setCefrFilter('all');
      setPickerStep('cefr');
    } else {
      setCefrFilter('all');
      startExercise(cat, 'all');
    }
  }, [startExercise]);

  const handleSelectAllWords = useCallback(() => {
    setSelectedCategory(null);
    setCefrFilter('all');
    setPickerStep('cefr');
  }, []);

  const handleSelectCefr = useCallback((level) => {
    setCefrFilter(level);
    startExercise(selectedCategory, level);
  }, [selectedCategory, startExercise]);

  const handleBackToPicker = useCallback(() => {
    if (pickerStep === 'cefr') {
      setPickerStep('category');
    }
  }, [pickerStep]);

  const currentWord = words[currentIdx];

  const handlePlay = useCallback(() => {
    if (ttsEnabled && onSpeak && currentWord) {
      onSpeak(currentWord[langCode] || currentWord.uk, playbackRate, ttsVolume);
    }
  }, [ttsEnabled, onSpeak, currentWord, playbackRate, ttsVolume]);

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (rate === 0.5) setUsedSlowSpeed(true);
  };

  const computeDiff = (target, input) => {
    const t = target.toLowerCase();
    const inp = input.toLowerCase();
    const diff = [];
    const maxLen = Math.max(t.length, inp.length);

    for (let i = 0; i < maxLen; i++) {
      if (i >= inp.length) {
        diff.push({ char: t[i], type: 'missing' });
      } else if (i >= t.length) {
        diff.push({ char: inp[i], type: 'extra' });
      } else if (t[i] === inp[i]) {
        diff.push({ char: inp[i], type: 'correct' });
      } else {
        diff.push({ char: inp[i], type: 'wrong', expected: t[i] });
      }
    }
    return diff;
  };

  const handleSubmit = () => {
    if (!userInput.trim() || submitted) return;

    const targetWord = currentWord[langCode] || currentWord.uk;
    const isCorrect = userInput.trim().toLowerCase() === targetWord.toLowerCase();
    const diff = computeDiff(targetWord, userInput.trim());
    const pointsEarned = isCorrect ? 20 : 5;

    setFeedback({ correct: isCorrect, diff });
    setSubmitted(true);

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setXpEarned(prev => prev + pointsEarned);
    if (onAddXP) onAddXP(pointsEarned);

    if (onTrackProgress) {
      onTrackProgress('listening', {
        word: currentWord[langCode] || currentWord.uk,
        correct: isCorrect
      });
    }
  };

  const handleNext = () => {
    if (currentIdx < words.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setUserInput('');
      setFeedback(null);
      setSubmitted(false);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({
          mode: 'listening',
          score,
          total: words.length,
          xpEarned,
          usedSlowSpeed
        });
      }
    }
  };

  const handleRetry = () => {
    startExercise(selectedCategory, cefrFilter);
  };

  // --- Picker Phase ---
  if (phase === 'picker') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Listening Practice" subtitle="Listen and type what you hear" icon="👂" onExit={onExit} />

        {pickerStep === 'category' && (
          <>
            <div style={styles.pickerSectionTitle}>Choose a word category</div>
            <div style={styles.categoryGrid}>
              <div
                style={{ ...styles.categoryCard, border: '2px solid #ffd700' }}
                onClick={handleSelectAllWords}
              >
                <div style={styles.categoryIcon}>🎲</div>
                <div style={styles.categoryName}>All Words</div>
                <div style={styles.categoryMeta}>Random from all categories</div>
              </div>

              {vocabularySets.map(set => (
                <div
                  key={set.setId}
                  style={styles.categoryCard}
                  onClick={() => handleSelectCategory(set)}
                >
                  <div style={styles.categoryIcon}>{set.icon}</div>
                  <div style={styles.categoryName}>{set.nameEn}</div>
                  <div style={styles.categoryMeta}>
                    <span style={styles.categoryDifficulty}>{set.difficulty}</span>
                    {' · '}
                    <span>{set.totalWords || set.words?.length || 0} words</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {pickerStep === 'cefr' && (
          <>
            <button style={styles.backStepBtn} onClick={handleBackToPicker}>
              ← Back to categories
            </button>
            <div style={styles.pickerSectionTitle}>
              Filter by difficulty level
              {selectedCategory && <span style={styles.pickerCategoryBadge}>{selectedCategory.icon} {selectedCategory.nameEn}</span>}
            </div>
            <div style={styles.cefrGrid}>
              <div
                style={{ ...styles.cefrCard, ...(cefrFilter === 'all' ? styles.cefrCardActive : {}) }}
                onClick={() => handleSelectCefr('all')}
              >
                <div style={styles.cefrLevel}>All Levels</div>
                <div style={styles.cefrDesc}>Include all difficulty levels</div>
              </div>
              {CEFR_LEVELS.map(level => (
                <div
                  key={level}
                  style={{ ...styles.cefrCard, ...(cefrFilter === level ? styles.cefrCardActive : {}) }}
                  onClick={() => handleSelectCefr(level)}
                >
                  <div style={styles.cefrLevel}>{level}</div>
                  <div style={styles.cefrDesc}>
                    {level === 'A1' ? 'Beginner' : level === 'A2' ? 'Elementary' : level === 'B1' ? 'Intermediate' : 'Upper Intermediate'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (phase === 'complete') {
    const accuracy = words.length > 0 ? Math.round((score / words.length) * 100) : 0;
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{
            title: 'Listening Session Complete!',
            score,
            total: words.length,
            xpEarned,
            accuracy
          }}
          onRetry={handleRetry}
          onExit={() => setPhase('picker')}
          exitLabel="Back to List"
        />
      </div>
    );
  }

  const progress = ((currentIdx + 1) / words.length) * 100;
  const diffColors = { correct: '#4ade80', wrong: '#f87171', missing: '#fbbf24', extra: '#f87171' };

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title="Listening Practice"
        subtitle={`Word ${currentIdx + 1} of ${words.length}${selectedCategory ? ` · ${selectedCategory.nameEn}` : ''}`}
        icon="👂"
        onExit={() => setPhase('picker')}
      />

      <div className="content-row" style={styles.contentRow}>
        <div style={styles.main}>
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${progress}%`}} />
          </div>

      <div style={styles.card}>
        <p style={styles.instruction}>Listen to the word and type what you hear</p>

        <button style={styles.playBtn} onClick={handlePlay}>
          🔊 Play Word
        </button>

        <div style={styles.speedControls}>
          {[0.5, 0.75, 1, 1.25].map(rate => (
            <button
              key={rate}
              style={{
                ...styles.speedBtn,
                ...(playbackRate === rate ? styles.speedBtnActive : {})
              }}
              onClick={() => handleSpeedChange(rate)}
            >
              {rate}x
            </button>
          ))}
        </div>

        <div style={styles.inputArea}>
          <input
            style={styles.input}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (submitted) handleNext();
                else handleSubmit();
              }
            }}
            placeholder={`Type the ${langCode === 'ru' ? 'Russian' : langCode === 'de' ? 'German' : 'Ukrainian'} word...`}
            disabled={submitted}
            autoFocus
          />
          {!submitted ? (
            <button style={styles.submitBtn} onClick={handleSubmit}>
              Check
            </button>
          ) : (
            <button style={styles.nextBtn} onClick={handleNext}>
              {currentIdx < words.length - 1 ? 'Next →' : 'Finish'}
            </button>
          )}
        </div>

        {feedback && (
          <div style={styles.feedbackArea}>
            <div style={{
              ...styles.feedbackHeader,
              color: feedback.correct ? '#4ade80' : '#f87171'
            }}>
              {feedback.correct ? 'Correct!' : 'Not quite...'}
            </div>

            <div style={styles.diffDisplay}>
              {feedback.diff.map((d, i) => (
                <span key={i} style={{
                  color: diffColors[d.type],
                  fontWeight: '700',
                  fontSize: '1.5rem',
                  textDecoration: d.type === 'extra' ? 'line-through' : 'none'
                }}>
                  {d.char}
                </span>
              ))}
            </div>

            {!feedback.correct && (
              <div style={styles.correctAnswer}>
                Correct answer: <strong><ClickableText text={currentWord.uk} onWordClick={handleWordClick} activeWord={selectedWord?.word} /></strong>
                {currentWord.en && <span style={styles.translation}> ({currentWord.en})</span>}
              </div>
            )}
          </div>
        )}
      </div>

          <div style={styles.scoreBar}>
            <span>Score: {score}/{currentIdx + (submitted ? 1 : 0)}</span>
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
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap',
  },
  pickerCategoryBadge: {
    fontSize: '0.9rem', background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.3)',
    padding: '0.25rem 0.75rem', borderRadius: '20px', color: '#ffd700', fontWeight: '500',
  },
  backStepBtn: {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.7)', padding: '0.5rem 1rem', borderRadius: '10px',
    cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', marginTop: '0.5rem',
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
  categoryDifficulty: { color: '#4dabf7', fontWeight: '600' },
  cefrGrid: {
    display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem',
  },
  cefrCard: {
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px', padding: '1.5rem 2rem', textAlign: 'center',
    cursor: 'pointer', transition: 'all 0.2s', minWidth: '140px',
  },
  cefrCardActive: { border: '2px solid #ffd700', background: 'rgba(255,215,0,0.1)' },
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
    maxWidth: '600px',
    margin: '0 auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '2rem',
    textAlign: 'center',
    border: '1px solid rgba(255,215,0,0.2)'
  },
  instruction: {
    fontSize: '1.1rem',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '1.5rem'
  },
  playBtn: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    border: 'none',
    color: '#fff',
    padding: '1rem 2.5rem',
    borderRadius: '16px',
    fontSize: '1.3rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    marginBottom: '1rem'
  },
  speedControls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem'
  },
  speedBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.4rem 0.8rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  speedBtnActive: {
    background: 'rgba(255,215,0,0.2)',
    borderColor: '#ffd700',
    color: '#ffd700',
    fontWeight: '600'
  },
  inputArea: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  input: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '1.1rem',
    fontFamily: 'inherit',
    outline: 'none'
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '0.75rem 1.5rem',
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
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  feedbackArea: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '1.25rem'
  },
  feedbackHeader: {
    fontSize: '1.3rem',
    fontWeight: '700',
    marginBottom: '0.75rem'
  },
  diffDisplay: {
    marginBottom: '0.75rem',
    letterSpacing: '2px'
  },
  correctAnswer: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.7)'
  },
  translation: {
    color: '#4dabf7'
  },
  scoreBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginTop: '1.5rem',
    padding: '0.75rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '10px',
    maxWidth: '600px',
    margin: '1.5rem auto 0',
    fontSize: '1rem',
    color: '#ffd700',
    fontWeight: '600'
  }
};

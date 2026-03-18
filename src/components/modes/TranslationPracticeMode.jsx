import React, { useState, useCallback } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { getAllVocabularyWords } from '../../utils/dictionaryBuilder.js';
import { WordToolbar, ClickableText } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';
import { cefrMatches } from '../../utils/speechUtils.js';
import useNextShortcut from '../../hooks/useNextShortcut.js';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2'];

export default function TranslationPracticeMode({ langCode = 'uk', vocabularySets = [], onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress, onMarkMastered, masteredWordsList = [] }) {
  const [phase, setPhase] = useState('picker'); // picker, playing, complete
  const [pickerStep, setPickerStep] = useState('category'); // category, cefr
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cefrFilter, setCefrFilter] = useState('all');
  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });
  const [direction, setDirection] = useState(`en-${langCode}`); // en-XX or XX-en
  const [words, setWords] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [usedHints, setUsedHints] = useState(false);
  const [sessionUsedHints, setSessionUsedHints] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const langName = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' }[langCode] || 'Ukrainian';
  const langNative = { uk: 'Українська', ru: 'Русский', de: 'Deutsch', es: 'Español', fr: 'Français', el: 'Ελληνικά', hi: 'हिन्दी', ar: 'العربية', ko: '한국어', zh: '中文', ja: '日本語' }[langCode] || 'Українська';
  const chat = useLessonChat({ langName, langCode, systemPrompt: `You are a helpful ${langName} language tutor. The student is doing a translation practice exercise — translating words between English and ${langName}. Answer questions about vocabulary, usage, or grammar concisely. Keep responses under 150 words.`, onSpeak, ttsEnabled, ttsVolume });
  const dirLabel = direction === `en-${langCode}` ? `EN → ${langCode.toUpperCase()}` : `${langCode.toUpperCase()} → EN`;

  const getFilteredWords = useCallback((cat, cefr) => {
    if (cat) {
      return (cat.words || []).map(w => ({
        uk: w.uk, en: w.en, phonetic: w.phonetic || '',
        source: w.source || cat.setId,
        examples: w.examples || [], examplesEn: w.examplesEn || [],
      }));
    }
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
    setStreak(0);
    setHintLevel(0);
    setUsedHints(false);
    setSessionUsedHints(false);
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
  const prompt = direction === `en-${langCode}` ? currentWord?.en : currentWord?.uk;
  const answer = direction === `en-${langCode}` ? currentWord?.uk : currentWord?.en;

  const getAcceptedAnswers = () => {
    if (!answer) return [];
    return answer.split('/').map(a => a.trim().toLowerCase()).filter(Boolean);
  };

  const getHint = () => {
    if (!answer) return '';
    if (hintLevel === 0) return '';
    if (hintLevel === 1) return answer.split('').map(c => c === ' ' ? ' ' : '_').join(' ');
    if (hintLevel >= 2) return answer[0] + answer.slice(1).split('').map(c => c === ' ' ? ' ' : '_').join(' ');
    return '';
  };

  const handleHint = () => {
    if (hintLevel < 2) {
      setHintLevel(prev => prev + 1);
      setUsedHints(true);
      setSessionUsedHints(true);
    }
  };

  const handleSubmit = () => {
    if (!userInput.trim() || submitted) return;

    const accepted = getAcceptedAnswers();
    const isCorrect = accepted.includes(userInput.trim().toLowerCase());
    const xpBase = 20;
    const hintPenalty = hintLevel * 5;
    const pointsEarned = isCorrect ? Math.max(5, xpBase - hintPenalty) : 3;

    setFeedback({ correct: isCorrect });
    setSubmitted(true);

    if (isCorrect) {
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      if (ttsEnabled && onSpeak && direction === `en-${langCode}`) {
        onSpeak(answer, 0.8, ttsVolume);
      }
    } else {
      setStreak(0);
    }

    setXpEarned(prev => prev + pointsEarned);
    if (onAddXP) onAddXP(pointsEarned);

    if (onTrackProgress) {
      onTrackProgress('translation', {
        word: currentWord[langCode] || currentWord.uk,
        correct: isCorrect,
        direction
      });
    }
  };

  const handleNext = () => {
    if (currentIdx < words.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setUserInput('');
      setFeedback(null);
      setHintLevel(0);
      setUsedHints(false);
      setSubmitted(false);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({
          mode: 'translation',
          score,
          total: words.length,
          xpEarned,
          usedHints: sessionUsedHints,
          direction
        });
      }
    }
  };

  const handleRetry = () => {
    startExercise(selectedCategory, cefrFilter);
  };

  useNextShortcut(handleNext, submitted);

  const handleDirectionChange = () => {
    const newDir = direction === `en-${langCode}` ? `${langCode}-en` : `en-${langCode}`;
    setDirection(newDir);
    const all = getFilteredWords(selectedCategory, cefrFilter);
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    setWords(shuffled.slice(0, 10));
    setCurrentIdx(0);
    setUserInput('');
    setFeedback(null);
    setScore(0);
    setXpEarned(0);
    setStreak(0);
    setHintLevel(0);
    setUsedHints(false);
    setSessionUsedHints(false);
    setSubmitted(false);
  };

  // --- Picker Phase ---
  if (phase === 'picker') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Translation Practice" subtitle="Translate words between languages" icon="🔄" onExit={onExit} />

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
            title: 'Translation Practice Complete!',
            score,
            total: words.length,
            xpEarned,
            accuracy
          }}
          onRetry={handleRetry}
          onExit={onExit}
        />
      </div>
    );
  }

  const progress = ((currentIdx + 1) / words.length) * 100;
  const hintText = getHint();

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title="Translation Practice"
        subtitle={`Question ${currentIdx + 1} of ${words.length}${selectedCategory ? ` · ${selectedCategory.nameEn}` : ''}`}
        icon="🔄"
        onExit={onExit}
      />

      <div className="content-row" style={styles.contentRow}>
        <div style={styles.main}>
      <div style={styles.controls}>
        <button style={styles.dirBtn} onClick={handleDirectionChange}>
          {dirLabel} (tap to switch)
        </button>
        {streak >= 3 && <span style={styles.streakBadge}>🔥 {streak} streak!</span>}
      </div>

      <div style={styles.progressBar}>
        <div style={{...styles.progressFill, width: `${progress}%`}} />
      </div>

      <div style={styles.card}>
        <p style={styles.promptLabel}>
          Translate to {direction === `en-${langCode}` ? langName : 'English'}:
        </p>
        <div style={styles.prompt}>
          <ClickableText text={prompt ?? ''} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
        </div>

        {hintText && (
          <div style={styles.hintBox}>
            Hint: <span style={styles.hintText}>{hintText}</span>
          </div>
        )}

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
            placeholder="Type your answer..."
            disabled={submitted}
            autoFocus
          />
        </div>

        <div style={styles.actions}>
          {!submitted && (
            <>
              <button style={styles.hintBtn} onClick={handleHint} disabled={hintLevel >= 2}>
                💡 Hint {hintLevel > 0 ? `(${hintLevel}/2)` : ''}
              </button>
              <button style={styles.submitBtn} onClick={handleSubmit}>
                Check Answer
              </button>
            </>
          )}
          {submitted && (
            <button style={styles.nextBtn} onClick={handleNext}>
              {currentIdx < words.length - 1 ? 'Next →' : 'Finish'}
            </button>
          )}
        </div>

        {feedback && (
          <div style={{
            ...styles.feedbackBox,
            borderColor: feedback.correct ? '#4ade80' : '#f87171'
          }}>
            <div style={{
              fontSize: '1.3rem',
              fontWeight: '700',
              color: feedback.correct ? '#4ade80' : '#f87171',
              marginBottom: '0.5rem'
            }}>
              {feedback.correct ? 'Correct!' : 'Not quite...'}
            </div>
            {!feedback.correct && (
              <div style={{ color: 'rgba(255,255,255,0.8)' }}>
                Correct answer: <strong style={{ color: '#ffd700' }}>
                  <ClickableText text={answer ?? ''} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
                </strong>
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
  controls: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  dirBtn: {
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.4)',
    color: '#ffd700',
    padding: '0.5rem 1.25rem',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    fontFamily: 'inherit'
  },
  streakBadge: {
    background: 'rgba(255,100,0,0.2)',
    padding: '0.4rem 0.8rem',
    borderRadius: '20px',
    color: '#ff6b35',
    fontWeight: '600',
    fontSize: '0.9rem'
  },
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
  promptLabel: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '0.5rem'
  },
  prompt: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#ffd700',
    marginBottom: '1.5rem',
    lineHeight: 1.3
  },
  hintBox: {
    background: 'rgba(255,215,0,0.1)',
    borderRadius: '10px',
    padding: '0.75rem',
    marginBottom: '1rem',
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.7)'
  },
  hintText: {
    fontFamily: 'monospace',
    letterSpacing: '3px',
    color: '#ffd700'
  },
  inputArea: {
    marginBottom: '1rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '1.2rem',
    fontFamily: 'inherit',
    outline: 'none',
    textAlign: 'center',
    boxSizing: 'border-box'
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap'
  },
  hintBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.6rem 1.25rem',
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
    maxWidth: '600px',
    margin: '1.5rem auto 0',
    fontSize: '1rem',
    color: '#ffd700',
    fontWeight: '600'
  }
};

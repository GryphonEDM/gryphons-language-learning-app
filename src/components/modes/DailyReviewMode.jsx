import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { WordToolbar } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import { buildDailySession, getTodayStr, getYesterdayStr } from '../../utils/dailySession.js';
import { reviewCard, formatInterval } from '../../utils/srs.js';
import { MINIMAL_PAIRS } from '../../data/minimalPairs.js';
import { storageGet, storageSet } from '../../utils/storage.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';

const RATINGS = [
  { key: 'again', label: 'Again', color: '#f87171', bg: 'rgba(248,113,113,0.15)', xp: 0, num: '1' },
  { key: 'hard', label: 'Hard', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', xp: 2, num: '2' },
  { key: 'good', label: 'Good', color: '#4ade80', bg: 'rgba(74,222,128,0.15)', xp: 5, num: '3' },
  { key: 'easy', label: 'Easy', color: '#4dabf7', bg: 'rgba(77,171,247,0.15)', xp: 8, num: '4' },
];

export default function DailyReviewMode({
  langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP,
  onTrackProgress, vocabularyMastery, modeProgress, vocabularySets,
  onMarkMastered, masteredWordsList = [], struggleContext
}) {
  const langNames = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese', en: 'English' };
  const langName = langNames[langCode] || 'Ukrainian';
  const targetField = langCode === 'en' ? 'en' : langCode;

  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });
  const chat = useLessonChat({ langName, langCode, systemPrompt: `You are a helpful ${langName} language tutor. The student is doing a daily spaced repetition review — they see ${langName} words and self-rate their recall. Help with vocabulary, pronunciation, or usage questions concisely. Keep responses under 150 words.${struggleContext ? `\n\nStudent's known weak areas:\n${struggleContext}\nIf the student asks about or struggles with one of these words, proactively offer a brief mnemonic or explanation.` : ''}`, onSpeak, ttsEnabled, ttsVolume });
  const mountedRef = useRef(true);

  // Build session — useState so we can rebuild on "Continue"
  const [session, setSession] = useState(() => buildDailySession({
    vocabularyMastery, modeProgress, langCode, ttsEnabled,
  }));

  const [phase, setPhase] = useState('summary'); // summary, review, newWords, exercise, complete
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [reviewScore, setReviewScore] = useState(0);
  const [newWordsScore, setNewWordsScore] = useState(0);
  const [exerciseScore, setExerciseScore] = useState(0);
  const [exerciseInput, setExerciseInput] = useState('');
  const [exerciseFeedback, setExerciseFeedback] = useState(null);
  const [exercisePlayed, setExercisePlayed] = useState(null); // for listening: index of played word
  const [continueMode, setContinueMode] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (phase === 'review') {
        if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          setRevealed(true);
        } else if (revealed) {
          const num = parseInt(e.key);
          if (num >= 1 && num <= 4) {
            e.preventDefault();
            handleRating(RATINGS[num - 1].key);
          }
        }
      } else if (phase === 'newWords' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        // space/enter not used here — user picks a button
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, revealed, currentIdx]);

  // Auto-play TTS when card changes
  useEffect(() => {
    if (phase === 'review' && !revealed && session.reviewCards[currentIdx]) {
      const word = session.reviewCards[currentIdx].word;
      if (ttsEnabled && onSpeak) {
        setTimeout(() => { if (mountedRef.current) onSpeak(word, 1, ttsVolume); }, 300);
      }
    }
  }, [phase, currentIdx, revealed]);

  useEffect(() => {
    if (phase === 'newWords' && session.newCards[currentIdx]) {
      const word = session.newCards[currentIdx].word;
      if (ttsEnabled && onSpeak) {
        setTimeout(() => { if (mountedRef.current) onSpeak(word, 1, ttsVolume); }, 300);
      }
    }
  }, [phase, currentIdx]);

  // --- Handlers ---

  const handleStart = useCallback(() => {
    if (session.reviewCards.length > 0) {
      setPhase('review');
    } else if (session.newCards.length > 0) {
      setPhase('newWords');
    } else if (session.exercise) {
      setPhase('exercise');
    }
    setCurrentIdx(0);
    setRevealed(false);
  }, [session]);

  const handleRating = useCallback((rating) => {
    if (!revealed) return;
    const card = session.reviewCards[currentIdx];
    if (!card) return;

    const r = RATINGS.find(r => r.key === rating);
    const points = r?.xp || 0;
    setXpEarned(prev => prev + points);
    if (points > 0 && onAddXP) onAddXP(points);
    if (rating !== 'again') setReviewScore(prev => prev + 1);

    if (onTrackProgress) {
      onTrackProgress('daily-review', {
        word: card.word,
        correct: rating !== 'again',
        rating,
      });
    }

    // Advance
    const nextIdx = currentIdx + 1;
    if (nextIdx < session.reviewCards.length) {
      setCurrentIdx(nextIdx);
      setRevealed(false);
    } else if (!continueMode && session.newCards.length > 0) {
      setPhase('newWords');
      setCurrentIdx(0);
    } else if (!continueMode && session.exercise) {
      setPhase('exercise');
      setCurrentIdx(0);
      startExerciseItem(0);
    } else {
      finishSession();
    }
  }, [revealed, currentIdx, session, continueMode, onAddXP, onTrackProgress]);

  const handleNewWordRating = useCallback((rating) => {
    const card = session.newCards[currentIdx];
    if (!card) return;

    const points = 3; // equal XP — the SRS rating (easy vs good) is the meaningful distinction
    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);
    setNewWordsScore(prev => prev + 1);

    if (onTrackProgress) {
      onTrackProgress('daily-review', {
        word: card.word,
        correct: true,
        rating,
      });
    }

    const nextIdx = currentIdx + 1;
    if (nextIdx < session.newCards.length) {
      setCurrentIdx(nextIdx);
    } else if (session.exercise) {
      setPhase('exercise');
      setCurrentIdx(0);
      startExerciseItem(0);
    } else {
      finishSession();
    }
  }, [currentIdx, session, onAddXP, onTrackProgress]);

  // --- Exercise handlers ---
  const startExerciseItem = useCallback((idx) => {
    setExerciseFeedback(null);
    setExerciseInput('');
    setExercisePlayed(null);

    if (!session.exercise) return;
    const { mode, words } = session.exercise;
    if (idx >= words.length) return;

    if (mode === 'listening' && ttsEnabled && onSpeak) {
      // Play the word for listening exercise
      setTimeout(() => {
        if (mountedRef.current) onSpeak(words[idx].word, 1, ttsVolume);
      }, 400);
    }
  }, [session, ttsEnabled, onSpeak, ttsVolume]);

  const handleExerciseSubmit = useCallback(() => {
    if (!session.exercise || exerciseFeedback) return;
    const { mode, words } = session.exercise;
    const item = words[currentIdx];
    if (!item) return;

    let correct = false;

    if (mode === 'translation') {
      correct = exerciseInput.trim().toLowerCase() === item.word.toLowerCase();
    } else if (mode === 'listening') {
      return; // handled by handleListeningChoice
    }

    const points = correct ? 5 : 0;
    setExerciseFeedback({ correct, answer: item.word });
    if (correct) {
      setExerciseScore(prev => prev + 1);
      setXpEarned(prev => prev + points);
      if (onAddXP) onAddXP(points);
    }

    if (onTrackProgress) {
      onTrackProgress('daily-review', {
        word: item.word,
        correct,
        userAnswer: exerciseInput.trim(),
        expected: item.word,
      });
    }
  }, [session, currentIdx, exerciseInput, exerciseFeedback, onAddXP, onTrackProgress]);

  const handleListeningChoice = useCallback((chosenWord, correctWord) => {
    if (exerciseFeedback) return;
    const correct = chosenWord === correctWord;
    const points = correct ? 5 : 0;
    setExerciseFeedback({ correct, answer: correctWord });
    if (correct) {
      setExerciseScore(prev => prev + 1);
      setXpEarned(prev => prev + points);
      if (onAddXP) onAddXP(points);
    }

    if (onTrackProgress) {
      onTrackProgress('daily-review', {
        word: correctWord,
        correct,
        userAnswer: chosenWord,
        expected: correctWord,
      });
    }
  }, [exerciseFeedback, onAddXP, onTrackProgress]);

  const handleExerciseNext = useCallback(() => {
    const nextIdx = currentIdx + 1;
    if (session.exercise && nextIdx < session.exercise.words.length) {
      setCurrentIdx(nextIdx);
      setExerciseFeedback(null);
      setExerciseInput('');
      startExerciseItem(nextIdx);
    } else {
      finishSession();
    }
  }, [currentIdx, session, startExerciseItem]);

  const finishSession = useCallback(() => {
    // Update streak
    const today = getTodayStr();
    const yesterday = getYesterdayStr();
    let streakData;
    try {
      streakData = JSON.parse(storageGet('dailyReviewStreak') || '{}');
    } catch { streakData = {}; }

    if (streakData.lastSessionDate !== today) {
      if (streakData.lastSessionDate === yesterday) {
        streakData.currentStreak = (streakData.currentStreak || 0) + 1;
      } else {
        streakData.currentStreak = 1;
      }
      streakData.lastSessionDate = today;
      streakData.bestStreak = Math.max(streakData.bestStreak || 0, streakData.currentStreak);
      storageSet('dailyReviewStreak', JSON.stringify(streakData));
    }

    // Completion bonus
    const bonus = 25;
    setXpEarned(prev => prev + bonus);
    if (onAddXP) onAddXP(bonus);

    setPhase('complete');

    if (onComplete) {
      onComplete({
        mode: 'daily-review',
        reviewed: session.reviewCards.length,
        newWords: session.newCards.length,
        exerciseScore,
        xpEarned: xpEarned + bonus,
        streak: streakData.currentStreak || 1,
        remainingDue: session.remainingDue,
      });
    }
  }, [session, exerciseScore, xpEarned, onAddXP, onComplete]);

  const handleContinue = useCallback(() => {
    // Rebuild session from current SRS state (cards reviewed so far are no longer due)
    const freshSession = buildDailySession({ vocabularyMastery, modeProgress, langCode, ttsEnabled });
    setSession(freshSession);
    setContinueMode(true);
    setCurrentIdx(0);
    setRevealed(false);
    setReviewScore(0);
    setExerciseScore(0);
    if (freshSession.reviewCards.length > 0) {
      setPhase('review');
    } else {
      setPhase('complete'); // nothing left to review
    }
  }, [vocabularyMastery, modeProgress, langCode, ttsEnabled]);

  // --- Streak data for display ---
  const streakData = useMemo(() => {
    try {
      return JSON.parse(storageGet('dailyReviewStreak') || '{}');
    } catch { return {}; }
  }, []);

  // Listening exercise choices (must be at top level, not inside conditional render)
  const listeningChoices = useMemo(() => {
    if (!session.exercise || session.exercise.mode !== 'listening' || phase !== 'exercise') return [];
    const item = session.exercise.words[currentIdx];
    if (!item) return [];
    const allSessionWords = [...session.reviewCards, ...session.newCards];
    const others = allSessionWords
      .filter(w => w.word !== item.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [item, ...others].sort(() => Math.random() - 0.5);
  }, [phase, currentIdx, session]);

  const todayStr = getTodayStr();
  const doneToday = streakData.lastSessionDate === todayStr;

  // --- Render helpers ---

  const renderIntervalPreview = (card) => {
    return RATINGS.map(r => {
      const preview = reviewCard(card, r.key);
      return { ...r, interval: formatInterval(preview.interval) };
    });
  };

  // --- SUMMARY PHASE ---
  if (phase === 'summary') {
    const { summary, remainingDue } = session;
    const nothing = summary.totalSteps === 0;

    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Daily Review" subtitle="Your personalized study session" icon="📋" onExit={onExit} />

        <div style={styles.summaryCard}>
          {nothing ? (
            <>
              <div style={styles.summaryIcon}>✅</div>
              <h2 style={styles.summaryTitle}>All caught up!</h2>
              <p style={styles.summaryText}>No cards due right now. Keep studying to add more words to your review queue.</p>
              {streakData.currentStreak > 0 && (
                <div style={styles.streakBadge}>🔥 {streakData.currentStreak}-day streak</div>
              )}
            </>
          ) : (
            <>
              <div style={styles.summaryIcon}>📋</div>
              <h2 style={styles.summaryTitle}>Today's Session</h2>
              <div style={styles.summaryItems}>
                {summary.reviewCount > 0 && (
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryNum}>{summary.reviewCount}</span>
                    <span>cards to review</span>
                  </div>
                )}
                {summary.newCount > 0 && (
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryNum}>{summary.newCount}</span>
                    <span>new words</span>
                  </div>
                )}
                {summary.exerciseMode && (
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryNum}>{summary.exerciseCount}</span>
                    <span>{summary.exerciseMode === 'listening' ? 'listening' : summary.exerciseMode === 'minimal-pairs' ? 'ear training' : 'translation'} questions</span>
                  </div>
                )}
              </div>
              {remainingDue > 0 && summary.reviewCount >= 20 && (
                <p style={styles.summaryMuted}>+{remainingDue} more cards due (will show after this session)</p>
              )}
              {streakData.currentStreak > 0 && (
                <div style={styles.streakBadge}>🔥 {streakData.currentStreak}-day streak{!doneToday ? ' — review to keep it!' : ''}</div>
              )}
              <button style={styles.startBtn} onClick={handleStart}>Start Session →</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- REVIEW PHASE ---
  if (phase === 'review') {
    const card = session.reviewCards[currentIdx];
    if (!card) { finishSession(); return null; }

    const progress = ((currentIdx + 1) / session.reviewCards.length) * 100;
    const previews = revealed ? renderIntervalPreview(card) : [];

    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader
          title="Daily Review"
          subtitle={`Review ${currentIdx + 1} of ${session.reviewCards.length}`}
          icon="📋"
          onExit={onExit}
        />
        <div className="content-row" style={styles.contentRow}>
          <div style={styles.main}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>

            <div style={styles.card}>
              <div style={styles.wordBig}>{card.word}</div>
              {card.phonetic && <div style={styles.phonetic}>{card.phonetic}</div>}

              {ttsEnabled && onSpeak && (
                <button style={styles.ttsBtn} onClick={() => onSpeak(card.word, 1, ttsVolume)}>
                  🔊 Play
                </button>
              )}

              {!revealed ? (
                <button style={styles.showBtn} onClick={() => setRevealed(true)}>
                  Show Answer
                </button>
              ) : (
                <div style={styles.answerArea}>
                  <div style={styles.translation}>{card.en}</div>
                  {card.examples?.length > 0 && (
                    <div style={styles.example}>
                      <div style={styles.exampleText}>{card.examples[0]}</div>
                      {card.examplesEn?.length > 0 && (
                        <div style={styles.exampleEn}>{card.examplesEn[0]}</div>
                      )}
                    </div>
                  )}

                  <div style={styles.ratingRow}>
                    {previews.map(r => (
                      <button
                        key={r.key}
                        style={{ ...styles.ratingBtn, borderColor: r.color, background: r.bg }}
                        onClick={() => handleRating(r.key)}
                      >
                        <div style={{ color: r.color, fontWeight: '700', fontSize: '1rem' }}>{r.label}</div>
                        <div style={styles.ratingInterval}>{r.interval}</div>
                        <div style={styles.ratingKey}>{r.num}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.scoreBar}>
              <span>Score: {reviewScore}/{currentIdx + (revealed ? 1 : 0)}</span>
              <span>XP: +{xpEarned}</span>
            </div>
          </div>
          <LessonChat {...chat} onWordClick={handleWordClick} activeWord={selectedWord?.word} onSpeak={onSpeak} />
        </div>
        <WordToolbar selectedWord={selectedWord} onDismiss={dismissWord} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} langName={langName} langCode={langCode} onMarkMastered={onMarkMastered} isMastered={masteredWordsList.some(m => m.word === selectedWord?.word)} />
      </div>
    );
  }

  // --- NEW WORDS PHASE ---
  if (phase === 'newWords') {
    const card = session.newCards[currentIdx];
    if (!card) {
      if (session.exercise) { setPhase('exercise'); setCurrentIdx(0); startExerciseItem(0); }
      else finishSession();
      return null;
    }

    const totalNew = session.newCards.length;
    const progress = ((currentIdx + 1) / totalNew) * 100;

    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader
          title="New Words"
          subtitle={`Word ${currentIdx + 1} of ${totalNew}`}
          icon="✨"
          onExit={onExit}
        />
        <div className="content-row" style={styles.contentRow}>
          <div style={styles.main}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%`, background: 'linear-gradient(90deg, #4dabf7, #339af0)' }} />
            </div>

            <div style={styles.card}>
              <div style={styles.newBadge}>NEW</div>
              <div style={styles.wordBig}>{card.word}</div>
              {card.phonetic && <div style={styles.phonetic}>{card.phonetic}</div>}
              <div style={styles.translation}>{card.en}</div>

              {ttsEnabled && onSpeak && (
                <button style={styles.ttsBtn} onClick={() => onSpeak(card.word, 1, ttsVolume)}>
                  🔊 Listen
                </button>
              )}

              {card.examples?.length > 0 && (
                <div style={styles.example}>
                  <div style={styles.exampleText}>{card.examples[0]}</div>
                  {card.examplesEn?.length > 0 && (
                    <div style={styles.exampleEn}>{card.examplesEn[0]}</div>
                  )}
                </div>
              )}

              <div style={styles.newRatingRow}>
                <button
                  style={{ ...styles.newRatingBtn, borderColor: '#4dabf7', background: 'rgba(77,171,247,0.15)' }}
                  onClick={() => handleNewWordRating('easy')}
                >
                  I knew this ✓
                </button>
                <button
                  style={{ ...styles.newRatingBtn, borderColor: '#4ade80', background: 'rgba(74,222,128,0.15)' }}
                  onClick={() => handleNewWordRating('good')}
                >
                  New to me 📝
                </button>
              </div>
            </div>

            <div style={styles.scoreBar}>
              <span>New: {currentIdx + 1}/{totalNew}</span>
              <span>XP: +{xpEarned}</span>
            </div>
          </div>
          <LessonChat {...chat} onWordClick={handleWordClick} activeWord={selectedWord?.word} onSpeak={onSpeak} />
        </div>
      </div>
    );
  }

  // --- EXERCISE PHASE ---
  if (phase === 'exercise' && session.exercise) {
    const { mode, words } = session.exercise;
    const item = words[currentIdx];
    if (!item) { finishSession(); return null; }

    const progress = ((currentIdx + 1) / words.length) * 100;
    const modeLabel = mode === 'listening' ? 'Listening' : mode === 'minimal-pairs' ? 'Ear Training' : 'Translation';

    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader
          title={`Exercise: ${modeLabel}`}
          subtitle={`Question ${currentIdx + 1} of ${words.length}`}
          icon={mode === 'listening' ? '👂' : mode === 'minimal-pairs' ? '🎯' : '🔄'}
          onExit={onExit}
        />
        <div className="content-row" style={styles.contentRow}>
          <div style={styles.main}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%`, background: 'linear-gradient(90deg, #a855f7, #7c3aed)' }} />
          </div>

          <div style={styles.card}>
            {mode === 'translation' && (
              <>
                <p style={styles.exercisePrompt}>Translate to {langName}:</p>
                <div style={styles.exerciseWord}>{item.en}</div>
                <div style={styles.inputArea}>
                  <input
                    style={styles.input}
                    value={exerciseInput}
                    onChange={e => setExerciseInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (exerciseFeedback) handleExerciseNext();
                        else handleExerciseSubmit();
                      }
                    }}
                    placeholder={`Type in ${langName}...`}
                    disabled={!!exerciseFeedback}
                    autoFocus
                  />
                  {!exerciseFeedback ? (
                    <button style={styles.submitBtn} onClick={handleExerciseSubmit}>Check</button>
                  ) : (
                    <button style={styles.nextBtn} onClick={handleExerciseNext}>
                      {currentIdx < words.length - 1 ? 'Next →' : 'Finish'}
                    </button>
                  )}
                </div>
                {exerciseFeedback && (
                  <div style={{ ...styles.exerciseFeedback, color: exerciseFeedback.correct ? '#4ade80' : '#f87171' }}>
                    {exerciseFeedback.correct ? '✓ Correct!' : `✗ Answer: ${exerciseFeedback.answer}`}
                  </div>
                )}
              </>
            )}

            {mode === 'listening' && (
              <>
                <p style={styles.exercisePrompt}>Which word did you hear?</p>
                <button style={styles.ttsBtn} onClick={() => onSpeak(item.word, 1, ttsVolume)}>
                  🔊 Play Again
                </button>
                <div style={styles.choiceGrid}>
                  {listeningChoices.map((choice, i) => (
                    <button
                      key={i}
                      style={{
                        ...styles.choiceBtn,
                        ...(exerciseFeedback && choice.word === item.word ? styles.choiceCorrect : {}),
                        ...(exerciseFeedback && choice.word !== item.word ? styles.choiceWrong : {}),
                      }}
                      onClick={() => handleListeningChoice(choice.word, item.word)}
                      disabled={!!exerciseFeedback}
                    >
                      <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{choice.word}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{choice.en}</div>
                    </button>
                  ))}
                </div>
                {exerciseFeedback && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ ...styles.exerciseFeedback, color: exerciseFeedback.correct ? '#4ade80' : '#f87171' }}>
                      {exerciseFeedback.correct ? '✓ Correct!' : `✗ It was: ${exerciseFeedback.answer}`}
                    </div>
                    <button style={styles.nextBtn} onClick={handleExerciseNext}>
                      {currentIdx < words.length - 1 ? 'Next →' : 'Finish'}
                    </button>
                  </div>
                )}
              </>
            )}

            {mode === 'minimal-pairs' && (() => {
              const pairsData = MINIMAL_PAIRS[langCode]?.pairs || [];
              if (pairsData.length === 0) return <p>No minimal pairs available.</p>;
              const pair = pairsData[currentIdx % pairsData.length];
              const playedSide = ((currentIdx * 7 + 3) % 11) % 2 === 0 ? 'A' : 'B'; // pseudo-random but stable per index
              const playedWord = playedSide === 'A' ? pair.wordA : pair.wordB;

              return (
                <>
                  <p style={styles.exercisePrompt}>Which word did you hear?</p>
                  <button style={styles.ttsBtn} onClick={() => onSpeak(playedWord.text, 1, ttsVolume)}>
                    🔊 Play Again
                  </button>
                  <div style={styles.pairGrid}>
                    {['A', 'B'].map(side => {
                      const w = side === 'A' ? pair.wordA : pair.wordB;
                      const isAnswer = side === playedSide;
                      return (
                        <button
                          key={side}
                          style={{
                            ...styles.pairCard,
                            ...(exerciseFeedback && isAnswer ? styles.choiceCorrect : {}),
                            ...(exerciseFeedback && !isAnswer ? styles.choiceMuted : {}),
                          }}
                          onClick={() => handleListeningChoice(w.text, playedWord.text)}
                          disabled={!!exerciseFeedback}
                        >
                          <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{w.text}</div>
                          <div style={{ fontSize: '0.85rem', color: '#4dabf7' }}>{w.phonetic}</div>
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{w.english}</div>
                        </button>
                      );
                    })}
                  </div>
                  {exerciseFeedback && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ ...styles.exerciseFeedback, color: exerciseFeedback.correct ? '#4ade80' : '#f87171' }}>
                        {exerciseFeedback.correct ? '✓ Correct!' : `✗ It was: ${playedWord.text}`}
                      </div>
                      <p style={styles.tip}>{pair.tip}</p>
                      <button style={styles.nextBtn} onClick={handleExerciseNext}>
                        {currentIdx < words.length - 1 ? 'Next →' : 'Finish'}
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div style={styles.scoreBar}>
            <span>Exercise: {exerciseScore}/{currentIdx + (exerciseFeedback ? 1 : 0)}</span>
            <span>XP: +{xpEarned}</span>
          </div>
          </div>
          <LessonChat {...chat} onWordClick={handleWordClick} activeWord={selectedWord?.word} onSpeak={onSpeak} />
        </div>
      </div>
    );
  }

  // --- COMPLETE PHASE ---
  if (phase === 'complete') {
    const streakNow = (() => {
      try { return JSON.parse(storageGet('dailyReviewStreak') || '{}'); } catch { return {}; }
    })();

    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{
            title: 'Daily Review Complete!',
            score: reviewScore + exerciseScore,
            total: session.reviewCards.length + (session.exercise?.words?.length || 0),
            xpEarned,
            accuracy: session.reviewCards.length > 0
              ? Math.round((reviewScore / session.reviewCards.length) * 100)
              : 100,
          }}
          onRetry={session.remainingDue > 0 ? handleContinue : handleStart}
          onExit={onExit}
          exitLabel="Back to Menu"
        />

        <div style={styles.completeExtra}>
          {streakNow.currentStreak > 0 && (
            <div style={styles.streakDisplay}>
              <span style={{ fontSize: '2rem' }}>🔥</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffd700' }}>
                {streakNow.currentStreak}-day streak
              </span>
              {streakNow.currentStreak === 1 && <span style={{ color: 'rgba(255,255,255,0.5)' }}>Streak started!</span>}
            </div>
          )}

          <div style={styles.sessionBreakdown}>
            {session.reviewCards.length > 0 && (
              <div style={styles.breakdownItem}>📋 {session.reviewCards.length} cards reviewed</div>
            )}
            {session.newCards.length > 0 && (
              <div style={styles.breakdownItem}>✨ {session.newCards.length} new words learned</div>
            )}
            {session.exercise && (
              <div style={styles.breakdownItem}>
                {session.exercise.mode === 'listening' ? '👂' : session.exercise.mode === 'minimal-pairs' ? '🎯' : '🔄'}{' '}
                Exercise: {exerciseScore}/{session.exercise.words.length}
              </div>
            )}
          </div>

          {session.remainingDue > 0 && (
            <div style={styles.continueSection}>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>
                {session.remainingDue} more cards due
              </p>
              <button style={styles.continueBtn} onClick={handleContinue}>
                Continue Reviewing →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// --- Styles ---
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  contentRow: { display: 'flex', gap: '1.5rem', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0, maxWidth: '650px' },

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
    background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '2rem',
    textAlign: 'center', border: '1px solid rgba(255,215,0,0.2)',
  },
  wordBig: { fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' },
  phonetic: { fontSize: '1.1rem', color: '#4dabf7', marginBottom: '0.75rem', fontStyle: 'italic' },
  translation: { fontSize: '1.4rem', color: '#ffd700', marginBottom: '1rem', fontWeight: '600' },
  ttsBtn: {
    background: 'rgba(77,171,247,0.2)', border: '1px solid rgba(77,171,247,0.4)',
    color: '#4dabf7', padding: '0.5rem 1.2rem', borderRadius: '10px',
    cursor: 'pointer', fontSize: '1rem', fontFamily: 'inherit', marginBottom: '1rem',
  },
  showBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none',
    color: '#1a1a2e', padding: '1rem 2.5rem', borderRadius: '16px',
    fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    marginTop: '1rem',
  },
  answerArea: { marginTop: '1rem' },
  example: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '0.75rem',
    marginBottom: '1.25rem',
  },
  exampleText: { fontSize: '1rem', marginBottom: '0.3rem' },
  exampleEn: { fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' },

  // Rating buttons
  ratingRow: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem',
  },
  ratingBtn: {
    border: '2px solid', borderRadius: '12px', padding: '0.75rem 0.5rem',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
    color: '#fff', transition: 'all 0.2s',
  },
  ratingInterval: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' },
  ratingKey: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' },

  // New words
  newBadge: {
    display: 'inline-block', background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '20px',
    fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem', letterSpacing: '1px',
  },
  newRatingRow: { display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' },
  newRatingBtn: {
    border: '2px solid', borderRadius: '12px', padding: '0.75rem 1.5rem',
    cursor: 'pointer', fontFamily: 'inherit', color: '#fff', fontSize: '1rem', fontWeight: '600',
  },

  // Exercise
  exercisePrompt: { fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' },
  exerciseWord: { fontSize: '1.8rem', fontWeight: '700', color: '#ffd700', marginBottom: '1.5rem' },
  inputArea: { display: 'flex', gap: '0.75rem', marginBottom: '1rem' },
  input: {
    flex: 1, padding: '0.75rem 1rem', borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)',
    color: '#fff', fontSize: '1.1rem', fontFamily: 'inherit', outline: 'none',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none',
    color: '#1a1a2e', padding: '0.75rem 1.5rem', borderRadius: '10px',
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #51cf66, #37b24d)', border: 'none',
    color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '10px',
    fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    marginTop: '0.5rem',
  },
  exerciseFeedback: { fontSize: '1.2rem', fontWeight: '700', marginTop: '0.5rem' },
  choiceGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' },
  choiceBtn: {
    background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: '12px', padding: '1rem', cursor: 'pointer', fontFamily: 'inherit',
    color: '#fff', textAlign: 'center', transition: 'all 0.2s',
  },
  choiceCorrect: { borderColor: '#4ade80', background: 'rgba(74,222,128,0.15)' },
  choiceWrong: { opacity: 0.5 },
  choiceMuted: { opacity: 0.4 },
  pairGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' },
  pairCard: {
    background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: '16px', padding: '1.25rem', cursor: 'pointer', fontFamily: 'inherit',
    color: '#fff', textAlign: 'center', transition: 'all 0.2s',
  },
  tip: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', fontStyle: 'italic' },

  // Score bar
  scoreBar: {
    display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem',
    padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
    fontSize: '1rem', color: '#ffd700', fontWeight: '600',
  },

  // Summary phase
  summaryCard: {
    maxWidth: '500px', margin: '2rem auto', background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px', padding: '2.5rem', textAlign: 'center',
    border: '2px solid rgba(255,215,0,0.2)',
  },
  summaryIcon: { fontSize: '3rem', marginBottom: '1rem' },
  summaryTitle: { color: '#ffd700', fontSize: '1.6rem', marginBottom: '1.5rem' },
  summaryText: { color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' },
  summaryMuted: { color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '1rem' },
  summaryItems: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' },
  summaryItem: {
    display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem',
    color: 'rgba(255,255,255,0.8)',
  },
  summaryNum: { fontWeight: '800', color: '#ffd700' },
  streakBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    background: 'rgba(255,165,0,0.15)', border: '1px solid rgba(255,165,0,0.3)',
    padding: '0.5rem 1rem', borderRadius: '20px', color: '#ffa500',
    fontWeight: '600', marginBottom: '1.5rem',
  },
  startBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none',
    color: '#1a1a2e', padding: '1rem 2.5rem', borderRadius: '16px',
    fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  },

  // Complete phase extras
  completeExtra: { maxWidth: '500px', margin: '1.5rem auto', textAlign: 'center' },
  streakDisplay: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  sessionBreakdown: {
    background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem',
    marginBottom: '1.5rem',
  },
  breakdownItem: {
    padding: '0.4rem 0', fontSize: '1rem', color: 'rgba(255,255,255,0.7)',
  },
  continueSection: { marginTop: '1rem' },
  continueBtn: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none',
    color: '#fff', padding: '0.75rem 2rem', borderRadius: '12px',
    fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
  },
};

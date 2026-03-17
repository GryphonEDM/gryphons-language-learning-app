import React, { useState, useRef, useEffect, useCallback } from 'react';
import { storageGet, storageSet } from '../../utils/storage.js';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { WordToolbar, ClickableText } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';
import ExerciseRenderer from './grammar/ExerciseRenderer.jsx';
import { stopSpeaking } from '../../App.jsx';
import { createAudioContext, playSound } from '../../utils/soundEffects.js';
import { ENCOURAGEMENTS, MISTAKE_MESSAGES, ENCOURAGEMENTS_RU, MISTAKE_MESSAGES_RU } from '../../utils/encouragement.js';

const TIER_INFO = {
  A1: { name: 'A1 Foundation', color: '#4ade80' },
  A2: { name: 'A2 Building Blocks', color: '#4dabf7' },
  B1: { name: 'B1 Intermediate', color: '#c084fc' },
  B2: { name: 'B2 Advanced', color: '#f97316' },
};

export default function GrammarMode({ langCode = 'uk', grammarLessons, onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress, onMarkMastered, masteredWordsList = [] }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';

  // Phases: picker, lesson, exercise, section-complete, complete, review
  const [phase, setPhase] = useState('picker');
  const [isReading, setIsReading] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [sectionIdx, setSectionIdx] = useState(0);

  // Exercise queue system (supports wrong-answer re-queuing)
  const [exerciseQueue, setExerciseQueue] = useState([]);
  const [queueIdx, setQueueIdx] = useState(0);

  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [totalExercises, setTotalExercises] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sectionScore, setSectionScore] = useState(0);
  const [sectionTotal, setSectionTotal] = useState(0);
  const [encouragement, setEncouragement] = useState('');
  const [completedLessons, setCompletedLessons] = useState(() => {
    try {
      const key = `grammar_completed_${langCode}`;
      return JSON.parse(storageGet(key)) || {};
    } catch { return {}; }
  });

  // Audio context for sound effects
  const audioCtxRef = useRef(null);
  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
    return audioCtxRef.current;
  };

  const encouragements = langCode === 'ru' ? ENCOURAGEMENTS_RU : ENCOURAGEMENTS;
  const mistakeMessages = langCode === 'ru' ? MISTAKE_MESSAGES_RU : MISTAKE_MESSAGES;

  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });

  const buildSystemPrompt = useCallback(() => {
    const lessonName = selectedLesson?.nameEn ?? 'grammar';
    const section = selectedLesson?.sections[sectionIdx];
    const sectionName = section?.title ?? '';
    return `You are a helpful ${langName} grammar tutor. The student is currently studying "${lessonName}"${sectionName ? ` — specifically the section "${sectionName}"` : ''}. Answer their questions clearly and concisely. Use examples in ${langName} with English translations. Keep responses focused and under 150 words unless a longer explanation is truly needed.`;
  }, [selectedLesson, sectionIdx, langName]);

  const chat = useLessonChat({
    langName,
    langCode,
    systemPrompt: buildSystemPrompt(),
    onSpeak,
    ttsEnabled,
    ttsVolume,
  });

  const currentSection = selectedLesson?.sections[sectionIdx];
  const currentExercise = exerciseQueue[queueIdx] || null;

  // Save completed lessons to localStorage + server
  useEffect(() => {
    const key = `grammar_completed_${langCode}`;
    storageSet(key, JSON.stringify(completedLessons));
  }, [completedLessons, langCode]);

  // Check if lesson prerequisites are met
  const isLessonUnlocked = () => true;

  // Group lessons by tier
  const lessonsByTier = {};
  grammarLessons.forEach(lesson => {
    const tier = lesson.tier || 'A1';
    if (!lessonsByTier[tier]) lessonsByTier[tier] = [];
    lessonsByTier[tier].push(lesson);
  });

  const startLesson = (lesson) => {
    if (!isLessonUnlocked(lesson)) return;
    setSelectedLesson(lesson);
    setSectionIdx(0);
    setPhase('lesson');
    setScore(0);
    setTotalExercises(0);
    setXpEarned(0);
    setStreak(0);
    setBestStreak(0);
    setSectionScore(0);
    setSectionTotal(0);
    setFeedback(null);
    chat.reset();
  };

  const startExercises = () => {
    const exercises = [...(currentSection?.exercises || [])];
    setExerciseQueue(exercises);
    setQueueIdx(0);
    setFeedback(null);
    setSectionScore(0);
    setSectionTotal(0);
    setPhase('exercise');
  };

  const handleAnswer = (isCorrect) => {
    if (feedback) return;

    const basePoints = isCorrect ? 15 : 3;
    let bonusPoints = 0;

    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);

    // Streak bonuses
    if (isCorrect && [3, 5, 7, 10, 15, 20].includes(newStreak)) {
      bonusPoints = newStreak >= 10 ? 25 : newStreak >= 7 ? 15 : newStreak >= 5 ? 10 : 5;
      playSound('achievement', getAudioCtx());
    } else {
      playSound(isCorrect ? 'correct' : 'wrong', getAudioCtx());
    }

    const points = basePoints + bonusPoints;
    const ex = currentExercise;
    setFeedback({
      correct: isCorrect,
      explanation: ex?.explanation || '',
      bonusPoints,
    });
    setTotalExercises(prev => prev + 1);
    setSectionTotal(prev => prev + 1);

    if (isCorrect) {
      setScore(prev => prev + 1);
      setSectionScore(prev => prev + 1);
      setEncouragement(encouragements[Math.floor(Math.random() * encouragements.length)]);
    } else {
      setEncouragement(mistakeMessages[Math.floor(Math.random() * mistakeMessages.length)]);
      // Re-queue wrong answers: insert 3 positions later
      setExerciseQueue(prev => {
        const copy = [...prev];
        const insertAt = Math.min(queueIdx + 3, copy.length);
        copy.splice(insertAt, 0, ex);
        return copy;
      });
    }

    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);
  };

  const handleNext = () => {
    setFeedback(null);
    setEncouragement('');

    if (queueIdx < exerciseQueue.length - 1) {
      setQueueIdx(prev => prev + 1);
    } else {
      // Section done — show section-complete or lesson-complete
      if (sectionIdx < selectedLesson.sections.length - 1) {
        playSound('complete', getAudioCtx());
        // Track section completion
        setCompletedLessons(prev => {
          const sections = prev[selectedLesson.lessonId]?.sections || [];
          if (!sections.includes(sectionIdx)) sections.push(sectionIdx);
          return { ...prev, [selectedLesson.lessonId]: { ...prev[selectedLesson.lessonId], sections } };
        });
        setPhase('section-complete');
      } else {
        // Lesson complete
        playSound('achievement', getAudioCtx());
        setPhase('complete');

        setCompletedLessons(prev => {
          const allSections = selectedLesson.sections.map((_, i) => i);
          return { ...prev, [selectedLesson.lessonId]: { done: true, sections: allSections } };
        });

        if (onComplete) {
          onComplete({ mode: 'grammar', lessonId: selectedLesson.lessonId, score, totalExercises, xpEarned });
        }
        if (onTrackProgress) {
          onTrackProgress('grammar', { lessonId: selectedLesson.lessonId, completed: true });
        }
      }
    }
  };

  const handleNextSection = () => {
    setSectionIdx(prev => prev + 1);
    setPhase('lesson');
  };

  const handleRetry = () => {
    if (selectedLesson) startLesson(selectedLesson);
  };

  // ─── Picker ─────────────────────────────────────────────────────
  if (phase === 'picker') {
    const tiers = Object.keys(TIER_INFO);
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Grammar Lessons" subtitle={`Learn ${langName} grammar step by step`} icon="📐" onExit={onExit} />
        {tiers.map(tier => {
          const lessons = lessonsByTier[tier];
          if (!lessons || lessons.length === 0) return null;
          const info = TIER_INFO[tier];
          return (
            <div key={tier} style={styles.tierGroup}>
              <div style={styles.tierHeader}>
                <span style={{ ...styles.tierBadge, background: info.color }}>{tier}</span>
                <span style={styles.tierName}>{info.name}</span>
              </div>
              <div style={styles.grid}>
                {lessons.map(lesson => {
                  const unlocked = isLessonUnlocked(lesson);
                  const progress = completedLessons[lesson.lessonId];
                  const completed = progress?.done || (progress === true);
                  const sectionsCompleted = progress?.sections?.length || (completed ? lesson.sections.length : 0);
                  const hasProgress = sectionsCompleted > 0 && !completed;
                  return (
                    <div
                      key={lesson.lessonId}
                      style={{
                        ...styles.lessonCard,
                        ...(unlocked ? {} : styles.lessonCardLocked),
                        ...(completed ? styles.lessonCardCompleted : {}),
                        ...(hasProgress ? styles.lessonCardInProgress : {}),
                        position: 'relative',
                      }}
                      onClick={() => unlocked && startLesson(lesson)}
                    >
                      {completed && <div style={styles.completedBadge}>✓</div>}
                      <div style={styles.lessonIcon}>
                        {!unlocked ? '🔒' : lesson.icon}
                      </div>
                      <div style={styles.lessonInfo}>
                        <h3 style={{ ...styles.lessonTitle, ...(unlocked ? {} : { color: 'rgba(255,255,255,0.3)' }) }}>
                          {lesson.nameEn}
                        </h3>
                        <p style={styles.lessonTitleUk}>{langCode === 'ru' ? lesson.nameRu : lesson.nameUk}</p>
                        <p style={styles.lessonMeta}>
                          {sectionsCompleted > 0 ? `${sectionsCompleted}/${lesson.sections.length} sections` : `${lesson.sections.length} sections`}
                          {lesson.estimatedMinutes ? ` · ~${lesson.estimatedMinutes} min` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Completion ─────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{
            title: `${selectedLesson.nameEn} Complete!`,
            score,
            total: totalExercises,
            xpEarned,
            accuracy: totalExercises > 0 ? Math.round((score / totalExercises) * 100) : 0,
          }}
          onRetry={handleRetry}
          onExit={() => setPhase('picker')}
        />
        {bestStreak >= 3 && (
          <div style={styles.streakSummary}>
            🔥 Best streak: {bestStreak} in a row!
          </div>
        )}
      </div>
    );
  }

  // ─── Section Complete Mini-Celebration ───────────────────────────
  if (phase === 'section-complete') {
    const accuracy = sectionTotal > 0 ? Math.round((sectionScore / sectionTotal) * 100) : 0;
    const nextSection = selectedLesson?.sections[sectionIdx + 1];
    return (
      <div className="mode-container" style={styles.container}>
        <div style={styles.sectionCompleteCard}>
          <div style={styles.sectionCompleteIcon}>
            {accuracy === 100 ? '🌟' : accuracy >= 80 ? '🎉' : '👍'}
          </div>
          <h2 style={styles.sectionCompleteTitle}>Section Complete!</h2>
          <p style={styles.sectionCompleteSub}>{currentSection?.title}</p>
          <div style={styles.sectionStats}>
            <div style={styles.miniStat}>
              <span style={styles.miniStatValue}>{sectionScore}/{sectionTotal}</span>
              <span style={styles.miniStatLabel}>Correct</span>
            </div>
            <div style={styles.miniStat}>
              <span style={styles.miniStatValue}>{accuracy}%</span>
              <span style={styles.miniStatLabel}>Accuracy</span>
            </div>
            {streak >= 3 && (
              <div style={styles.miniStat}>
                <span style={styles.miniStatValue}>🔥 {streak}</span>
                <span style={styles.miniStatLabel}>Streak</span>
              </div>
            )}
          </div>
          <p style={styles.encourageMsg}>
            {encouragements[Math.floor(Math.random() * encouragements.length)]}
          </p>
          {nextSection && (
            <p style={styles.nextSectionPreview}>
              Next: {nextSection.title}
            </p>
          )}
          <button style={styles.practiceBtn} onClick={handleNextSection}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ─── Lesson Explanation View ────────────────────────────────────
  if (phase === 'lesson' && currentSection) {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader
          title={selectedLesson.nameEn}
          subtitle={`Section ${sectionIdx + 1} of ${selectedLesson.sections.length}`}
          icon={selectedLesson.icon}
          onExit={() => setPhase('picker')}
        />
        {/* Progress bar for sections */}
        <div style={styles.sectionProgress}>
          {selectedLesson.sections.map((_, i) => (
            <div key={i} style={{
              ...styles.sectionDot,
              background: i < sectionIdx ? '#4ade80' : i === sectionIdx ? '#ffd700' : 'rgba(255,255,255,0.15)',
            }} />
          ))}
        </div>
        <div className="content-row" style={styles.contentRow}>
          <div style={styles.sectionCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>{currentSection.title}</h3>
              {ttsEnabled && (
                <button style={styles.readAloudBtn} onClick={() => {
                  if (isReading) {
                    stopSpeaking();
                    setIsReading(false);
                  } else {
                    setIsReading(true);
                    onSpeak(currentSection.explanation, 0.8, ttsVolume).finally(() => setIsReading(false));
                  }
                }}>
                  {isReading ? '⏹ Stop' : '🔊 Read'}
                </button>
              )}
            </div>
            <p style={styles.explanation}><ClickableText text={currentSection.explanation} onWordClick={handleWordClick} activeWord={selectedWord?.word} /></p>

            {/* Tip card */}
            {currentSection.tip && (
              <div style={styles.tipCard}>
                <span style={styles.tipIcon}>💡</span>
                <span><ClickableText text={currentSection.tip} onWordClick={handleWordClick} activeWord={selectedWord?.word} /></span>
              </div>
            )}

            <div style={styles.examples}>
              <h4 style={styles.examplesTitle}>Examples:</h4>
              {currentSection.examples.map((ex, i) => {
                const nativeText = ex.uk ?? ex.ru ?? '';
                return (
                  <div key={i} style={styles.exampleRow}>
                    <div style={styles.exampleUk}>
                      <ClickableText text={nativeText} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
                      {ttsEnabled && (
                        <button style={styles.miniSpeak} onClick={() => onSpeak(nativeText, 0.8, ttsVolume)}>🔊</button>
                      )}
                    </div>
                    <div style={styles.exampleEn}>{ex.en}</div>
                  </div>
                );
              })}
            </div>

            <button style={styles.practiceBtn} onClick={startExercises}>
              Practice Exercises →
            </button>
          </div>
          <LessonChat {...chat} onSpeak={onSpeak} />
        </div>
        <WordToolbar selectedWord={selectedWord} onDismiss={dismissWord} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} langName={langName} langCode={langCode} onMarkMastered={onMarkMastered} isMastered={masteredWordsList.some(m => m.word === selectedWord?.word)} />
      </div>
    );
  }

  // ─── Exercise View ──────────────────────────────────────────────
  if (phase === 'exercise' && currentExercise) {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader
          title={currentSection?.title || ''}
          subtitle={`Exercise ${queueIdx + 1} of ${exerciseQueue.length}`}
          icon={selectedLesson?.icon || '📐'}
          onExit={() => setPhase('lesson')}
        />

        {/* Progress bar + streak */}
        <div style={styles.exerciseHeader}>
          <div style={styles.progressBarOuter}>
            <div style={{ ...styles.progressBarInner, width: `${((queueIdx + 1) / exerciseQueue.length) * 100}%` }} />
          </div>
          {streak >= 3 && (
            <div style={styles.streakBadge}>
              🔥 {streak}
            </div>
          )}
        </div>

        <div className="content-row" style={styles.contentRow}>
          <div style={styles.exerciseCard}>
            {/* Tip reminder during exercises */}
            {currentSection?.tip && (
              <div style={styles.tipCardSmall}>
                <span style={styles.tipIcon}>💡</span>
                <span><ClickableText text={currentSection.tip} onWordClick={handleWordClick} activeWord={selectedWord?.word} /></span>
              </div>
            )}

            <p style={styles.exercisePrompt}>
              <ClickableText text={currentExercise.prompt} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
              {ttsEnabled && currentExercise.prompt && currentExercise.type !== 'listen-type' && (
                <button style={styles.miniSpeak} onClick={() => {
                  // Extract Cyrillic text from prompt for TTS
                  const cyrillicMatch = currentExercise.prompt.match(/[а-яА-ЯіІїЇєЄґҐёЁ][а-яА-ЯіІїЇєЄґҐёЁ\s.,!?''"-]*/);
                  if (cyrillicMatch) onSpeak(cyrillicMatch[0].trim(), 0.8, ttsVolume);
                }}>🔊</button>
              )}
            </p>

            <ExerciseRenderer
              exercise={currentExercise}
              onAnswer={handleAnswer}
              onSpeak={onSpeak}
              ttsEnabled={ttsEnabled}
              ttsVolume={ttsVolume}
              feedback={feedback}
              langCode={langCode}
            />

            {feedback && (
              <div style={{ ...styles.feedbackBox, borderColor: feedback.correct ? '#4ade80' : '#f87171' }}>
                <div style={{ color: feedback.correct ? '#4ade80' : '#f87171', fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                  {feedback.correct ? '✓ Correct!' : '✗ Not quite...'}
                  {feedback.bonusPoints > 0 && (
                    <span style={styles.bonusXP}> +{feedback.bonusPoints} streak bonus!</span>
                  )}
                </div>
                {encouragement && (
                  <p style={styles.encourageText}>{encouragement}</p>
                )}
                {feedback.explanation && (
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', marginTop: '0.25rem' }}>{feedback.explanation}</p>
                )}
                <button style={styles.nextBtn} onClick={handleNext}>
                  Continue →
                </button>
              </div>
            )}
          </div>
          <LessonChat {...chat} onSpeak={onSpeak} />
        </div>
        <WordToolbar selectedWord={selectedWord} onDismiss={dismissWord} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} langName={langName} langCode={langCode} onMarkMastered={onMarkMastered} isMastered={masteredWordsList.some(m => m.word === selectedWord?.word)} />
      </div>
    );
  }

  return null;
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative',
  },
  contentRow: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
  },
  // Tier grouping
  tierGroup: {
    maxWidth: '900px',
    margin: '0 auto 2rem',
  },
  tierHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  tierBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontWeight: '800',
    fontSize: '0.8rem',
    color: '#1a1a2e',
  },
  tierName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  lessonCard: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '1.25rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    cursor: 'pointer',
    border: '2px solid rgba(255,215,0,0.2)',
    transition: 'all 0.3s',
  },
  lessonCardLocked: {
    opacity: 0.45,
    cursor: 'not-allowed',
    border: '2px solid rgba(255,255,255,0.08)',
  },
  lessonCardCompleted: {
    border: '2px solid #4ade80',
    background: 'rgba(74,222,128,0.08)',
  },
  lessonCardInProgress: {
    border: '2px solid rgba(250,204,21,0.5)',
  },
  completedBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    background: '#4ade80',
    color: '#000',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: '900',
    boxShadow: '0 2px 6px rgba(74,222,128,0.4)',
  },
  lessonIcon: { fontSize: '2.2rem' },
  lessonInfo: { flex: 1 },
  lessonTitle: { margin: 0, color: '#ffd700', fontSize: '1.1rem' },
  lessonTitleUk: { margin: '0.2rem 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' },
  lessonMeta: { margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' },
  // Section progress dots
  sectionProgress: {
    display: 'flex',
    gap: '0.4rem',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  sectionDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'background 0.3s',
  },
  // Section card
  sectionCard: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '2rem',
    border: '1px solid rgba(255,215,0,0.2)',
    width: '100%',
  },
  sectionTitle: { color: '#ffd700', fontSize: '1.4rem', marginBottom: '1rem' },
  explanation: { fontSize: '1.05rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' },
  // Tip card
  tipCard: {
    background: 'rgba(255,215,0,0.08)',
    border: '1px solid rgba(255,215,0,0.25)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-start',
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 1.5,
  },
  tipCardSmall: {
    background: 'rgba(255,215,0,0.06)',
    border: '1px solid rgba(255,215,0,0.15)',
    borderRadius: '10px',
    padding: '0.5rem 0.75rem',
    marginBottom: '1rem',
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'center',
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.6)',
  },
  tipIcon: { flexShrink: 0 },
  // Examples
  examples: { marginBottom: '1.5rem' },
  examplesTitle: { color: '#4dabf7', marginBottom: '0.75rem' },
  exampleRow: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem',
  },
  exampleUk: { fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  exampleEn: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' },
  miniSpeak: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.2rem',
    flexShrink: 0,
  },
  readAloudBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '0.3rem 0.7rem',
    borderRadius: '8px',
    color: '#ffd700',
    flexShrink: 0,
  },
  practiceBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '1rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  // Exercise header
  exerciseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    maxWidth: '900px',
    margin: '0 auto 1rem',
  },
  progressBarOuter: {
    flex: 1,
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    background: 'linear-gradient(90deg, #ffd700, #4ade80)',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  streakBadge: {
    background: 'rgba(255,100,0,0.15)',
    border: '1px solid rgba(255,100,0,0.3)',
    borderRadius: '20px',
    padding: '0.25rem 0.75rem',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#ff6b35',
    whiteSpace: 'nowrap',
  },
  // Exercise card
  exerciseCard: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '2rem',
    border: '1px solid rgba(255,215,0,0.2)',
    width: '100%',
  },
  exercisePrompt: { fontSize: '1.2rem', marginBottom: '1.5rem', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  feedbackBox: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '1rem',
    borderLeft: '4px solid',
    marginTop: '1rem',
  },
  bonusXP: {
    color: '#ffd700',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  encourageText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
    fontStyle: 'italic',
    margin: '0.25rem 0',
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #51cf66, #37b24d)',
    border: 'none',
    color: '#fff',
    padding: '0.6rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: '0.75rem',
  },
  // Section complete
  sectionCompleteCard: {
    maxWidth: '500px',
    margin: '3rem auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '24px',
    padding: '2.5rem',
    border: '1px solid rgba(255,215,0,0.25)',
    textAlign: 'center',
  },
  sectionCompleteIcon: { fontSize: '3rem', marginBottom: '0.5rem' },
  sectionCompleteTitle: { color: '#ffd700', fontSize: '1.5rem', margin: '0 0 0.25rem' },
  sectionCompleteSub: { color: 'rgba(255,255,255,0.6)', fontSize: '1rem', margin: '0 0 1.5rem' },
  sectionStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginBottom: '1.5rem',
  },
  miniStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#fff',
  },
  miniStatLabel: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '0.2rem',
  },
  encourageMsg: {
    color: '#4ade80',
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: '0 0 1rem',
  },
  nextSectionPreview: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.9rem',
    margin: '0 0 1.5rem',
  },
  streakSummary: {
    textAlign: 'center',
    color: '#ff6b35',
    fontSize: '1.1rem',
    fontWeight: '600',
    marginTop: '1rem',
  },
};

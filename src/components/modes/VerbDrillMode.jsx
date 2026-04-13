import React, { useState, useRef, useEffect, useCallback } from 'react';
import ExerciseRenderer from './grammar/ExerciseRenderer.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import ModeHeader from '../shared/ModeHeader.jsx';
import { createAudioContext, playSound } from '../../utils/soundEffects.js';
import { ENCOURAGEMENTS, MISTAKE_MESSAGES, ENCOURAGEMENTS_RU, MISTAKE_MESSAGES_RU, ENCOURAGEMENTS_DE, MISTAKE_MESSAGES_DE, ENCOURAGEMENTS_ES, MISTAKE_MESSAGES_ES, ENCOURAGEMENTS_FR, MISTAKE_MESSAGES_FR, ENCOURAGEMENTS_EL, MISTAKE_MESSAGES_EL, ENCOURAGEMENTS_HI, MISTAKE_MESSAGES_HI, ENCOURAGEMENTS_AR, MISTAKE_MESSAGES_AR, ENCOURAGEMENTS_KO, MISTAKE_MESSAGES_KO, ENCOURAGEMENTS_ZH, MISTAKE_MESSAGES_ZH, ENCOURAGEMENTS_JA, MISTAKE_MESSAGES_JA } from '../../utils/encouragement.js';

const EXERCISE_COUNT = 15;

const encouragementMap = { ru: ENCOURAGEMENTS_RU, de: ENCOURAGEMENTS_DE, es: ENCOURAGEMENTS_ES, fr: ENCOURAGEMENTS_FR, el: ENCOURAGEMENTS_EL, hi: ENCOURAGEMENTS_HI, ar: ENCOURAGEMENTS_AR, ko: ENCOURAGEMENTS_KO, zh: ENCOURAGEMENTS_ZH, ja: ENCOURAGEMENTS_JA };
const mistakeMap = { ru: MISTAKE_MESSAGES_RU, de: MISTAKE_MESSAGES_DE, es: MISTAKE_MESSAGES_ES, fr: MISTAKE_MESSAGES_FR, el: MISTAKE_MESSAGES_EL, hi: MISTAKE_MESSAGES_HI, ar: MISTAKE_MESSAGES_AR, ko: MISTAKE_MESSAGES_KO, zh: MISTAKE_MESSAGES_ZH, ja: MISTAKE_MESSAGES_JA };

const normalize = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase();

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate exercises from verb data
function generateExercises(tenseId, verbDrillData, count = EXERCISE_COUNT, langCode = 'uk') {
  const { meta, verbs } = verbDrillData;
  const exercises = [];
  const usedCombos = new Set();

  // For mixed mode, distribute across tenses
  const tenseDistribution = tenseId === 'mixed'
    ? [
        ...Array(4).fill('present'),
        ...Array(4).fill('past'),
        ...Array(4).fill('future'),
        ...Array(3).fill('imperative'),
      ]
    : Array(count).fill(tenseId);

  for (let i = 0; i < count; i++) {
    const currentTense = tenseDistribution[i] || tenseId;
    let attempts = 0;
    let exercise = null;

    while (attempts < 50) {
      attempts++;
      const verb = pickRandom(verbs);

      // Pick a slot based on tense
      let slotKey, slotLabel;
      if (currentTense === 'past') {
        const gender = pickRandom(meta.pastGenders);
        slotKey = gender.key;
        slotLabel = gender.label;
      } else if (currentTense === 'imperative') {
        const imp = pickRandom(meta.imperativePronouns);
        slotKey = imp;
        slotLabel = imp;
      } else {
        const pronoun = pickRandom(meta.pronouns);
        slotKey = pronoun;
        slotLabel = pronoun;
      }

      const comboKey = `${verb.infinitive}-${currentTense}-${slotKey}`;
      if (usedCombos.has(comboKey)) continue;

      const correctAnswer = verb[currentTense]?.[slotKey];
      if (!correctAnswer) continue;

      usedCombos.add(comboKey);

      // Determine exercise type by weighted random
      const isImperative = currentTense === 'imperative';
      const roll = Math.random() * 100;
      let exType;
      if (isImperative) {
        // No table-fill for imperative; redistribute weight
        exType = roll < 55 ? 'fill-blank' : roll < 90 ? 'multiple-choice' : 'form-recall';
      } else {
        exType = roll < 45 ? 'fill-blank' : roll < 75 ? 'multiple-choice' : roll < 90 ? 'form-recall' : 'table-fill';
      }

      if (exType === 'fill-blank') {
        exercise = generateFillBlank(verb, currentTense, slotKey, slotLabel, correctAnswer, meta, langCode);
      } else if (exType === 'multiple-choice') {
        exercise = generateMultipleChoice(verb, currentTense, slotKey, slotLabel, correctAnswer, meta, verbs);
      } else if (exType === 'form-recall') {
        exercise = generateFormRecall(verb, currentTense, slotKey, slotLabel, correctAnswer, meta);
      } else {
        exercise = generateTableFill(verb, currentTense, meta);
      }

      if (exercise) {
        exercise.verb = verb;
        exercise.tenseId = currentTense;
        break;
      }
    }

    if (exercise) exercises.push(exercise);
  }

  return exercises;
}

function generateFillBlank(verb, tense, slotKey, slotLabel, correctAnswer, meta, langCode = 'uk') {
  let prompt;
  if (tense === 'imperative') {
    if (langCode === 'ru') {
      prompt = `___, пожалуйста! (${verb.infinitive}, ${slotLabel})`;
    } else if (langCode === 'uk') {
      prompt = `___, будь ласка! (${verb.infinitive}, ${slotLabel})`;
    } else {
      prompt = `___! (${verb.infinitive}, ${slotLabel})`;
    }
  } else if (tense === 'past') {
    const obj = verb.transitive ? pickRandom(meta.sampleObjects) : verb.context || '';
    prompt = `${slotLabel} ___ ${obj}. (${verb.infinitive})`;
  } else {
    const obj = verb.transitive ? pickRandom(meta.sampleObjects) : verb.context || '';
    prompt = `${slotLabel} ___ ${obj}. (${verb.infinitive})`;
  }

  return {
    type: 'fill-blank',
    prompt: prompt.replace(/\s+/g, ' ').trim(),
    correctAnswer,
    explanation: getExplanation(verb, tense, slotKey, slotLabel, correctAnswer),
  };
}

function generateMultipleChoice(verb, tense, slotKey, slotLabel, correctAnswer, meta, allVerbs) {
  const distractors = new Set();

  if (tense === 'past') {
    // Distractors: other gender forms of same verb
    for (const g of meta.pastGenders) {
      if (g.key !== slotKey && verb[tense]?.[g.key]) {
        distractors.add(verb[tense][g.key]);
      }
    }
  } else if (tense === 'imperative') {
    // Distractors: other imperative forms of same verb + one from another verb
    for (const p of meta.imperativePronouns) {
      if (p !== slotKey && verb[tense]?.[p]) {
        distractors.add(verb[tense][p]);
      }
    }
    // Add one from another verb if needed
    if (distractors.size < 2) {
      const otherVerb = pickRandom(allVerbs.filter(v => v.infinitive !== verb.infinitive));
      if (otherVerb?.[tense]?.[slotKey]) {
        distractors.add(otherVerb[tense][slotKey]);
      }
    }
  } else {
    // Present/future: other pronoun forms of same verb + same-pronoun forms of other verbs
    const keys = tense === 'present' || tense === 'future' ? meta.pronouns : [];
    for (const p of keys) {
      if (p !== slotKey && verb[tense]?.[p]) {
        distractors.add(verb[tense][p]);
      }
      if (distractors.size >= 3) break;
    }
    // Fill remaining from other verbs
    const others = shuffle(allVerbs.filter(v => v.infinitive !== verb.infinitive));
    for (const ov of others) {
      if (distractors.size >= 3) break;
      if (ov[tense]?.[slotKey]) {
        distractors.add(ov[tense][slotKey]);
      }
    }
  }

  // Remove correct answer from distractors
  distractors.delete(correctAnswer);

  // Limit distractors (imperative may have fewer)
  const maxOptions = tense === 'imperative' ? 2 : 3;
  const distArr = [...distractors].slice(0, maxOptions);

  const options = shuffle([correctAnswer, ...distArr]);

  const obj = verb.transitive ? pickRandom(meta.sampleObjects) : verb.context || '';
  let prompt;
  if (tense === 'imperative') {
    prompt = `${verb.infinitive} (${slotLabel})`;
  } else if (tense === 'past') {
    prompt = `${slotLabel} ___ ${obj}. (${verb.infinitive})`;
  } else {
    prompt = `${slotLabel} ___ ${obj}. (${verb.infinitive})`;
  }

  return {
    type: 'multiple-choice',
    prompt: prompt.replace(/\s+/g, ' ').trim(),
    options,
    correctAnswer,
    explanation: getExplanation(verb, tense, slotKey, slotLabel, correctAnswer),
  };
}

function generateFormRecall(verb, tense, slotKey, slotLabel, correctAnswer, meta) {
  const tenseNames = { present: 'present', past: 'past', future: 'future', imperative: 'imperative' };
  let slotDesc;
  if (tense === 'past') {
    slotDesc = slotLabel;
  } else {
    slotDesc = slotLabel;
  }

  return {
    type: 'form-recall',
    prompt: `Type the ${tenseNames[tense]} form of "${verb.infinitive}" for ${slotDesc}`,
    correctAnswer,
    infinitiveEn: verb.infinitiveEn,
    explanation: getExplanation(verb, tense, slotKey, slotLabel, correctAnswer),
  };
}

function generateTableFill(verb, tense, meta) {
  const conjugation = verb[tense];
  if (!conjugation) return null;

  let allKeys, allLabels;
  if (tense === 'past') {
    allKeys = meta.pastGenders.map(g => g.key);
    allLabels = meta.pastGenders.map(g => g.label);
  } else {
    allKeys = meta.pronouns;
    allLabels = meta.pronouns;
  }

  const entries = allKeys.map((key, i) => ({
    key,
    label: allLabels[i],
    answer: conjugation[key] || '',
  })).filter(e => e.answer);

  if (entries.length < 3) return null;

  // Blank out 3-4 of the entries (or 2-3 for past with 4 entries)
  const blankCount = entries.length <= 4
    ? Math.min(3, Math.max(2, Math.floor(entries.length * 0.6)))
    : Math.min(4, Math.max(3, Math.floor(entries.length * 0.5)));

  const indices = shuffle(entries.map((_, i) => i));
  const blankIndices = new Set(indices.slice(0, blankCount));

  const rows = entries.map((e, i) => ({
    label: e.label,
    answer: e.answer,
    prefilled: !blankIndices.has(i),
  }));

  return {
    type: 'table-fill',
    headers: ['', `${verb.infinitive} (${verb.infinitiveEn})`],
    rows,
    verb,
    explanation: `Full conjugation of "${verb.infinitive}"`,
  };
}

function getExplanation(verb, tense, slotKey, slotLabel, correctAnswer) {
  const classDesc = verb.irregular
    ? 'Irregular verb'
    : `Conjugation class ${verb.conjugationClass}`;
  return `${classDesc}: ${slotLabel} → ${correctAnswer}`;
}

export default function VerbDrillMode({ langCode = 'uk', verbDrillData, onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress }) {
  const [phase, setPhase] = useState('picker'); // picker, drilling, complete
  const [selectedTense, setSelectedTense] = useState(null);
  const [exerciseQueue, setExerciseQueue] = useState([]);
  const [queueIdx, setQueueIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [originalCount, setOriginalCount] = useState(EXERCISE_COUNT);
  const [xpEarned, setXpEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [encouragement, setEncouragement] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [mistakes, setMistakes] = useState([]);
  const [showMistakes, setShowMistakes] = useState(false);

  const inputRef = useRef(null);
  const audioCtxRef = useRef(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
    return audioCtxRef.current;
  };

  const encouragements = encouragementMap[langCode] || ENCOURAGEMENTS;
  const mistakeMessages = mistakeMap[langCode] || MISTAKE_MESSAGES;

  const currentExercise = exerciseQueue[queueIdx] || null;

  // Auto-focus input when exercise changes
  useEffect(() => {
    if (phase === 'drilling' && inputRef.current && !feedback) {
      inputRef.current.focus();
    }
  }, [queueIdx, phase, feedback]);

  const startDrill = useCallback((tenseId) => {
    setSelectedTense(tenseId);
    const exercises = generateExercises(tenseId, verbDrillData, EXERCISE_COUNT, langCode);
    setExerciseQueue(exercises);
    setOriginalCount(exercises.length);
    setQueueIdx(0);
    setScore(0);
    setXpEarned(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    setEncouragement('');
    setUserAnswer('');
    setSelectedOption(null);
    setMistakes([]);
    setPhase('drilling');
  }, [verbDrillData]);

  const handleAnswer = useCallback((isCorrect, shownAnswer = false) => {
    if (feedback) return;

    const basePoints = shownAnswer ? 0 : isCorrect ? 15 : 3;
    let bonusPoints = 0;
    const newStreak = (isCorrect && !shownAnswer) ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);

    // Streak bonuses
    if (isCorrect && !shownAnswer && [3, 5, 7, 10, 15, 20].includes(newStreak)) {
      bonusPoints = newStreak >= 10 ? 25 : newStreak >= 7 ? 15 : newStreak >= 5 ? 10 : 5;
      playSound('achievement', getAudioCtx());
    } else {
      playSound(isCorrect ? 'correct' : 'wrong', getAudioCtx());
    }

    const points = basePoints + bonusPoints;
    const ex = currentExercise;

    setFeedback({
      correct: isCorrect && !shownAnswer,
      explanation: ex?.explanation || '',
      bonusPoints,
      shownAnswer,
    });

    if (isCorrect && !shownAnswer && !ex.isRetry) {
      setScore(prev => prev + 1);
      setEncouragement(encouragements[Math.floor(Math.random() * encouragements.length)]);
    } else if (!isCorrect || shownAnswer) {
      setEncouragement(mistakeMessages[Math.floor(Math.random() * mistakeMessages.length)]);
      // Track mistake
      setMistakes(prev => [...prev, {
        exercise: ex,
        userAnswer: userAnswer || selectedOption || '(no answer)',
        correctAnswer: ex.correctAnswer || '(table)',
      }]);
      // Re-queue wrong answers 3 positions later
      if (!shownAnswer) {
        setExerciseQueue(prev => {
          const copy = [...prev];
          const insertAt = Math.min(queueIdx + 3, copy.length);
          copy.splice(insertAt, 0, { ...ex, isRetry: true });
          return copy;
        });
      }
    }

    setXpEarned(prev => prev + points);
    if (onAddXP && points > 0) onAddXP(points);

    // Auto-speak correct answer on feedback
    if (ttsEnabled && onSpeak && isCorrect && ex.correctAnswer) {
      onSpeak(ex.correctAnswer, 0.8, ttsVolume);
    }
  }, [feedback, streak, bestStreak, currentExercise, queueIdx, userAnswer, selectedOption, encouragements, mistakeMessages, ttsEnabled, ttsVolume, onSpeak, onAddXP]);

  const handleNext = useCallback(() => {
    const nextIdx = queueIdx + 1;
    if (nextIdx >= exerciseQueue.length) {
      // Session complete
      const accuracy = originalCount > 0 ? Math.round((score / originalCount) * 100) : 0;

      if (onTrackProgress) {
        onTrackProgress('verbDrills', {
          [`tense_${selectedTense}_done`]: true,
          sessionsCompleted: 1, // Will be accumulated by handler
        });
      }

      if (onComplete) {
        onComplete({
          mode: 'verbDrills',
          tenseId: selectedTense,
          score,
          totalExercises: originalCount,
          xpEarned,
          accuracy,
        });
      }

      setPhase('complete');
    } else {
      setQueueIdx(nextIdx);
      setFeedback(null);
      setEncouragement('');
      setUserAnswer('');
      setSelectedOption(null);
    }
  }, [queueIdx, exerciseQueue.length, originalCount, score, selectedTense, xpEarned, onTrackProgress, onComplete]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      if (feedback) {
        handleNext();
      } else if (userAnswer.trim()) {
        // Submit fill-blank or form-recall
        const isCorrect = normalize(userAnswer) === normalize(currentExercise.correctAnswer);
        handleAnswer(isCorrect);
      }
    }
  }, [feedback, userAnswer, currentExercise, handleAnswer, handleNext]);

  const handleShowAnswer = useCallback(() => {
    if (feedback || !currentExercise) return;
    setUserAnswer(currentExercise.correctAnswer);
    handleAnswer(false, true);
  }, [feedback, currentExercise, handleAnswer]);

  const handleTableFillAnswer = useCallback((isCorrect) => {
    handleAnswer(isCorrect);
  }, [handleAnswer]);

  const speakPrompt = useCallback((text) => {
    if (!onSpeak || !text) return;
    const cyrillicLangs = ['uk', 'ru'];
    if (cyrillicLangs.includes(langCode)) {
      const match = text.match(/[а-яА-ЯіІїЇєЄґҐёЁ][а-яА-ЯіІїЇєЄґҐёЁ\s.,!?''"-]*/);
      if (match) onSpeak(match[0].trim(), 0.8, ttsVolume);
    } else {
      const cleaned = text.replace(/\(.*?\)/g, '').replace(/___/g, '').trim();
      if (cleaned) onSpeak(cleaned, 0.8, ttsVolume);
    }
  }, [onSpeak, langCode, ttsVolume]);

  // ─── Picker Phase ─────────────────────────────────────────────────
  if (phase === 'picker') {
    const tenses = verbDrillData.tenses || [];
    return (
      <div style={styles.container}>
        <ModeHeader title="Verb Drills" subtitle="Rapid-fire conjugation practice" icon="🏋️" onExit={onExit} />
        <div style={styles.pickerGrid}>
          {tenses.map(t => (
            <div key={t.tenseId} style={styles.tenseCard} onClick={() => startDrill(t.tenseId)}>
              <div style={styles.tenseIcon}>{t.icon}</div>
              <div style={styles.tenseInfo}>
                <h3 style={styles.tenseName}>{t.nameEn}</h3>
                <p style={styles.tenseLocal}>{t.nameLocal}</p>
                <p style={styles.tenseTip}>{t.tip}</p>
              </div>
            </div>
          ))}
          <div style={styles.tenseCard} onClick={() => startDrill('mixed')}>
            <div style={styles.tenseIcon}>🔀</div>
            <div style={styles.tenseInfo}>
              <h3 style={styles.tenseName}>Mixed</h3>
              <p style={styles.tenseLocal}>All tenses combined</p>
              <p style={styles.tenseTip}>Practice all tenses in one session</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Complete Phase ───────────────────────────────────────────────
  if (phase === 'complete') {
    const accuracy = originalCount > 0 ? Math.round((score / originalCount) * 100) : 0;
    return (
      <div style={styles.container}>
        <CompletionScreen
          stats={{
            title: 'Drill Complete!',
            score,
            total: originalCount,
            xpEarned,
            accuracy,
          }}
          onRetry={() => startDrill(selectedTense)}
          onExit={onExit}
          exitLabel="Back to Menu"
        />
        {mistakes.length > 0 && (
          <div style={styles.mistakeSection}>
            <button
              style={styles.mistakeToggle}
              onClick={() => setShowMistakes(!showMistakes)}
            >
              {showMistakes ? 'Hide' : 'Review'} Mistakes ({mistakes.length})
            </button>
            {showMistakes && (
              <div style={styles.mistakeList}>
                {mistakes.map((m, i) => (
                  <div key={i} style={styles.mistakeItem}>
                    <div style={styles.mistakePrompt}>{m.exercise.prompt || 'Table fill'}</div>
                    <div style={styles.mistakeAnswers}>
                      <span style={styles.wrongAnswer}>Your answer: {m.userAnswer}</span>
                      <span style={styles.correctAnswerText}>Correct: {m.correctAnswer}</span>
                    </div>
                    {m.exercise.verb && m.exercise.tenseId && (
                      <div style={styles.mistakeTable}>
                        <strong>{m.exercise.verb.infinitive} ({m.exercise.verb.infinitiveEn}) - {m.exercise.tenseId}</strong>
                        <table style={styles.miniTable}>
                          <tbody>
                            {Object.entries(m.exercise.verb[m.exercise.tenseId] || {}).map(([k, v]) => (
                              <tr key={k}>
                                <td style={styles.miniTd}>{k}</td>
                                <td style={styles.miniTd}>{v}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Drilling Phase ───────────────────────────────────────────────
  if (!currentExercise) return null;

  const progress = exerciseQueue.length > 0
    ? Math.round(((queueIdx) / exerciseQueue.length) * 100)
    : 0;

  return (
    <div style={styles.container}>
      <ModeHeader title="Verb Drills" subtitle={selectedTense === 'mixed' ? 'Mixed Tenses' : (verbDrillData.tenses.find(t => t.tenseId === selectedTense)?.nameEn || selectedTense)} icon="🏋️" onExit={onExit} />

      {/* Progress bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <div style={styles.statsRow}>
          <span>Score: {score}/{originalCount}</span>
          <span>Streak: {streak}{streak >= 3 ? ' 🔥' : ''}</span>
          <span>XP: {xpEarned}</span>
        </div>
      </div>

      {/* Exercise area */}
      <div style={styles.exerciseArea}>
        {currentExercise.type === 'table-fill' ? (
          <ExerciseRenderer
            exercise={currentExercise}
            onAnswer={handleTableFillAnswer}
            onSpeak={onSpeak}
            ttsEnabled={ttsEnabled}
            ttsVolume={ttsVolume}
            feedback={feedback}
            langCode={langCode}
          />
        ) : currentExercise.type === 'multiple-choice' ? (
          <div style={styles.exerciseContent}>
            <div style={styles.promptRow}>
              <p style={styles.prompt}>{currentExercise.prompt}</p>
              {ttsEnabled && (
                <button style={styles.miniSpeak} onClick={() => speakPrompt(currentExercise.prompt)}>🔊</button>
              )}
            </div>
            <div style={styles.optionsGrid}>
              {currentExercise.options.map((opt, i) => {
                let optStyle = styles.option;
                if (feedback) {
                  if (opt === currentExercise.correctAnswer) {
                    optStyle = { ...styles.option, ...styles.optionCorrect };
                  } else if (opt === selectedOption && !feedback.correct) {
                    optStyle = { ...styles.option, ...styles.optionWrong };
                  }
                } else if (opt === selectedOption) {
                  optStyle = { ...styles.option, ...styles.optionSelected };
                }
                return (
                  <button
                    key={i}
                    style={optStyle}
                    onClick={() => {
                      if (feedback) return;
                      setSelectedOption(opt);
                      const isCorrect = opt === currentExercise.correctAnswer;
                      handleAnswer(isCorrect);
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* fill-blank or form-recall */
          <div style={styles.exerciseContent}>
            <div style={styles.promptRow}>
              <p style={styles.prompt}>{currentExercise.prompt}</p>
              {ttsEnabled && (
                <button style={styles.miniSpeak} onClick={() => speakPrompt(currentExercise.prompt)}>🔊</button>
              )}
            </div>
            <div style={styles.inputRow}>
              <input
                ref={inputRef}
                style={{
                  ...styles.input,
                  ...(feedback ? (feedback.correct ? styles.inputCorrect : styles.inputWrong) : {}),
                }}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!!feedback}
                autoFocus
                placeholder="Type your answer..."
              />
              {!feedback && (
                <button style={styles.showAnswerBtn} onClick={handleShowAnswer}>
                  Show Answer
                </button>
              )}
            </div>
            {!feedback && userAnswer.trim() && (
              <button style={styles.submitBtn} onClick={() => {
                const isCorrect = normalize(userAnswer) === normalize(currentExercise.correctAnswer);
                handleAnswer(isCorrect);
              }}>
                Submit
              </button>
            )}
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div style={{
            ...styles.feedback,
            ...(feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong),
          }}>
            <div style={styles.feedbackHeader}>
              {feedback.shownAnswer ? '👁️ Answer Shown' : feedback.correct ? '✅ Correct!' : '❌ Incorrect'}
              {feedback.bonusPoints > 0 && <span style={styles.bonus}> +{feedback.bonusPoints} streak bonus!</span>}
            </div>
            {!feedback.correct && currentExercise.correctAnswer && (
              <p style={styles.correctAnswer}>Correct answer: <strong>{currentExercise.correctAnswer}</strong></p>
            )}
            {feedback.explanation && <p style={styles.explanation}>{feedback.explanation}</p>}
            {encouragement && <p style={styles.encouragement}>{encouragement}</p>}
            <button style={styles.nextBtn} onClick={handleNext} autoFocus={currentExercise.type === 'multiple-choice' || currentExercise.type === 'table-fill'}>
              {queueIdx + 1 >= exerciseQueue.length ? 'Finish' : 'Next'} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '1rem',
  },
  // Picker
  pickerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  tenseCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.2rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.1)',
    transition: 'all 0.2s',
  },
  tenseIcon: {
    fontSize: '2rem',
  },
  tenseInfo: {
    flex: 1,
  },
  tenseName: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#e2e8f0',
  },
  tenseLocal: {
    margin: '0.2rem 0 0',
    fontSize: '0.9rem',
    color: '#94a3b8',
  },
  tenseTip: {
    margin: '0.4rem 0 0',
    fontSize: '0.8rem',
    color: '#64748b',
  },
  // Progress
  progressContainer: {
    margin: '1rem 0',
  },
  progressBar: {
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4ade80, #22d3ee)',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '0.5rem',
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  // Exercise
  exerciseArea: {
    marginTop: '1rem',
  },
  exerciseContent: {
    padding: '1.5rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  promptRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  prompt: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#e2e8f0',
    lineHeight: 1.5,
  },
  miniSpeak: {
    background: 'none',
    border: 'none',
    fontSize: '1.3rem',
    cursor: 'pointer',
    padding: '0.3rem',
    opacity: 0.7,
    flexShrink: 0,
  },
  // Input
  inputRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '0.8rem 1rem',
    fontSize: '1.1rem',
    borderRadius: '8px',
    border: '2px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
    outline: 'none',
  },
  inputCorrect: {
    borderColor: '#4ade80',
    background: 'rgba(74,222,128,0.1)',
  },
  inputWrong: {
    borderColor: '#f87171',
    background: 'rgba(248,113,113,0.1)',
  },
  showAnswerBtn: {
    padding: '0.8rem 1rem',
    fontSize: '0.85rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#94a3b8',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  submitBtn: {
    marginTop: '0.8rem',
    padding: '0.7rem 2rem',
    fontSize: '1rem',
    borderRadius: '8px',
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
  },
  // Multiple choice
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.7rem',
  },
  option: {
    padding: '0.9rem',
    fontSize: '1.05rem',
    borderRadius: '8px',
    border: '2px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s',
  },
  optionSelected: {
    borderColor: '#3b82f6',
    background: 'rgba(59,130,246,0.15)',
  },
  optionCorrect: {
    borderColor: '#4ade80',
    background: 'rgba(74,222,128,0.15)',
    color: '#4ade80',
  },
  optionWrong: {
    borderColor: '#f87171',
    background: 'rgba(248,113,113,0.15)',
    color: '#f87171',
  },
  // Feedback
  feedback: {
    marginTop: '1rem',
    padding: '1rem 1.2rem',
    borderRadius: '10px',
    border: '1px solid',
  },
  feedbackCorrect: {
    borderColor: 'rgba(74,222,128,0.3)',
    background: 'rgba(74,222,128,0.08)',
  },
  feedbackWrong: {
    borderColor: 'rgba(248,113,113,0.3)',
    background: 'rgba(248,113,113,0.08)',
  },
  feedbackHeader: {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '0.3rem',
    color: '#e2e8f0',
  },
  bonus: {
    color: '#fbbf24',
    fontSize: '0.9rem',
  },
  correctAnswer: {
    margin: '0.3rem 0',
    color: '#94a3b8',
    fontSize: '0.95rem',
  },
  explanation: {
    margin: '0.3rem 0',
    color: '#64748b',
    fontSize: '0.85rem',
  },
  encouragement: {
    margin: '0.3rem 0 0',
    color: '#a78bfa',
    fontSize: '0.9rem',
    fontStyle: 'italic',
  },
  nextBtn: {
    marginTop: '0.8rem',
    padding: '0.6rem 1.5rem',
    fontSize: '0.95rem',
    borderRadius: '8px',
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
  },
  // Mistake review
  mistakeSection: {
    marginTop: '1.5rem',
  },
  mistakeToggle: {
    padding: '0.6rem 1.2rem',
    fontSize: '0.9rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
    cursor: 'pointer',
    width: '100%',
  },
  mistakeList: {
    marginTop: '0.8rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  mistakeItem: {
    padding: '1rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  mistakePrompt: {
    fontSize: '0.95rem',
    color: '#e2e8f0',
    marginBottom: '0.5rem',
  },
  mistakeAnswers: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.85rem',
    flexWrap: 'wrap',
  },
  wrongAnswer: {
    color: '#f87171',
  },
  correctAnswerText: {
    color: '#4ade80',
  },
  mistakeTable: {
    marginTop: '0.5rem',
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  miniTable: {
    marginTop: '0.3rem',
    borderCollapse: 'collapse',
    width: '100%',
  },
  miniTd: {
    padding: '0.2rem 0.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
};

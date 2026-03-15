import React, { useState } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';

export default function ReadingMode({ langCode = 'uk', passages, onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';
  const chat = useLessonChat({ langName, systemPrompt: `You are a helpful ${langName} language tutor. The student is doing a reading comprehension exercise with a ${langName} text. Answer questions about vocabulary, grammar, or comprehension concisely. Keep responses under 150 words.` });
  const [phase, setPhase] = useState('picker'); // picker, reading, questions, complete
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(-1);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [clickedWord, setClickedWord] = useState(null);

  const startPassage = (passage) => {
    setSelectedPassage(passage);
    setPhase('reading');
    setQuestionIdx(0);
    setSelectedAnswer(-1);
    setFeedback(null);
    setScore(0);
    setXpEarned(0);
    setHoveredWord(null);
    setClickedWord(null);
  };

  const handleWordInteraction = (word, clean) => {
    // Toggle on click (mobile-friendly)
    if (clickedWord === clean) {
      setClickedWord(null);
    } else {
      setClickedWord(clean);
      // Speak the word when clicked
      if (ttsEnabled && onSpeak) {
        onSpeak(clean, 0.8, ttsVolume);
      }
    }
  };

  const handleReadAloud = () => {
    if (ttsEnabled && onSpeak && selectedPassage) {
      onSpeak(selectedPassage.text, 0.7, ttsVolume);
    }
  };

  const handleAnswerSelect = (idx) => {
    if (feedback) return;
    setSelectedAnswer(idx);
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer < 0 || feedback) return;

    const question = selectedPassage.questions[questionIdx];
    const isCorrect = selectedAnswer === question.correctIndex;
    const points = isCorrect ? 25 : 5;

    setFeedback({ correct: isCorrect, explanation: question.explanation });

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);
  };

  const handleNextQuestion = () => {
    if (questionIdx < selectedPassage.questions.length - 1) {
      setQuestionIdx(prev => prev + 1);
      setSelectedAnswer(-1);
      setFeedback(null);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({
          mode: 'reading',
          passageId: selectedPassage.passageId,
          score,
          total: selectedPassage.questions.length,
          xpEarned
        });
      }
      if (onTrackProgress) {
        onTrackProgress('reading', {
          passageId: selectedPassage.passageId,
          completed: true,
          score
        });
      }
    }
  };

  const handleRetry = () => {
    if (selectedPassage) startPassage(selectedPassage);
  };

  // Picker
  if (phase === 'picker') {
    return (
      <div style={styles.container}>
        <ModeHeader title="Reading Practice" subtitle={`Read and comprehend ${langName} texts`} icon="📖" onExit={onExit} />
        <div style={styles.grid}>
          {passages.map(p => (
            <div key={p.passageId} style={styles.passageCard} onClick={() => startPassage(p)}>
              <div style={styles.passageInfo}>
                <h3 style={styles.passageTitle}>{p.titleEn}</h3>
                <p style={styles.passageTitleUk}>{p.title}</p>
                <div style={styles.passageMeta}>
                  <span style={styles.difficulty}>{p.difficulty}</span>
                  <span style={styles.questionCount}>{p.questions.length} questions</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Complete
  if (phase === 'complete') {
    const accuracy = selectedPassage.questions.length > 0
      ? Math.round((score / selectedPassage.questions.length) * 100) : 0;
    return (
      <div style={styles.container}>
        <CompletionScreen
          stats={{ title: 'Reading Complete!', score, total: selectedPassage.questions.length, xpEarned, accuracy }}
          onRetry={handleRetry}
          onExit={onExit}
        />
      </div>
    );
  }

  // Reading phase
  if (phase === 'reading') {
    const words = selectedPassage.text.split(/(\s+)/);
    const glossary = selectedPassage.wordGlossary || {};

    return (
      <div style={styles.container}>
        <ModeHeader
          title={selectedPassage.titleEn}
          subtitle={selectedPassage.title}
          icon="📖"
          onExit={() => setPhase('picker')}
        />

        <div style={styles.contentRow}>
          <div style={styles.main}>
        <div style={styles.readingCard}>
          {ttsEnabled && (
            <button style={styles.readAloudBtn} onClick={handleReadAloud}>
              🔊 Read Aloud
            </button>
          )}

          <div style={styles.textArea}>
            {words.map((word, i) => {
              const clean = word.trim().toLowerCase().replace(/[.,!?;:"""()]/g, '');
              const hasGlossary = glossary[clean];
              const isActive = hoveredWord === clean || clickedWord === clean;

              if (!word.trim()) {
                return <span key={i}>{word}</span>;
              }

              return (
                <span
                  key={i}
                  style={{
                    ...styles.word,
                    ...(hasGlossary ? styles.glossaryWord : {}),
                    ...(isActive ? styles.activeWord : {})
                  }}
                  onMouseEnter={() => hasGlossary && setHoveredWord(clean)}
                  onMouseLeave={() => setHoveredWord(null)}
                  onClick={() => hasGlossary && handleWordInteraction(word, clean)}
                >
                  {word}
                  {isActive && hasGlossary && (
                    <span style={styles.tooltip}>{glossary[clean]}</span>
                  )}
                </span>
              );
            })}
          </div>

          <p style={styles.glossaryHint}>
            Hover or tap highlighted words to see translations
          </p>

          <button style={styles.questionsBtn} onClick={() => setPhase('questions')}>
            Answer Questions →
          </button>
        </div>
          </div>
          <LessonChat {...chat} />
        </div>
      </div>
    );
  }

  // Questions phase
  if (phase === 'questions') {
    const question = selectedPassage.questions[questionIdx];

    return (
      <div style={styles.container}>
        <ModeHeader
          title={selectedPassage.titleEn}
          subtitle={`Question ${questionIdx + 1} of ${selectedPassage.questions.length}`}
          icon="📖"
          onExit={() => setPhase('reading')}
        />

        <div style={styles.contentRow}>
          <div style={styles.main}>
        <div style={styles.questionCard}>
          <p style={styles.questionText}>{question.question}</p>

          <div style={styles.options}>
            {question.options.map((opt, i) => (
              <button
                key={i}
                style={{
                  ...styles.optionBtn,
                  ...(selectedAnswer === i ? styles.optionSelected : {}),
                  ...(feedback && i === question.correctIndex ? styles.optionCorrect : {}),
                  ...(feedback && selectedAnswer === i && i !== question.correctIndex ? styles.optionWrong : {})
                }}
                onClick={() => handleAnswerSelect(i)}
                disabled={!!feedback}
              >
                {opt}
              </button>
            ))}
          </div>

          {!feedback && (
            <button style={styles.checkBtn} onClick={handleCheckAnswer} disabled={selectedAnswer < 0}>
              Check Answer
            </button>
          )}

          {feedback && (
            <div style={{
              ...styles.feedbackBox,
              borderColor: feedback.correct ? '#4ade80' : '#f87171'
            }}>
              <div style={{ color: feedback.correct ? '#4ade80' : '#f87171', fontWeight: '700', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                {feedback.correct ? 'Correct!' : 'Not quite...'}
              </div>
              {feedback.explanation && (
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>{feedback.explanation}</p>
              )}
              <button style={styles.nextBtn} onClick={handleNextQuestion}>
                {questionIdx < selectedPassage.questions.length - 1 ? 'Next Question →' : 'See Results'}
              </button>
            </div>
          )}
        </div>

          <div style={styles.scoreBar}>
            <span>Score: {score}/{questionIdx + (feedback ? 1 : 0)}</span>
            <span>XP: +{xpEarned}</span>
          </div>
          </div>
          <LessonChat {...chat} />
        </div>
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
  },
  contentRow: { display: 'flex', gap: '1.5rem', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
    maxWidth: '900px',
    margin: '0 auto'
  },
  passageCard: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '1.5rem',
    cursor: 'pointer',
    border: '2px solid rgba(255,215,0,0.2)',
    transition: 'all 0.3s'
  },
  passageInfo: {},
  passageTitle: { margin: 0, color: '#ffd700', fontSize: '1.15rem' },
  passageTitleUk: { margin: '0.25rem 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' },
  passageMeta: { display: 'flex', gap: '1rem', marginTop: '0.5rem' },
  difficulty: { color: '#4dabf7', fontWeight: '600', fontSize: '0.85rem' },
  questionCount: { color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' },
  readingCard: {
    maxWidth: '750px',
    margin: '0 auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '2rem',
    border: '1px solid rgba(255,215,0,0.2)'
  },
  readAloudBtn: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    border: 'none',
    color: '#fff',
    padding: '0.6rem 1.25rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    fontFamily: 'inherit',
    marginBottom: '1.5rem',
    display: 'block'
  },
  textArea: {
    fontSize: '1.2rem',
    lineHeight: 2,
    marginBottom: '1.5rem'
  },
  word: {
    position: 'relative',
    cursor: 'default',
    transition: 'color 0.2s'
  },
  glossaryWord: {
    borderBottom: '2px dotted rgba(255,215,0,0.4)',
    cursor: 'pointer',
    color: '#ffd700'
  },
  activeWord: {
    color: '#4dabf7',
    borderBottomColor: '#4dabf7'
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.9)',
    color: '#4dabf7',
    padding: '0.4rem 0.8rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
    zIndex: 10,
    fontWeight: '600',
    border: '1px solid rgba(77,171,247,0.3)',
    pointerEvents: 'none'
  },
  glossaryHint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.85rem',
    marginBottom: '1.5rem'
  },
  questionsBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '1rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  questionCard: {
    maxWidth: '650px',
    margin: '0 auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '2rem',
    border: '1px solid rgba(255,215,0,0.2)'
  },
  questionText: {
    fontSize: '1.2rem',
    marginBottom: '1.5rem',
    lineHeight: 1.4
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  optionBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'all 0.2s'
  },
  optionSelected: { borderColor: '#ffd700', background: 'rgba(255,215,0,0.1)' },
  optionCorrect: { borderColor: '#4ade80', background: 'rgba(74,222,128,0.15)' },
  optionWrong: { borderColor: '#f87171', background: 'rgba(248,113,113,0.15)' },
  checkBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '0.75rem',
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
    borderLeft: '4px solid',
    marginTop: '1rem'
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
    marginTop: '0.75rem'
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

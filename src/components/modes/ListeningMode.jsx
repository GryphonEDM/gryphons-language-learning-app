import React, { useState, useCallback } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { getAllVocabularyWords } from '../../utils/dictionaryBuilder.js';
import { WordToolbar, ClickableText } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';

export default function ListeningMode({ langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';
  const [phase, setPhase] = useState('playing'); // playing, complete
  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });
  const chat = useLessonChat({ langName, systemPrompt: `You are a helpful ${langName} language tutor. The student is doing a listening and dictation exercise — they hear a ${langName} word and type what they hear. Answer questions about spelling, pronunciation, or vocabulary concisely. Keep responses under 150 words.` });
  const [words, setWords] = useState(() => {
    const all = getAllVocabularyWords(langCode);
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null); // { correct, diff }
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [usedSlowSpeed, setUsedSlowSpeed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentWord = words[currentIdx];

  const handlePlay = useCallback(() => {
    if (ttsEnabled && onSpeak && currentWord) {
      onSpeak(currentWord.uk, playbackRate, ttsVolume);
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

    const isCorrect = userInput.trim().toLowerCase() === currentWord.uk.toLowerCase();
    const diff = computeDiff(currentWord.uk, userInput.trim());
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
        word: currentWord.uk,
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
    const all = getAllVocabularyWords(langCode);
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    setWords(shuffled.slice(0, 10));
    setCurrentIdx(0);
    setUserInput('');
    setFeedback(null);
    setScore(0);
    setXpEarned(0);
    setSubmitted(false);
    setPhase('playing');
  };

  if (phase === 'complete') {
    const accuracy = words.length > 0 ? Math.round((score / words.length) * 100) : 0;
    return (
      <div style={styles.container}>
        <CompletionScreen
          stats={{
            title: 'Listening Session Complete!',
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
  const diffColors = { correct: '#4ade80', wrong: '#f87171', missing: '#fbbf24', extra: '#f87171' };

  return (
    <div style={styles.container}>
      <ModeHeader
        title="Listening Practice"
        subtitle={`Word ${currentIdx + 1} of ${words.length}`}
        icon="👂"
        onExit={onExit}
      />

      <div style={styles.contentRow}>
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
            placeholder={`Type the ${langCode === 'ru' ? 'Russian' : 'Ukrainian'} word...`}
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
        <LessonChat {...chat} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
      </div>
      <WordToolbar selectedWord={selectedWord} onDismiss={dismissWord} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} />
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

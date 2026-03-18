import React, { useState, useEffect, useRef } from 'react';

/**
 * Renders any of the 8 grammar exercise types.
 * Props:
 *   exercise     - the exercise JSON object
 *   onAnswer     - callback(isCorrect) when user submits
 *   onSpeak      - TTS function
 *   ttsEnabled   - boolean
 *   ttsVolume    - number
 *   feedback     - null | { correct, explanation }
 *   langCode     - 'uk' | 'ru'
 */
export default function ExerciseRenderer({ exercise, onAnswer, onSpeak, ttsEnabled, ttsVolume, feedback, langCode }) {
  switch (exercise.type) {
    case 'multiple-choice': return <MultipleChoice exercise={exercise} onAnswer={onAnswer} feedback={feedback} />;
    case 'fill-blank': return <FillBlank exercise={exercise} onAnswer={onAnswer} feedback={feedback} />;
    case 'sentence-order': return <SentenceOrder exercise={exercise} onAnswer={onAnswer} feedback={feedback} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} />;
    case 'matching': return <Matching exercise={exercise} onAnswer={onAnswer} feedback={feedback} />;
    case 'error-correction': return <ErrorCorrection exercise={exercise} onAnswer={onAnswer} feedback={feedback} />;
    case 'transformation': return <Transformation exercise={exercise} onAnswer={onAnswer} feedback={feedback} />;
    case 'listen-type': return <ListenType exercise={exercise} onAnswer={onAnswer} feedback={feedback} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} />;
    case 'table-fill': return <TableFill exercise={exercise} onAnswer={onAnswer} feedback={feedback} />;
    default: return <FillBlank exercise={exercise} onAnswer={onAnswer} feedback={feedback} />;
  }
}

// ─── Multiple Choice ────────────────────────────────────────────────

function MultipleChoice({ exercise, onAnswer, feedback }) {
  const [selected, setSelected] = useState(-1);

  useEffect(() => { setSelected(-1); }, [exercise]);

  const handleSubmit = () => {
    if (selected < 0 || feedback) return;
    onAnswer(selected === exercise.correctIndex);
  };

  return (
    <div>
      <div style={s.options}>
        {exercise.options.map((opt, i) => (
          <button
            key={i}
            style={{
              ...s.optionBtn,
              ...(selected === i ? s.optionSelected : {}),
              ...(feedback && i === exercise.correctIndex ? s.optionCorrect : {}),
              ...(feedback && selected === i && i !== exercise.correctIndex ? s.optionWrong : {}),
            }}
            onClick={() => !feedback && setSelected(i)}
            disabled={!!feedback}
          >{opt}</button>
        ))}
      </div>
      {!feedback && <button style={s.checkBtn} onClick={handleSubmit} disabled={selected < 0}>Check Answer</button>}
    </div>
  );
}

// ─── Fill in the Blank ──────────────────────────────────────────────

function FillBlank({ exercise, onAnswer, feedback }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const answers = exercise.acceptedAnswers || (exercise.answer ? [exercise.answer] : []);

  useEffect(() => { setValue(''); inputRef.current?.focus(); }, [exercise]);

  const handleSubmit = () => {
    if (!value.trim() || feedback) return;
    const isCorrect = answers
      .map(a => a.toLowerCase())
      .includes(value.trim().toLowerCase());
    onAnswer(isCorrect);
  };

  return (
    <div>
      <input
        ref={inputRef}
        style={s.input}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        placeholder="Type your answer..."
        disabled={!!feedback}
        autoFocus
      />
      {exercise.hint && !feedback && <p style={s.hint}>Hint: {exercise.hint}</p>}
      {!feedback && <button style={s.checkBtn} onClick={handleSubmit} disabled={!value.trim()}>Check Answer</button>}
      {feedback && !feedback.correct && answers.length > 0 && (
        <p style={s.correctAnswer}>Correct answer: {answers[0]}</p>
      )}
    </div>
  );
}

// ─── Sentence Order ─────────────────────────────────────────────────

function SentenceOrder({ exercise, onAnswer, feedback, onSpeak, ttsEnabled, ttsVolume }) {
  const [available, setAvailable] = useState([]);
  const [placed, setPlaced] = useState([]);

  useEffect(() => {
    const allWords = [...exercise.words, ...(exercise.distractors || [])];
    setAvailable(allWords.sort(() => Math.random() - 0.5).map((w, i) => ({ id: `${i}-${w}`, word: w })));
    setPlaced([]);
  }, [exercise]);

  const handleTileClick = (tile) => {
    if (feedback) return;
    setAvailable(prev => prev.filter(t => t.id !== tile.id));
    setPlaced(prev => [...prev, tile]);
    if (ttsEnabled && onSpeak) onSpeak(tile.word, 0.8, ttsVolume);
  };

  const handlePlacedClick = (tile) => {
    if (feedback) return;
    setPlaced(prev => prev.filter(t => t.id !== tile.id));
    setAvailable(prev => [...prev, tile]);
  };

  const handleSubmit = () => {
    if (feedback || placed.length === 0) return;
    const placedWords = placed.map(t => t.word);
    // Support both validOrders (array of arrays) and correctOrder (single array)
    const orders = exercise.validOrders || (exercise.correctOrder ? [exercise.correctOrder] : []);
    const isCorrect = orders.some(order => {
      if (order.length !== placedWords.length) return false;
      return order.every((w, i) => w.toLowerCase() === placedWords[i].toLowerCase());
    });
    onAnswer(isCorrect);
  };

  const correctDisplay = exercise.validOrders?.[0] || exercise.correctOrder;

  return (
    <div>
      {exercise.translation && <p style={s.translation}>{exercise.translation}</p>}
      <div style={s.tilePlaceholder}>
        {placed.length === 0 && <span style={s.placeholderText}>Tap words to build the sentence</span>}
        {placed.map(tile => (
          <button key={tile.id} style={s.tilePlaced} onClick={() => handlePlacedClick(tile)}>{tile.word}</button>
        ))}
      </div>
      <div style={s.tileBank}>
        {available.map(tile => (
          <button key={tile.id} style={s.tile} onClick={() => handleTileClick(tile)}>{tile.word}</button>
        ))}
      </div>
      {!feedback && <button style={s.checkBtn} onClick={handleSubmit} disabled={placed.length === 0}>Check Answer</button>}
      {feedback && !feedback.correct && correctDisplay && (
        <p style={s.correctAnswer}>Correct: {correctDisplay.join(' ')}</p>
      )}
    </div>
  );
}

// ─── Matching ───────────────────────────────────────────────────────

function Matching({ exercise, onAnswer, feedback }) {
  const [shuffledRight, setShuffledRight] = useState([]);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [matches, setMatches] = useState({}); // { leftIdx: rightIdx }
  const [wrongPair, setWrongPair] = useState(null);

  useEffect(() => {
    const indices = exercise.pairs.map((_, i) => i);
    setShuffledRight(indices.sort(() => Math.random() - 0.5));
    setSelectedLeft(null);
    setMatches({});
    setWrongPair(null);
  }, [exercise]);

  const handleLeftClick = (idx) => {
    if (feedback || matches[idx] !== undefined) return;
    setSelectedLeft(idx);
    setWrongPair(null);
  };

  const handleRightClick = (rightIdx) => {
    if (feedback || selectedLeft === null) return;
    const correctRightIdx = selectedLeft; // pairs[i].right matches pairs[i].left
    if (rightIdx === correctRightIdx) {
      setMatches(prev => ({ ...prev, [selectedLeft]: rightIdx }));
      setSelectedLeft(null);
      // Check if all matched
      const newMatches = { ...matches, [selectedLeft]: rightIdx };
      if (Object.keys(newMatches).length === exercise.pairs.length) {
        onAnswer(true);
      }
    } else {
      setWrongPair({ left: selectedLeft, right: rightIdx });
      setTimeout(() => setWrongPair(null), 600);
    }
  };

  const isRightMatched = (rightIdx) => Object.values(matches).includes(rightIdx);

  return (
    <div style={s.matchContainer}>
      <div style={s.matchColumn}>
        {exercise.pairs.map((pair, i) => (
          <button
            key={i}
            style={{
              ...s.matchItem,
              ...(matches[i] !== undefined ? s.matchItemMatched : {}),
              ...(selectedLeft === i ? s.matchItemSelected : {}),
              ...(wrongPair?.left === i ? s.matchItemWrong : {}),
            }}
            onClick={() => handleLeftClick(i)}
            disabled={matches[i] !== undefined || !!feedback}
          >{pair.left}</button>
        ))}
      </div>
      <div style={s.matchColumn}>
        {shuffledRight.map(rightIdx => (
          <button
            key={rightIdx}
            style={{
              ...s.matchItem,
              ...(isRightMatched(rightIdx) ? s.matchItemMatched : {}),
              ...(wrongPair?.right === rightIdx ? s.matchItemWrong : {}),
            }}
            onClick={() => handleRightClick(rightIdx)}
            disabled={isRightMatched(rightIdx) || !!feedback}
          >{exercise.pairs[rightIdx].right}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Error Correction ───────────────────────────────────────────────

function ErrorCorrection({ exercise, onAnswer, feedback }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { setValue(''); inputRef.current?.focus(); }, [exercise]);

  // Support both formats: sentence+errorWord (word fix) and incorrectText+acceptedAnswers (full sentence fix)
  const sentenceText = exercise.sentence || exercise.incorrectText || '';
  const errorWord = exercise.errorWord || '';
  const acceptedAnswers = exercise.acceptedAnswers || (exercise.correctedText ? [exercise.correctedText] : []);

  const handleSubmit = () => {
    if (!value.trim() || feedback) return;
    const userVal = value.trim().toLowerCase().replace(/[.!?]+$/, '');
    const isCorrect = acceptedAnswers.some(a =>
      a.toLowerCase().replace(/[.!?]+$/, '') === userVal
    );
    onAnswer(isCorrect);
  };

  // Highlight the error word in the sentence
  const renderSentence = () => {
    if (!errorWord) return sentenceText;
    const parts = sentenceText.split(new RegExp(`(${errorWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'));
    return parts.map((part, i) =>
      part.toLowerCase() === errorWord.toLowerCase()
        ? <span key={i} style={s.errorWord}>{part}</span>
        : part
    );
  };

  const placeholder = errorWord ? `Correct "${errorWord}"...` : 'Type the corrected sentence...';

  return (
    <div>
      <div style={s.errorSentence}>{renderSentence()}</div>
      <input
        ref={inputRef}
        style={s.input}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        placeholder={placeholder}
        disabled={!!feedback}
        autoFocus
      />
      {exercise.hint && !feedback && <p style={s.hint}>Hint: {exercise.hint}</p>}
      {!feedback && <button style={s.checkBtn} onClick={handleSubmit} disabled={!value.trim()}>Check Answer</button>}
      {feedback && !feedback.correct && acceptedAnswers.length > 0 && (
        <p style={s.correctAnswer}>Correct: {acceptedAnswers[0]}</p>
      )}
    </div>
  );
}

// ─── Transformation ─────────────────────────────────────────────────

function Transformation({ exercise, onAnswer, feedback }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const answers = exercise.acceptedAnswers || (exercise.answer ? [exercise.answer] : []);

  useEffect(() => { setValue(''); inputRef.current?.focus(); }, [exercise]);

  const handleSubmit = () => {
    if (!value.trim() || feedback) return;
    const userVal = value.trim().toLowerCase().replace(/[.!?]+$/, '');
    const isCorrect = answers.some(a =>
      a.toLowerCase().replace(/[.!?]+$/, '') === userVal
    );
    onAnswer(isCorrect);
  };

  return (
    <div>
      {exercise.baseWord && <div style={s.baseWord}>{exercise.baseWord} →</div>}
      {exercise.context && <div style={s.context}>{exercise.context}</div>}
      <input
        ref={inputRef}
        style={s.input}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        placeholder="Type the correct form..."
        disabled={!!feedback}
        autoFocus
      />
      {exercise.hint && !feedback && <p style={s.hint}>Hint: {exercise.hint}</p>}
      {!feedback && <button style={s.checkBtn} onClick={handleSubmit} disabled={!value.trim()}>Check Answer</button>}
      {feedback && !feedback.correct && answers.length > 0 && (
        <p style={s.correctAnswer}>Correct: {answers[0]}</p>
      )}
    </div>
  );
}

// ─── Listen and Type ────────────────────────────────────────────────

function ListenType({ exercise, onAnswer, feedback, onSpeak, ttsEnabled, ttsVolume }) {
  const [value, setValue] = useState('');
  const [played, setPlayed] = useState(false);
  const inputRef = useRef(null);

  // Support both "text" and "audio" field names
  const audioText = exercise.text || exercise.audio || '';

  useEffect(() => { setValue(''); setPlayed(false); }, [exercise]);

  const handlePlay = () => {
    if (onSpeak && ttsEnabled && audioText) {
      onSpeak(audioText, 0.8, ttsVolume);
      setPlayed(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  };

  useEffect(() => {
    // Auto-play on mount
    const timer = setTimeout(handlePlay, 400);
    return () => clearTimeout(timer);
  }, [exercise]);

  const handleSubmit = () => {
    if (!value.trim() || feedback) return;
    const answers = exercise.acceptedAnswers || (exercise.answer ? [exercise.answer] : []);
    const isCorrect = answers
      .map(a => a.toLowerCase().replace(/[.,!?;:]/g, ''))
      .includes(value.trim().toLowerCase().replace(/[.,!?;:]/g, ''));
    onAnswer(isCorrect);
  };

  return (
    <div>
      <div style={s.listenControls}>
        <button style={s.listenBtn} onClick={handlePlay} disabled={!ttsEnabled}>
          🔊 {played ? 'Play Again' : 'Listen'}
        </button>
        <button style={s.listenBtnSlow} onClick={() => onSpeak && onSpeak(audioText, 0.5, ttsVolume)} disabled={!ttsEnabled}>
          🐢 Slow
        </button>
      </div>
      <input
        ref={inputRef}
        style={s.input}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        placeholder="Type what you hear..."
        disabled={!!feedback}
      />
      {!feedback && <button style={s.checkBtn} onClick={handleSubmit} disabled={!value.trim()}>Check Answer</button>}
      {feedback && (
        <p style={s.correctAnswer}>Answer: {audioText}</p>
      )}
    </div>
  );
}

// ─── Table Fill ─────────────────────────────────────────────────────

function TableFill({ exercise, onAnswer, feedback }) {
  // Normalize: support both formats
  // Format 1 (planned): { headers, rows: [{label, answer, prefilled}] }
  // Format 2 (agent): { table: { infinitive, rows: [{pronoun, answer}] } }
  const rows = exercise.rows || (exercise.table?.rows || []).map((r, i) => ({
    label: r.pronoun || r.label || '',
    answer: r.answer || '',
    prefilled: r.prefilled || false,
  }));
  const headers = exercise.headers || ['', exercise.table?.infinitive || 'Form'];

  const [values, setValues] = useState({});
  const inputRefs = useRef({});

  useEffect(() => {
    setValues({});
    inputRefs.current = {};
  }, [exercise]);

  const blankRows = rows.filter(r => !r.prefilled);

  const handleChange = (rowIdx, val) => {
    setValues(prev => ({ ...prev, [rowIdx]: val }));
  };

  const handleSubmit = () => {
    if (feedback) return;
    let allCorrect = true;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].prefilled) continue;
      const userVal = (values[i] || '').trim().toLowerCase();
      if (userVal !== rows[i].answer.toLowerCase()) {
        allCorrect = false;
        break;
      }
    }
    onAnswer(allCorrect);
  };

  const allFilled = blankRows.every(row => {
    const idx = rows.indexOf(row);
    return (values[idx] || '').trim();
  });

  return (
    <div>
      <table style={s.table}>
        <thead>
          <tr>
            {headers.map((h, i) => <th key={i} style={s.th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={s.td}>{row.label}</td>
              <td style={s.td}>
                {row.prefilled ? (
                  <span style={s.prefilled}>{row.answer}</span>
                ) : (
                  <input
                    ref={el => inputRefs.current[i] = el}
                    style={{
                      ...s.tableInput,
                      ...(feedback && (values[i] || '').trim().toLowerCase() === row.answer.toLowerCase() ? s.tableInputCorrect : {}),
                      ...(feedback && (values[i] || '').trim().toLowerCase() !== row.answer.toLowerCase() ? s.tableInputWrong : {}),
                    }}
                    value={values[i] || ''}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const nextBlank = rows.findIndex((r, j) => j > i && !r.prefilled);
                        if (nextBlank >= 0) inputRefs.current[nextBlank]?.focus();
                        else if (allFilled) handleSubmit();
                      }
                    }}
                    disabled={!!feedback}
                    placeholder="..."
                    autoFocus={i === rows.findIndex(r => !r.prefilled)}
                  />
                )}
                {feedback && !row.prefilled && (values[i] || '').trim().toLowerCase() !== row.answer.toLowerCase() && (
                  <span style={s.tableCorrectAnswer}>{row.answer}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!feedback && <button style={s.checkBtn} onClick={handleSubmit} disabled={!allFilled}>Check Answer</button>}
    </div>
  );
}

// ─── Shared Styles ──────────────────────────────────────────────────

const s = {
  options: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' },
  optionBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1.05rem',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  optionSelected: { borderColor: '#ffd700', background: 'rgba(255,215,0,0.1)' },
  optionCorrect: { borderColor: '#4ade80', background: 'rgba(74,222,128,0.15)' },
  optionWrong: { borderColor: '#f87171', background: 'rgba(248,113,113,0.15)' },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '1.1rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '0.5rem',
  },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.25rem', fontStyle: 'italic' },
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
    fontFamily: 'inherit',
    marginTop: '0.5rem',
    opacity: 1,
    transition: 'opacity 0.2s',
  },
  correctAnswer: { color: '#4ade80', fontSize: '0.95rem', marginTop: '0.5rem', fontWeight: '600' },
  // Sentence order
  translation: { color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: '1rem', fontStyle: 'italic' },
  tilePlaceholder: {
    minHeight: '60px',
    background: 'rgba(255,255,255,0.03)',
    border: '2px dashed rgba(255,255,255,0.15)',
    borderRadius: '12px',
    padding: '0.75rem',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  placeholderText: { color: 'rgba(255,255,255,0.25)', fontSize: '0.9rem' },
  tileBank: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' },
  tile: {
    background: 'rgba(77,171,247,0.15)',
    border: '1px solid rgba(77,171,247,0.4)',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  tilePlaced: {
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.4)',
    color: '#ffd700',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontFamily: 'inherit',
  },
  // Matching
  matchContainer: { display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '1rem' },
  matchColumn: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 },
  matchItem: {
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.6rem 1rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontFamily: 'inherit',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  matchItemSelected: { borderColor: '#ffd700', background: 'rgba(255,215,0,0.1)' },
  matchItemMatched: { borderColor: '#4ade80', background: 'rgba(74,222,128,0.1)', opacity: 0.6 },
  matchItemWrong: { borderColor: '#f87171', background: 'rgba(248,113,113,0.15)' },
  // Error correction
  errorSentence: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '1rem',
    fontSize: '1.15rem',
    lineHeight: 1.6,
    marginBottom: '1rem',
  },
  errorWord: {
    color: '#f87171',
    textDecoration: 'underline wavy #f87171',
    fontWeight: '700',
  },
  // Transformation
  baseWord: { color: '#ffd700', fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.5rem' },
  context: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    fontSize: '1.1rem',
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  // Listen type
  listenControls: { display: 'flex', gap: '0.75rem', marginBottom: '1rem' },
  listenBtn: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    border: 'none',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    flex: 1,
  },
  listenBtnSlow: {
    background: 'rgba(77,171,247,0.15)',
    border: '1px solid rgba(77,171,247,0.4)',
    color: '#4dabf7',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  // Table fill
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '1rem',
  },
  th: {
    padding: '0.6rem 1rem',
    textAlign: 'left',
    color: '#ffd700',
    borderBottom: '2px solid rgba(255,215,0,0.3)',
    fontSize: '0.95rem',
  },
  td: {
    padding: '0.5rem 1rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: '1rem',
  },
  prefilled: { color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' },
  tableInput: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    color: '#fff',
    padding: '0.4rem 0.6rem',
    fontSize: '1rem',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  tableInputCorrect: { borderColor: '#4ade80', background: 'rgba(74,222,128,0.1)' },
  tableInputWrong: { borderColor: '#f87171', background: 'rgba(248,113,113,0.1)' },
  tableCorrectAnswer: {
    color: '#4ade80',
    fontSize: '0.85rem',
    marginLeft: '0.5rem',
  },
};

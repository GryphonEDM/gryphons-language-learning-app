import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { buildDictionary, getAllVocabularyWords } from '../../utils/dictionaryBuilder.js';
import { buildStruggleDrillSession } from '../../utils/struggleEngine.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';

// Character-level diff (reused from ListeningMode pattern)
function computeDiff(target, input) {
  const t = target.toLowerCase();
  const inp = input.toLowerCase();
  const diff = [];
  const maxLen = Math.max(t.length, inp.length);
  for (let i = 0; i < maxLen; i++) {
    if (i >= inp.length) diff.push({ char: t[i], type: 'missing' });
    else if (i >= t.length) diff.push({ char: inp[i], type: 'extra' });
    else if (t[i] === inp[i]) diff.push({ char: inp[i], type: 'correct' });
    else diff.push({ char: inp[i], type: 'wrong', expected: t[i] });
  }
  return diff;
}

const DRILL_TITLES = {
  spelling: 'Spelling Drill',
  confusion: 'Confusion Pair Drill',
  listening: 'Listening Drill',
  meaning: 'Meaning Drill',
};

const DRILL_ICONS = {
  spelling: '✏️',
  confusion: '⇄',
  listening: '👂',
  meaning: '💡',
};

export default function StruggleDrillMode({
  langCode = 'uk', vocabularyMastery = {}, focusWords,
  onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress,
  struggleContext,
}) {
  const langNames = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' };
  const langName = langNames[langCode] || 'Ukrainian';
  const dict = useMemo(() => buildDictionary(langCode), [langCode]);
  const allWords = useMemo(() => getAllVocabularyWords(langCode), [langCode]);

  const chat = useLessonChat({
    langName, langCode,
    systemPrompt: `You are a helpful ${langName} language tutor. The student is doing a targeted drill on words they struggle with. Help with spelling, pronunciation, meaning, or grammar questions concisely. Keep responses under 150 words.${struggleContext ? `\n\nStudent's known weak areas:\n${struggleContext}\nProactively offer mnemonics or tips when relevant.` : ''}`,
    onSpeak, ttsEnabled, ttsVolume,
  });

  const [items, setItems] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState('drill'); // 'drill' | 'complete'
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  // Per-drill state
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [confusionPhase, setConfusionPhase] = useState('study'); // 'study' | 'pick' | 'type'
  const [meaningChoices, setMeaningChoices] = useState([]);
  const [promptStartTime, setPromptStartTime] = useState(Date.now());
  const inputRef = useRef(null);

  const lookupTranslation = useCallback((word) => {
    const entry = dict[word] || dict[word?.toLowerCase()];
    if (entry?.en) return entry.en;
    const vocabEntry = allWords.find(w => (w[langCode] || w.uk) === word);
    return vocabEntry?.en || '';
  }, [dict, allWords, langCode]);

  const lookupPhonetic = useCallback((word) => {
    const vocabEntry = allWords.find(w => (w[langCode] || w.uk) === word);
    return vocabEntry?.phonetic || '';
  }, [allWords, langCode]);

  const lookupExamples = useCallback((word) => {
    const vocabEntry = allWords.find(w => (w[langCode] || w.uk) === word);
    return { examples: vocabEntry?.examples || [], examplesEn: vocabEntry?.examplesEn || [] };
  }, [allWords, langCode]);

  // Build session on mount
  useEffect(() => {
    const session = buildStruggleDrillSession(vocabularyMastery, {
      limit: 10,
      focusWords: focusWords || undefined,
    });
    setItems(session);
    setCurrentIdx(0);
    setPhase(session.length > 0 ? 'drill' : 'complete');
  }, []);

  const currentItem = items[currentIdx];

  // Reset per-drill state when moving to next item
  useEffect(() => {
    if (!currentItem) return;
    setUserInput('');
    setFeedback(null);
    setSubmitted(false);
    setConfusionPhase('study');
    setPromptStartTime(Date.now());

    // Build meaning drill choices
    if (currentItem.type === 'meaning') {
      const correct = currentItem.word;
      const correctEn = lookupTranslation(correct);
      // Pick 3 random distractors
      const distractors = allWords
        .filter(w => (w[langCode] || w.uk) !== correct && w.en && w.en !== correctEn)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => ({ word: w[langCode] || w.uk, en: w.en }));
      const choices = [{ word: correct, en: correctEn }, ...distractors]
        .sort(() => Math.random() - 0.5);
      setMeaningChoices(choices);
    }

    // Auto-play for listening drills
    if (currentItem.type === 'listening' && ttsEnabled && onSpeak) {
      setTimeout(() => onSpeak(currentItem.word, 1, ttsVolume), 400);
    }

    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentIdx, items]);

  const handleSpeak = useCallback((word, rate = 0.8) => {
    if (ttsEnabled && onSpeak) onSpeak(word, rate, ttsVolume);
  }, [ttsEnabled, onSpeak, ttsVolume]);

  const trackResult = useCallback((word, correct) => {
    const points = correct ? 15 : 3;
    setXpEarned(prev => prev + points);
    if (correct) setScore(prev => prev + 1);
    if (onAddXP) onAddXP(points);
    if (onTrackProgress) {
      onTrackProgress('struggle-drill', {
        word,
        correct,
        userAnswer: userInput.trim() || undefined,
        expected: word,
        responseMs: Date.now() - promptStartTime,
      });
    }
  }, [onAddXP, onTrackProgress, userInput, promptStartTime]);

  const handleNext = useCallback(() => {
    if (currentIdx < items.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({
          mode: 'struggle-drill',
          score,
          total: items.length,
          xpEarned,
        });
      }
    }
  }, [currentIdx, items, score, xpEarned, onComplete]);

  // --- SPELLING DRILL ---
  const renderSpellingDrill = () => {
    const word = currentItem.word;
    const translation = lookupTranslation(word);
    const phonetic = lookupPhonetic(word);

    const handleSpellingSubmit = () => {
      if (!userInput.trim() || submitted) return;
      const correct = userInput.trim().toLowerCase() === word.toLowerCase();
      const diff = computeDiff(word, userInput.trim());
      setFeedback({ correct, diff });
      setSubmitted(true);
      trackResult(word, correct);
    };

    return (
      <div style={styles.drillCard}>
        <div style={styles.drillType}>{DRILL_ICONS.spelling} Spelling Drill</div>
        <div style={styles.prompt}>Type this word correctly:</div>
        <div style={styles.targetWord}>{word}</div>
        <div style={styles.translation}>{translation}</div>
        {phonetic && <div style={styles.phonetic}>/{phonetic}/</div>}
        <button style={styles.ttsBtn} onClick={() => handleSpeak(word)}>🔊 Listen</button>

        <div style={styles.inputArea}>
          <input
            ref={inputRef}
            style={styles.input}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitted ? handleNext() : handleSpellingSubmit(); }}
            placeholder={`Type in ${langName}...`}
            disabled={submitted}
            autoFocus
          />
          {!submitted ? (
            <button style={styles.submitBtn} onClick={handleSpellingSubmit}>Check</button>
          ) : (
            <button style={styles.nextBtn} onClick={handleNext}>
              {currentIdx < items.length - 1 ? 'Next →' : 'Finish'}
            </button>
          )}
        </div>

        {feedback && (
          <div style={styles.feedbackArea}>
            <div style={{ color: feedback.correct ? '#4ade80' : '#f87171', fontSize: '1.1rem', fontWeight: '600' }}>
              {feedback.correct ? '✓ Correct!' : '✗ Not quite'}
            </div>
            {!feedback.correct && feedback.diff && (
              <div style={styles.diffDisplay}>
                {feedback.diff.map((d, i) => (
                  <span key={i} style={{
                    color: d.type === 'correct' ? '#4ade80' : d.type === 'missing' ? '#60a5fa' : '#f87171',
                    textDecoration: d.type === 'missing' ? 'underline' : 'none',
                    fontWeight: d.type !== 'correct' ? '700' : '400',
                    fontSize: '1.3rem',
                  }}>
                    {d.type === 'missing' ? d.char : d.char}
                  </span>
                ))}
                <div style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                  Correct: <strong style={{ color: '#4ade80' }}>{word}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- CONFUSION PAIR DRILL ---
  const renderConfusionDrill = () => {
    const word = currentItem.word;
    const pairWord = currentItem.pairWord;
    const wordTranslation = lookupTranslation(word);
    const pairTranslation = pairWord ? lookupTranslation(pairWord) : '';
    const wordPhonetic = lookupPhonetic(word);
    const pairPhonetic = pairWord ? lookupPhonetic(pairWord) : '';

    if (!pairWord) {
      // Fallback to spelling drill if no pair word found
      return renderSpellingDrill();
    }

    const handlePickChoice = (chosen) => {
      if (submitted) return;
      const correct = chosen === word;
      setFeedback({ correct, chosen });
      setSubmitted(true);
      trackResult(word, correct);
    };

    const handleTypeSubmit = () => {
      if (!userInput.trim() || submitted) return;
      const correct = userInput.trim().toLowerCase() === word.toLowerCase();
      setFeedback({ correct });
      setSubmitted(true);
      trackResult(word, correct);
    };

    return (
      <div style={styles.drillCard}>
        <div style={styles.drillType}>{DRILL_ICONS.confusion} Confusion Pair Drill</div>

        {confusionPhase === 'study' && (
          <>
            <div style={styles.prompt}>Study these two words:</div>
            <div style={styles.pairDisplay}>
              <div style={styles.pairSide} onClick={() => handleSpeak(word)}>
                <div style={styles.pairSideWord}>{word}</div>
                {wordPhonetic && <div style={styles.pairPhonetic}>/{wordPhonetic}/</div>}
                <div style={styles.pairMeaning}>{wordTranslation}</div>
                <span style={styles.speakSmall}>🔊</span>
              </div>
              <div style={styles.pairDivider}>vs</div>
              <div style={styles.pairSide} onClick={() => handleSpeak(pairWord)}>
                <div style={styles.pairSideWord}>{pairWord}</div>
                {pairPhonetic && <div style={styles.pairPhonetic}>/{pairPhonetic}/</div>}
                <div style={styles.pairMeaning}>{pairTranslation}</div>
                <span style={styles.speakSmall}>🔊</span>
              </div>
            </div>
            <button style={styles.submitBtn} onClick={() => { setConfusionPhase('pick'); setPromptStartTime(Date.now()); }}>
              Ready — Test Me
            </button>
          </>
        )}

        {confusionPhase === 'pick' && (
          <>
            <div style={styles.prompt}>Which word means: <strong>"{wordTranslation}"</strong>?</div>
            <div style={styles.choiceRow}>
              {[word, pairWord].sort(() => Math.random() - 0.5).map(w => (
                <button key={w} style={{
                  ...styles.choiceBtn,
                  ...(submitted && w === word ? styles.choiceCorrect : {}),
                  ...(submitted && feedback && feedback.chosen === w && !feedback.correct ? styles.choiceWrong : {}),
                }} onClick={() => handlePickChoice(w)} disabled={submitted}>
                  {w}
                </button>
              ))}
            </div>
            {submitted && (
              <div style={styles.feedbackArea}>
                <div style={{ color: feedback.correct ? '#4ade80' : '#f87171', fontWeight: '600' }}>
                  {feedback.correct ? '✓ Correct!' : `✗ It was: ${word}`}
                </div>
                {feedback.correct ? (
                  <button style={styles.submitBtn} onClick={() => { setSubmitted(false); setFeedback(null); setConfusionPhase('type'); setPromptStartTime(Date.now()); }}>
                    Now Type It →
                  </button>
                ) : (
                  <button style={styles.nextBtn} onClick={handleNext}>
                    {currentIdx < items.length - 1 ? 'Next →' : 'Finish'}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {confusionPhase === 'type' && (
          <>
            <div style={styles.prompt}>Type the word that means: <strong>"{wordTranslation}"</strong></div>
            <div style={styles.inputArea}>
              <input
                ref={inputRef}
                style={styles.input}
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitted ? handleNext() : handleTypeSubmit(); }}
                placeholder={`Type in ${langName}...`}
                disabled={submitted}
                autoFocus
              />
              {!submitted ? (
                <button style={styles.submitBtn} onClick={handleTypeSubmit}>Check</button>
              ) : (
                <button style={styles.nextBtn} onClick={handleNext}>
                  {currentIdx < items.length - 1 ? 'Next →' : 'Finish'}
                </button>
              )}
            </div>
            {feedback && (
              <div style={{ color: feedback.correct ? '#4ade80' : '#f87171', fontWeight: '600', marginTop: '0.5rem' }}>
                {feedback.correct ? '✓ Perfect!' : `✗ Correct answer: ${word}`}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // --- LISTENING DRILL ---
  const renderListeningDrill = () => {
    const word = currentItem.word;
    const translation = lookupTranslation(word);

    const handleListeningSubmit = () => {
      if (!userInput.trim() || submitted) return;
      const correct = userInput.trim().toLowerCase() === word.toLowerCase();
      const diff = computeDiff(word, userInput.trim());
      setFeedback({ correct, diff });
      setSubmitted(true);
      trackResult(word, correct);
      if (!correct && ttsEnabled && onSpeak) {
        // Replay slowly on error
        setTimeout(() => onSpeak(word, 0.6, ttsVolume), 500);
      }
    };

    return (
      <div style={styles.drillCard}>
        <div style={styles.drillType}>{DRILL_ICONS.listening} Listening Drill</div>
        <div style={styles.prompt}>Type what you hear:</div>

        <div style={styles.ttsControls}>
          <button style={styles.ttsBtnLarge} onClick={() => handleSpeak(word, 1)}>🔊 Normal</button>
          <button style={styles.ttsBtnLarge} onClick={() => handleSpeak(word, 0.6)}>🐢 Slow</button>
        </div>

        <div style={styles.inputArea}>
          <input
            ref={inputRef}
            style={styles.input}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitted ? handleNext() : handleListeningSubmit(); }}
            placeholder={`Type what you hear...`}
            disabled={submitted}
            autoFocus
          />
          {!submitted ? (
            <button style={styles.submitBtn} onClick={handleListeningSubmit}>Check</button>
          ) : (
            <button style={styles.nextBtn} onClick={handleNext}>
              {currentIdx < items.length - 1 ? 'Next →' : 'Finish'}
            </button>
          )}
        </div>

        {feedback && (
          <div style={styles.feedbackArea}>
            <div style={{ color: feedback.correct ? '#4ade80' : '#f87171', fontSize: '1.1rem', fontWeight: '600' }}>
              {feedback.correct ? '✓ Correct!' : '✗ Not quite'}
            </div>
            {!feedback.correct && feedback.diff && (
              <div style={styles.diffDisplay}>
                {feedback.diff.map((d, i) => (
                  <span key={i} style={{
                    color: d.type === 'correct' ? '#4ade80' : d.type === 'missing' ? '#60a5fa' : '#f87171',
                    textDecoration: d.type === 'missing' ? 'underline' : 'none',
                    fontWeight: d.type !== 'correct' ? '700' : '400',
                    fontSize: '1.3rem',
                  }}>
                    {d.type === 'missing' ? d.char : d.char}
                  </span>
                ))}
                <div style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                  Answer: <strong style={{ color: '#4ade80' }}>{word}</strong> ({translation})
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- MEANING DRILL ---
  const renderMeaningDrill = () => {
    const word = currentItem.word;
    const translation = lookupTranslation(word);

    const handleMeaningChoice = (chosen) => {
      if (submitted) return;
      const correct = chosen === word;
      setFeedback({ correct, chosen });
      setSubmitted(true);
      trackResult(word, correct);
    };

    return (
      <div style={styles.drillCard}>
        <div style={styles.drillType}>{DRILL_ICONS.meaning} Meaning Drill</div>
        <div style={styles.prompt}>Which word means: <strong>"{translation}"</strong>?</div>

        <div style={styles.meaningChoices}>
          {meaningChoices.map((choice, i) => (
            <button key={i} style={{
              ...styles.meaningBtn,
              ...(submitted && choice.word === word ? styles.choiceCorrect : {}),
              ...(submitted && feedback && feedback.chosen === choice.word && !feedback.correct ? styles.choiceWrong : {}),
            }} onClick={() => handleMeaningChoice(choice.word)} disabled={submitted}>
              <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{choice.word}</div>
            </button>
          ))}
        </div>

        {feedback && (
          <div style={styles.feedbackArea}>
            <div style={{ color: feedback.correct ? '#4ade80' : '#f87171', fontWeight: '600' }}>
              {feedback.correct ? '✓ Correct!' : `✗ Answer: ${word}`}
            </div>
            {submitted && (
              <button style={styles.nextBtn} onClick={handleNext}>
                {currentIdx < items.length - 1 ? 'Next →' : 'Finish'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- RENDER ---
  if (phase === 'complete' || items.length === 0) {
    if (items.length === 0) {
      return (
        <div style={styles.container}>
          <ModeHeader title="Struggle Drill" subtitle="No words to drill" icon="🎯" onExit={onExit} />
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <p>No struggle words to practice right now. Keep learning!</p>
          </div>
        </div>
      );
    }
    return (
      <CompletionScreen
        stats={{
          score,
          total: items.length,
          xpEarned,
          accuracy: items.length > 0 ? Math.round((score / items.length) * 100) : 0,
          title: 'Struggle Drill Complete!',
        }}
        onRetry={() => { setCurrentIdx(0); setScore(0); setXpEarned(0); setPhase('drill'); }}
        onExit={onExit}
      />
    );
  }

  return (
    <div style={styles.container}>
      <ModeHeader
        title="Struggle Drill"
        subtitle={`${currentIdx + 1} / ${items.length}`}
        icon="🎯"
        onExit={onExit}
      />

      {/* Progress bar */}
      <div style={styles.progressOuter}>
        <div style={{ ...styles.progressInner, width: `${((currentIdx + (submitted ? 1 : 0)) / items.length) * 100}%` }} />
      </div>

      {currentItem.type === 'spelling' && renderSpellingDrill()}
      {currentItem.type === 'confusion' && renderConfusionDrill()}
      {currentItem.type === 'listening' && renderListeningDrill()}
      {currentItem.type === 'meaning' && renderMeaningDrill()}

      {/* AI Tutor sidebar */}
      <LessonChat {...chat} langCode={langCode} />
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  progressOuter: {
    height: 4,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginBottom: '1.5rem',
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
    borderRadius: 2,
    transition: 'width 0.3s',
  },
  drillCard: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: '1.5rem',
    textAlign: 'center',
  },
  drillType: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '1rem',
  },
  prompt: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '1rem',
    marginBottom: '0.8rem',
  },
  targetWord: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '0.3rem',
  },
  translation: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.2rem',
  },
  phonetic: {
    fontSize: '0.9rem',
    color: '#4dabf7',
    marginBottom: '0.5rem',
  },
  ttsBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: 8,
    padding: '0.4rem 1rem',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginBottom: '1rem',
  },
  ttsControls: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  ttsBtnLarge: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: 8,
    padding: '0.6rem 1.2rem',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  inputArea: {
    display: 'flex',
    gap: '0.5rem',
    maxWidth: 400,
    margin: '0 auto',
  },
  input: {
    flex: 1,
    padding: '0.7rem 1rem',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
  },
  submitBtn: {
    padding: '0.7rem 1.2rem',
    background: '#4dabf7',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  nextBtn: {
    padding: '0.7rem 1.2rem',
    background: '#4ade80',
    color: '#000',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  feedbackArea: {
    marginTop: '1rem',
  },
  diffDisplay: {
    marginTop: '0.5rem',
    fontFamily: 'monospace',
  },
  // Confusion drill
  pairDisplay: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '0.5rem',
    marginBottom: '1rem',
    justifyContent: 'center',
  },
  pairSide: {
    flex: 1,
    maxWidth: 200,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: '1rem',
    cursor: 'pointer',
    textAlign: 'center',
    position: 'relative',
  },
  pairSideWord: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '0.2rem',
  },
  pairPhonetic: {
    fontSize: '0.8rem',
    color: '#4dabf7',
    marginBottom: '0.2rem',
  },
  pairMeaning: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)',
  },
  pairDivider: {
    display: 'flex',
    alignItems: 'center',
    color: '#f87171',
    fontWeight: '700',
    fontSize: '1.1rem',
  },
  speakSmall: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: '0.8rem',
    opacity: 0.5,
  },
  choiceRow: {
    display: 'flex',
    gap: '0.8rem',
    justifyContent: 'center',
    marginBottom: '0.5rem',
  },
  choiceBtn: {
    padding: '1rem 2rem',
    background: 'rgba(255,255,255,0.08)',
    border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    color: '#fff',
    fontSize: '1.2rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  choiceCorrect: {
    borderColor: '#4ade80',
    background: 'rgba(74,222,128,0.15)',
  },
  choiceWrong: {
    borderColor: '#f87171',
    background: 'rgba(248,113,113,0.15)',
  },
  // Meaning drill
  meaningChoices: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.6rem',
    maxWidth: 400,
    margin: '0 auto 0.5rem',
  },
  meaningBtn: {
    padding: '0.9rem',
    background: 'rgba(255,255,255,0.08)',
    border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { WordToolbar, ClickableText } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';
import useWhisperSTT from '../../hooks/useWhisperSTT.js';
import { getAllVocabularyWords } from '../../utils/dictionaryBuilder.js';

// --- Helpers ---

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"""''()—–\-…«»\[\]ʼ']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 100;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - levenshtein(na, nb) / maxLen) * 100);
}

function computeDiff(target, input) {
  const t = normalize(target);
  const inp = normalize(input);
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

function buildItems(langCode, difficulty) {
  const all = getAllVocabularyWords(langCode);
  const targetField = 'uk';

  if (difficulty === 'words') {
    const singles = all.filter(w => w[targetField] && !w[targetField].includes(' '));
    const shuffled = [...singles].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10).map(w => ({
      target: w[targetField],
      english: w.en || '',
      phonetic: w.phonetic || '',
    }));
  }

  if (difficulty === 'phrases') {
    const phrases = all.filter(w => {
      const wc = (w[targetField] || '').split(' ').length;
      return wc >= 2 && wc <= 4;
    });
    // Also collect examples from vocabulary entries
    const examplePhrases = [];
    all.forEach(w => {
      if (w.examples && w.examplesEn) {
        w.examples.forEach((ex, i) => {
          const wc = (ex || '').split(' ').length;
          if (wc >= 2 && wc <= 4 && w.examplesEn[i]) {
            examplePhrases.push({ target: ex, english: w.examplesEn[i], phonetic: '' });
          }
        });
      }
    });
    const fromVocab = phrases.map(w => ({ target: w[targetField], english: w.en || '', phonetic: w.phonetic || '' }));
    const combined = [...fromVocab, ...examplePhrases];
    const shuffled = [...combined].sort(() => Math.random() - 0.5);
    if (shuffled.length >= 10) return shuffled.slice(0, 10);
    // Pad with single words if not enough phrases
    const singles = all.filter(w => w[targetField] && !w[targetField].includes(' '))
      .sort(() => Math.random() - 0.5)
      .slice(0, 10 - shuffled.length)
      .map(w => ({ target: w[targetField], english: w.en || '', phonetic: w.phonetic || '' }));
    return [...shuffled, ...singles].slice(0, 10);
  }

  // sentences
  const sentences = [];
  all.forEach(w => {
    if (w.examples && w.examplesEn) {
      w.examples.forEach((ex, i) => {
        if ((ex || '').split(' ').length >= 5 && w.examplesEn[i]) {
          sentences.push({ target: ex, english: w.examplesEn[i], phonetic: '' });
        }
      });
    }
  });
  const shuffled = [...sentences].sort(() => Math.random() - 0.5);
  if (shuffled.length >= 8) return shuffled.slice(0, 8);
  // Pad with long phrases
  const long = all.filter(w => (w[targetField] || '').split(' ').length >= 3)
    .sort(() => Math.random() - 0.5)
    .slice(0, 8 - shuffled.length)
    .map(w => ({ target: w[targetField], english: w.en || '', phonetic: w.phonetic || '' }));
  return [...shuffled, ...long].slice(0, 8);
}

const DIFFICULTY_MULTIPLIER = { words: 1, phrases: 1.5, sentences: 2 };

// --- Component ---

export default function SpeechMode({ langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';

  // Phase
  const [phase, setPhase] = useState('picker'); // picker, playing, complete
  const [difficulty, setDifficulty] = useState(null);
  const [items, setItems] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Scoring
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [attempts, setAttempts] = useState(0); // on current item
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [similarityScores, setSimilarityScores] = useState([]);

  // Feedback
  const [feedback, setFeedback] = useState(null); // { match: 'correct'|'close'|'miss', transcript, similarity, diff }
  const [llmFeedback, setLlmFeedback] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);

  // TTS
  const [playbackRate, setPlaybackRate] = useState(1);

  // Pulse animation for recording
  const [pulseScale, setPulseScale] = useState(1);
  const pulseRef = useRef(null);

  // Shared hooks
  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });
  const chat = useLessonChat({
    langName, langCode,
    systemPrompt: `You are a helpful ${langName} pronunciation coach. The student is practicing speaking ${langName} words and phrases aloud. Answer questions about pronunciation, stress patterns, or specific sounds concisely. Keep responses under 150 words.`,
    onSpeak, ttsEnabled, ttsVolume,
  });

  const onTranscript = useCallback((text) => {
    if (!items[currentIdx]) return;
    const target = items[currentIdx].target;
    const sim = similarity(target, text);
    const diff = computeDiff(target, text);
    const match = sim >= 90 ? 'correct' : sim >= 70 ? 'close' : 'miss';

    setFeedback({ match, transcript: text, similarity: sim, diff });
    setTotalAttempts(p => p + 1);
    setAttempts(p => p + 1);
    setSimilarityScores(p => [...p, sim]);

    const mult = DIFFICULTY_MULTIPLIER[difficulty] || 1;
    let xp = 0;
    if (match === 'correct') {
      xp = Math.round((attempts === 0 ? 25 : 15) * mult);
      setScore(p => p + 1);
      setStreak(p => {
        const ns = p + 1;
        setBestStreak(b => Math.max(b, ns));
        // Streak bonus every 3
        if (ns % 3 === 0 && onAddXP) onAddXP(Math.round(10 * mult));
        return ns;
      });
    } else {
      xp = Math.round((match === 'close' ? 10 : 5) * mult);
      setStreak(0);
    }
    setXpEarned(p => p + xp);
    if (onAddXP) onAddXP(xp);
  }, [items, currentIdx, difficulty, attempts, onAddXP]);

  const stt = useWhisperSTT({ onTranscript });

  // Pulse animation
  useEffect(() => {
    if (stt.isListening) {
      pulseRef.current = setInterval(() => {
        setPulseScale(p => p === 1 ? 1.15 : 1);
      }, 500);
    } else {
      clearInterval(pulseRef.current);
      setPulseScale(1);
    }
    return () => clearInterval(pulseRef.current);
  }, [stt.isListening]);

  const currentItem = items[currentIdx] || null;

  const handlePlay = useCallback(() => {
    if (ttsEnabled && onSpeak && currentItem) {
      onSpeak(currentItem.target, playbackRate, ttsVolume);
    }
  }, [ttsEnabled, onSpeak, currentItem, playbackRate, ttsVolume]);

  const handleToggleRecord = useCallback(() => {
    if (stt.isListening) {
      stt.stopListening();
    } else {
      setFeedback(null);
      setLlmFeedback(null);
      stt.startListening(langCode);
    }
  }, [stt, langCode]);

  const handleGetTips = useCallback(async () => {
    if (!feedback || llmLoading) return;
    setLlmLoading(true);
    try {
      const ukSpecific = langCode === 'uk'
        ? 'For Ukrainian, pay attention to: soft/hard consonants, palatalization, vowel reduction, stress patterns, and the letters ь, ї, є, щ, г (fricative "h").'
        : 'For Russian, pay attention to: soft/hard consonants, palatalization, vowel reduction (аканье/иканье), stress patterns, and the letters ы, э, ё, щ, ж.';

      const systemPrompt = `You are a ${langName} pronunciation coach. A student spoke a ${langName} word/phrase and a speech recognition system (Whisper) transcribed what it heard.

Your job:
- Analyze the difference between the target and what Whisper heard
- Identify which specific sounds or syllables likely caused the mismatch
- ${ukSpecific}
- Give 1-2 specific, actionable pronunciation tips
- If they got it right, give brief encouragement and mention a subtle aspect they could refine
- Use IPA or simplified phonetic notation when helpful
- Keep responses under 100 words — be direct and practical
- Do NOT repeat the target or transcript back verbatim`;

      const res = await fetch('/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Target: "${currentItem.target}"\nWhisper heard: "${feedback.transcript}"\nSimilarity: ${feedback.similarity}%\nPlease analyze.` },
          ],
          temperature: 0.5,
          max_tokens: 300,
          stream: false,
        }),
      });
      const data = await res.json();
      setLlmFeedback(data.choices?.[0]?.message?.content || 'No feedback available.');
    } catch {
      setLlmFeedback('Could not reach the AI. Make sure LM Studio is running.');
    } finally {
      setLlmLoading(false);
    }
  }, [feedback, llmLoading, currentItem, langCode, langName]);

  const handleRetry = useCallback(() => {
    setFeedback(null);
    setLlmFeedback(null);
  }, []);

  const handleNext = useCallback(() => {
    // Track progress for completed item
    if (onTrackProgress && currentItem) {
      onTrackProgress('speech', {
        word: currentItem.target,
        correct: feedback?.match === 'correct',
      });
    }

    if (currentIdx < items.length - 1) {
      setCurrentIdx(p => p + 1);
      setFeedback(null);
      setLlmFeedback(null);
      setAttempts(0);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({
          mode: 'speech',
          score,
          total: items.length,
          xpEarned,
          difficulty,
        });
      }
    }
  }, [currentIdx, items, feedback, currentItem, score, xpEarned, difficulty, onComplete, onTrackProgress]);

  const handleStartDifficulty = useCallback((diff) => {
    setDifficulty(diff);
    setItems(buildItems(langCode, diff));
    setCurrentIdx(0);
    setScore(0);
    setXpEarned(0);
    setStreak(0);
    setBestStreak(0);
    setAttempts(0);
    setTotalAttempts(0);
    setSimilarityScores([]);
    setFeedback(null);
    setLlmFeedback(null);
    setPhase('playing');
  }, [langCode]);

  const handleSessionRetry = useCallback(() => {
    if (difficulty) handleStartDifficulty(difficulty);
  }, [difficulty, handleStartDifficulty]);

  // --- Picker Phase ---
  if (phase === 'picker') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Speech Practice" subtitle="Practice your pronunciation" icon="🎙️" onExit={onExit} />
        <div style={styles.pickerGrid}>
          {[
            { key: 'words', icon: '🔤', title: 'Words', desc: 'Start with individual words', count: '10 words' },
            { key: 'phrases', icon: '💬', title: 'Phrases', desc: 'Common 2-4 word phrases', count: '10 phrases' },
            { key: 'sentences', icon: '📝', title: 'Sentences', desc: 'Full sentences', count: '8 sentences' },
          ].map(d => (
            <div key={d.key} style={styles.pickerCard} onClick={() => handleStartDifficulty(d.key)}>
              <div style={styles.pickerIcon}>{d.icon}</div>
              <div style={styles.pickerTitle}>{d.title}</div>
              <div style={styles.pickerDesc}>{d.desc}</div>
              <div style={styles.pickerCount}>{d.count}</div>
            </div>
          ))}
        </div>
        <div style={styles.pickerHint}>
          Speak into your microphone — if the speech recognition understands you, your pronunciation is on track!
        </div>
      </div>
    );
  }

  // --- Complete Phase ---
  if (phase === 'complete') {
    const accuracy = items.length > 0 ? Math.round((score / items.length) * 100) : 0;
    const avgSim = similarityScores.length > 0 ? Math.round(similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length) : 0;
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{ title: 'Speech Practice Complete!', score, total: items.length, xpEarned, accuracy }}
          onRetry={handleSessionRetry}
          onExit={onExit}
        />
        <div style={styles.extraStats}>
          <div style={styles.extraStat}>
            <span style={styles.extraStatLabel}>Best Streak</span>
            <span style={styles.extraStatValue}>{bestStreak}</span>
          </div>
          <div style={styles.extraStat}>
            <span style={styles.extraStatLabel}>Avg Similarity</span>
            <span style={styles.extraStatValue}>{avgSim}%</span>
          </div>
          <div style={styles.extraStat}>
            <span style={styles.extraStatLabel}>Total Attempts</span>
            <span style={styles.extraStatValue}>{totalAttempts}</span>
          </div>
        </div>
      </div>
    );
  }

  // --- Playing Phase ---
  const progress = ((currentIdx + 1) / items.length) * 100;
  const diffColors = { correct: '#4ade80', wrong: '#f87171', missing: '#fbbf24', extra: '#f87171' };
  const matchColors = { correct: '#4ade80', close: '#fbbf24', miss: '#f87171' };
  const matchLabels = { correct: 'Correct!', close: 'Almost there!', miss: 'Try again' };

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title="Speech Practice"
        subtitle={`${difficulty === 'words' ? 'Word' : difficulty === 'phrases' ? 'Phrase' : 'Sentence'} ${currentIdx + 1} of ${items.length}`}
        icon="🎙️"
        onExit={onExit}
      />

      <div className="content-row" style={styles.contentRow}>
        <div style={styles.main}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>

          <div style={styles.card}>
            {/* Target display */}
            <div style={styles.targetText}>
              <ClickableText text={currentItem?.target || ''} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
            </div>
            {currentItem?.phonetic && (
              <div style={styles.phonetic}>{currentItem.phonetic}</div>
            )}
            {currentItem?.english && (
              <div style={styles.english}>{currentItem.english}</div>
            )}

            {/* TTS controls */}
            <div style={styles.ttsRow}>
              <button style={styles.playBtn} onClick={handlePlay}>
                🔊 Listen
              </button>
              <div style={styles.speedControls}>
                {[0.5, 0.75, 1].map(rate => (
                  <button
                    key={rate}
                    style={{ ...styles.speedBtn, ...(playbackRate === rate ? styles.speedBtnActive : {}) }}
                    onClick={() => setPlaybackRate(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={styles.divider} />

            {/* Record button */}
            <div style={styles.recordSection}>
              <button
                style={{
                  ...styles.recordBtn,
                  ...(stt.isListening ? styles.recordBtnActive : {}),
                  transform: stt.isListening ? `scale(${pulseScale})` : 'scale(1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onClick={handleToggleRecord}
                disabled={stt.isTranscribing}
              >
                {stt.isTranscribing ? (
                  <span style={styles.recordIcon}>⏳</span>
                ) : stt.isListening ? (
                  <span style={styles.recordIcon}>⏹️</span>
                ) : (
                  <span style={styles.recordIcon}>🎤</span>
                )}
              </button>
              <div style={styles.recordLabel}>
                {stt.isTranscribing ? 'Processing...' : stt.isListening ? 'Tap to stop' : 'Tap to speak'}
              </div>
            </div>

            {stt.error && (
              <div style={styles.errorMsg}>
                {stt.error === 'Microphone access denied'
                  ? 'Microphone access is required for speech practice. Please allow microphone access and try again.'
                  : stt.error}
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div style={styles.feedbackArea}>
                <div style={{ ...styles.feedbackHeader, color: matchColors[feedback.match] }}>
                  {matchLabels[feedback.match]}
                  <span style={styles.simBadge}>{feedback.similarity}% match</span>
                </div>

                {/* Visual diff */}
                <div style={styles.diffSection}>
                  <div style={styles.diffLabel}>You said:</div>
                  <div style={styles.diffDisplay}>
                    {feedback.diff.map((d, i) => (
                      <span key={i} style={{
                        color: diffColors[d.type],
                        fontWeight: '700',
                        fontSize: '1.3rem',
                        textDecoration: d.type === 'extra' ? 'line-through' : 'none',
                      }}>
                        {d.char}
                      </span>
                    ))}
                  </div>
                  {feedback.match !== 'correct' && (
                    <div style={styles.expectedLabel}>
                      Expected: <strong>{currentItem?.target}</strong>
                    </div>
                  )}
                </div>

                {/* LLM tips */}
                {!llmFeedback && !llmLoading && (
                  <button style={styles.tipsBtn} onClick={handleGetTips}>
                    💡 Get pronunciation tips
                  </button>
                )}
                {llmLoading && (
                  <div style={styles.tipsLoading}>Analyzing your pronunciation...</div>
                )}
                {llmFeedback && (
                  <div style={styles.tipsBox}>
                    <div style={styles.tipsHeader}>💡 Pronunciation Coach</div>
                    <div style={styles.tipsText}>{llmFeedback}</div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={styles.actionRow}>
                  <button style={styles.retryBtn} onClick={handleRetry}>
                    🔄 Retry
                  </button>
                  <button style={styles.nextBtn} onClick={handleNext}>
                    {currentIdx < items.length - 1 ? 'Next →' : 'Finish'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={styles.scoreBar}>
            <span>Score: {score}/{currentIdx + (feedback ? 1 : 0)}</span>
            <span>Streak: {streak}</span>
            <span>XP: +{xpEarned}</span>
          </div>
        </div>
        <LessonChat {...chat} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
      </div>
      <WordToolbar selectedWord={selectedWord} onDismiss={dismissWord} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} langName={langName} />
    </div>
  );
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
  main: { flex: 1, minWidth: 0 },

  // Picker
  pickerGrid: {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '2rem',
  },
  pickerCard: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: '20px',
    padding: '2rem 1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    width: '220px',
    transition: 'all 0.2s',
  },
  pickerIcon: { fontSize: '3rem', marginBottom: '0.75rem' },
  pickerTitle: { fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.5rem' },
  pickerDesc: { fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' },
  pickerCount: { fontSize: '0.85rem', color: '#ffd700', fontWeight: '600' },
  pickerHint: {
    textAlign: 'center',
    marginTop: '2rem',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.95rem',
    maxWidth: '500px',
    margin: '2rem auto 0',
  },

  // Progress
  progressBar: {
    width: '100%',
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    marginBottom: '2rem',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ffd700, #ffed4e)',
    transition: 'width 0.3s ease',
  },

  // Card
  card: {
    maxWidth: '600px',
    margin: '0 auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '2rem',
    textAlign: 'center',
    border: '1px solid rgba(255,215,0,0.2)',
  },
  targetText: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    lineHeight: 1.4,
  },
  phonetic: {
    fontSize: '1.1rem',
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    marginBottom: '0.25rem',
  },
  english: {
    fontSize: '1rem',
    color: '#4dabf7',
    marginBottom: '1.25rem',
  },

  // TTS
  ttsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  playBtn: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    border: 'none',
    color: '#fff',
    padding: '0.7rem 1.8rem',
    borderRadius: '14px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  speedControls: {
    display: 'flex',
    gap: '0.4rem',
  },
  speedBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.35rem 0.7rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  speedBtnActive: {
    background: 'rgba(255,215,0,0.2)',
    borderColor: '#ffd700',
    color: '#ffd700',
    fontWeight: '600',
  },

  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.1)',
    margin: '1rem 0 1.5rem',
  },

  // Record
  recordSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  recordBtn: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s',
  },
  recordBtnActive: {
    border: '3px solid #f87171',
    background: 'rgba(248,113,113,0.15)',
    boxShadow: '0 0 20px rgba(248,113,113,0.3)',
  },
  recordIcon: {
    fontSize: '2rem',
  },
  recordLabel: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.5)',
  },

  // Error
  errorMsg: {
    background: 'rgba(248,113,113,0.15)',
    border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    color: '#f87171',
    fontSize: '0.9rem',
    marginBottom: '1rem',
  },

  // Feedback
  feedbackArea: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '1.25rem',
  },
  feedbackHeader: {
    fontSize: '1.3rem',
    fontWeight: '700',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
  },
  simBadge: {
    fontSize: '0.85rem',
    fontWeight: '600',
    background: 'rgba(255,255,255,0.1)',
    padding: '0.2rem 0.6rem',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
  },
  diffSection: {
    marginBottom: '1rem',
  },
  diffLabel: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.4rem',
  },
  diffDisplay: {
    marginBottom: '0.5rem',
    letterSpacing: '1px',
  },
  expectedLabel: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.6)',
  },

  // LLM tips
  tipsBtn: {
    background: 'rgba(255,215,0,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
    color: '#ffd700',
    padding: '0.6rem 1.2rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    fontFamily: 'inherit',
    marginBottom: '1rem',
    transition: 'all 0.2s',
  },
  tipsLoading: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    fontStyle: 'italic',
  },
  tipsBox: {
    background: 'rgba(77,171,247,0.1)',
    border: '1px solid rgba(77,171,247,0.25)',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '1rem',
    textAlign: 'left',
  },
  tipsHeader: {
    fontWeight: '700',
    color: '#4dabf7',
    marginBottom: '0.5rem',
    fontSize: '0.95rem',
  },
  tipsText: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },

  // Actions
  actionRow: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
  },
  retryBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.7rem 1.5rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #51cf66, #37b24d)',
    border: 'none',
    color: '#fff',
    padding: '0.7rem 1.5rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  // Score bar
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
    fontWeight: '600',
  },

  // Extra stats on complete
  extraStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginTop: '1.5rem',
    flexWrap: 'wrap',
  },
  extraStat: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    padding: '1rem 1.5rem',
    textAlign: 'center',
    minWidth: '120px',
  },
  extraStatLabel: {
    display: 'block',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.3rem',
  },
  extraStatValue: {
    display: 'block',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffd700',
  },
};

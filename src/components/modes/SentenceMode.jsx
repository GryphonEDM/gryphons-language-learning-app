import React, { useState, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { WordToolbar, ClickableText } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';
import { storageGet, storageSet } from '../../utils/storage.js';
import useNextShortcut from '../../hooks/useNextShortcut.js';

const RANDOM_TOPICS = {
  A1: ['my cat', 'at the park', 'breakfast', 'my family', 'colors', 'my room', 'at the store', 'the weather', 'my friend', 'school'],
  A2: ['a trip to the market', 'my best friend', 'a rainy day', 'learning to cook', 'the weekend', 'a birthday party', 'my hobby', 'at the zoo', 'a new pet', 'the seasons'],
  B1: ['a mysterious package', 'the old bookshop', 'a train journey', 'moving to a new city', 'an unexpected visitor', 'a lost key', 'the first day of work', 'a recipe from grandma', 'a winter adventure', 'the street musician'],
  B2: ['a misunderstanding at work', 'the philosophy of travel', 'a cultural tradition', 'an ethical dilemma', 'the impact of technology', 'a childhood memory', 'an unexpected friendship', 'the meaning of home'],
};

const DIFFICULTY_GUIDANCE = {
  A1: 'Use only present tense, very simple sentences of 3-5 words, basic vocabulary (family, food, animals, colors, daily routines). Use 1-2 distractor words per sentence.',
  A2: 'Use present tense mostly with some past tense, simple sentences of 4-7 words, everyday vocabulary. Use 2 distractor words per sentence.',
  B1: 'Use past, present, and future tenses, sentences of 5-8 words, broader vocabulary including emotions and opinions. Use 2-3 distractor words per sentence.',
  B2: 'Use varied tenses and moods, sentences of 6-10 words, nuanced vocabulary. Use 3-4 distractor words per sentence.',
};

const SpinKeyframes = () => (
  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
);

function loadAiSentenceSets() {
  try {
    return JSON.parse(storageGet('aiSentenceSets') || '[]');
  } catch { return []; }
}

function saveAiSentenceSet(set) {
  const existing = loadAiSentenceSets();
  existing.unshift(set);
  storageSet('aiSentenceSets', JSON.stringify(existing));
}

function deleteAiSentenceSet(id) {
  const existing = loadAiSentenceSets().filter(s => s.id !== id);
  storageSet('aiSentenceSets', JSON.stringify(existing));
}

export default function SentenceMode({ langCode = 'uk', sentenceData, onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress, onMarkMastered, masteredWordsList = [] }) {
  const langName = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' }[langCode] || 'Ukrainian';
  const [phase, setPhase] = useState('pick-difficulty'); // pick-difficulty, generate, playing, complete
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });
  const chat = useLessonChat({ langName, langCode, systemPrompt: `You are a helpful ${langName} language tutor. The student is doing a sentence-building exercise — arranging word tiles into correct ${langName} sentences. Answer questions about grammar, vocabulary, or word order concisely. Keep responses under 150 words.`, onSpeak, ttsEnabled, ttsVolume });
  const [sentences, setSentences] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [availableTiles, setAvailableTiles] = useState([]);
  const [placedTiles, setPlacedTiles] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [isAiSession, setIsAiSession] = useState(false);

  // AI generation state
  const [aiSentenceSets, setAiSentenceSets] = useState(() => loadAiSentenceSets());
  const [aiDifficulty, setAiDifficulty] = useState('A1');
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(10);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiProgressStep, setAiProgressStep] = useState('');
  const [aiProgressPct, setAiProgressPct] = useState(0);
  const aiAbortRef = useRef(null);

  function initTilesFromSentence(sentence) {
    if (!sentence) return [];
    const allWords = [...(sentence.words ?? []), ...(sentence.distractors ?? [])];
    return allWords.sort(() => Math.random() - 0.5).map((word, i) => ({ id: `${i}-${word}`, word }));
  }

  // Compute available difficulty levels and counts from sentenceData
  const difficultyLevels = React.useMemo(() => {
    const counts = {};
    sentenceData.forEach(s => {
      const d = s.difficulty || 'Unknown';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [sentenceData]);

  const startExercise = React.useCallback((diff, customSentences = null) => {
    setSelectedDifficulty(diff);
    let selected;
    if (customSentences) {
      selected = [...customSentences].sort(() => Math.random() - 0.5);
      setIsAiSession(true);
    } else {
      const filtered = diff ? sentenceData.filter(s => s.difficulty === diff) : sentenceData;
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      selected = shuffled.slice(0, 10);
      setIsAiSession(false);
    }
    setSentences(selected);
    setCurrentIdx(0);
    setAvailableTiles(initTilesFromSentence(selected[0]));
    setPlacedTiles([]);
    setFeedback(null);
    setScore(0);
    setXpEarned(0);
    setMistakeCount(0);
    setConsecutiveCorrect(0);
    setPhase('playing');
  }, [sentenceData]);

  const currentSentence = sentences[currentIdx];

  const handleTileClick = (tile) => {
    if (feedback) return;
    setAvailableTiles(prev => prev.filter(t => t.id !== tile.id));
    setPlacedTiles(prev => [...prev, tile]);
    if (ttsEnabled) onSpeak(tile.word, 0.8, ttsVolume);
  };

  const handlePlacedClick = (tile) => {
    if (feedback) return;
    setPlacedTiles(prev => prev.filter(t => t.id !== tile.id));
    setAvailableTiles(prev => [...prev, tile]);
  };

  const handleSubmit = () => {
    if (feedback || placedTiles.length === 0) return;

    const placed = placedTiles.map(t => t.word);
    const orders = currentSentence.validOrders?.length ? currentSentence.validOrders : [currentSentence.words ?? []];
    const isCorrect = orders.some(order => {
      if (order.length !== placed.length) return false;
      return order.every((w, i) => w.toLowerCase() === placed[i].toLowerCase());
    });

    const points = isCorrect ? 20 : 5;
    setFeedback({ correct: isCorrect });

    if (isCorrect) {
      setScore(prev => prev + 1);
      setConsecutiveCorrect(prev => prev + 1);
      if (ttsEnabled && onSpeak) {
        onSpeak(currentSentence[langCode], 0.8, ttsVolume);
      }
    } else {
      setConsecutiveCorrect(0);
      setMistakeCount(prev => prev + 1);
    }

    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);

    if (onTrackProgress) {
      onTrackProgress('sentences', {
        sentenceId: currentSentence.id,
        correct: isCorrect
      });
    }
  };

  const handleNext = () => {
    if (currentIdx < sentences.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setAvailableTiles(initTilesFromSentence(sentences[nextIdx]));
      setPlacedTiles([]);
      setFeedback(null);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({
          mode: 'sentences',
          score,
          total: sentences.length,
          xpEarned,
          consecutiveCorrect
        });
      }
    }
  };

  const handleClear = () => {
    if (feedback) return;
    setAvailableTiles(initTilesFromSentence(currentSentence));
    setPlacedTiles([]);
  };

  const handleRetry = () => {
    if (isAiSession) {
      startExercise(selectedDifficulty, sentences);
    } else {
      startExercise(selectedDifficulty);
    }
  };

  useNextShortcut(handleNext, !!feedback);

  // --- AI Generation ---
  const detectProgress = (accumulated) => {
    const sentenceMatches = accumulated.match(/"en"\s*:/g);
    const count = sentenceMatches ? sentenceMatches.length : 0;
    if (count === 0) return { step: 'Starting generation...', pct: 5 };
    const pct = Math.min(90, Math.round((count / aiCount) * 90));
    return { step: `Generated ${count} of ${aiCount} sentences...`, pct };
  };

  const cancelGeneration = () => {
    if (aiAbortRef.current) aiAbortRef.current.abort();
    setAiGenerating(false);
    setAiProgressStep('');
    setAiProgressPct(0);
  };

  const generateSentences = async () => {
    setAiGenerating(true);
    setAiError(null);
    setAiProgressStep('Starting generation...');
    setAiProgressPct(0);

    const topic = aiTopic.trim() || 'daily life';
    const langInstructions = `Provide each sentence in ${langName} AND English. Use "${langCode}" for the ${langName} text and "en" for English.`;

    const prompt = `Generate exactly ${aiCount} sentence-building exercises for a ${langName} language learner at ${aiDifficulty} level.
Topic: ${topic}

${DIFFICULTY_GUIDANCE[aiDifficulty]}

${langInstructions}

For each sentence, provide:
- "en": the English translation
- "${langCode}": the sentence in ${langName}
- "words": array of the correct words that make up the ${langName} sentence (in correct order)
- "distractors": array of plausible but incorrect ${langName} words (same part of speech or related meaning)
- "validOrders": array of valid word orderings (at minimum the canonical order, add alternatives if the language allows flexible word order)

Respond with ONLY valid JSON, no markdown fences, no extra text. Use this exact format:
{
  "sentences": [
    {
      "en": "I like this book",
      "${langCode}": "(the sentence in ${langName})",
      "words": ["(word1)", "(word2)", "(word3)"],
      "distractors": ["(wrong1)", "(wrong2)"],
      "validOrders": [["(word1)", "(word2)", "(word3)"]]
    }
  ]
}`;

    try {
      const abort = new AbortController();
      aiAbortRef.current = abort;

      const res = await fetch('/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: [
            { role: 'system', content: `You are a ${langName} language learning content creator. Always respond with valid JSON only. Create high-quality sentence-building exercises.` },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          stream: true,
          max_tokens: 4000
        }),
        signal: abort.signal,
      });

      if (!res.ok) throw new Error('LLM request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let sseBuffer = '';

      while (true) {
        if (abort.signal.aborted) { reader.cancel(); break; }
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              const progress = detectProgress(accumulated);
              setAiProgressStep(progress.step);
              setAiProgressPct(progress.pct);
            }
          } catch { /* ignore malformed chunks */ }
        }
      }

      if (abort.signal.aborted) return;

      // Parse accumulated response
      let content = accumulated.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.sentences || !Array.isArray(parsed.sentences) || parsed.sentences.length === 0) {
        throw new Error('No sentences found in response');
      }

      setAiProgressPct(100);
      setAiProgressStep('Done!');

      const timestamp = Date.now();
      const generatedSentences = parsed.sentences.map((s, i) => ({
        id: `ai-sentence-${timestamp}-${i}`,
        en: s.en,
        [langCode]: s[langCode] || s.text || '',
        uk: s.uk || (langCode === 'uk' ? s[langCode] : ''),
        ru: s.ru || (langCode === 'ru' ? s[langCode] : ''),
        de: s.de || (langCode === 'de' ? s[langCode] : ''),
        words: s.words,
        distractors: s.distractors || [],
        validOrders: s.validOrders || [s.words],
        difficulty: aiDifficulty,
      }));

      const sentenceSet = {
        id: `ai-set-${timestamp}`,
        topic,
        difficulty: aiDifficulty,
        langCode,
        count: generatedSentences.length,
        sentences: generatedSentences,
        createdAt: timestamp,
      };

      saveAiSentenceSet(sentenceSet);
      setAiSentenceSets(prev => [sentenceSet, ...prev]);

      setAiGenerating(false);
      startExercise(aiDifficulty, generatedSentences);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setAiGenerating(false);
      setAiError(err.message === 'Failed to fetch'
        ? 'Could not connect to LM Studio. Make sure it is running at localhost:1234.'
        : 'Failed to generate sentences. Please try again.');
    }
  };

  const pickRandomTopic = () => {
    const topics = RANDOM_TOPICS[aiDifficulty] || RANDOM_TOPICS.A1;
    setAiTopic(topics[Math.floor(Math.random() * topics.length)]);
  };

  // --- Difficulty Picker Phase ---
  if (phase === 'pick-difficulty') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Build Sentences" subtitle="Arrange words to build sentences" icon="🧱" onExit={onExit} />
        <div style={styles.levelList}>
          {/* AI Generate Card */}
          <div style={styles.aiCard} onClick={() => setPhase('generate')}>
            <div style={styles.aiCardIcon}>&#10024;</div>
            <div>
              <div style={styles.aiCardTitle}>AI Sentence Generator</div>
              <div style={styles.aiCardDesc}>Generate custom sentence exercises on any topic at your level</div>
            </div>
          </div>

          {/* Saved AI Sentence Sets */}
          {aiSentenceSets.filter(s => !s.langCode || s.langCode === langCode).length > 0 && (
            <div style={styles.listSection}>
              <h2 style={styles.sectionHeading}>Your AI Sentences</h2>
              {aiSentenceSets.filter(s => !s.langCode || s.langCode === langCode).map(set => (
                <div
                  key={set.id}
                  style={styles.listRow}
                  onClick={() => startExercise(set.difficulty, set.sentences)}
                >
                  <span style={styles.listTitle}>{set.topic}</span>
                  <span style={styles.listMeta}>
                    <span style={styles.difficultyBadge}>{set.difficulty}</span>
                    <span style={styles.countBadge}>{set.count} sentences</span>
                  </span>
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAiSentenceSet(set.id);
                      setAiSentenceSets(prev => prev.filter(x => x.id !== set.id));
                    }}
                  >x</button>
                </div>
              ))}
            </div>
          )}

          {/* Built-in Sentences */}
          <div style={styles.listSection}>
            <h2 style={styles.sectionHeading}>Built-in Sentences</h2>
            <div
              style={styles.listRow}
              onClick={() => startExercise(null)}
            >
              <span style={styles.listTitle}>All Levels</span>
              <span style={styles.listMeta}>
                <span style={styles.countBadge}>{sentenceData.length} sentences</span>
              </span>
            </div>
            {difficultyLevels.map(([level, count]) => (
              <div
                key={level}
                style={styles.listRow}
                onClick={() => startExercise(level)}
              >
                <span style={styles.listTitle}>{level}</span>
                <span style={styles.listMeta}>
                  <span style={styles.listPreview}>
                    {level === 'A1' ? 'Beginner' : level === 'A2' ? 'Elementary' : level === 'B1' ? 'Intermediate' : level === 'B2' ? 'Upper Intermediate' : level}
                  </span>
                  <span style={styles.countBadge}>{count} sentences</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- AI Generate Phase ---
  if (phase === 'generate') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader
          title="AI Sentence Generator"
          subtitle={`Generate custom ${langName} sentence exercises`}
          icon="&#10024;"
          onExit={() => setPhase('pick-difficulty')}
        />
        <div style={styles.generateForm}>
          {/* Difficulty */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Difficulty Level</label>
            <div style={styles.difficultyGroup}>
              {['A1', 'A2', 'B1', 'B2'].map(d => (
                <button
                  key={d}
                  style={{
                    ...styles.difficultyBtn,
                    ...(aiDifficulty === d ? styles.difficultyBtnActive : {})
                  }}
                  onClick={() => setAiDifficulty(d)}
                  disabled={aiGenerating}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Topic</label>
            <div style={styles.topicRow}>
              <input
                style={styles.topicInput}
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="e.g., at the restaurant"
                disabled={aiGenerating}
                onKeyDown={e => { if (e.key === 'Enter' && !aiGenerating) generateSentences(); }}
              />
              <button
                style={styles.randomBtn}
                onClick={pickRandomTopic}
                disabled={aiGenerating}
              >
                Random
              </button>
            </div>
          </div>

          {/* Number of sentences */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Number of Sentences</label>
            <div style={styles.difficultyGroup}>
              {[5, 10, 15].map(n => (
                <button
                  key={n}
                  style={{
                    ...styles.difficultyBtn,
                    ...(aiCount === n ? styles.difficultyBtnActive : {})
                  }}
                  onClick={() => setAiCount(n)}
                  disabled={aiGenerating}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            style={{
              ...styles.generateBtn,
              ...(aiGenerating ? styles.generateBtnDisabled : {})
            }}
            onClick={generateSentences}
            disabled={aiGenerating}
          >
            {aiGenerating ? 'Generating...' : 'Generate Sentences'}
          </button>

          {/* Loading indicator */}
          {aiGenerating && (
            <div style={styles.loadingContainer}>
              <SpinKeyframes />
              <div style={styles.loadingSpinner} />
              <div style={styles.loadingText}>{aiProgressStep || 'Starting generation...'}</div>
              <div style={styles.progressBarTrack}>
                <div style={{ ...styles.progressBarFillAi, width: `${aiProgressPct}%` }} />
              </div>
              <button style={styles.cancelBtn} onClick={cancelGeneration}>Cancel</button>
            </div>
          )}

          {/* Error */}
          {aiError && (
            <div style={styles.errorBox}>
              {aiError}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    const accuracy = sentences.length > 0 ? Math.round((score / sentences.length) * 100) : 0;
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{ title: 'Sentence Building Complete!', score, total: sentences.length, xpEarned, accuracy }}
          onRetry={handleRetry}
          onExit={() => setPhase('pick-difficulty')}
          exitLabel="Back to List"
        />
      </div>
    );
  }

  const progress = ((currentIdx + 1) / sentences.length) * 100;

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title="Build Sentences"
        subtitle={`Sentence ${currentIdx + 1} of ${sentences.length}${selectedDifficulty ? ` · ${selectedDifficulty}` : ''}${isAiSession ? ' · AI' : ''}`}
        icon="🧱"
        onExit={() => setPhase('pick-difficulty')}
      />

      <div className="content-row" style={styles.contentRow}>
        <div style={styles.main}>
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${progress}%`}} />
          </div>

      <div style={styles.card}>
        <p style={styles.instruction}>Arrange the words to translate:</p>
        <div style={styles.englishSentence}>{currentSentence.en}</div>

        {/* Placed tiles area */}
        <div style={styles.placedArea}>
          {placedTiles.length === 0 ? (
            <span style={styles.placeholderText}>Tap words below to build the sentence</span>
          ) : (
            placedTiles.map(tile => (
              <button key={tile.id} style={styles.placedTile} onClick={() => handlePlacedClick(tile)}>
                {tile.word}
              </button>
            ))
          )}
        </div>

        {/* Available tiles */}
        <div style={styles.availableArea}>
          {availableTiles.map(tile => (
            <button key={tile.id} style={styles.availableTile} onClick={() => handleTileClick(tile)}>
              {tile.word}
            </button>
          ))}
        </div>

        <div style={styles.actions}>
          {!feedback && (
            <>
              <button style={styles.clearBtn} onClick={handleClear}>Clear</button>
              <button style={styles.submitBtn} onClick={handleSubmit}>Check</button>
            </>
          )}
          {feedback && (
            <button style={styles.nextBtn} onClick={handleNext}>
              {currentIdx < sentences.length - 1 ? 'Next →' : 'Finish'}
            </button>
          )}
        </div>

        {feedback && (
          <div style={{
            ...styles.feedbackBox,
            borderColor: feedback.correct ? '#4ade80' : '#f87171'
          }}>
            <div style={{ color: feedback.correct ? '#4ade80' : '#f87171', fontWeight: '700', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              {feedback.correct ? 'Correct!' : 'Not quite...'}
            </div>
            {!feedback.correct && (
              <div style={{ color: 'rgba(255,255,255,0.8)' }}>
                Correct: <strong style={{ color: '#ffd700' }}>
                  <ClickableText text={currentSentence[langCode]} onWordClick={handleWordClick} activeWord={selectedWord?.word} langCode={langCode} />
                </strong>
              </div>
            )}
          </div>
        )}
      </div>

          <div style={styles.scoreBar}>
            <span>Score: {score}/{currentIdx + (feedback ? 1 : 0)}</span>
            <span>XP: +{xpEarned}</span>
          </div>

          {isAiSession && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                style={styles.newAiBtn}
                onClick={() => setPhase('generate')}
              >
                New AI Sentences
              </button>
            </div>
          )}
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

  // List layout
  levelList: { maxWidth: '800px', margin: '0 auto' },
  listSection: { marginBottom: '1.5rem' },
  sectionHeading: {
    fontSize: '1rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
    letterSpacing: '1px', marginTop: '1.5rem', marginBottom: '0.5rem',
  },
  listRow: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.6rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer', transition: 'background 0.15s', borderRadius: '6px',
  },
  listTitle: {
    fontSize: '0.95rem', fontWeight: '600', color: '#ffd700', flex: 1, minWidth: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize',
  },
  listMeta: { display: 'flex', gap: '0.5rem', flexShrink: 0 },
  listPreview: {
    fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)',
  },
  difficultyBadge: { color: '#4dabf7', fontWeight: '600', fontSize: '0.75rem' },
  countBadge: { color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' },
  deleteBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
    cursor: 'pointer', fontSize: '0.85rem', padding: '0.2rem 0.5rem',
    borderRadius: '4px', fontFamily: 'inherit', flexShrink: 0,
  },

  // AI Card
  aiCard: {
    background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(77,171,247,0.2))',
    border: '2px solid rgba(139,92,246,0.4)', borderRadius: '16px', padding: '1.5rem',
    cursor: 'pointer', transition: 'all 0.2s', display: 'flex',
    alignItems: 'center', gap: '1.25rem', marginBottom: '1rem',
  },
  aiCardIcon: { fontSize: '2.5rem' },
  aiCardTitle: { fontSize: '1.2rem', fontWeight: '700', color: '#c4b5fd', marginBottom: '0.25rem' },
  aiCardDesc: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' },

  // Generate form styles
  generateForm: {
    maxWidth: '500px', margin: '2rem auto',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  formLabel: {
    display: 'block', fontSize: '0.95rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)',
    marginBottom: '0.5rem',
  },
  difficultyGroup: {
    display: 'flex', gap: '0.5rem',
  },
  difficultyBtn: {
    flex: 1, padding: '0.6rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1rem', fontWeight: '600',
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
  },
  difficultyBtnActive: {
    background: 'rgba(147,51,234,0.4)', borderColor: '#9333ea', color: '#c4b5fd',
  },
  topicRow: {
    display: 'flex', gap: '0.5rem',
  },
  topicInput: {
    flex: 1, padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.95rem',
    fontFamily: 'inherit', outline: 'none',
  },
  randomBtn: {
    padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid rgba(147,51,234,0.5)',
    background: 'rgba(147,51,234,0.2)', color: '#c4b5fd', fontSize: '0.9rem', fontWeight: '600',
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  },
  generateBtn: {
    width: '100%', padding: '0.8rem', borderRadius: '12px', border: 'none',
    background: 'linear-gradient(135deg, #9333ea, #6d28d9)', color: '#fff',
    fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  generateBtnDisabled: {
    opacity: 0.6, cursor: 'not-allowed',
  },
  loadingContainer: {
    textAlign: 'center', marginTop: '1.5rem',
  },
  loadingSpinner: {
    width: '32px', height: '32px', border: '3px solid rgba(147,51,234,0.3)',
    borderTop: '3px solid #9333ea', borderRadius: '50%',
    animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem',
  },
  loadingText: {
    color: '#c4b5fd', fontSize: '0.95rem', marginBottom: '0.75rem',
  },
  progressBarTrack: {
    width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px', overflow: 'hidden', marginBottom: '1rem',
  },
  progressBarFillAi: {
    height: '100%', background: 'linear-gradient(90deg, #9333ea, #c4b5fd)',
    transition: 'width 0.3s ease',
  },
  cancelBtn: {
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff', padding: '0.4rem 1.2rem', borderRadius: '8px',
    cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
  },
  errorBox: {
    marginTop: '1rem', padding: '1rem', borderRadius: '10px',
    background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)',
    color: '#fca5a5', fontSize: '0.9rem', textAlign: 'center',
  },

  // New AI button during gameplay
  newAiBtn: {
    background: 'linear-gradient(135deg, rgba(147,51,234,0.4), rgba(79,70,229,0.4))',
    border: '1px solid rgba(147,51,234,0.5)',
    color: '#c4b5fd', padding: '0.5rem 1.2rem', borderRadius: '10px',
    cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', fontFamily: 'inherit',
  },

  // (picker uses list styles above)
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
    maxWidth: '650px',
    margin: '0 auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '2rem',
    textAlign: 'center',
    border: '1px solid rgba(255,215,0,0.2)'
  },
  instruction: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '0.5rem'
  },
  englishSentence: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#4dabf7',
    marginBottom: '1.5rem'
  },
  placedArea: {
    minHeight: '60px',
    background: 'rgba(255,215,0,0.05)',
    border: '2px dashed rgba(255,215,0,0.3)',
    borderRadius: '12px',
    padding: '0.75rem',
    marginBottom: '1rem',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.9rem'
  },
  placedTile: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  availableArea: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    justifyContent: 'center',
    marginBottom: '1.5rem'
  },
  availableTile: {
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  clearBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.6rem 1.5rem',
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
    maxWidth: '650px',
    margin: '1.5rem auto 0',
    fontSize: '1rem',
    color: '#ffd700',
    fontWeight: '600'
  }
};

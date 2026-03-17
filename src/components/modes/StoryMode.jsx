import React, { useState, useCallback, useRef, useEffect } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { buildDictionary } from '../../utils/dictionaryBuilder.js';
import { lookupUserDict, saveToUserDict, translateWithLLM } from '../../utils/userDictionary.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';

const RANDOM_TOPICS = {
  A1: ['my cat', 'at the park', 'breakfast', 'my family', 'colors', 'my room', 'at the store', 'the weather', 'my friend', 'school'],
  A2: ['a trip to the market', 'my best friend', 'a rainy day', 'learning to cook', 'the weekend', 'a birthday party', 'my hobby', 'at the zoo', 'a new pet', 'the seasons'],
  B1: ['a mysterious package', 'the old bookshop', 'a train journey', 'moving to a new city', 'an unexpected visitor', 'a lost key', 'the first day of work', 'a recipe from grandma', 'a winter adventure', 'the street musician'],
  B2: ['a misunderstanding at work', 'the philosophy of travel', 'a cultural tradition', 'an ethical dilemma', 'the impact of technology', 'a childhood memory', 'an unexpected friendship', 'the meaning of home'],
};

const DIFFICULTY_GUIDANCE = {
  A1: 'Use only present tense, very simple sentences of 3-6 words, basic vocabulary (family, food, animals, colors, daily routines).',
  A2: 'Use present tense mostly with some past tense, simple sentences of 5-8 words, everyday vocabulary.',
  B1: 'Use past, present, and future tenses, compound sentences allowed, broader vocabulary including emotions and opinions.',
  B2: 'Use varied tenses and moods, complex sentence structures, nuanced vocabulary, idiomatic expressions where appropriate.',
};

const SpinKeyframes = () => (
  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
);

function loadAiStories() {
  try {
    return JSON.parse(localStorage.getItem('aiStories') || '[]');
  } catch { return []; }
}

function saveAiStory(story) {
  const existing = loadAiStories();
  existing.unshift(story);
  localStorage.setItem('aiStories', JSON.stringify(existing));
}

function deleteAiStory(id) {
  const existing = loadAiStories().filter(s => s.id !== id);
  localStorage.setItem('aiStories', JSON.stringify(existing));
}

export default function StoryMode({ langCode = 'uk', stories, passages = [], onSpeak, ttsEnabled, ttsVolume, onExit, onAddXP, onComplete, onTrackProgress }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';
  const langField = langCode === 'ru' ? 'ru' : 'uk';
  const dict = buildDictionary(langCode);

  const [aiStories, setAiStories] = useState(() => loadAiStories());

  const [phase, setPhase] = useState('picker'); // picker, generate, reading, questions, complete
  const chat = useLessonChat({ langName, langCode, systemPrompt: `You are a helpful ${langName} language tutor. The student is reading a ${langName} story and can click words to hear and translate them. Answer questions about vocabulary, grammar, or the story content concisely. Keep responses under 150 words.`, onSpeak, ttsEnabled, ttsVolume });

  // Selected item (unified format)
  const [selectedItem, setSelectedItem] = useState(null);

  // Reading state
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordAddForm, setWordAddForm] = useState(null);
  const [showEnglish, setShowEnglish] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [highlightRange, setHighlightRange] = useState({ start: -1, end: -1 });
  const stopRef = useRef(false);
  const readingRef = useRef(false);

  // Questions state
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(-1);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  // AI generation state
  const [aiDifficulty, setAiDifficulty] = useState('A1');
  const [aiTopic, setAiTopic] = useState('');
  const [aiIncludeQuestions, setAiIncludeQuestions] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiProgressStep, setAiProgressStep] = useState('');
  const [aiProgressPct, setAiProgressPct] = useState(0);
  const aiAbortRef = useRef(null);

  // Flatten stories for prev/next navigation
  const flatStories = stories.flatMap(group => group.stories);
  const currentStoryIndex = selectedItem && selectedItem.source === 'builtin' && !selectedItem.questions
    ? flatStories.findIndex(s => s.id === selectedItem.id)
    : -1;

  // Look up a word in the dictionary
  const lookupWord = useCallback((word) => {
    const cleaned = word.toLowerCase().replace(/[.,!?;:"""()—–\-…]/g, '');
    if (!cleaned) return null;
    const userHit = lookupUserDict(cleaned);
    if (userHit) return userHit;
    if (dict.ukToEn[cleaned]) return dict.ukToEn[cleaned];
    for (let i = cleaned.length - 1; i >= Math.max(1, cleaned.length - 3); i--) {
      const prefix = cleaned.slice(0, i);
      if (dict.ukToEn[prefix]) return dict.ukToEn[prefix];
    }
    return null;
  }, [dict]);

  useEffect(() => { setWordAddForm(null); }, [selectedWord?.word]);

  const getWords = useCallback((text) => {
    if (!text) return [];
    return text.split(/(\s+)/).filter(Boolean);
  }, []);

  // TTS read-aloud
  const readAloud = useCallback(async (text, fromIndex = 0) => {
    if (!ttsEnabled || !onSpeak) return;
    stopRef.current = false;
    readingRef.current = true;
    setIsReading(true);

    const sentences = text.split(/(?<=[.!?])\s+/);
    let wordOffset = 0;

    for (const sentence of sentences) {
      if (stopRef.current) break;
      const sentenceWords = sentence.split(/\s+/);
      const sentenceEnd = wordOffset + sentenceWords.length;

      if (sentenceEnd <= fromIndex) {
        wordOffset = sentenceEnd;
        continue;
      }

      let textToSpeak = sentence;
      if (wordOffset < fromIndex) {
        const wordsToSkip = fromIndex - wordOffset;
        textToSpeak = sentenceWords.slice(wordsToSkip).join(' ');
      }

      setHighlightRange({ start: Math.max(wordOffset, fromIndex), end: sentenceEnd });

      try {
        await onSpeak(textToSpeak, 0.85, ttsVolume);
      } catch (e) {}

      wordOffset = sentenceEnd;
      if (stopRef.current) break;
    }

    setIsReading(false);
    readingRef.current = false;
    setHighlightRange({ start: -1, end: -1 });
  }, [ttsEnabled, onSpeak, ttsVolume]);

  const handleStop = useCallback(() => {
    stopRef.current = true;
    setIsReading(false);
    setHighlightRange({ start: -1, end: -1 });
  }, []);

  const wordPendingRef = useRef(null);

  const handleWordClick = useCallback((word, wordIndex, contextText = '') => {
    if (isReading) return;
    const cleaned = word.replace(/[.,!?;:"""()—–\-…]/g, '').trim();
    if (!cleaned) return;

    const translation = lookupWord(cleaned);
    const sentences = contextText.split(/(?<=[.!?])\s+/);
    const contextSentence = sentences.find(s => s.includes(word)) || contextText;
    setSelectedWord({ word: cleaned, translation, index: wordIndex, contextSentence });
    setWordAddForm(null);

    if (ttsEnabled && onSpeak) {
      onSpeak(cleaned, 0.8, ttsVolume);
    }

    // Auto-translate with LLM and save to dictionary if no translation found
    if (!translation) {
      const requestId = Date.now();
      wordPendingRef.current = requestId;
      translateWithLLM(cleaned, langName, contextSentence).then(llmTranslation => {
        if (llmTranslation && wordPendingRef.current === requestId) {
          saveToUserDict(cleaned, llmTranslation);
          setSelectedWord(prev =>
            prev && prev.word === cleaned
              ? { ...prev, translation: llmTranslation }
              : prev
          );
        }
      });
    }
  }, [lookupWord, ttsEnabled, onSpeak, ttsVolume, isReading, langName]);

  const handleWordDoubleClick = useCallback((word, wordIndex, fullText) => {
    handleStop();
    setTimeout(() => {
      const allTokens = fullText.split(/(\s+)/).filter(Boolean);
      let realWordIdx = 0;
      for (let i = 0; i < allTokens.length; i++) {
        if (!/^\s+$/.test(allTokens[i])) {
          if (i === wordIndex) break;
          realWordIdx++;
        }
      }
      readAloud(fullText, realWordIdx);
    }, 100);
  }, [readAloud, handleStop]);

  // Select a story/passage to read
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setSelectedWord(null);
    setShowEnglish(false);
    setQuestionIdx(0);
    setSelectedAnswer(-1);
    setFeedback(null);
    setScore(0);
    setXpEarned(0);
    setPhase('reading');
    if (onAddXP) onAddXP(5);
  };

  // Navigate between built-in stories (no questions only)
  const handlePreviousStory = () => {
    if (currentStoryIndex > 0) {
      handleStop();
      const prev = flatStories[currentStoryIndex - 1];
      handleSelectItem({
        id: prev.id, title: prev.title, titleEn: prev.title,
        text: prev[langField], en: prev.en, difficulty: null,
        questions: null, wordGlossary: null, source: 'builtin'
      });
    }
  };

  const handleNextStory = () => {
    if (currentStoryIndex < flatStories.length - 1) {
      handleStop();
      const next = flatStories[currentStoryIndex + 1];
      handleSelectItem({
        id: next.id, title: next.title, titleEn: next.title,
        text: next[langField], en: next.en, difficulty: null,
        questions: null, wordGlossary: null, source: 'builtin'
      });
    }
  };

  // Questions logic
  const handleAnswerSelect = (idx) => {
    if (feedback) return;
    setSelectedAnswer(idx);
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer < 0 || feedback) return;
    const question = selectedItem.questions[questionIdx];
    const isCorrect = selectedAnswer === question.correctIndex;
    const points = isCorrect ? 25 : 5;
    setFeedback({ correct: isCorrect, explanation: question.explanation });
    if (isCorrect) setScore(prev => prev + 1);
    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);
  };

  const handleNextQuestion = () => {
    if (questionIdx < selectedItem.questions.length - 1) {
      setQuestionIdx(prev => prev + 1);
      setSelectedAnswer(-1);
      setFeedback(null);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({ mode: 'reading', itemId: selectedItem.id, score, total: selectedItem.questions.length, xpEarned });
      }
      if (onTrackProgress) {
        onTrackProgress('reading', { itemId: selectedItem.id, completed: true, score });
      }
    }
  };

  // AI story generation — progress detection based on streaming JSON keys
  const detectProgress = (accumulated, hasQuestions) => {
    if (hasQuestions && accumulated.includes('"questions"')) return { step: 'Creating comprehension questions...', pct: 85 };
    if (accumulated.includes('"en"'))       return { step: 'Adding English translation...', pct: hasQuestions ? 65 : 80 };
    if (accumulated.includes('"ru"'))       return { step: 'Translating to Russian...', pct: 50 };
    if (accumulated.includes('"uk"'))       return { step: 'Writing the story in Ukrainian...', pct: 30 };
    if (accumulated.includes('"titleEn"'))  return { step: 'Crafting a title...', pct: 10 };
    return { step: 'Starting generation...', pct: 5 };
  };

  const cancelGeneration = () => {
    if (aiAbortRef.current) aiAbortRef.current.abort();
    setAiGenerating(false);
    setAiProgressStep('');
    setAiProgressPct(0);
  };

  const generateStory = async () => {
    setAiGenerating(true);
    setAiError(null);
    setAiProgressStep('Starting generation...');
    setAiProgressPct(0);

    const topic = aiTopic.trim() || 'daily life';
    const questionsInstruction = aiIncludeQuestions
      ? `\nAlso include exactly 3 comprehension questions. Add a "questions" field as an array where each question has: "question" (the question text in English), "options" (array of exactly 4 answer options in English), "correctIndex" (0-based index of correct answer), "explanation" (brief explanation in English).`
      : '';

    const prompt = `Write a short story for a language learner at ${aiDifficulty} level.
Topic: ${topic}

${DIFFICULTY_GUIDANCE[aiDifficulty]}

The story should be 6-10 sentences long. Provide the story in Ukrainian, Russian, AND English.

Respond with ONLY valid JSON, no markdown fences, no extra text. Use this exact format:
{
  "titleEn": "Story title in English",
  "uk": "The full story in Ukrainian...",
  "ru": "The full story in Russian...",
  "en": "Full English translation of the story..."${aiIncludeQuestions ? ',\n  "questions": [...]' : ''}
}${questionsInstruction}`;

    try {
      const abort = new AbortController();
      aiAbortRef.current = abort;

      const res = await fetch('/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: [
            { role: 'system', content: 'You are a Ukrainian and Russian language learning content creator. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          stream: true,
          max_tokens: 2000
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
              const progress = detectProgress(accumulated, aiIncludeQuestions);
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

      const story = JSON.parse(jsonMatch[0]);
      if (!story.uk && !story.ru) throw new Error('Missing required fields');

      setAiProgressPct(100);
      setAiProgressStep('Done!');

      const aiStory = {
        id: 'ai-' + Date.now(),
        titleEn: story.titleEn || 'AI Story',
        uk: story.uk || '',
        ru: story.ru || '',
        en: story.en || null,
        difficulty: aiDifficulty,
        questions: story.questions && Array.isArray(story.questions) ? story.questions : null,
        source: 'ai',
        createdAt: Date.now(),
      };

      saveAiStory(aiStory);
      setAiStories(prev => [aiStory, ...prev]);

      const item = {
        id: aiStory.id,
        title: aiStory.titleEn,
        titleEn: aiStory.titleEn,
        text: aiStory[langField],
        en: aiStory.en,
        difficulty: aiStory.difficulty,
        questions: aiStory.questions,
        wordGlossary: null,
        source: 'ai'
      };

      setAiGenerating(false);
      handleSelectItem(item);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setAiGenerating(false);
      setAiError(err.message === 'Failed to fetch'
        ? 'Could not connect to LM Studio. Make sure it is running at localhost:1234.'
        : 'Failed to generate story. Please try again.');
    }
  };

  const pickRandomTopic = () => {
    const topics = RANDOM_TOPICS[aiDifficulty] || RANDOM_TOPICS.A1;
    setAiTopic(topics[Math.floor(Math.random() * topics.length)]);
  };

  // ====================
  // PICKER PHASE
  // ====================
  if (phase === 'picker') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader
          title="Story Time"
          subtitle={`Read along in ${langName}`}
          icon="📖"
          onExit={onExit}
        />
        <div style={styles.levelList}>
          {/* AI Generate Card */}
          <div style={styles.aiCard} onClick={() => setPhase('generate')}>
            <div style={styles.aiCardIcon}>&#10024;</div>
            <div>
              <div style={styles.aiCardTitle}>AI Story Generator</div>
              <div style={styles.aiCardDesc}>Generate a custom story on any topic at your level</div>
            </div>
          </div>

          {/* Saved AI Stories */}
          {aiStories.length > 0 && (
            <div style={styles.listSection}>
              <h2 style={styles.sectionHeading}>Your AI Stories</h2>
              {aiStories.map((s) => (
                <div
                  key={s.id}
                  style={styles.listRow}
                  onClick={() => handleSelectItem({
                    id: s.id, title: s.titleEn, titleEn: s.titleEn,
                    text: s[langField], en: s.en, difficulty: s.difficulty,
                    questions: s.questions, wordGlossary: null, source: 'ai'
                  })}
                >
                  <span style={styles.listTitle}>{s.titleEn}</span>
                  <span style={styles.listMeta}>
                    <span style={styles.difficultyBadge}>{s.difficulty}</span>
                    {s.questions && <span style={styles.questionCountBadge}>{s.questions.length}Q</span>}
                  </span>
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAiStory(s.id);
                      setAiStories(prev => prev.filter(x => x.id !== s.id));
                    }}
                  >x</button>
                </div>
              ))}
            </div>
          )}

          {/* Stories Section */}
          {stories.map((levelGroup) => (
            <div key={levelGroup.level} style={styles.listSection}>
              <h3 style={styles.levelTitle}>
                {levelGroup.level}
                <span style={styles.levelNative}>
                  {' '}/ {langCode === 'ru' ? levelGroup.levelRu : levelGroup.levelUk}
                </span>
              </h3>
              {levelGroup.stories.map((story) => (
                <div
                  key={story.id}
                  style={styles.listRow}
                  onClick={() => handleSelectItem({
                    id: story.id, title: story.title, titleEn: story.title,
                    text: story[langField], en: story.en, difficulty: null,
                    questions: null, wordGlossary: null, source: 'builtin'
                  })}
                >
                  <span style={styles.listTitle}>{story.title}</span>
                  <span style={styles.listPreview}>{story[langField].slice(0, 60)}...</span>
                </div>
              ))}
            </div>
          ))}

          {/* Reading Practice Section */}
          {passages.length > 0 && (
            <div style={styles.listSection}>
              <h2 style={styles.sectionHeading}>Reading Practice</h2>
              {passages.map((p) => (
                <div
                  key={p.passageId}
                  style={styles.listRow}
                  onClick={() => handleSelectItem({
                    id: p.passageId, title: p.title, titleEn: p.titleEn,
                    text: p.text, en: null, difficulty: p.difficulty,
                    questions: p.questions || null,
                    wordGlossary: p.wordGlossary || null,
                    source: 'builtin'
                  })}
                >
                  <span style={styles.listTitle}>{p.titleEn}</span>
                  <span style={styles.listMeta}>
                    <span style={styles.difficultyBadge}>{p.difficulty}</span>
                    <span style={styles.questionCountBadge}>{p.questions.length}Q</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====================
  // AI GENERATE PHASE
  // ====================
  if (phase === 'generate') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader
          title="AI Story Generator"
          subtitle={`Generate a custom ${langName} story`}
          icon="&#10024;"
          onExit={() => setPhase('picker')}
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
                placeholder="e.g., a trip to the beach"
                disabled={aiGenerating}
                onKeyDown={e => { if (e.key === 'Enter' && !aiGenerating) generateStory(); }}
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

          {/* Include Questions Toggle */}
          <div style={styles.formGroup}>
            <label style={styles.toggleRow} onClick={() => !aiGenerating && setAiIncludeQuestions(!aiIncludeQuestions)}>
              <span style={{
                ...styles.toggleBox,
                ...(aiIncludeQuestions ? styles.toggleBoxActive : {})
              }}>
                {aiIncludeQuestions ? '✓' : ''}
              </span>
              <span style={styles.formLabel}>Include comprehension questions</span>
            </label>
          </div>

          {/* Generate Button */}
          <button
            style={{
              ...styles.generateBtn,
              ...(aiGenerating ? styles.generateBtnDisabled : {})
            }}
            onClick={generateStory}
            disabled={aiGenerating}
          >
            {aiGenerating ? 'Generating...' : 'Generate Story'}
          </button>

          {/* Loading indicator with progress */}
          {aiGenerating && (
            <div style={styles.loadingContainer}>
              <SpinKeyframes />
              <div style={styles.loadingSpinner} />
              <div style={styles.loadingText}>{aiProgressStep || 'Starting generation...'}</div>
              <div style={styles.progressBarTrack}>
                <div style={{ ...styles.progressBarFill, width: `${aiProgressPct}%` }} />
              </div>
              <button style={styles.cancelBtn} onClick={cancelGeneration}>Cancel</button>
            </div>
          )}

          {/* Error */}
          {aiError && (
            <div style={styles.errorBox}>
              <div style={styles.errorText}>{aiError}</div>
              <button style={styles.retryBtn} onClick={generateStory}>Try Again</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====================
  // COMPLETE PHASE
  // ====================
  if (phase === 'complete') {
    const total = selectedItem?.questions?.length || 0;
    const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{ title: 'Reading Complete!', score, total, xpEarned, accuracy }}
          onRetry={() => {
            setQuestionIdx(0);
            setSelectedAnswer(-1);
            setFeedback(null);
            setScore(0);
            setXpEarned(0);
            setPhase('reading');
          }}
          onExit={() => {
            setSelectedItem(null);
            setPhase('picker');
          }}
        />
      </div>
    );
  }

  // ====================
  // QUESTIONS PHASE
  // ====================
  if (phase === 'questions' && selectedItem?.questions?.length > 0) {
    const question = selectedItem.questions[questionIdx];

    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader
          title={selectedItem.titleEn || selectedItem.title}
          subtitle={`Question ${questionIdx + 1} of ${selectedItem.questions.length}`}
          icon="📖"
          onExit={() => setPhase('reading')}
        />

        <div className="content-row" style={styles.contentRow}>
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
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', margin: 0 }}>{feedback.explanation}</p>
                  )}
                  <button style={styles.nextBtn} onClick={handleNextQuestion}>
                    {questionIdx < selectedItem.questions.length - 1 ? 'Next Question' : 'See Results'}
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

  // ====================
  // READING PHASE
  // ====================
  if (!selectedItem) return null;

  const storyText = selectedItem.text;
  const tokens = getWords(storyText);
  const glossary = selectedItem.wordGlossary || {};
  const hasQuestions = selectedItem.questions && selectedItem.questions.length > 0;
  const isAi = selectedItem.source === 'ai';
  const isBuiltinStory = selectedItem.source === 'builtin' && !hasQuestions;

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title={selectedItem.titleEn || selectedItem.title}
        subtitle="Click a word to hear it and see its meaning"
        icon="📖"
        onExit={() => { handleStop(); setPhase('picker'); setSelectedWord(null); setSelectedItem(null); }}
      />

      {/* Controls */}
      <div style={styles.controls}>
        <button
          style={{
            ...styles.controlBtn,
            ...(isReading ? styles.controlBtnDisabled : styles.controlBtnPrimary)
          }}
          onClick={() => readAloud(storyText, 0)}
          disabled={isReading}
        >
          Read Aloud
        </button>
        {isReading && (
          <button
            style={{ ...styles.controlBtn, ...styles.controlBtnStop }}
            onClick={handleStop}
          >
            Stop
          </button>
        )}
        {selectedItem.en && (
          <button
            style={{
              ...styles.controlBtn,
              ...(showEnglish ? styles.controlBtnActive : styles.controlBtnSecondary)
            }}
            onClick={() => setShowEnglish(!showEnglish)}
          >
            {showEnglish ? 'Hide English' : 'Show English'}
          </button>
        )}
        {isBuiltinStory && (
          <>
            <button
              style={{
                ...styles.controlBtn,
                ...(currentStoryIndex <= 0 ? styles.controlBtnDisabled : styles.controlBtnSecondary)
              }}
              onClick={handlePreviousStory}
              disabled={currentStoryIndex <= 0}
            >
              Previous
            </button>
            <button
              style={{
                ...styles.controlBtn,
                ...(currentStoryIndex >= flatStories.length - 1 ? styles.controlBtnDisabled : styles.controlBtnSecondary)
              }}
              onClick={handleNextStory}
              disabled={currentStoryIndex >= flatStories.length - 1}
            >
              Next
            </button>
          </>
        )}
        {isAi && (
          <button
            style={{ ...styles.controlBtn, ...styles.controlBtnAi }}
            onClick={() => { handleStop(); setPhase('generate'); setSelectedWord(null); }}
          >
            New AI Story
          </button>
        )}
        <button
          style={{ ...styles.controlBtn, ...styles.controlBtnSecondary }}
          onClick={() => { handleStop(); setPhase('picker'); setSelectedWord(null); setSelectedItem(null); }}
        >
          All Stories
        </button>
      </div>

      <div className="content-row" style={styles.contentRow}>
        <div style={styles.main}>
          {/* Story text with clickable words */}
          <div style={styles.storyContainer}>
            <div style={styles.storyText}>
              {tokens.map((token, i) => {
                const isWhitespace = /^\s+$/.test(token);
                if (isWhitespace) {
                  return <span key={i}>{token}</span>;
                }

                const cleaned = token.toLowerCase().replace(/[.,!?;:"""()—–\-…]/g, '');
                const hasGlossary = glossary[cleaned];

                const isHighlighted = highlightRange.start >= 0 && (() => {
                  let count = 0;
                  for (let j = 0; j < i; j++) {
                    if (!/^\s+$/.test(tokens[j])) count++;
                  }
                  return count >= highlightRange.start && count < highlightRange.end;
                })();

                const isSelected = selectedWord && selectedWord.index === i;

                return (
                  <span
                    key={i}
                    style={{
                      ...styles.word,
                      ...(hasGlossary ? styles.glossaryWord : {}),
                      ...(isSelected ? styles.wordSelected : {}),
                      ...(isHighlighted && isReading ? styles.wordHighlighted : {})
                    }}
                    onClick={() => handleWordClick(token, i, storyText)}
                    onDoubleClick={() => handleWordDoubleClick(token, i, storyText)}
                  >
                    {token}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Word info panel */}
          {selectedWord && (
            <div style={styles.wordPanel}>
              <div style={styles.wordPanelWord}>{selectedWord.word}</div>
              {selectedWord.translation ? (
                <div style={styles.wordPanelTranslation}>= "{selectedWord.translation}"</div>
              ) : !wordAddForm ? (
                <>
                  <div style={styles.wordPanelNoResult}>No translation found</div>
                  <button
                    style={styles.addWordBtn}
                    onClick={() => {
                      setWordAddForm({ en: '', translating: true });
                      translateWithLLM(selectedWord.word, langName, selectedWord.contextSentence || '').then(t =>
                        setWordAddForm(prev => prev ? { ...prev, en: t || '', translating: false } : null)
                      );
                    }}
                  >+ Add to dictionary</button>
                </>
              ) : (
                <div style={styles.addWordForm}>
                  <div style={styles.addWordLabel}>
                    English meaning
                    {wordAddForm.translating && <span style={styles.translatingHint}> translating...</span>}
                  </div>
                  <input
                    style={{ ...styles.addWordInput, ...(wordAddForm.translating ? { opacity: 0.5 } : {}) }}
                    value={wordAddForm.en}
                    onChange={e => setWordAddForm(prev => ({ ...prev, en: e.target.value }))}
                    placeholder={wordAddForm.translating ? 'Getting translation...' : 'Enter translation...'}
                    disabled={wordAddForm.translating}
                    autoFocus={!wordAddForm.translating}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && wordAddForm.en.trim()) { saveToUserDict(selectedWord.word, wordAddForm.en); setWordAddForm(null); setSelectedWord(null); }
                      if (e.key === 'Escape') setWordAddForm(null);
                    }}
                  />
                  <div style={styles.addWordActions}>
                    <button style={styles.addWordCancel} onClick={() => setWordAddForm(null)}>Cancel</button>
                    <button
                      style={styles.addWordSave}
                      disabled={wordAddForm.translating || !wordAddForm.en.trim()}
                      onClick={() => { saveToUserDict(selectedWord.word, wordAddForm.en); setWordAddForm(null); setSelectedWord(null); }}
                    >Save</button>
                  </div>
                </div>
              )}
              <button
                style={styles.wordPanelSpeak}
                onClick={() => ttsEnabled && onSpeak && onSpeak(selectedWord.word, 0.7, ttsVolume)}
              >
                Hear again
              </button>
            </div>
          )}

          {/* English translation */}
          {showEnglish && selectedItem.en && (
            <div style={styles.englishSection}>
              <div style={styles.englishLabel}>English Translation</div>
              <div style={styles.englishText}>{selectedItem.en}</div>
            </div>
          )}

          {/* Answer Questions button */}
          {hasQuestions && (
            <div style={styles.questionsButtonContainer}>
              <button style={styles.questionsBtn} onClick={() => setPhase('questions')}>
                Answer Questions ({selectedItem.questions.length})
              </button>
            </div>
          )}

          <div style={styles.tipBar}>
            Click a word to hear it & see its meaning. Double-click to read from that word onward.
          </div>
        </div>
        <LessonChat {...chat} />
      </div>
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

  // Picker - list view
  levelList: { maxWidth: '800px', margin: '0 auto' },
  listSection: { marginBottom: '1.5rem' },
  sectionHeading: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginTop: '1.5rem',
    marginBottom: '0.5rem',
  },
  levelTitle: {
    fontSize: '1.1rem',
    color: '#ffd700',
    marginBottom: '0.5rem',
    borderBottom: '1px solid rgba(255,215,0,0.2)',
    paddingBottom: '0.4rem'
  },
  levelNative: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '400'
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.6rem 0.75rem',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'background 0.15s',
    borderRadius: '6px',
  },
  listTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#ffd700',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listPreview: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.35)',
    flex: '0 1 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '300px',
  },
  listMeta: {
    display: 'flex',
    gap: '0.5rem',
    flexShrink: 0,
  },
  difficultyBadge: {
    color: '#4dabf7',
    fontWeight: '600',
    fontSize: '0.75rem',
  },
  questionCountBadge: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.75rem',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.25)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontFamily: 'inherit',
    flexShrink: 0,
  },

  // AI Card
  aiCard: {
    background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(77,171,247,0.2))',
    border: '2px solid rgba(139,92,246,0.4)',
    borderRadius: '16px',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    marginBottom: '1rem',
  },
  aiCardIcon: {
    fontSize: '2.5rem',
  },
  aiCardTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#c4b5fd',
    marginBottom: '0.25rem',
  },
  aiCardDesc: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.6)',
  },

  // Generate form
  generateForm: {
    maxWidth: '500px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  formLabel: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    cursor: 'default',
  },
  difficultyGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  difficultyBtn: {
    flex: 1,
    padding: '0.7rem',
    border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  difficultyBtnActive: {
    borderColor: '#c4b5fd',
    background: 'rgba(139,92,246,0.25)',
    color: '#c4b5fd',
  },
  topicRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  topicInput: {
    flex: 1,
    padding: '0.7rem 1rem',
    borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '1rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  randomBtn: {
    padding: '0.7rem 1.25rem',
    borderRadius: '10px',
    border: '2px solid rgba(139,92,246,0.3)',
    background: 'rgba(139,92,246,0.15)',
    color: '#c4b5fd',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
  },
  toggleBox: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    color: '#c4b5fd',
    fontWeight: '700',
    flexShrink: 0,
  },
  toggleBoxActive: {
    borderColor: '#c4b5fd',
    background: 'rgba(139,92,246,0.3)',
  },
  generateBtn: {
    padding: '1rem',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  generateBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '2rem',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(139,92,246,0.2)',
    borderTop: '3px solid #c4b5fd',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '1rem',
  },
  progressBarTrack: {
    width: '100%',
    maxWidth: '300px',
    height: '6px',
    background: 'rgba(139,92,246,0.15)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #8b5cf6, #c4b5fd)',
    borderRadius: '3px',
    transition: 'width 0.5s ease-out',
  },
  cancelBtn: {
    padding: '0.4rem 1rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
  },
  errorBox: {
    background: 'rgba(248,113,113,0.1)',
    border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: '10px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  errorText: {
    color: '#f87171',
    flex: 1,
  },
  retryBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid rgba(248,113,113,0.3)',
    background: 'rgba(248,113,113,0.15)',
    color: '#f87171',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: '600',
  },

  // Controls
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    maxWidth: '800px',
    margin: '0 auto 1.5rem'
  },
  controlBtn: {
    border: 'none',
    padding: '0.6rem 1.25rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff'
  },
  controlBtnPrimary: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    color: '#fff'
  },
  controlBtnStop: {
    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
    color: '#fff'
  },
  controlBtnSecondary: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff'
  },
  controlBtnActive: {
    background: 'rgba(255,215,0,0.2)',
    border: '1px solid rgba(255,215,0,0.4)',
    color: '#ffd700'
  },
  controlBtnDisabled: {
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.3)',
    cursor: 'not-allowed'
  },
  controlBtnAi: {
    background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(109,40,217,0.4))',
    border: '1px solid rgba(139,92,246,0.5)',
    color: '#c4b5fd',
  },

  // Story container
  storyContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '2rem',
    border: '1px solid rgba(255,215,0,0.15)',
    marginBottom: '1.5rem'
  },
  storyText: {
    fontSize: '1.3rem',
    lineHeight: '2.2',
    letterSpacing: '0.02em'
  },
  word: {
    cursor: 'pointer',
    borderRadius: '4px',
    padding: '2px 1px',
    transition: 'all 0.15s',
    position: 'relative'
  },
  glossaryWord: {
    borderBottom: '2px dotted rgba(255,215,0,0.4)',
  },
  wordSelected: {
    background: 'rgba(255,215,0,0.25)',
    color: '#ffd700',
    borderBottom: '2px solid #ffd700'
  },
  wordHighlighted: {
    background: 'rgba(77,171,247,0.15)',
    color: '#4dabf7'
  },

  // Word panel
  wordPanel: {
    maxWidth: '800px',
    margin: '0 auto 1.5rem',
    background: 'rgba(77,171,247,0.12)',
    border: '1px solid rgba(77,171,247,0.3)',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    flexWrap: 'wrap'
  },
  wordPanelWord: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffd700'
  },
  wordPanelTranslation: {
    fontSize: '1.2rem',
    color: '#4dabf7',
    fontStyle: 'italic'
  },
  wordPanelNoResult: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic'
  },
  addWordBtn: {
    background: 'rgba(255,215,0,0.12)',
    border: '1px solid rgba(255,215,0,0.3)',
    color: '#ffd700',
    padding: '0.3rem 0.8rem',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    fontFamily: 'inherit',
  },
  addWordForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  addWordLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
  },
  translatingHint: {
    color: '#4dabf7',
    fontStyle: 'italic',
  },
  addWordInput: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '7px',
    color: '#fff',
    padding: '0.4rem 0.6rem',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  addWordActions: {
    display: 'flex',
    gap: '0.4rem',
  },
  addWordCancel: {
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
    borderRadius: '7px',
    color: 'rgba(255,255,255,0.5)',
    padding: '0.3rem 0.6rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
  },
  addWordSave: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    borderRadius: '7px',
    color: '#1a1a2e',
    padding: '0.3rem 0.7rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '700',
    fontFamily: 'inherit',
  },
  wordPanelSpeak: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    border: 'none',
    color: '#fff',
    padding: '0.4rem 1rem',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    fontFamily: 'inherit',
    marginLeft: 'auto'
  },

  // English section
  englishSection: {
    maxWidth: '800px',
    margin: '0 auto 1.5rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  englishLabel: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.75rem'
  },
  englishText: {
    fontSize: '1.1rem',
    lineHeight: '1.8',
    color: 'rgba(255,255,255,0.8)'
  },

  // Questions button in reading phase
  questionsButtonContainer: {
    maxWidth: '800px',
    margin: '0 auto 1.5rem',
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

  // Questions phase
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
    lineHeight: 1.4,
    marginTop: 0,
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
  },

  // Tip bar
  tipBar: {
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.4)',
    padding: '1rem'
  }
};

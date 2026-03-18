import React, { useState, useEffect, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { WordToolbar, ClickableText } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';
import { storageGet, storageSet } from '../../utils/storage.js';

const RANDOM_DIALOGUE_TOPICS = {
  A1: ['greeting a neighbor', 'ordering coffee', 'buying fruit at the market', 'asking for directions', 'at the bus stop', 'meeting a classmate', 'at the pharmacy', 'checking into a hotel', 'ordering food at a cafe', 'introducing your family'],
  A2: ['booking a hotel room', 'visiting the doctor', 'buying clothes at a shop', 'at the post office', 'making a phone call', 'at the train station', 'returning an item to a store', 'asking about the weather', 'planning a weekend', 'at the library'],
  B1: ['job interview', 'complaining about a service', 'planning a trip with a friend', 'at the bank opening an account', 'discussing a movie', 'negotiating a price', 'at a parent-teacher meeting', 'calling tech support', 'discussing weekend plans', 'at the car mechanic'],
  B2: ['discussing current events', 'debating environmental issues', 'resolving a neighbor dispute', 'discussing career changes', 'cultural exchange conversation', 'negotiating a contract', 'philosophical small talk', 'giving feedback at work'],
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

function loadAiDialogues() {
  try {
    return JSON.parse(storageGet('aiDialogues') || '[]');
  } catch { return []; }
}

function saveAiDialogue(dialogue) {
  const existing = loadAiDialogues();
  existing.unshift(dialogue);
  storageSet('aiDialogues', JSON.stringify(existing));
}

function deleteAiDialogue(id) {
  const existing = loadAiDialogues().filter(d => d.id !== id);
  storageSet('aiDialogues', JSON.stringify(existing));
}

export default function DialogueMode({ langCode = 'uk', dialogues, onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress, onMarkMastered, masteredWordsList = [] }) {
  const langName = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' }[langCode] || 'Ukrainian';
  const nameField = 'name' + langCode.charAt(0).toUpperCase() + langCode.slice(1);
  const [phase, setPhase] = useState('picker'); // picker, generate, playing, complete
  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });
  const chat = useLessonChat({ langName, langCode, systemPrompt: `You are a helpful ${langName} language tutor. The student is practicing a dialogue conversation exercise in ${langName}. Answer questions about phrases, vocabulary, grammar, or pronunciation concisely. Keep responses under 150 words.`, onSpeak, ttsEnabled, ttsVolume });
  const [selectedDialogue, setSelectedDialogue] = useState(null);
  const [exchangeIdx, setExchangeIdx] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [totalPlayerTurns, setTotalPlayerTurns] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const chatEndRef = useRef(null);

  // AI generation state
  const [aiDialogues, setAiDialogues] = useState(() => loadAiDialogues());
  const [aiDifficulty, setAiDifficulty] = useState('A1');
  const [aiTopic, setAiTopic] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiProgressStep, setAiProgressStep] = useState('');
  const [aiProgressPct, setAiProgressPct] = useState(0);
  const aiAbortRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const startDialogue = (dialogue) => {
    setSelectedDialogue(dialogue);
    setExchangeIdx(0);
    setChatHistory([]);
    setUserInput('');
    setFeedback(null);
    setScore(0);
    setTotalPlayerTurns(0);
    setXpEarned(0);
    setMistakes(0);
    setShowHint(false);
    setPhase('playing');
  };

  // Auto-advance NPC lines
  useEffect(() => {
    if (phase !== 'playing' || !selectedDialogue) return;

    const exchange = selectedDialogue.exchanges[exchangeIdx];
    if (!exchange) return;

    if (exchange.speaker === 'npc') {
      // Add NPC line to chat
      setChatHistory(prev => [...prev, {
        speaker: 'npc',
        name: selectedDialogue.characters.npc.name,
        text: exchange.text,
        translation: exchange.translation
      }]);

      if (ttsEnabled && onSpeak) {
        onSpeak(exchange.text, 0.8, ttsVolume);
      }

      // Auto-advance to next exchange after a delay
      const timer = setTimeout(() => {
        if (exchangeIdx < selectedDialogue.exchanges.length - 1) {
          setExchangeIdx(prev => prev + 1);
        } else {
          // Dialogue complete
          finishDialogue();
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [exchangeIdx, phase, selectedDialogue]);

  const checkKeywordMatch = (input, exchange) => {
    const inputLower = input.toLowerCase().trim();

    // Exact match
    if (exchange.acceptedResponses.some(r => r.toLowerCase() === inputLower)) {
      return true;
    }

    // Keyword match (60%+)
    if (exchange.keyWords && exchange.keyWords.length > 0) {
      const matched = exchange.keyWords.filter(kw => inputLower.includes(kw.toLowerCase()));
      return matched.length / exchange.keyWords.length >= 0.6;
    }

    return false;
  };

  const handleSubmit = () => {
    if (!userInput.trim() || feedback) return;

    const exchange = selectedDialogue.exchanges[exchangeIdx];
    if (!exchange || exchange.speaker !== 'player') return;

    const isCorrect = checkKeywordMatch(userInput, exchange);
    const points = isCorrect ? 20 : 5;

    // Add player response to chat
    setChatHistory(prev => [...prev, {
      speaker: 'player',
      name: selectedDialogue.characters.player.name,
      text: userInput.trim(),
      correct: isCorrect
    }]);

    setTotalPlayerTurns(prev => prev + 1);

    if (isCorrect) {
      setScore(prev => prev + 1);
    } else {
      setMistakes(prev => prev + 1);
      // Show the accepted response
      setChatHistory(prev => [...prev, {
        speaker: 'system',
        text: `Suggested: ${exchange.acceptedResponses[0]}`
      }]);
    }

    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);

    setUserInput('');
    setShowHint(false);

    // Move to next exchange
    if (exchangeIdx < selectedDialogue.exchanges.length - 1) {
      setExchangeIdx(prev => prev + 1);
    } else {
      finishDialogue();
    }
  };

  const finishDialogue = () => {
    setPhase('complete');
    if (onComplete) {
      onComplete({
        mode: 'dialogue',
        dialogueId: selectedDialogue.dialogueId || selectedDialogue.id,
        score,
        totalPlayerTurns,
        xpEarned,
        mistakes
      });
    }
    if (onTrackProgress) {
      onTrackProgress('dialogue', {
        dialogueId: selectedDialogue.dialogueId || selectedDialogue.id,
        completed: true,
        mistakes
      });
    }
  };

  const handleRetry = () => {
    if (selectedDialogue) startDialogue(selectedDialogue);
  };

  // AI dialogue generation
  const detectDialogueProgress = (accumulated) => {
    if (accumulated.includes('"hint"'))              return { step: 'Adding hints...', pct: 85 };
    if (accumulated.includes('"acceptedResponses"')) return { step: 'Adding response options...', pct: 70 };
    if (accumulated.includes('"exchanges"'))          return { step: 'Writing exchanges...', pct: 50 };
    if (accumulated.includes('"characters"'))         return { step: 'Creating characters...', pct: 30 };
    if (accumulated.includes('"context"'))            return { step: 'Setting the scene...', pct: 20 };
    if (accumulated.includes('"nameEn"'))             return { step: 'Naming the dialogue...', pct: 10 };
    return { step: 'Starting generation...', pct: 5 };
  };

  const cancelGeneration = () => {
    if (aiAbortRef.current) aiAbortRef.current.abort();
    setAiGenerating(false);
    setAiProgressStep('');
    setAiProgressPct(0);
  };

  const pickRandomTopic = () => {
    const topics = RANDOM_DIALOGUE_TOPICS[aiDifficulty] || RANDOM_DIALOGUE_TOPICS.A1;
    setAiTopic(topics[Math.floor(Math.random() * topics.length)]);
  };

  const generateDialogue = async () => {
    setAiGenerating(true);
    setAiError(null);
    setAiProgressStep('Starting generation...');
    setAiProgressPct(0);

    const topic = aiTopic.trim() || 'a casual everyday conversation';
    const playerNames = { uk: 'Ви', ru: 'Вы', de: 'Sie', es: 'Usted', fr: 'Vous', el: 'Εσείς', hi: 'आप', ar: 'أنت', ko: '당신', zh: '您', ja: 'あなた' };
    const playerName = playerNames[langCode] || 'You';
    const langLabel = langName;
    const nameFieldLabel = nameField;

    const prompt = `Create a dialogue practice exercise for a language learner at ${aiDifficulty} level.
Scenario: ${topic}

${DIFFICULTY_GUIDANCE[aiDifficulty]}

The dialogue should have 8-12 exchanges alternating between an NPC and a player.
The NPC speaks in ${langLabel}. The player must type responses in ${langLabel}.

Respond with ONLY valid JSON, no markdown fences, no extra text. Use this EXACT format:
{
  "nameEn": "English name for this dialogue",
  "${nameFieldLabel}": "${langLabel} name for this dialogue",
  "icon": "single emoji representing the scenario",
  "context": "1-2 sentence English description of the scenario",
  "characters": {
    "npc": { "name": "${langLabel} first name for the NPC" },
    "player": { "name": "${playerName}" }
  },
  "exchanges": [
    { "speaker": "npc", "text": "${langLabel} text", "translation": "English translation" },
    { "speaker": "player", "prompt": "English instruction telling the student what to say", "acceptedResponses": ["exact ${langLabel} response in lowercase", "alternative response in lowercase"], "keyWords": ["key", "words"], "hint": "beginning of response..." },
    ...more exchanges alternating npc then player...
  ]
}

IMPORTANT RULES:
- Exchanges MUST alternate: npc, player, npc, player, etc.
- Start with an npc exchange and end with a player exchange
- Each player exchange MUST have: prompt (English instruction), acceptedResponses (array of 2-4 valid ${langLabel} responses in lowercase), keyWords (array of 1-3 essential ${langLabel} words in lowercase), hint (first few characters of a valid response followed by "...")
- Each npc exchange MUST have: text (${langLabel}), translation (English)`;

    try {
      const abort = new AbortController();
      aiAbortRef.current = abort;

      const res = await fetch('/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: [
            { role: 'system', content: `You are a ${langLabel} and English language learning content creator specializing in realistic conversational dialogues. Always respond with valid JSON only.` },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          stream: true,
          max_tokens: 3000
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
              const progress = detectDialogueProgress(accumulated);
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

      const dialogue = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!dialogue.exchanges || !Array.isArray(dialogue.exchanges) || dialogue.exchanges.length < 4) {
        throw new Error('Generated dialogue has too few exchanges');
      }
      for (let i = 0; i < dialogue.exchanges.length; i++) {
        const ex = dialogue.exchanges[i];
        if (ex.speaker === 'player' && (!ex.acceptedResponses || !ex.keyWords || !ex.prompt)) {
          throw new Error('Player exchange missing required fields');
        }
        if (ex.speaker === 'npc' && (!ex.text || !ex.translation)) {
          throw new Error('NPC exchange missing required fields');
        }
      }

      setAiProgressPct(100);
      setAiProgressStep('Done!');

      const aiDialogue = {
        id: 'ai-' + Date.now(),
        dialogueId: 'ai-' + Date.now(),
        nameEn: dialogue.nameEn || 'AI Dialogue',
        [nameField]: dialogue[nameField] || '',
        icon: dialogue.icon || '💬',
        context: dialogue.context || '',
        characters: dialogue.characters || { npc: { name: { uk: 'Співрозмовник', ru: 'Собеседник', de: 'Gesprächspartner', es: 'Interlocutor', fr: 'Interlocuteur', el: 'Συνομιλητής', hi: 'वार्ताकार', ar: 'محاور', ko: '대화 상대', zh: '对话伙伴', ja: '会話相手' }[langCode] || 'Partner' }, player: { name: playerName } },
        exchanges: dialogue.exchanges,
        difficulty: aiDifficulty,
        langCode,
        source: 'ai',
        createdAt: Date.now(),
      };

      saveAiDialogue(aiDialogue);
      setAiDialogues(prev => [aiDialogue, ...prev]);

      setAiGenerating(false);
      startDialogue(aiDialogue);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setAiGenerating(false);
      setAiError(err.message === 'Failed to fetch'
        ? 'Could not connect to LM Studio. Make sure it is running at localhost:1234.'
        : `Failed to generate dialogue: ${err.message}. Please try again.`);
    }
  };

  // Picker
  if (phase === 'picker') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Dialogue Practice" subtitle="Practice real conversations" icon="💬" onExit={onExit} />
        <div style={styles.levelList}>
          {/* AI Generate Card */}
          <div style={styles.aiCard} onClick={() => setPhase('generate')}>
            <div style={styles.aiCardIcon}>&#10024;</div>
            <div>
              <div style={styles.aiCardTitle}>AI Dialogue Generator</div>
              <div style={styles.aiCardDesc}>Generate a custom conversation on any topic at your level</div>
            </div>
          </div>

          {/* Saved AI Dialogues (filtered by current language) */}
          {aiDialogues.filter(d => !d.langCode || d.langCode === langCode).length > 0 && (
            <div style={styles.listSection}>
              <h2 style={styles.sectionHeading}>Your AI Dialogues</h2>
              {aiDialogues.filter(d => !d.langCode || d.langCode === langCode).map((d) => (
                <div
                  key={d.id}
                  style={styles.listRow}
                  onClick={() => startDialogue(d)}
                >
                  <span style={{ marginRight: '0.25rem', fontSize: '1.1rem' }}>{d.icon || '💬'}</span>
                  <span style={styles.listTitle}>{d.nameEn}</span>
                  <span style={styles.listMeta}>
                    <span style={styles.difficultyBadge}>{d.difficulty}</span>
                  </span>
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAiDialogue(d.id);
                      setAiDialogues(prev => prev.filter(x => x.id !== d.id));
                    }}
                  >x</button>
                </div>
              ))}
            </div>
          )}

          {/* Built-in Dialogues */}
          <div style={styles.listSection}>
            <h2 style={styles.sectionHeading}>Built-in Dialogues</h2>
            {dialogues.map(d => (
              <div key={d.dialogueId} style={styles.listRow} onClick={() => startDialogue(d)}>
                <span style={{ marginRight: '0.25rem', fontSize: '1.1rem' }}>{d.icon}</span>
                <span style={styles.listTitle}>{d.nameEn}</span>
                <span style={styles.listNativeName}>{d[nameField]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Generate
  if (phase === 'generate') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader
          title="AI Dialogue Generator"
          subtitle={`Generate a custom ${langName} conversation`}
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

          {/* Scenario */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Scenario</label>
            <div style={styles.topicRow}>
              <input
                style={styles.topicInput}
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="e.g., ordering food at a restaurant"
                disabled={aiGenerating}
                onKeyDown={e => { if (e.key === 'Enter' && !aiGenerating) generateDialogue(); }}
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

          {/* Generate Button */}
          <button
            style={{
              ...styles.generateBtn,
              ...(aiGenerating ? styles.generateBtnDisabled : {})
            }}
            onClick={generateDialogue}
            disabled={aiGenerating}
          >
            {aiGenerating ? 'Generating...' : 'Generate Dialogue'}
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
              <button style={styles.retryBtn} onClick={generateDialogue}>Try Again</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Complete
  if (phase === 'complete') {
    const accuracy = totalPlayerTurns > 0 ? Math.round((score / totalPlayerTurns) * 100) : 0;
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{ title: `${selectedDialogue.nameEn} Complete!`, score, total: totalPlayerTurns, xpEarned, accuracy }}
          onRetry={handleRetry}
          onExit={onExit}
        />
      </div>
    );
  }

  // Playing
  const currentExchange = selectedDialogue?.exchanges[exchangeIdx];
  const isPlayerTurn = currentExchange?.speaker === 'player';

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title={selectedDialogue.nameEn}
        subtitle={selectedDialogue[nameField]}
        icon={selectedDialogue.icon}
        onExit={() => setPhase('picker')}
      />

      <div className="content-row" style={styles.contentRow}>
        <div style={styles.main}>
      <div style={styles.contextBox}>
        <p style={styles.contextText}>{selectedDialogue.context}</p>
      </div>

      <div style={styles.chatArea}>
        {chatHistory.map((msg, i) => (
          <div key={i} style={{
            ...styles.chatBubble,
            ...(msg.speaker === 'npc' ? styles.npcBubble : {}),
            ...(msg.speaker === 'player' ? styles.playerBubble : {}),
            ...(msg.speaker === 'system' ? styles.systemBubble : {})
          }}>
            {msg.speaker !== 'system' && (
              <div style={styles.bubbleName}>{msg.name}</div>
            )}
            <div style={styles.bubbleText}>
              {msg.speaker !== 'player'
                ? <ClickableText text={msg.text} onWordClick={handleWordClick} activeWord={selectedWord?.word} langCode={langCode} />
                : msg.text}
            </div>
            {msg.translation && (
              <div style={styles.bubbleTranslation}>{msg.translation}</div>
            )}
            {msg.speaker === 'player' && msg.correct === false && (
              <div style={styles.incorrectMark}>Not quite</div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {isPlayerTurn && (
        <div style={styles.inputSection}>
          <div style={styles.promptBox}>
            <span style={styles.promptLabel}>Your turn:</span> {currentExchange.prompt}
          </div>

          {showHint && currentExchange.hint && (
            <div style={styles.hintBox}>Hint: {currentExchange.hint}</div>
          )}

          <div style={styles.inputRow}>
            <input
              style={styles.input}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={`Type your response in ${langName}...`}
              autoFocus
            />
            <button style={styles.hintBtn} onClick={() => setShowHint(true)} title="Show hint">
              💡
            </button>
            <button style={styles.sendBtn} onClick={handleSubmit}>
              Send
            </button>
          </div>
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

  // List layout (matching StoryMode)
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
  listNativeName: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.4)',
    flexShrink: 0,
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

  // Playing phase styles
  contextBox: {
    background: 'rgba(255,215,0,0.08)',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(255,215,0,0.2)',
    maxWidth: '700px',
    margin: '0 auto 1.5rem'
  },
  contextText: { margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', textAlign: 'center' },
  chatArea: {
    maxWidth: '700px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '1rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '16px'
  },
  chatBubble: {
    maxWidth: '80%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    fontSize: '1rem'
  },
  npcBubble: {
    background: 'rgba(77,171,247,0.2)',
    border: '1px solid rgba(77,171,247,0.3)',
    alignSelf: 'flex-start'
  },
  playerBubble: {
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.3)',
    alignSelf: 'flex-end'
  },
  systemBubble: {
    background: 'rgba(255,255,255,0.05)',
    alignSelf: 'center',
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic'
  },
  bubbleName: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  bubbleText: { fontWeight: '500' },
  bubbleTranslation: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '0.25rem',
    fontStyle: 'italic'
  },
  incorrectMark: {
    fontSize: '0.75rem',
    color: '#f87171',
    marginTop: '0.25rem'
  },
  inputSection: {
    maxWidth: '700px',
    margin: '0 auto'
  },
  promptBox: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    marginBottom: '0.75rem',
    fontSize: '0.95rem'
  },
  promptLabel: {
    color: '#ffd700',
    fontWeight: '600'
  },
  hintBox: {
    background: 'rgba(255,215,0,0.1)',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    color: '#ffd700'
  },
  inputRow: {
    display: 'flex',
    gap: '0.5rem'
  },
  input: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '1rem',
    fontFamily: 'inherit',
    outline: 'none'
  },
  hintBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    padding: '0 0.75rem',
    cursor: 'pointer',
    fontSize: '1.2rem'
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit'
  }
};

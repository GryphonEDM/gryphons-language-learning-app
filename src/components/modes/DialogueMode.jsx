import React, { useState, useEffect, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { WordToolbar, ClickableText } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';

export default function DialogueMode({ langCode = 'uk', dialogues, onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';
  const [phase, setPhase] = useState('picker'); // picker, playing, complete
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
        dialogueId: selectedDialogue.dialogueId,
        score,
        totalPlayerTurns,
        xpEarned,
        mistakes
      });
    }
    if (onTrackProgress) {
      onTrackProgress('dialogue', {
        dialogueId: selectedDialogue.dialogueId,
        completed: true,
        mistakes
      });
    }
  };

  const handleRetry = () => {
    if (selectedDialogue) startDialogue(selectedDialogue);
  };

  // Picker
  if (phase === 'picker') {
    return (
      <div style={styles.container}>
        <ModeHeader title="Dialogue Practice" subtitle="Practice real conversations" icon="💬" onExit={onExit} />
        <div style={styles.grid}>
          {dialogues.map(d => (
            <div key={d.dialogueId} style={styles.dialogueCard} onClick={() => startDialogue(d)}>
              <div style={styles.dialogueIcon}>{d.icon}</div>
              <div style={styles.dialogueInfo}>
                <h3 style={styles.dialogueTitle}>{d.nameEn}</h3>
                <p style={styles.dialogueTitleUk}>{d.nameUk}</p>
                <p style={styles.dialogueContext}>{d.context}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Complete
  if (phase === 'complete') {
    const accuracy = totalPlayerTurns > 0 ? Math.round((score / totalPlayerTurns) * 100) : 0;
    return (
      <div style={styles.container}>
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
    <div style={styles.container}>
      <ModeHeader
        title={selectedDialogue.nameEn}
        subtitle={selectedDialogue.nameUk}
        icon={selectedDialogue.icon}
        onExit={() => setPhase('picker')}
      />

      <div style={styles.contentRow}>
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
                ? <ClickableText text={msg.text} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
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
        <LessonChat {...chat} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
      </div>
      <WordToolbar selectedWord={selectedWord} onDismiss={dismissWord} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} langName={langName} />
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
    maxWidth: '900px',
    margin: '0 auto'
  },
  dialogueCard: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    cursor: 'pointer',
    border: '2px solid rgba(255,215,0,0.2)',
    transition: 'all 0.3s'
  },
  dialogueIcon: { fontSize: '2.5rem', flexShrink: 0 },
  dialogueInfo: { flex: 1 },
  dialogueTitle: { margin: 0, color: '#ffd700', fontSize: '1.15rem' },
  dialogueTitleUk: { margin: '0.25rem 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' },
  dialogueContext: { margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' },
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

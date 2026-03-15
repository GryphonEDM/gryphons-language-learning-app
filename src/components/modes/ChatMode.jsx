import React, { useState, useEffect, useRef, useCallback } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import useWhisperSTT from '../../hooks/useWhisperSTT.js';

export default function ChatMode({ langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onAddXP }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';

  const [messages, setMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmConnected, setLlmConnected] = useState(null);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const systemPrompt = `You are a friendly ${langName} language tutor having a conversation with a student.
- Respond primarily in ${langName}, with English translations in parentheses when introducing new vocabulary.
- Keep responses concise (2-3 sentences max).
- If the user makes a grammar or spelling mistake, gently correct it.
- Adjust your complexity to match the user's level.
- Encourage the user to practice by asking follow-up questions in ${langName}.
- If the user writes in English, respond in ${langName} with an English translation, and encourage them to try in ${langName}.`;

  // Initialize messages with system prompt
  useEffect(() => {
    setMessages([{ role: 'system', content: systemPrompt }]);
  }, [langCode]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, isLoading]);

  // Check LM Studio connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/llm/models');
        setLlmConnected(res.ok);
      } catch {
        setLlmConnected(false);
      }
    };
    checkConnection();
  }, []);

  // Use a ref so the STT callback can call the latest version of handleSend
  const sendRef = useRef(null);

  // STT callback — auto-send when transcription completes
  const handleTranscript = useCallback((text) => {
    setUserInput(text);
    // Use a short timeout to let state update, then send
    setTimeout(() => {
      if (sendRef.current) sendRef.current(text);
    }, 0);
  }, []);

  const { isListening, isTranscribing, error: sttError, startListening, stopListening } = useWhisperSTT({
    onTranscript: handleTranscript,
  });

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(langCode);
    }
  };

  const sendToLLM = async (messageHistory) => {
    const res = await fetch('/llm/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'local-model',
        messages: messageHistory,
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      throw new Error(`LLM request failed (${res.status})`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  };

  const handleSend = async (directText) => {
    const text = (directText || userInput).trim();
    if (!text || isLoading) return;

    setError(null);
    const userMsg = { role: 'user', content: text };

    // Keep system + last 20 messages to avoid context overflow
    const recentMessages = messages.length > 21
      ? [messages[0], ...messages.slice(-20)]
      : messages;
    const newMessages = [...recentMessages, userMsg];

    setMessages(prev => [...prev, userMsg]);
    setDisplayMessages(prev => [...prev, { sender: 'user', text }]);
    setUserInput('');
    setIsLoading(true);

    try {
      const reply = await sendToLLM(newMessages);
      const assistantMsg = { role: 'assistant', content: reply };

      setMessages(prev => [...prev, assistantMsg]);
      setDisplayMessages(prev => [...prev, { sender: 'bot', text: reply }]);

      if (ttsEnabled && onSpeak) {
        onSpeak(reply, 0.8, ttsVolume);
      }

      if (onAddXP) onAddXP(5);
    } catch (err) {
      console.error('[Chat] LLM error:', err);
      setError('Could not reach LM Studio. Make sure it is running with a model loaded.');
      setLlmConnected(false);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  sendRef.current = handleSend;

  const replayTTS = (text) => {
    if (ttsEnabled && onSpeak) {
      onSpeak(text, 0.8, ttsVolume);
    }
  };

  return (
    <div style={styles.container}>
      <ModeHeader title="Chat Practice" subtitle={`Free conversation with AI tutor (${langName})`} icon="🤖" onExit={onExit} />

      {llmConnected === false && (
        <div style={styles.warningBanner}>
          ⚠️ LM Studio not detected at localhost:1234. Please start LM Studio and load a model.
        </div>
      )}

      {(error || sttError) && (
        <div style={styles.errorBanner}>
          {error || sttError}
        </div>
      )}

      <div style={styles.chatArea}>
        {displayMessages.length === 0 && !isLoading && (
          <div style={styles.emptyState}>
            Start a conversation! Type or speak in {langName} or English.
          </div>
        )}

        {displayMessages.map((msg, i) => (
          <div key={i} style={{
            ...styles.chatBubble,
            ...(msg.sender === 'user' ? styles.playerBubble : styles.botBubble),
          }}>
            <div style={styles.bubbleName}>{msg.sender === 'user' ? 'You' : 'Tutor'}</div>
            <div style={styles.bubbleText}>{msg.text}</div>
            {msg.sender === 'bot' && ttsEnabled && (
              <button style={styles.speakBtn} onClick={() => replayTTS(msg.text)} title="Listen again">
                🔊
              </button>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ ...styles.chatBubble, ...styles.botBubble }}>
            <div style={styles.bubbleName}>Tutor</div>
            <div style={styles.typingIndicator}>
              <span style={styles.dot}>●</span>
              <span style={{ ...styles.dot, animationDelay: '0.2s' }}>●</span>
              <span style={{ ...styles.dot, animationDelay: '0.4s' }}>●</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div style={styles.inputSection}>
        {isTranscribing && (
          <div style={styles.transcribingBar}>Transcribing...</div>
        )}
        <div style={styles.inputRow}>
          <input
            ref={inputRef}
            style={styles.input}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={`Type in ${langName} or English...`}
            disabled={isLoading}
            autoFocus
          />
          <button
            style={{
              ...styles.micBtn,
              ...(isListening ? styles.micBtnActive : {}),
              ...(isTranscribing ? styles.micBtnTranscribing : {}),
            }}
            onClick={toggleMic}
            disabled={isTranscribing}
            title={isListening ? 'Stop recording' : 'Speak your message'}
          >
            🎤
          </button>
          <button
            style={{
              ...styles.sendBtn,
              ...(!userInput.trim() || isLoading ? styles.sendBtnDisabled : {}),
            }}
            onClick={handleSend}
            disabled={isLoading || !userInput.trim()}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 80, 80, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(255, 80, 80, 0); }
        }
      `}</style>
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
    display: 'flex',
    flexDirection: 'column',
  },
  warningBanner: {
    background: 'rgba(255, 160, 0, 0.15)',
    border: '1px solid rgba(255, 160, 0, 0.4)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    maxWidth: '700px',
    margin: '0 auto 1rem',
    textAlign: 'center',
    fontSize: '0.9rem',
    color: '#ffb74d',
  },
  errorBanner: {
    background: 'rgba(255, 80, 80, 0.15)',
    border: '1px solid rgba(255, 80, 80, 0.4)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    maxWidth: '700px',
    margin: '0 auto 1rem',
    textAlign: 'center',
    fontSize: '0.9rem',
    color: '#f87171',
  },
  chatArea: {
    maxWidth: '700px',
    width: '100%',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    flex: 1,
    minHeight: '300px',
    maxHeight: '60vh',
    overflowY: 'auto',
    padding: '1rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '16px',
  },
  emptyState: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    padding: '3rem 1rem',
    fontSize: '1.1rem',
  },
  chatBubble: {
    maxWidth: '80%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    fontSize: '1rem',
    position: 'relative',
  },
  playerBubble: {
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.3)',
    alignSelf: 'flex-end',
  },
  botBubble: {
    background: 'rgba(77,171,247,0.2)',
    border: '1px solid rgba(77,171,247,0.3)',
    alignSelf: 'flex-start',
  },
  bubbleName: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  bubbleText: {
    fontWeight: '500',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.5',
  },
  speakBtn: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    opacity: 0.5,
    padding: '2px',
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    padding: '0.25rem 0',
  },
  dot: {
    animation: 'dotPulse 1.4s infinite ease-in-out',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
  },
  inputSection: {
    maxWidth: '700px',
    width: '100%',
    margin: '0 auto',
  },
  transcribingBar: {
    textAlign: 'center',
    color: '#ffd700',
    fontSize: '0.85rem',
    marginBottom: '0.5rem',
    fontStyle: 'italic',
  },
  inputRow: {
    display: 'flex',
    gap: '0.5rem',
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
    outline: 'none',
  },
  micBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    padding: '0 0.75rem',
    cursor: 'pointer',
    fontSize: '1.2rem',
    transition: 'all 0.2s',
  },
  micBtnActive: {
    background: 'rgba(255,80,80,0.3)',
    borderColor: '#f87171',
    animation: 'micPulse 1.5s infinite',
  },
  micBtnTranscribing: {
    opacity: 0.5,
    cursor: 'wait',
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
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  sendBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

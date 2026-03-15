import React, { useState, useEffect, useRef, useCallback } from 'react';
import useWhisperSTT from '../../hooks/useWhisperSTT.js';
import { buildDictionary } from '../../utils/dictionaryBuilder.js';

const STORAGE_KEY = 'chat_practice_sessions';

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function makeSession(langCode) {
  return {
    id: Date.now().toString(),
    langCode,
    title: 'New Chat',
    createdAt: Date.now(),
    displayMessages: [],
    messages: [],
  };
}

function titleFromMessages(displayMessages) {
  const first = displayMessages.find(m => m.sender === 'user');
  if (!first) return 'New Chat';
  return first.text.slice(0, 40) + (first.text.length > 40 ? '…' : '');
}

export default function ChatMode({ langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onAddXP }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';
  const dict = buildDictionary(langCode);

  const [sessions, setSessions] = useState(() => loadSessions());
  const [activeId, setActiveId] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmConnected, setLlmConnected] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedWord, setSelectedWord] = useState(null); // { word, translation, rect }
  const [ttsHighlight, setTtsHighlight] = useState(null); // { msgIdx, wordStart, wordEnd }
  const ttsSpeakingRef = useRef(false);
  const chatAreaRef = useRef(null);
  const inputRef = useRef(null);
  const sendRef = useRef(null);
  const rootRef = useRef(null);

  const lookupWord = useCallback((word) => {
    const cleaned = word.toLowerCase().replace(/[.,!?;:"""''()—–\-…«»\[\]]/g, '');
    if (!cleaned) return null;
    // Exact match
    if (dict.ukToEn[cleaned]) return dict.ukToEn[cleaned];
    // Try prefix matching for inflected forms
    for (let i = cleaned.length - 1; i >= Math.max(1, cleaned.length - 3); i--) {
      const prefix = cleaned.slice(0, i);
      if (dict.ukToEn[prefix]) return dict.ukToEn[prefix];
    }
    return null;
  }, [dict]);

  const handleWordClick = useCallback((e, word) => {
    const cleaned = word.replace(/[.,!?;:"""''()—–\-…«»\[\]]/g, '').trim();
    if (!cleaned) return;
    const translation = lookupWord(cleaned);
    const rect = e.target.getBoundingClientRect();
    setSelectedWord({ word: cleaned, translation, rect });
    if (ttsEnabled && onSpeak) onSpeak(cleaned, 0.8, ttsVolume);
  }, [lookupWord, ttsEnabled, onSpeak, ttsVolume]);

  const dismissWord = useCallback(() => setSelectedWord(null), []);

  const systemPrompt = `You are a friendly ${langName} language tutor having a conversation with a student.
- Respond primarily in ${langName}, with English translations in parentheses when introducing new vocabulary.
- Keep responses concise (2-3 sentences max).
- If the user makes a grammar or spelling mistake, gently correct it.
- Adjust your complexity to match the user's level.
- Encourage the user to practice by asking follow-up questions in ${langName}.
- If the user writes in English, respond in ${langName} with an English translation, and encourage them to try in ${langName}.`;

  const activeSession = sessions.find(s => s.id === activeId) || null;

  // Start a new session when entering, or resume latest
  useEffect(() => {
    const existing = loadSessions();
    if (existing.length > 0) {
      setActiveId(existing[0].id);
    } else {
      startNewChat();
    }
  }, []);

  // Persist sessions whenever they change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Auto-scroll
  useEffect(() => {
    const el = chatAreaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeSession?.displayMessages, isLoading]);

  // Check LM Studio connection on mount
  useEffect(() => {
    fetch('/llm/models')
      .then(res => setLlmConnected(res.ok))
      .catch(() => setLlmConnected(false));
  }, []);

  function startNewChat() {
    const session = makeSession(langCode);
    setSessions(prev => [session, ...prev]);
    setActiveId(session.id);
    setUserInput('');
    setError(null);
  }

  function deleteSession(id) {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (id === activeId) {
        if (next.length > 0) setActiveId(next[0].id);
        else {
          const fresh = makeSession(langCode);
          setSessions([fresh]);
          setActiveId(fresh.id);
          return [fresh];
        }
      }
      return next;
    });
  }

  function updateActive(updater) {
    setSessions(prev => prev.map(s => s.id === activeId ? updater(s) : s));
  }

  const handleSend = async (directText) => {
    const text = (directText || userInput).trim();
    if (!text || isLoading || !activeSession) return;

    setError(null);
    // Cancel any ongoing TTS
    ttsSpeakingRef.current = false;
    setTtsHighlight(null);
    // bot will land at displayMessages.length + 1 (user at +0, bot at +1)
    const botMsgIdx = (activeSession?.displayMessages?.length ?? 0) + 1;
    const userMsg = { role: 'user', content: text };
    const userDisplay = { sender: 'user', text };

    // Build LLM message history: system prompt + session history + new message
    const history = activeSession.messages.length > 0
      ? activeSession.messages
      : [{ role: 'system', content: systemPrompt }];

    const trimmed = history.length > 21
      ? [history[0], ...history.slice(-20)]
      : history;
    const newMessages = [...trimmed, userMsg];

    updateActive(s => ({
      ...s,
      messages: [...s.messages, userMsg],
      displayMessages: [...s.displayMessages, userDisplay],
      title: s.displayMessages.length === 0 ? titleFromMessages([userDisplay]) : s.title,
    }));

    setUserInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: newMessages,
          temperature: 0.7,
          max_tokens: 300,
          stream: true,
        }),
      });
      if (!res.ok) throw new Error(`LLM request failed (${res.status})`);

      // Add an empty bot message to start streaming into
      updateActive(s => ({
        ...s,
        displayMessages: [...s.displayMessages, { sender: 'bot', text: '' }],
      }));
      setIsLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              reply += delta;
              updateActive(s => {
                const msgs = [...s.displayMessages];
                msgs[msgs.length - 1] = { sender: 'bot', text: reply };
                return { ...s, displayMessages: msgs };
              });
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }

      const assistantMsg = { role: 'assistant', content: reply };
      updateActive(s => ({
        ...s,
        messages: [...s.messages, assistantMsg],
      }));

      speakWithHighlight(reply, botMsgIdx);
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

  const handleTranscript = useCallback((text) => {
    setUserInput(text);
    setTimeout(() => { if (sendRef.current) sendRef.current(text); }, 0);
  }, []);

  const { isListening, isTranscribing, error: sttError, startListening, stopListening } = useWhisperSTT({
    onTranscript: handleTranscript,
  });

  const toggleMic = (lang) => {
    if (isListening) stopListening();
    else startListening(lang);
  };

  const speakWithHighlight = useCallback(async (text, msgIdx) => {
    if (!ttsEnabled || !onSpeak) return;
    ttsSpeakingRef.current = true;
    setTtsHighlight(null);
    const sentences = text.split(/(?<=[.!?])\s+/);
    let wordOffset = 0;
    for (const sentence of sentences) {
      if (!ttsSpeakingRef.current) break;
      const words = sentence.split(/\s+/).filter(Boolean);
      setTtsHighlight({ msgIdx, wordStart: wordOffset, wordEnd: wordOffset + words.length });
      try { await onSpeak(sentence, 0.8, ttsVolume); } catch {}
      wordOffset += words.length;
      if (!ttsSpeakingRef.current) break;
    }
    setTtsHighlight(null);
    ttsSpeakingRef.current = false;
  }, [ttsEnabled, onSpeak, ttsVolume]);

  const displayMessages = activeSession?.displayMessages || [];

  const snapIntoView = () => {
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={rootRef} style={styles.root}>
      {/* Sidebar */}
      <div style={{ ...styles.sidebar, ...(sidebarOpen ? {} : styles.sidebarClosed) }}>
        <div style={styles.sidebarHeader}>
          <button style={styles.newChatBtn} onClick={startNewChat}>+ New Chat</button>
          <button style={styles.collapseBtn} onClick={() => setSidebarOpen(false)} title="Close sidebar">✕</button>
        </div>

        <div style={styles.sessionList}>
          {sessions.length === 0 && (
            <div style={styles.noSessions}>No chats yet</div>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              style={{ ...styles.sessionItem, ...(s.id === activeId ? styles.sessionItemActive : {}) }}
              onClick={() => { setActiveId(s.id); setError(null); }}
            >
              <div style={styles.sessionTitle}>{s.title}</div>
              <div style={styles.sessionMeta}>
                {s.langCode === 'ru' ? '🇷🇺' : '🇺🇦'} · {s.displayMessages.length} msg{s.displayMessages.length !== 1 ? 's' : ''}
              </div>
              <button
                style={styles.deleteBtn}
                onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                title="Delete chat"
              >🗑</button>
            </div>
          ))}
        </div>

        <button style={styles.exitBtn} onClick={onExit}>← Back to Menu</button>
      </div>

      {/* Main area */}
      <div style={styles.main}>
        {/* Top bar */}
        <div style={styles.topBar}>
          {!sidebarOpen && (
            <button style={styles.openSidebarBtn} onClick={() => setSidebarOpen(true)} title="Open sidebar">☰</button>
          )}
          <div style={styles.topBarTitle}>
            🤖 Chat Practice
            <span style={styles.topBarSub}>{langName}</span>
          </div>
          <button style={styles.newChatBtnTop} onClick={startNewChat} title="New chat">＋ New</button>
        </div>

        {/* Banners */}
        {llmConnected === false && (
          <div style={styles.warningBanner}>
            ⚠️ LM Studio not detected at localhost:1234. Please start LM Studio and load a model.
          </div>
        )}
        {(error || sttError) && (
          <div style={styles.errorBanner}>{error || sttError}</div>
        )}

        {/* Messages */}
        <div ref={chatAreaRef} style={styles.chatArea}>
          {displayMessages.length === 0 && !isLoading && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🤖</div>
              <div>Start a conversation!</div>
              <div style={styles.emptyHint}>Type or use the mic buttons to speak in {langName} or English.</div>
            </div>
          )}

          {displayMessages.map((msg, i) => (
            <div key={i} style={styles.messageRow}>
              <div style={msg.sender === 'user' ? styles.userAvatar : styles.botAvatar}>
                {msg.sender === 'user' ? '👤' : '🤖'}
              </div>
              <div style={{ ...styles.chatBubble, ...(msg.sender === 'user' ? styles.playerBubble : styles.botBubble) }}>
                <div style={styles.bubbleText}>
                  {(() => {
                    let wordCount = 0;
                    return msg.text.split(/(\s+)/).map((token, j) => {
                      if (/^\s+$/.test(token)) return token;
                      const myWordIdx = wordCount++;
                      const isSelected = selectedWord && selectedWord.word === token.replace(/[.,!?;:"""''()—–\-…«»\[\]]/g, '').toLowerCase();
                      const isHighlighted = ttsHighlight?.msgIdx === i &&
                        myWordIdx >= ttsHighlight.wordStart && myWordIdx < ttsHighlight.wordEnd;
                      return (
                        <span
                          key={j}
                          onClick={(e) => handleWordClick(e, token)}
                          style={{
                            ...styles.clickableWord,
                            ...(isSelected ? styles.clickableWordActive : {}),
                            ...(isHighlighted ? styles.clickableWordTts : {}),
                          }}
                        >{token}</span>
                      );
                    });
                  })()}
                </div>
                {msg.sender === 'bot' && ttsEnabled && (
                  <button style={styles.speakBtn} onClick={() => speakWithHighlight(msg.text, i)} title="Listen again">🔊</button>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={styles.messageRow}>
              <div style={styles.botAvatar}>🤖</div>
              <div style={{ ...styles.chatBubble, ...styles.botBubble }}>
                <div style={styles.typingIndicator}>
                  <span style={styles.dot}>●</span>
                  <span style={{ ...styles.dot, animationDelay: '0.2s' }}>●</span>
                  <span style={{ ...styles.dot, animationDelay: '0.4s' }}>●</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Input */}
        <div style={styles.inputSection}>
          {isTranscribing && <div style={styles.transcribingBar}>Transcribing...</div>}
          <div style={styles.inputRow}>
            <input
              ref={inputRef}
              style={styles.input}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Type in ${langName} or English...`}
              disabled={isLoading}
              autoFocus
            />
            <button
              style={{ ...styles.micBtn, ...(isListening ? styles.micBtnActive : {}), ...(isTranscribing ? styles.micBtnTranscribing : {}) }}
              onClick={() => toggleMic('en')}
              disabled={isTranscribing}
              title="Speak in English"
            >🎤 EN</button>
            <button
              style={{ ...styles.micBtn, ...(isListening ? styles.micBtnActive : {}), ...(isTranscribing ? styles.micBtnTranscribing : {}) }}
              onClick={() => toggleMic(langCode)}
              disabled={isTranscribing}
              title={`Speak in ${langName}`}
            >🎤 {langCode === 'ru' ? 'RU' : 'UA'}</button>
            <button
              style={{ ...styles.sendBtn, ...(!userInput.trim() || isLoading ? styles.sendBtnDisabled : {}) }}
              onClick={() => handleSend()}
              disabled={isLoading || !userInput.trim()}
            >Send</button>
          </div>
        </div>
      </div>

      {/* Word toolbar popup */}
      {selectedWord && (
        <div
          style={{
            ...styles.wordToolbar,
            top: selectedWord.rect.bottom + 8,
            left: Math.max(10, Math.min(selectedWord.rect.left, window.innerWidth - 280)),
          }}
        >
          <button style={styles.wordToolbarClose} onClick={dismissWord}>✕</button>
          <div style={styles.wordToolbarWord}>{selectedWord.word}</div>
          <div style={styles.wordToolbarTranslation}>
            {selectedWord.translation || 'No translation found'}
          </div>
          <div style={styles.wordToolbarActions}>
            <button
              style={styles.wordToolbarBtn}
              onClick={() => { if (ttsEnabled && onSpeak) onSpeak(selectedWord.word, 0.7, ttsVolume); }}
            >🔊 Listen</button>
          </div>
        </div>
      )}

      {/* Click-outside to dismiss word toolbar */}
      {selectedWord && <div style={styles.wordToolbarBackdrop} onClick={dismissWord} />}

      {/* Snap-to-view floating button */}
      <button style={styles.snapBtn} onClick={snapIntoView} title="Snap chat into view">⌖</button>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,80,80,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(255,80,80,0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    height: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
  },

  // Sidebar
  sidebar: {
    width: '260px',
    flexShrink: 0,
    background: 'rgba(0,0,0,0.35)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem 0.75rem',
    gap: '0.5rem',
    transition: 'width 0.2s, padding 0.2s',
    overflow: 'hidden',
  },
  sidebarClosed: {
    width: 0,
    padding: 0,
  },
  sidebarHeader: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  newChatBtn: {
    flex: 1,
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '8px',
    color: '#ffd700',
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  collapseBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.5)',
    padding: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
  },
  sessionList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  noSessions: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.85rem',
    textAlign: 'center',
    marginTop: '1rem',
  },
  sessionItem: {
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid transparent',
    position: 'relative',
    transition: 'background 0.15s',
  },
  sessionItemActive: {
    background: 'rgba(255,215,0,0.1)',
    border: '1px solid rgba(255,215,0,0.25)',
  },
  sessionTitle: {
    fontSize: '0.88rem',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingRight: '1.5rem',
  },
  sessionMeta: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '0.15rem',
  },
  deleteBtn: {
    position: 'absolute',
    top: '50%',
    right: '0.5rem',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    opacity: 0.4,
    padding: '2px',
    color: '#fff',
  },
  exitBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    padding: '0.6rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    textAlign: 'left',
  },

  // Main
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.15)',
    flexShrink: 0,
  },
  openSidebarBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    padding: '0.4rem 0.6rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontFamily: 'inherit',
  },
  topBarTitle: {
    flex: 1,
    fontWeight: '700',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  topBarSub: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '400',
  },
  newChatBtnTop: {
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '8px',
    color: '#ffd700',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontWeight: '600',
    fontFamily: 'inherit',
  },
  warningBanner: {
    background: 'rgba(255,160,0,0.12)',
    border: '1px solid rgba(255,160,0,0.3)',
    padding: '0.6rem 1.5rem',
    fontSize: '0.88rem',
    color: '#ffb74d',
    flexShrink: 0,
  },
  errorBanner: {
    background: 'rgba(255,80,80,0.12)',
    border: '1px solid rgba(255,80,80,0.3)',
    padding: '0.6rem 1.5rem',
    fontSize: '0.88rem',
    color: '#f87171',
    flexShrink: 0,
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '0.5rem',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '1.1rem',
    paddingTop: '4rem',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
  },
  emptyHint: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.3)',
  },
  messageRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    maxWidth: '780px',
    width: '100%',
    alignSelf: 'center',
  },
  userAvatar: {
    fontSize: '1.2rem',
    flexShrink: 0,
    order: 2,
  },
  botAvatar: {
    fontSize: '1.2rem',
    flexShrink: 0,
  },
  chatBubble: {
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    fontSize: '1rem',
    position: 'relative',
    lineHeight: '1.6',
  },
  playerBubble: {
    background: 'rgba(255,215,0,0.12)',
    border: '1px solid rgba(255,215,0,0.25)',
    marginLeft: 'auto',
    order: 1,
    maxWidth: '75%',
  },
  botBubble: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    maxWidth: '75%',
  },
  bubbleText: {
    fontWeight: '400',
    whiteSpace: 'pre-wrap',
  },
  speakBtn: {
    display: 'inline-block',
    marginTop: '0.4rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    opacity: 0.5,
    padding: '0',
    color: '#fff',
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    padding: '0.1rem 0',
  },
  dot: {
    animation: 'dotPulse 1.4s infinite ease-in-out',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
  },
  inputSection: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.15)',
    flexShrink: 0,
  },
  transcribingBar: {
    textAlign: 'center',
    color: '#ffd700',
    fontSize: '0.82rem',
    marginBottom: '0.5rem',
    fontStyle: 'italic',
  },
  inputRow: {
    display: 'flex',
    gap: '0.5rem',
    maxWidth: '780px',
    margin: '0 auto',
  },
  input: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.07)',
    color: '#fff',
    fontSize: '1rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  micBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '0.4rem 0.6rem',
    cursor: 'pointer',
    fontSize: '0.82rem',
    color: '#fff',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  micBtnActive: {
    background: 'rgba(255,80,80,0.3)',
    borderColor: '#f87171',
    animation: 'micPulse 1.5s infinite',
  },
  micBtnTranscribing: {
    opacity: 0.4,
    cursor: 'wait',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '0.75rem 1.25rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  sendBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  clickableWord: {
    cursor: 'pointer',
    borderRadius: '3px',
    padding: '0 1px',
    transition: 'background 0.15s',
  },
  clickableWordActive: {
    background: 'rgba(255,215,0,0.3)',
    borderBottom: '2px solid #ffd700',
  },
  clickableWordTts: {
    background: 'rgba(77,171,247,0.3)',
    color: '#4dabf7',
  },
  wordToolbarBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  wordToolbar: {
    position: 'fixed',
    zIndex: 1001,
    background: '#1e293b',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    minWidth: '200px',
    maxWidth: '280px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  wordToolbarClose: {
    position: 'absolute',
    top: '0.4rem',
    right: '0.5rem',
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    padding: '2px',
  },
  wordToolbarWord: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#ffd700',
    marginBottom: '0.3rem',
  },
  wordToolbarTranslation: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
    marginBottom: '0.5rem',
  },
  wordToolbarActions: {
    display: 'flex',
    gap: '0.4rem',
  },
  wordToolbarBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    padding: '0.35rem 0.65rem',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontFamily: 'inherit',
  },
  snapBtn: {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '50%',
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.35)',
    color: '#ffd700',
    fontSize: '1.2rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    transition: 'background 0.2s',
    fontFamily: 'inherit',
  },
};

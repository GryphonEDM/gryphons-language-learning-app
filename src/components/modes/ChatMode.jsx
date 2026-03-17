import React, { useState, useEffect, useRef, useCallback } from 'react';
import useWhisperSTT from '../../hooks/useWhisperSTT.js';
import { stopSpeaking } from '../../App.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import { WordToolbar } from '../shared/WordToolbar.jsx';

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

  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });

  const [sessions, setSessions] = useState(() => loadSessions());
  const [activeId, setActiveId] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmConnected, setLlmConnected] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [ttsHighlight, setTtsHighlight] = useState(null); // { msgIdx, wordStart, wordEnd }
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [contextLimit, setContextLimit] = useState(null); // max context tokens from model
  const [tokenUsage, setTokenUsage] = useState(0); // total_tokens from last response
  const ttsSpeakingRef = useRef(false);
  const abortRef = useRef(null);
  const chatAreaRef = useRef(null);
  const inputRef = useRef(null);
  const sendRef = useRef(null);
  const rootRef = useRef(null);

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

  // Check LM Studio connection and get model context length on mount
  useEffect(() => {
    fetch('/llm/models')
      .then(res => setLlmConnected(res.ok))
      .catch(() => setLlmConnected(false));

    // Fetch context length from LM Studio native API
    fetch('/lmstudio/models')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.models) return;
        // Find a loaded model and get its context length
        for (const m of data.models) {
          const loaded = m.loaded_instances?.[0];
          if (loaded?.config?.context_length) {
            setContextLimit(loaded.config.context_length);
            return;
          }
          if (m.max_context_length) {
            setContextLimit(m.max_context_length);
            return;
          }
        }
      })
      .catch(() => {}); // LM Studio native API not available, bar just won't show
  }, []);

  function startNewChat() {
    const session = makeSession(langCode);
    setSessions(prev => [session, ...prev]);
    setActiveId(session.id);
    setUserInput('');
    setError(null);
    setTokenUsage(0);
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

  const contextFull = contextLimit && tokenUsage / contextLimit > 0.95;

  const handleSend = async (directText, fromSTT = false) => {
    const text = (directText || userInput).trim();
    if (!text || isLoading || !activeSession) return;
    if (contextFull) {
      setError('Context window is full. Please start a new chat.');
      return;
    }

    setError(null);
    stopAll();
    // bot will land at displayMessages.length + 1 (user at +0, bot at +1)
    const botMsgIdx = (activeSession?.displayMessages?.length ?? 0) + 1;
    const llmContent = fromSTT
      ? `[Note: this message was captured via speech-to-text. Evaluate the intent, STT might have captured them incorrectly or their pronunciation might be off.]\n${text}`
      : text;
    const userMsg = { role: 'user', content: llmContent };
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
      const abort = new AbortController();
      abortRef.current = abort;
      const res = await fetch('/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: newMessages,
          temperature: 0.7,
          stream: true,
          stream_options: { include_usage: true },
        }),
        signal: abort.signal,
      });
      if (!res.ok) throw new Error(`LLM request failed (${res.status})`);

      // Add an empty bot message to start streaming into
      updateActive(s => ({
        ...s,
        displayMessages: [...s.displayMessages, { sender: 'bot', text: '' }],
      }));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      let buffer = '';

      while (true) {
        if (abort.signal.aborted) {
          reader.cancel();
          break;
        }
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
            // Capture token usage from final chunk
            if (chunk.usage) {
              setTokenUsage(chunk.usage.total_tokens || 0);
            }
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

      // Save partial or complete reply to conversation history
      if (reply) {
        const assistantMsg = { role: 'assistant', content: reply };
        updateActive(s => ({
          ...s,
          messages: [...s.messages, assistantMsg],
        }));
      }

      if (!abort.signal.aborted) {
        speakWithHighlight(reply, botMsgIdx);
        if (onAddXP) onAddXP(5);
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // user stopped intentionally
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
    setTimeout(() => { if (sendRef.current) sendRef.current(text, true); }, 0);
  }, []);

  const { isListening, isTranscribing, error: sttError, startListening, stopListening } = useWhisperSTT({
    onTranscript: handleTranscript,
  });

  const [micLang, setMicLang] = useState(null);
  const toggleMic = (lang) => {
    if (isListening) {
      stopListening();
      setMicLang(null);
    } else {
      setMicLang(lang);
      startListening(lang);
    }
  };

  const stopAll = useCallback(() => {
    ttsSpeakingRef.current = false;
    stopSpeaking();
    setTtsHighlight(null);
    setIsSpeaking(false);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setIsLoading(false);
  }, []);

  // Stop TTS and abort any pending LLM request on unmount
  useEffect(() => {
    return () => {
      ttsSpeakingRef.current = false;
      stopSpeaking();
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    };
  }, []);

  const speakWithHighlight = useCallback(async (text, msgIdx) => {
    if (!ttsEnabled || !onSpeak) return;
    ttsSpeakingRef.current = true;
    setIsSpeaking(true);
    setTtsHighlight(null);
    const chunks = text.split(/(?<=[.!?;,])\s+/);
    let wordOffset = 0;
    for (const chunk of chunks) {
      if (!ttsSpeakingRef.current) break;
      const words = chunk.split(/\s+/).filter(Boolean);
      setTtsHighlight({ msgIdx, wordStart: wordOffset, wordEnd: wordOffset + words.length });
      try { await onSpeak(chunk, 0.8, ttsVolume); } catch {}
      wordOffset += words.length;
      if (!ttsSpeakingRef.current) break;
    }
    setTtsHighlight(null);
    ttsSpeakingRef.current = false;
    setIsSpeaking(false);
  }, [ttsEnabled, onSpeak, ttsVolume]);

  const displayMessages = activeSession?.displayMessages || [];

  const snapIntoView = () => {
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={rootRef} className="chat-root" style={styles.root}>
      {/* Sidebar */}
      <div className={`chat-sidebar ${sidebarOpen ? '' : 'chat-sidebar-closed'}`} style={{ ...styles.sidebar, ...(sidebarOpen ? {} : styles.sidebarClosed) }}>
        <div style={styles.sidebarHeader}>
          <button style={styles.newChatBtn} onClick={onExit}>← Back to Menu</button>
          <button style={styles.collapseBtn} onClick={() => setSidebarOpen(false)} title="Close sidebar">☰</button>
        </div>

        <div style={styles.sessionList}>
          {sessions.length === 0 && (
            <div style={styles.noSessions}>No chats yet</div>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              style={{ ...styles.sessionItem, ...(s.id === activeId ? styles.sessionItemActive : {}) }}
              onClick={() => { setActiveId(s.id); setError(null); setTokenUsage(0); }}
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

        <button style={styles.exitBtn} onClick={startNewChat}>+ New Chat</button>
      </div>

      {/* Main area */}
      <div style={styles.main}>
        {/* Top bar */}
        <div className="chat-topbar" style={styles.topBar}>
          {!sidebarOpen && (
            <button style={styles.openSidebarBtn} onClick={() => setSidebarOpen(true)} title="Open sidebar">☰</button>
          )}
          <div style={styles.topBarTitle}>
            🤖 Chat Practice
            <span style={styles.topBarSub}>{langName}</span>
          </div>
          <button style={styles.newChatBtnTop} onClick={startNewChat} title="New chat">＋ New</button>
          {contextLimit && tokenUsage > 0 && (
            <div style={styles.contextBar}>
              <div style={styles.contextBarTrack}>
                <div style={{
                  ...styles.contextBarFill,
                  width: `${Math.min(100, (tokenUsage / contextLimit) * 100)}%`,
                  background: tokenUsage / contextLimit > 0.9 ? '#f87171'
                    : tokenUsage / contextLimit > 0.7 ? '#fbbf24' : '#4ade80',
                }} />
              </div>
              <span style={styles.contextBarLabel}>
                {Math.round((tokenUsage / contextLimit) * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Banners */}
        {llmConnected === false && (
          <div style={styles.warningBanner}>
            ⚠️ LM Studio not detected at localhost:1234. Please start LM Studio and load a model.
          </div>
        )}
        {contextLimit && tokenUsage / contextLimit > 0.9 && (
          <div style={styles.warningBanner}>
            ⚠️ Context is {Math.round((tokenUsage / contextLimit) * 100)}% full — start a new chat to avoid degraded responses.
          </div>
        )}
        {(error || sttError) && (
          <div style={styles.errorBanner}>{error || sttError}</div>
        )}

        {/* Messages */}
        <div ref={chatAreaRef} className="chat-area" style={styles.chatArea}>
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
                          onClick={(e) => handleWordClick(e, token, msg.text)}
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
        <div className="chat-input-section" style={styles.inputSection}>
          {isTranscribing && <div style={styles.transcribingBar}>Transcribing...</div>}
          <div className="chat-input-row" style={styles.inputRow}>
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
              style={{ ...styles.micBtn, ...(isListening && micLang === 'en' ? styles.micBtnActive : {}), ...(isTranscribing ? styles.micBtnTranscribing : {}) }}
              onClick={() => toggleMic('en')}
              disabled={isTranscribing || (isListening && micLang !== 'en')}
              title="Speak in English"
            >🎤 EN</button>
            <button
              style={{ ...styles.micBtn, ...(isListening && micLang === langCode ? styles.micBtnActive : {}), ...(isTranscribing ? styles.micBtnTranscribing : {}) }}
              onClick={() => toggleMic(langCode)}
              disabled={isTranscribing || (isListening && micLang !== langCode)}
              title={`Speak in ${langName}`}
            >🎤 {langCode === 'ru' ? 'RU' : 'UA'}</button>
            {(isLoading || isSpeaking) && (
              <button style={styles.stopBtn} onClick={stopAll} title="Stop">⏹ Stop</button>
            )}
            <button
              style={{ ...styles.sendBtn, ...(!userInput.trim() || isLoading || contextFull ? styles.sendBtnDisabled : {}) }}
              onClick={() => handleSend()}
              disabled={isLoading || !userInput.trim() || contextFull}
            >Send</button>
          </div>
        </div>
      </div>

      <WordToolbar selectedWord={selectedWord} onDismiss={dismissWord} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} langName={langName} langCode={langCode} />

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
    height: '100%',
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
  contextBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginLeft: 'auto',
  },
  contextBarTrack: {
    width: '80px',
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  contextBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s, background 0.3s',
  },
  contextBarLabel: {
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.5)',
    minWidth: '2rem',
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
  stopBtn: {
    background: 'rgba(255,80,80,0.15)',
    border: '1px solid rgba(255,80,80,0.4)',
    borderRadius: '10px',
    color: '#f87171',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
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

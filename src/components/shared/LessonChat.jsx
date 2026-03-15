import React from 'react';
import { ClickableText } from './WordToolbar.jsx';

/**
 * Fixed right-side chat panel for learning modes.
 * Pass the result of useLessonChat() as props.
 */
export default function LessonChat({ open, setOpen, messages, input, setInput, loading, send, scrollRef, inputRef, onWordClick, activeWord }) {
  return (
    <>
      {/* Toggle button — only shown when closed */}
      {!open && (
        <button style={styles.toggleBtn} onClick={() => setOpen(true)}>
          💬 Have a question?
        </button>
      )}

      {/* Side panel */}
      {open && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <span style={styles.title}>💬 Ask a Question</span>
            <button style={styles.closeBtn} onClick={() => setOpen(false)} title="Close">✕</button>
          </div>

          <div ref={scrollRef} style={styles.messages}>
            {messages.length === 0 && (
              <div style={styles.empty}>Ask me anything about this exercise!</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ ...styles.bubble, ...(msg.sender === 'user' ? styles.userBubble : styles.botBubble) }}>
                {msg.sender === 'bot' && onWordClick
                  ? <ClickableText text={msg.text} onWordClick={onWordClick} activeWord={activeWord} />
                  : msg.text}
              </div>
            ))}
            {loading && (
              <div style={{ ...styles.bubble, ...styles.botBubble }}>
                <span style={styles.dot}>●</span>
                <span style={{ ...styles.dot, animationDelay: '0.2s' }}>●</span>
                <span style={{ ...styles.dot, animationDelay: '0.4s' }}>●</span>
              </div>
            )}
          </div>

          <div style={styles.inputRow}>
            <input
              ref={inputRef}
              style={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask a question..."
            />
            <button style={styles.sendBtn} onClick={send} disabled={loading}>→</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes lessonDotPulse {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
      `}</style>
    </>
  );
}

const styles = {
  toggleBtn: {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    border: 'none',
    borderRadius: '999px',
    color: '#fff',
    fontWeight: '700',
    fontSize: '0.95rem',
    padding: '0.75rem 1.25rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 20px rgba(77,171,247,0.4)',
    zIndex: 200,
  },
  panel: {
    position: 'fixed',
    top: '4rem',
    right: 0,
    bottom: 0,
    width: '340px',
    background: '#0f172a',
    borderLeft: '1px solid rgba(255,215,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 200,
    boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  title: {
    fontWeight: '700',
    fontSize: '1rem',
    color: '#ffd700',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.2rem 0.4rem',
    borderRadius: '6px',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  empty: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.9rem',
    textAlign: 'center',
    marginTop: '1rem',
  },
  bubble: {
    padding: '0.6rem 0.9rem',
    borderRadius: '12px',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    maxWidth: '90%',
    wordBreak: 'break-word',
  },
  userBubble: {
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.3)',
    alignSelf: 'flex-end',
    color: '#fff',
  },
  botBubble: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    color: 'rgba(255,255,255,0.9)',
  },
  inputRow: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: '#fff',
    padding: '0.5rem 0.75rem',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    borderRadius: '10px',
    color: '#1a1a2e',
    fontWeight: '700',
    fontSize: '1rem',
    padding: '0.5rem 0.9rem',
    cursor: 'pointer',
  },
  dot: {
    display: 'inline-block',
    animation: 'lessonDotPulse 1.2s infinite',
    marginRight: '2px',
    fontSize: '0.7rem',
  },
};

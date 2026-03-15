import React from 'react';

/**
 * Popup toolbar shown when a word is clicked.
 * Renders nothing if selectedWord is null.
 */
export function WordToolbar({ selectedWord, onDismiss, onSpeak, ttsEnabled, ttsVolume }) {
  if (!selectedWord) return null;

  const top = selectedWord.rect.bottom + 8;
  const left = Math.max(10, Math.min(selectedWord.rect.left, window.innerWidth - 280));

  return (
    <>
      <div style={{ ...styles.backdrop }} onClick={onDismiss} />
      <div style={{ ...styles.toolbar, top, left }}>
        <button style={styles.close} onClick={onDismiss}>✕</button>
        <div style={styles.word}>{selectedWord.word}</div>
        <div style={styles.translation}>
          {selectedWord.translation || 'No translation found'}
        </div>
        <div style={styles.actions}>
          <button
            style={styles.btn}
            onClick={() => { if (ttsEnabled && onSpeak) onSpeak(selectedWord.word, 0.7, ttsVolume); }}
          >
            🔊 Listen
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Renders a string as a series of clickable word tokens.
 * Non-word tokens (whitespace) are rendered as-is.
 */
export function ClickableText({ text = '', onWordClick, activeWord = null, style = {} }) {
  const tokens = text.split(/(\s+)/);
  return (
    <span style={style}>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return token;
        const cleaned = token.replace(/[.,!?;:"""''()—–\-…«»\[\]]/g, '').toLowerCase();
        const isActive = activeWord && activeWord === cleaned;
        return (
          <span
            key={i}
            onClick={(e) => onWordClick(e, token)}
            style={{
              cursor: 'pointer',
              borderRadius: '3px',
              padding: '0 1px',
              background: isActive ? 'rgba(255,215,0,0.25)' : 'transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'rgba(255,215,0,0.25)' : 'transparent'; }}
          >
            {token}
          </span>
        );
      })}
    </span>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
  },
  toolbar: {
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
  close: {
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
  word: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#ffd700',
    marginBottom: '0.3rem',
  },
  translation: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
    marginBottom: '0.5rem',
  },
  actions: {
    display: 'flex',
    gap: '0.4rem',
  },
  btn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    padding: '0.35rem 0.65rem',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontFamily: 'inherit',
  },
};

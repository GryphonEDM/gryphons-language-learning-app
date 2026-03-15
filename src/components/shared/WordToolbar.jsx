import React, { useState, useEffect } from 'react';
import { saveToUserDict, translateWithLLM } from '../../utils/userDictionary.js';

/**
 * Popup toolbar shown when a word is clicked.
 * Handles add-to-dictionary via LLM translation internally.
 */
export function WordToolbar({ selectedWord, onDismiss, onSpeak, ttsEnabled, ttsVolume, langName = 'Ukrainian' }) {
  const [addForm, setAddForm] = useState(null); // null | { en: string, translating: boolean }

  // Reset form whenever a new word is selected
  useEffect(() => { setAddForm(null); }, [selectedWord?.word]);

  if (!selectedWord) return null;

  const top = selectedWord.rect.bottom + 8;
  const left = Math.max(10, Math.min(selectedWord.rect.left, window.innerWidth - 300));

  const handleAddClick = () => {
    setAddForm({ en: '', translating: true });
    translateWithLLM(selectedWord.word, langName).then(translation => {
      setAddForm(prev => prev ? { ...prev, en: translation || '', translating: false } : null);
    });
  };

  const handleSave = () => {
    if (!addForm?.en.trim()) return;
    saveToUserDict(selectedWord.word, addForm.en);
    onDismiss();
  };

  return (
    <>
      <div style={styles.backdrop} onClick={onDismiss} />
      <div style={{ ...styles.toolbar, top, left }}>
        <button style={styles.close} onClick={onDismiss}>✕</button>
        <div style={styles.word}>{selectedWord.word}</div>

        {!addForm ? (
          <>
            <div style={styles.translation}>
              {selectedWord.translation || <span style={styles.noResult}>No translation found</span>}
            </div>
            <div style={styles.actions}>
              <button style={styles.btn} onClick={() => { if (ttsEnabled && onSpeak) onSpeak(selectedWord.word, 0.7, ttsVolume); }}>
                🔊 Listen
              </button>
              {!selectedWord.translation && (
                <button style={{ ...styles.btn, ...styles.addBtn }} onClick={handleAddClick}>
                  + Add to dictionary
                </button>
              )}
            </div>
          </>
        ) : (
          <div style={styles.addForm}>
            <div style={styles.addLabel}>
              English meaning
              {addForm.translating && <span style={styles.translatingHint}> translating…</span>}
            </div>
            <input
              style={{ ...styles.addInput, ...(addForm.translating ? { opacity: 0.5 } : {}) }}
              value={addForm.en}
              onChange={e => setAddForm(prev => ({ ...prev, en: e.target.value }))}
              placeholder={addForm.translating ? 'Getting translation…' : 'Enter translation...'}
              disabled={addForm.translating}
              autoFocus={!addForm.translating}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setAddForm(null);
              }}
            />
            <div style={styles.addActions}>
              <button style={styles.cancelBtn} onClick={() => setAddForm(null)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSave} disabled={addForm.translating || !addForm.en.trim()}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Renders a string as a series of clickable word tokens.
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
    minWidth: '220px',
    maxWidth: '300px',
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
  noResult: {
    color: 'rgba(255,255,255,0.4)',
  },
  actions: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap',
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
  addBtn: {
    background: 'rgba(255,215,0,0.12)',
    border: '1px solid rgba(255,215,0,0.3)',
    color: '#ffd700',
  },
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  addLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
  },
  translatingHint: {
    color: '#4dabf7',
    fontStyle: 'italic',
  },
  addInput: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '7px',
    color: '#fff',
    padding: '0.4rem 0.6rem',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  addActions: {
    display: 'flex',
    gap: '0.4rem',
    justifyContent: 'flex-end',
    marginTop: '0.15rem',
  },
  cancelBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
    borderRadius: '7px',
    color: 'rgba(255,255,255,0.5)',
    padding: '0.35rem 0.7rem',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontFamily: 'inherit',
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    borderRadius: '7px',
    color: '#1a1a2e',
    padding: '0.35rem 0.8rem',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '700',
    fontFamily: 'inherit',
  },
};

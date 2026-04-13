import React, { useState } from 'react';

export default function CustomFlashcardManager({ langCode = 'uk', customWords, onSave, onSpeak, ttsEnabled, ttsVolume }) {
  const langName = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' }[langCode] || 'Ukrainian';
  const [newTarget, setNewTarget] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [editIndex, setEditIndex] = useState(-1);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = () => {
    if (!newTarget.trim() || !newEn.trim()) return;

    const word = {
      [langCode]: newTarget.trim(),
      en: newEn.trim(),
      phonetic: newPhonetic.trim()
    };

    let updated;
    if (editIndex >= 0) {
      updated = [...customWords];
      updated[editIndex] = word;
      setEditIndex(-1);
    } else {
      updated = [...customWords, word];
    }

    onSave(updated);
    setNewTarget('');
    setNewEn('');
    setNewPhonetic('');
    setShowForm(false);
  };

  const handleEdit = (index) => {
    const word = customWords[index];
    setNewTarget(word[langCode] || word.uk || '');
    setNewEn(word.en);
    setNewPhonetic(word.phonetic || '');
    setEditIndex(index);
    setShowForm(true);
  };

  const handleDelete = (index) => {
    const updated = customWords.filter((_, i) => i !== index);
    onSave(updated);
  };

  const handleCancel = () => {
    setNewTarget('');
    setNewEn('');
    setNewPhonetic('');
    setEditIndex(-1);
    setShowForm(false);
  };

  return (
    <div className="mode-container" style={styles.container}>
      <div style={styles.headerRow}>
        <h3 style={styles.heading}>My Custom Words ({customWords.length})</h3>
        {!showForm && (
          <button style={styles.addBtn} onClick={() => setShowForm(true)}>
            + Add Word
          </button>
        )}
      </div>

      {showForm && (
        <div style={styles.form}>
          <div style={styles.formRow}>
            <input
              style={styles.input}
              placeholder={`${langName} word`}
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <input
              style={styles.input}
              placeholder="English translation"
              value={newEn}
              onChange={e => setNewEn(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <input
              style={{...styles.input, flex: '0.7'}}
              placeholder="Phonetic (optional)"
              value={newPhonetic}
              onChange={e => setNewPhonetic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div style={styles.formActions}>
            <button style={styles.saveBtn} onClick={handleAdd}>
              {editIndex >= 0 ? 'Update' : 'Add'}
            </button>
            <button style={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      )}

      {customWords.length > 0 && (
        <div style={styles.wordList}>
          {customWords.map((word, i) => (
            <div key={`${word.en}-${word[langCode] || word.uk}`} style={styles.wordItem}>
              <div style={styles.wordInfo}>
                <span style={styles.ukWord}>{word[langCode] || word.uk}</span>
                <span style={styles.separator}> — </span>
                <span style={styles.enWord}>{word.en}</span>
                {word.phonetic && <span style={styles.phonetic}>({word.phonetic})</span>}
              </div>
              <div style={styles.wordActions}>
                {ttsEnabled && (
                  <button
                    style={styles.iconBtn}
                    onClick={() => onSpeak(word[langCode] || word.uk, 0.8, ttsVolume)}
                    title="Pronounce"
                  >
                    🔊
                  </button>
                )}
                <button style={styles.iconBtn} onClick={() => handleEdit(i)} title="Edit">✏️</button>
                <button style={styles.iconBtn} onClick={() => handleDelete(i)} title="Delete">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {customWords.length === 0 && !showForm && (
        <p style={styles.emptyText}>No custom words yet. Click "Add Word" to create your own flashcards!</p>
      )}
    </div>
  );
}

const styles = {
  container: {
    marginTop: '1.5rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '16px',
    padding: '1.5rem'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  heading: {
    color: '#ffd700',
    margin: 0,
    fontSize: '1.2rem'
  },
  addBtn: {
    background: 'linear-gradient(135deg, #51cf66, #37b24d)',
    border: 'none',
    color: '#fff',
    padding: '0.5rem 1.25rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    fontFamily: 'inherit'
  },
  form: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem',
    border: '1px solid rgba(255,215,0,0.2)'
  },
  formRow: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '0.75rem',
    flexWrap: 'wrap'
  },
  input: {
    flex: 1,
    minWidth: '150px',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '1rem',
    fontFamily: 'inherit',
    outline: 'none'
  },
  formActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '0.5rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '0.9rem',
    fontFamily: 'inherit'
  },
  cancelBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.5rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontFamily: 'inherit'
  },
  wordList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  wordItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    transition: 'background 0.2s'
  },
  wordInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  ukWord: {
    color: '#ffd700',
    fontWeight: '600',
    fontSize: '1.05rem'
  },
  separator: {
    color: 'rgba(255,255,255,0.4)'
  },
  enWord: {
    color: '#fff'
  },
  phonetic: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.9rem'
  },
  wordActions: {
    display: 'flex',
    gap: '0.25rem'
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    transition: 'background 0.2s'
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    padding: '1rem',
    fontSize: '0.95rem'
  }
};

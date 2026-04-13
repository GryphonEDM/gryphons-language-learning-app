import React, { useState, useMemo } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import { buildDictionary, getAllVocabularyWords } from '../../utils/dictionaryBuilder.js';

export default function MasteredWordsManager({ langCode = 'uk', masteredWordsList = [], onMarkMastered, onUnmarkMastered, onSpeak, ttsEnabled, ttsVolume, onExit }) {
  const langName = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' }[langCode] || 'Ukrainian';
  const dict = buildDictionary(langCode);
  const allWords = useMemo(() => getAllVocabularyWords(langCode), [langCode]);

  const [search, setSearch] = useState('');
  const [addSearch, setAddSearch] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Build lookup for mastered words with their translations
  const masteredSet = useMemo(() => new Set(masteredWordsList.map(m => m.word)), [masteredWordsList]);

  const masteredWithInfo = useMemo(() => {
    return masteredWordsList.map(m => {
      const dictEntry = dict.targetToEn?.[m.word] || dict.targetToEn?.[m.word.toLowerCase()];
      const vocabEntry = allWords.find(w => (w[langCode] || w.uk) === m.word);
      return {
        word: m.word,
        timestamp: m.timestamp,
        translation: dictEntry || vocabEntry?.en || '',
        difficulty: vocabEntry?.difficulty || '',
      };
    });
  }, [masteredWordsList, dict, allWords]);

  const filtered = useMemo(() => {
    if (!search) return masteredWithInfo;
    const q = search.toLowerCase();
    return masteredWithInfo.filter(m =>
      m.word.toLowerCase().includes(q) || m.translation.toLowerCase().includes(q)
    );
  }, [masteredWithInfo, search]);

  // Words available to add (not already mastered)
  const addResults = useMemo(() => {
    if (!addSearch || addSearch.length < 2) return [];
    const q = addSearch.toLowerCase();
    return allWords
      .filter(w => !masteredSet.has(w[langCode] || w.uk) && ((w[langCode] || w.uk || '').toLowerCase().includes(q) || w.en.toLowerCase().includes(q)))
      .slice(0, 20);
  }, [addSearch, allWords, masteredSet]);

  return (
    <div style={styles.container}>
      <ModeHeader
        title="Mastered Words"
        subtitle={`${masteredWordsList.length} word${masteredWordsList.length !== 1 ? 's' : ''} mastered`}
        icon="⭐"
        onExit={onExit}
      />

      <div style={styles.content}>
        {/* Search + Add controls */}
        <div style={styles.controls}>
          <input
            style={styles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search mastered words..."
          />
          <button
            style={{ ...styles.addToggle, ...(showAddPanel ? styles.addToggleActive : {}) }}
            onClick={() => { setShowAddPanel(!showAddPanel); setAddSearch(''); }}
          >
            {showAddPanel ? '- Close' : '+ Add Word'}
          </button>
        </div>

        {/* Add word panel */}
        {showAddPanel && (
          <div style={styles.addPanel}>
            <input
              style={styles.searchInput}
              value={addSearch}
              onChange={e => setAddSearch(e.target.value)}
              placeholder="Search dictionary to add words..."
              autoFocus
            />
            {addResults.length > 0 && (
              <div style={styles.addResults}>
                {addResults.map(w => (
                  <div key={w[langCode] || w.uk} style={styles.addResultItem}>
                    <div style={styles.addResultInfo}>
                      <span style={styles.wordText}>{w[langCode] || w.uk}</span>
                      <span style={styles.separator}> — </span>
                      <span style={styles.translationText}>{w.en}</span>
                      {w.difficulty && <span style={{ ...styles.diffBadge, color: { A1: '#4caf50', A2: '#ffeb3b', B1: '#ff9800', B2: '#f44336' }[w.difficulty] || '#aaa' }}>{w.difficulty}</span>}
                    </div>
                    <button
                      style={styles.addWordBtn}
                      onClick={() => { onMarkMastered(w[langCode] || w.uk); }}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}
            {addSearch.length >= 2 && addResults.length === 0 && (
              <div style={styles.noResults}>No matching words found</div>
            )}
          </div>
        )}

        {/* Mastered words list */}
        {filtered.length === 0 ? (
          <div style={styles.emptyState}>
            {masteredWordsList.length === 0
              ? 'No mastered words yet. Mark words as mastered in flashcards or by clicking words in any lesson.'
              : 'No words match your search.'}
          </div>
        ) : (
          <div style={styles.wordList}>
            {filtered.map(m => (
              <div key={m.word} style={styles.wordItem}>
                <div style={styles.wordInfo}>
                  <span style={styles.wordText}>{m.word}</span>
                  {m.translation && (
                    <>
                      <span style={styles.separator}> — </span>
                      <span style={styles.translationText}>{m.translation}</span>
                    </>
                  )}
                  {m.difficulty && <span style={{ ...styles.diffBadge, color: { A1: '#4caf50', A2: '#ffeb3b', B1: '#ff9800', B2: '#f44336' }[m.difficulty] || '#aaa' }}>{m.difficulty}</span>}
                </div>
                <div style={styles.wordActions}>
                  {ttsEnabled && onSpeak && (
                    <button style={styles.iconBtn} onClick={() => onSpeak(m.word, 0.8, ttsVolume)} title="Listen">
                      🔊
                    </button>
                  )}
                  <button style={{ ...styles.iconBtn, ...styles.removeBtn }} onClick={() => onUnmarkMastered(m.word)} title="Remove from mastered">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#fff',
  },
  content: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '1rem',
  },
  controls: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  searchInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    padding: '0.6rem 0.8rem',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  addToggle: {
    background: 'rgba(76,175,80,0.15)',
    border: '1px solid rgba(76,175,80,0.3)',
    borderRadius: '8px',
    color: '#4caf50',
    padding: '0.6rem 1rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  addToggleActive: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.6)',
  },
  addPanel: {
    background: 'rgba(76,175,80,0.06)',
    border: '1px solid rgba(76,175,80,0.2)',
    borderRadius: '10px',
    padding: '0.75rem',
    marginBottom: '1rem',
  },
  addResults: {
    marginTop: '0.5rem',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  addResultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0.4rem',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  addResultInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    flex: 1,
    flexWrap: 'wrap',
  },
  addWordBtn: {
    background: 'rgba(76,175,80,0.2)',
    border: '1px solid rgba(76,175,80,0.4)',
    borderRadius: '6px',
    color: '#4caf50',
    padding: '0.3rem 0.7rem',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontFamily: 'inherit',
    fontWeight: '600',
    marginLeft: '0.5rem',
    whiteSpace: 'nowrap',
  },
  noResults: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    padding: '1rem',
    fontSize: '0.9rem',
  },
  emptyState: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    padding: '3rem 1rem',
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  wordList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  wordItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 0.75rem',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '8px',
    transition: 'background 0.15s',
  },
  wordInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    flex: 1,
    flexWrap: 'wrap',
  },
  wordText: {
    fontWeight: '600',
    color: '#ffd700',
    fontSize: '1rem',
  },
  separator: {
    color: 'rgba(255,255,255,0.3)',
  },
  translationText: {
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
  diffBadge: {
    fontSize: '0.7rem',
    fontWeight: '700',
    marginLeft: '0.4rem',
    opacity: 0.7,
  },
  wordActions: {
    display: 'flex',
    gap: '0.3rem',
    marginLeft: '0.5rem',
  },
  iconBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    padding: '0.35rem 0.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  removeBtn: {
    color: '#f44336',
    background: 'rgba(244,67,54,0.1)',
  },
};

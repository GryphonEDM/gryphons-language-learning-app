import React, { useState, useMemo, useCallback } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import { buildDictionary, getAllVocabularyWords } from '../../utils/dictionaryBuilder.js';
import { getStruggleWords, getConfusionPairs, categorizeStruggle, computeStruggleScore } from '../../utils/struggleEngine.js';

const ERROR_TYPE_COLORS = {
  spelling: '#f59e0b',
  listening: '#8b5cf6',
  confusion: '#ef4444',
  meaning: '#3b82f6',
  grammar: '#10b981',
  unknown: '#6b7280',
};

const ERROR_TYPE_LABELS = {
  spelling: 'Spelling',
  listening: 'Listening',
  confusion: 'Confusion',
  meaning: 'Meaning',
  grammar: 'Grammar',
  unknown: 'Other',
};

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function StruggleWordsMode({
  langCode = 'uk', vocabularyMastery = {}, onSpeak, ttsEnabled, ttsVolume,
  onExit, onStartDrill, onAddXP, onTrackProgress,
}) {
  const langName = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' }[langCode] || 'Ukrainian';
  const dict = useMemo(() => buildDictionary(langCode), [langCode]);
  const allWords = useMemo(() => getAllVocabularyWords(langCode), [langCode]);

  const [tab, setTab] = useState('words'); // 'words' | 'pairs'
  const [filter, setFilter] = useState('all'); // 'all' | error type
  const [expandedWord, setExpandedWord] = useState(null);
  const [search, setSearch] = useState('');

  const struggles = useMemo(() => getStruggleWords(vocabularyMastery), [vocabularyMastery]);
  const confusionPairs = useMemo(() => getConfusionPairs(vocabularyMastery), [vocabularyMastery]);

  const lookupTranslation = useCallback((word) => {
    const entry = dict[word] || dict[word?.toLowerCase()];
    if (entry?.en) return entry.en;
    const vocabEntry = allWords.find(w => (w[langCode] || w.uk) === word);
    return vocabEntry?.en || '';
  }, [dict, allWords, langCode]);

  const filtered = useMemo(() => {
    let list = struggles;
    if (filter !== 'all') {
      list = list.filter(s => s.categories.includes(filter));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.word.toLowerCase().includes(q) || lookupTranslation(s.word).toLowerCase().includes(q)
      );
    }
    return list;
  }, [struggles, filter, search, lookupTranslation]);

  const handleSpeak = useCallback((word) => {
    if (ttsEnabled && onSpeak) onSpeak(word, 0.8, ttsVolume);
  }, [ttsEnabled, onSpeak, ttsVolume]);

  const scoreColor = (score) => {
    if (score >= 0.7) return '#ef4444';
    if (score >= 0.4) return '#f59e0b';
    return '#eab308';
  };

  // Count by category for filter badges
  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const s of struggles) {
      for (const cat of s.categories) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    return counts;
  }, [struggles]);

  const renderScoreBar = (score) => (
    <div style={styles.scoreBarOuter}>
      <div style={{ ...styles.scoreBarInner, width: `${Math.round(score * 100)}%`, background: scoreColor(score) }} />
      <span style={styles.scoreText}>{Math.round(score * 100)}</span>
    </div>
  );

  const renderErrorTags = (categories) => (
    <div style={styles.tags}>
      {categories.map(cat => (
        <span key={cat} style={{ ...styles.tag, background: ERROR_TYPE_COLORS[cat] || '#6b7280' }}>
          {ERROR_TYPE_LABELS[cat] || cat}
        </span>
      ))}
    </div>
  );

  const renderWordDetail = (s) => {
    const errors = s.recentErrors || [];
    const errorTypeCounts = {};
    for (const e of errors) {
      errorTypeCounts[e.type] = (errorTypeCounts[e.type] || 0) + 1;
    }
    const modeCounts = {};
    for (const e of errors) {
      modeCounts[e.mode] = (modeCounts[e.mode] || 0) + 1;
    }

    return (
      <div style={styles.detail}>
        <div style={styles.detailSection}>
          <div style={styles.detailLabel}>Error Timeline (last {errors.length})</div>
          <div style={styles.timeline}>
            {errors.map((e, i) => (
              <div key={i} title={`${e.type} in ${e.mode} — ${timeAgo(e.ts)}\n${e.userAnswer ? `You typed: "${e.userAnswer}"` : ''}`}
                style={{ ...styles.timelineDot, background: ERROR_TYPE_COLORS[e.type] || '#6b7280' }} />
            ))}
          </div>
        </div>

        <div style={styles.detailSection}>
          <div style={styles.detailLabel}>Error Breakdown</div>
          <div style={styles.breakdownRow}>
            {Object.entries(errorTypeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={styles.breakdownItem}>
                <span style={{ ...styles.breakdownDot, background: ERROR_TYPE_COLORS[type] }} />
                {ERROR_TYPE_LABELS[type]}: {count}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.detailSection}>
          <div style={styles.detailLabel}>Modes Where You Struggle</div>
          <div style={styles.breakdownRow}>
            {Object.entries(modeCounts).sort((a, b) => b[1] - a[1]).map(([mode, count]) => (
              <div key={mode} style={styles.breakdownItem}>
                {mode}: {count} errors
              </div>
            ))}
          </div>
        </div>

        {s.confusionPairs.length > 0 && (
          <div style={styles.detailSection}>
            <div style={styles.detailLabel}>Confused With</div>
            <div style={styles.breakdownRow}>
              {s.confusionPairs.map(pair => (
                <span key={pair} style={styles.confusionChip} onClick={() => handleSpeak(pair)}>
                  {pair} ({lookupTranslation(pair) || '?'})
                </span>
              ))}
            </div>
          </div>
        )}

        {errors.length > 0 && errors[errors.length - 1].userAnswer && (
          <div style={styles.detailSection}>
            <div style={styles.detailLabel}>Last Error</div>
            <div style={{ color: '#f87171', fontSize: '0.9rem' }}>
              You typed: "{errors[errors.length - 1].userAnswer}" — Expected: "{errors[errors.length - 1].expected}"
            </div>
          </div>
        )}

        <div style={styles.detailActions}>
          <button style={styles.drillBtn} onClick={() => onStartDrill && onStartDrill([s.word])}>
            Drill This Word
          </button>
        </div>
      </div>
    );
  };

  // --- Empty state ---
  if (struggles.length === 0) {
    return (
      <div style={styles.container}>
        <ModeHeader title="Struggle Words" subtitle="Your personalized weak spots" icon="🎯" onExit={onExit} />
        <div style={styles.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>No Struggle Words!</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 400, lineHeight: 1.6 }}>
            As you practice across different modes, words you struggle with will automatically appear here
            with targeted drills to help you improve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <ModeHeader title="Struggle Words" subtitle={`${struggles.length} words need attention`} icon="🎯" onExit={onExit} />

      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryItem}>
          <div style={styles.summaryValue}>{struggles.length}</div>
          <div style={styles.summaryLabel}>Struggle Words</div>
        </div>
        <div style={styles.summaryItem}>
          <div style={styles.summaryValue}>{confusionPairs.length}</div>
          <div style={styles.summaryLabel}>Confusion Pairs</div>
        </div>
        <div style={styles.summaryItem}>
          <div style={styles.summaryValue}>{struggles.filter(s => s.score >= 0.7).length}</div>
          <div style={styles.summaryLabel}>High Priority</div>
        </div>
      </div>

      {/* Practice All button */}
      <button style={styles.practiceAllBtn} onClick={() => onStartDrill && onStartDrill()}>
        Practice All Struggle Words
      </button>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={{ ...styles.tabBtn, ...(tab === 'words' ? styles.tabActive : {}) }} onClick={() => setTab('words')}>
          Words ({struggles.length})
        </button>
        <button style={{ ...styles.tabBtn, ...(tab === 'pairs' ? styles.tabActive : {}) }} onClick={() => setTab('pairs')}>
          Confusion Pairs ({confusionPairs.length})
        </button>
      </div>

      {tab === 'words' && (
        <>
          {/* Search + Filters */}
          <div style={styles.filterRow}>
            <input
              style={styles.searchInput}
              placeholder="Search words..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={styles.filterChips}>
              <button style={{ ...styles.filterChip, ...(filter === 'all' ? styles.filterActive : {}) }} onClick={() => setFilter('all')}>
                All
              </button>
              {Object.keys(categoryCounts).map(cat => (
                <button key={cat} style={{ ...styles.filterChip, ...(filter === cat ? styles.filterActive : {}), borderColor: ERROR_TYPE_COLORS[cat] }} onClick={() => setFilter(cat)}>
                  {ERROR_TYPE_LABELS[cat]} ({categoryCounts[cat]})
                </button>
              ))}
            </div>
          </div>

          {/* Word list */}
          <div style={styles.wordList}>
            {filtered.map(s => (
              <div key={s.word} style={styles.wordCard}>
                <div style={styles.wordRow} onClick={() => setExpandedWord(expandedWord === s.word ? null : s.word)}>
                  <button style={styles.speakBtn} onClick={e => { e.stopPropagation(); handleSpeak(s.word); }}>
                    🔊
                  </button>
                  <div style={styles.wordInfo}>
                    <div style={styles.wordText}>{s.word}</div>
                    <div style={styles.wordTranslation}>{lookupTranslation(s.word)}</div>
                  </div>
                  {renderScoreBar(s.score)}
                  {renderErrorTags(s.categories)}
                  {s.confusionPairs.length > 0 && (
                    <span style={styles.pairBadge} title={`Confused with: ${s.confusionPairs.join(', ')}`}>
                      ⇄ {s.confusionPairs.length}
                    </span>
                  )}
                  <span style={styles.timeText}>
                    {s.recentErrors?.length > 0 ? timeAgo(s.recentErrors[s.recentErrors.length - 1].ts) : ''}
                  </span>
                  <span style={styles.expandIcon}>{expandedWord === s.word ? '▾' : '▸'}</span>
                </div>
                {expandedWord === s.word && renderWordDetail(s)}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'pairs' && (
        <div style={styles.pairList}>
          {confusionPairs.length === 0 ? (
            <div style={styles.emptyPairs}>No confusion pairs detected yet. Keep practicing!</div>
          ) : (
            confusionPairs.map(({ wordA, wordB, count }) => (
              <div key={`${wordA}|${wordB}`} style={styles.pairCard}>
                <div style={styles.pairWords}>
                  <div style={styles.pairWord} onClick={() => handleSpeak(wordA)}>
                    <div style={styles.pairWordText}>{wordA}</div>
                    <div style={styles.pairWordTranslation}>{lookupTranslation(wordA)}</div>
                  </div>
                  <div style={styles.pairVs}>⇄</div>
                  <div style={styles.pairWord} onClick={() => handleSpeak(wordB)}>
                    <div style={styles.pairWordText}>{wordB}</div>
                    <div style={styles.pairWordTranslation}>{lookupTranslation(wordB)}</div>
                  </div>
                </div>
                <div style={styles.pairMeta}>
                  <span style={{ color: '#f87171' }}>Confused {count}x</span>
                  <button style={styles.drillPairBtn} onClick={() => onStartDrill && onStartDrill([wordA, wordB])}>
                    Drill Pair
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
  },
  summary: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
  },
  summaryItem: {
    flex: 1,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: '1rem',
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '0.25rem',
  },
  practiceAllBtn: {
    width: '100%',
    padding: '0.9rem',
    background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  tabBtn: {
    flex: 1,
    padding: '0.6rem',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  tabActive: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  filterRow: {
    marginBottom: '1rem',
  },
  searchInput: {
    width: '100%',
    padding: '0.6rem 1rem',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#fff',
    fontSize: '0.9rem',
    marginBottom: '0.5rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  filterChips: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  filterChip: {
    padding: '0.3rem 0.7rem',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 20,
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  filterActive: {
    background: 'rgba(255,255,255,0.18)',
    color: '#fff',
  },
  wordList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  wordCard: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  wordRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.7rem 0.8rem',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  speakBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    padding: '0.2rem',
    flexShrink: 0,
  },
  wordInfo: {
    flex: 1,
    minWidth: 0,
  },
  wordText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: '1rem',
  },
  wordTranslation: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  scoreBarOuter: {
    width: 60,
    height: 6,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    position: 'relative',
    flexShrink: 0,
  },
  scoreBarInner: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s',
  },
  scoreText: {
    position: 'absolute',
    right: -28,
    top: -5,
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.5)',
    width: 24,
    textAlign: 'right',
  },
  tags: {
    display: 'flex',
    gap: '0.25rem',
    flexShrink: 0,
  },
  tag: {
    padding: '0.15rem 0.45rem',
    borderRadius: 4,
    fontSize: '0.65rem',
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  pairBadge: {
    background: 'rgba(239,68,68,0.2)',
    color: '#f87171',
    padding: '0.15rem 0.4rem',
    borderRadius: 4,
    fontSize: '0.7rem',
    flexShrink: 0,
  },
  timeText: {
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.35)',
    flexShrink: 0,
    minWidth: 40,
    textAlign: 'right',
  },
  expandIcon: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.8rem',
    flexShrink: 0,
  },
  detail: {
    padding: '0 0.8rem 0.8rem',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  detailSection: {
    marginTop: '0.6rem',
  },
  detailLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.3rem',
  },
  timeline: {
    display: 'flex',
    gap: '0.3rem',
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    cursor: 'help',
  },
  breakdownRow: {
    display: 'flex',
    gap: '0.6rem',
    flexWrap: 'wrap',
  },
  breakdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.85rem',
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
  },
  confusionChip: {
    background: 'rgba(239,68,68,0.15)',
    color: '#fca5a5',
    padding: '0.2rem 0.5rem',
    borderRadius: 6,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  detailActions: {
    marginTop: '0.8rem',
    display: 'flex',
    gap: '0.5rem',
  },
  drillBtn: {
    padding: '0.5rem 1.2rem',
    background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  pairList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  emptyPairs: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    padding: '2rem',
  },
  pairCard: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: '1rem',
  },
  pairWords: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    justifyContent: 'center',
  },
  pairWord: {
    flex: 1,
    textAlign: 'center',
    cursor: 'pointer',
    padding: '0.6rem',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  pairWordText: {
    color: '#fff',
    fontSize: '1.2rem',
    fontWeight: '700',
  },
  pairWordTranslation: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
    marginTop: '0.2rem',
  },
  pairVs: {
    color: '#f87171',
    fontSize: '1.3rem',
    fontWeight: '700',
    flexShrink: 0,
  },
  pairMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.8rem',
    fontSize: '0.85rem',
  },
  drillPairBtn: {
    padding: '0.4rem 1rem',
    background: 'rgba(239,68,68,0.2)',
    color: '#fca5a5',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8,
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

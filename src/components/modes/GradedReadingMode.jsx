import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import { computeKnownWords, gradeText, highlightText } from '../../utils/readingLevel.js';
import { WordToolbar } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';

/**
 * Graded Reading Mode
 *
 * Research: Extensive reading at 98% known-word density produces gains
 * across ALL language domains: comprehension, vocabulary, fluency,
 * motivation, writing, oral proficiency. Unknown words are highlighted
 * and clickable for instant definition — naturally adding them to SRS.
 */
export default function GradedReadingMode({
  langCode = 'uk', vocabularyMastery = {}, onSpeak, ttsEnabled, ttsVolume,
  onExit, onAddXP, onTrackProgress, onMarkMastered, masteredWordsList = []
}) {
  const langNames = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' };
  const langName = langNames[langCode] || 'Ukrainian';

  const [phase, setPhase] = useState('library');
  const [passages, setPassages] = useState([]);
  const [currentPassage, setCurrentPassage] = useState(null);
  const [readingStart, setReadingStart] = useState(null);
  const [wordsRead, setWordsRead] = useState(0);
  const [newWordsClicked, setNewWordsClicked] = useState(new Set());

  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });

  const knownWords = useMemo(() => computeKnownWords(vocabularyMastery), [vocabularyMastery]);

  // Load reading passages
  useEffect(() => {
    const load = async () => {
      const allPassages = [];

      // Load from stories
      try {
        const stories = [
          await import('../../data/stories/very-beginner.json'),
          await import('../../data/stories/beginner.json'),
          await import('../../data/stories/early-intermediate.json'),
        ];
        for (const storyModule of stories) {
          const data = storyModule.default;
          const storyList = data.stories || data;
          if (Array.isArray(storyList)) {
            for (const story of storyList) {
              const text = story.passage || story.text || story[langCode] || story.uk;
              if (text && typeof text === 'string') {
                allPassages.push({
                  title: story.title || 'Story',
                  text,
                  source: 'story',
                  difficulty: story.difficulty || 'A2',
                });
              }
            }
          }
        }
      } catch {}

      // Load from reading data if available
      try {
        const readingFiles = ['very-beginner', 'beginner', 'early-intermediate'];
        for (const level of readingFiles) {
          try {
            const data = (await import(`../../data/reading/${level}.json`)).default;
            const passages = data.passages || data;
            if (Array.isArray(passages)) {
              for (const p of passages) {
                const text = p.text || p[langCode] || p.uk;
                if (text) allPassages.push({ title: p.title || level, text, source: 'reading', difficulty: p.difficulty || 'A2' });
              }
            }
          } catch {}
        }
      } catch {}

      // Grade each passage
      const graded = allPassages.map(p => ({
        ...p,
        ...gradeText(p.text, knownWords),
      }));

      // Sort by coverage (most readable first)
      graded.sort((a, b) => b.coveragePercent - a.coveragePercent);
      setPassages(graded);
    };
    load();
  }, [langCode, knownWords]);

  const startReading = useCallback((passage) => {
    setCurrentPassage(passage);
    setReadingStart(Date.now());
    setNewWordsClicked(new Set());
    setPhase('reading');
  }, []);

  const finishReading = useCallback(() => {
    if (readingStart) {
      const readingTimeMs = Date.now() - readingStart;
      const readingTimeSec = Math.round(readingTimeMs / 1000);

      // Track each new word that was clicked
      for (const word of newWordsClicked) {
        if (onTrackProgress) {
          onTrackProgress('graded-reading', {
            word,
            correct: true, // Encountering in context counts as exposure
          });
        }
      }

      const xp = Math.min(50, Math.round(currentPassage.totalWords / 5) + newWordsClicked.size * 3);
      if (onAddXP) onAddXP(xp);
      setWordsRead(prev => prev + (currentPassage?.totalWords || 0));
    }
    setPhase('library');
    setCurrentPassage(null);
  }, [readingStart, newWordsClicked, currentPassage, onTrackProgress, onAddXP]);

  const handleUnknownWordClick = useCallback((word) => {
    handleWordClick(word);
    setNewWordsClicked(prev => new Set([...prev, word]));
    if (ttsEnabled && onSpeak) onSpeak(word, 0.8, ttsVolume);
  }, [handleWordClick, ttsEnabled, onSpeak, ttsVolume]);

  const knownCount = knownWords.size;
  const readablePassages = passages.filter(p => p.coveragePercent >= 90);

  // --- Library Phase ---
  if (phase === 'library') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Graded Reading" subtitle={`${knownCount} words known — ${readablePassages.length} readable passages`} icon="📖" onExit={onExit} />

        <div style={styles.statsRow}>
          <div style={styles.statBadge}>📚 {knownCount} words known</div>
          <div style={styles.statBadge}>📄 {readablePassages.length} / {passages.length} readable</div>
          {wordsRead > 0 && <div style={styles.statBadge}>👁️ {wordsRead} words read</div>}
        </div>

        {passages.length === 0 ? (
          <div style={styles.card}>
            <p style={styles.instruction}>No reading passages found. Learn more vocabulary and check back!</p>
            <button style={styles.actionBtn} onClick={onExit}>Back to Menu</button>
          </div>
        ) : (
          <div style={styles.passageList}>
            {passages.map((p, i) => (
              <div
                key={i}
                style={{
                  ...styles.passageCard,
                  borderColor: p.coveragePercent >= 98 ? 'rgba(74,222,128,0.4)' :
                    p.coveragePercent >= 90 ? 'rgba(251,191,36,0.4)' : 'rgba(248,113,113,0.2)',
                  opacity: p.coveragePercent < 80 ? 0.5 : 1,
                }}
                onClick={() => p.coveragePercent >= 80 && startReading(p)}
              >
                <div style={styles.passageHeader}>
                  <div style={styles.passageTitle}>{p.title}</div>
                  <div style={{
                    ...styles.coverageBadge,
                    color: p.coveragePercent >= 98 ? '#4ade80' : p.coveragePercent >= 90 ? '#fbbf24' : '#f87171',
                  }}>
                    {p.coveragePercent}%
                  </div>
                </div>
                <div style={styles.passageMeta}>
                  {p.totalWords} words · {p.unknownWords.length} unknown · {p.difficulty}
                </div>
                {p.coveragePercent >= 98 && <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>Ready to read</div>}
                {p.coveragePercent >= 90 && p.coveragePercent < 98 && <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>Challenging but possible</div>}
                {p.coveragePercent < 80 && <div style={{ fontSize: '0.75rem', color: '#f87171' }}>Too difficult — learn more vocab first</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Reading Phase ---
  const highlighted = highlightText(currentPassage.text, knownWords);

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader
        title={currentPassage.title}
        subtitle={`${currentPassage.coveragePercent}% coverage · ${currentPassage.totalWords} words`}
        icon="📖"
        onExit={finishReading}
      />

      <div style={styles.readingCard}>
        {ttsEnabled && onSpeak && (
          <button style={styles.readAloudBtn} onClick={() => onSpeak(currentPassage.text, 0.85, ttsVolume)}>
            🔊 Read Aloud
          </button>
        )}

        <div style={styles.readingText}>
          {highlighted.map((token, i) => {
            if (/^\s+$/.test(token.original)) return <span key={i}>{token.original}</span>;
            if (token.known) {
              return <span key={i} style={styles.knownWord}>{token.original}</span>;
            }
            return (
              <span
                key={i}
                style={styles.unknownWord}
                onClick={() => handleUnknownWordClick(token.word)}
              >
                {token.original}
              </span>
            );
          })}
        </div>

        {newWordsClicked.size > 0 && (
          <div style={styles.newWordsSection}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
              Words looked up this session: {newWordsClicked.size}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[...newWordsClicked].map(w => (
                <span key={w} style={styles.lookedUpWord}>{w}</span>
              ))}
            </div>
          </div>
        )}

        <button style={styles.finishBtn} onClick={finishReading}>
          Done Reading
        </button>
      </div>

      <WordToolbar selectedWord={selectedWord} onDismiss={dismissWord} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} langName={langName} langCode={langCode} onMarkMastered={onMarkMastered} isMastered={masteredWordsList.some(m => m.word === selectedWord?.word)} />
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' },
  statsRow: { display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' },
  statBadge: { background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', color: '#ffd700' },
  card: { maxWidth: '600px', margin: '0 auto', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '2rem', textAlign: 'center', border: '1px solid rgba(255,215,0,0.2)' },
  instruction: { fontSize: '1rem', color: 'rgba(255,255,255,0.6)' },
  actionBtn: { background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none', color: '#1a1a2e', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '1rem' },
  passageList: { maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  passageCard: { background: 'rgba(0,0,0,0.3)', border: '1px solid', borderRadius: '12px', padding: '1rem', cursor: 'pointer', transition: 'all 0.2s' },
  passageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' },
  passageTitle: { fontSize: '1rem', fontWeight: '600' },
  coverageBadge: { fontSize: '1rem', fontWeight: '700' },
  passageMeta: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' },
  readingCard: { maxWidth: '700px', margin: '0 auto', background: 'rgba(0,0,0,0.2)', borderRadius: '20px', padding: '2rem', border: '1px solid rgba(255,215,0,0.1)' },
  readAloudBtn: { background: 'rgba(77,171,247,0.2)', border: '1px solid rgba(77,171,247,0.4)', color: '#4dabf7', padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: '1.5rem', display: 'block', margin: '0 auto 1.5rem' },
  readingText: { fontSize: '1.2rem', lineHeight: 1.8, textAlign: 'left' },
  knownWord: { color: 'rgba(255,255,255,0.85)' },
  unknownWord: { color: '#ffd700', textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'pointer', fontWeight: '600' },
  newWordsSection: { marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,215,0,0.05)', borderRadius: '10px' },
  lookedUpWord: { background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.85rem', color: '#ffd700' },
  finishBtn: { background: 'linear-gradient(135deg, #51cf66, #37b24d)', border: 'none', color: '#fff', padding: '0.75rem 2rem', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '2rem', display: 'block', margin: '2rem auto 0' },
};

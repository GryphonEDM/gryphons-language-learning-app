import React, { useState, useCallback, useEffect, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { getAllVocabularyWords } from '../../utils/dictionaryBuilder.js';
import { computeSentenceDiff } from '../../utils/sentenceDiff.js';
import useNextShortcut from '../../hooks/useNextShortcut.js';

/**
 * Bidirectional Translation Mode (Lampariello's Method)
 *
 * Research: Polyglot Luca Lampariello's core method — translate L2→L1,
 * then back L1→L2 from your own translation, then compare with original.
 * Tests whether your L1 intermediate representation preserves enough
 * meaning to reconstruct the L2.
 */
export default function BidirectionalTranslationMode({
  langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress
}) {
  const langNames = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' };
  const langName = langNames[langCode] || 'Ukrainian';

  const [phase, setPhase] = useState('loading');
  const [items, setItems] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [step, setStep] = useState(1); // 1: L2→L1, 2: L1→L2, 3: Compare
  const [userL1, setUserL1] = useState('');
  const [userL2, setUserL2] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const inputRef = useRef(null);

  // Load sentence data with both L2 and L1
  useEffect(() => {
    const load = async () => {
      try {
        let data;
        if (langCode === 'uk') {
          data = (await import('../../data/sentences.json')).default;
        } else {
          data = (await import(`../../data/${langCode}/sentences.json`)).default;
        }
        const sentences = (data.sentences || []).filter(s => s[langCode] || s.uk).map(s => ({
          l2: s[langCode] || s.uk,
          l1: s.en,
          difficulty: s.difficulty || 'A2',
        }));

        // Also add vocabulary examples
        const allWords = getAllVocabularyWords(langCode);
        const targetField = langCode === 'en' ? 'en' : langCode;
        for (const w of allWords) {
          if (w.examples && w.examples.length > 0 && w.examplesEn && w.examplesEn.length > 0) {
            sentences.push({
              l2: w.examples[0],
              l1: w.examplesEn[0],
              difficulty: w.difficulty || 'A2',
            });
          }
        }

        const shuffled = sentences.sort(() => Math.random() - 0.5).slice(0, 8);
        setItems(shuffled);
        setPhase(shuffled.length > 0 ? 'playing' : 'nodata');
      } catch {
        setItems([]);
        setPhase('nodata');
      }
    };
    load();
  }, [langCode]);

  const currentItem = items[currentIdx];

  useEffect(() => {
    setUserL1('');
    setUserL2('');
    setDiffResult(null);
    setStep(1);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentIdx]);

  // Auto-speak L2 sentence on step 1
  useEffect(() => {
    if (phase === 'playing' && step === 1 && currentItem && ttsEnabled && onSpeak) {
      setTimeout(() => onSpeak(currentItem.l2, 0.9, ttsVolume), 300);
    }
  }, [currentIdx, step, phase]);

  const handleStep1Submit = useCallback(() => {
    if (!userL1.trim()) return;
    setStep(2);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [userL1]);

  const handleStep2Submit = useCallback(() => {
    if (!userL2.trim() || !currentItem) return;

    const result = computeSentenceDiff(currentItem.l2, userL2.trim());
    setDiffResult(result);
    setStep(3);

    const points = result.accuracy >= 90 ? 25 : result.accuracy >= 60 ? 15 : 5;
    const isCorrect = result.accuracy >= 70;
    if (isCorrect) setScore(prev => prev + 1);
    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);

    if (onTrackProgress) {
      // Track the hardest word in the sentence
      const incorrectWords = result.diff.filter(d => d.type !== 'correct');
      const trackedWord = incorrectWords[0]?.expected || incorrectWords[0]?.word || currentItem.l2.split(' ')[0];
      onTrackProgress('bidirectional', {
        word: trackedWord,
        correct: isCorrect,
        userAnswer: userL2.trim(),
        expected: currentItem.l2,
      });
    }
  }, [userL2, currentItem, onAddXP, onTrackProgress]);

  const handleNext = useCallback(() => {
    if (step !== 3) return;
    if (currentIdx < items.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setPhase('complete');
      if (onComplete) onComplete({ mode: 'bidirectional', score, total: items.length, xpEarned });
    }
  }, [step, currentIdx, items.length, score, xpEarned, onComplete]);

  useNextShortcut(handleNext, step === 3);

  const diffColors = { correct: '#4ade80', wrong: '#f87171', missing: '#fbbf24', extra: '#f87171' };

  if (phase === 'loading') return <div className="mode-container" style={styles.container}><ModeHeader title="Bidirectional Translation" icon="🔄" onExit={onExit} /><div style={styles.card}><p>Loading...</p></div></div>;
  if (phase === 'nodata') return <div className="mode-container" style={styles.container}><ModeHeader title="Bidirectional Translation" icon="🔄" onExit={onExit} /><div style={styles.card}><p>Not enough sentence data for {langName} yet.</p><button style={styles.actionBtn} onClick={onExit}>Back</button></div></div>;
  if (phase === 'complete') {
    const accuracy = items.length > 0 ? Math.round((score / items.length) * 100) : 0;
    return <div className="mode-container" style={styles.container}><CompletionScreen stats={{ title: 'Bidirectional Translation Complete!', score, total: items.length, xpEarned, accuracy }} onRetry={() => { setCurrentIdx(0); setScore(0); setXpEarned(0); setStep(1); setPhase('playing'); }} onExit={onExit} /></div>;
  }

  const progress = ((currentIdx + 1) / items.length) * 100;

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader title="Bidirectional Translation" subtitle={`Sentence ${currentIdx + 1} of ${items.length}`} icon="🔄" onExit={onExit} />
      <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: `${progress}%` }} /></div>

      <div style={styles.card}>
        {/* Step indicator */}
        <div style={styles.stepRow}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ ...styles.stepDot, background: s <= step ? '#ffd700' : 'rgba(255,255,255,0.15)' }}>
              {s === 1 ? `${langName}→EN` : s === 2 ? `EN→${langName}` : 'Compare'}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <p style={styles.instruction}>Translate to English:</p>
            <div style={styles.sentenceDisplay}>{currentItem.l2}</div>
            {ttsEnabled && onSpeak && <button style={styles.ttsBtn} onClick={() => onSpeak(currentItem.l2, 0.9, ttsVolume)}>🔊 Listen</button>}
            <input ref={inputRef} style={styles.input} value={userL1} onChange={e => setUserL1(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleStep1Submit(); }} placeholder="Type English translation..." autoFocus />
            <button style={styles.submitBtn} onClick={handleStep1Submit}>Next Step →</button>
          </>
        )}

        {step === 2 && (
          <>
            <p style={styles.instruction}>Now translate YOUR English back to {langName}:</p>
            <div style={styles.sentenceDisplay}>{userL1}</div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>Your English translation from Step 1</p>
            <input ref={inputRef} style={styles.input} value={userL2} onChange={e => setUserL2(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleStep2Submit(); }} placeholder={`Type ${langName} translation...`} autoFocus />
            <button style={styles.submitBtn} onClick={handleStep2Submit}>Compare →</button>
          </>
        )}

        {step === 3 && diffResult && (
          <>
            <p style={styles.instruction}>Comparison: your version vs original</p>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>Original:</div>
              <div style={styles.sentenceDisplay}>{currentItem.l2}</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>Your version:</div>
              <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {diffResult.diff.map((d, i) => (
                  <span key={i} style={{
                    color: diffColors[d.type] || '#fff',
                    fontWeight: '700', fontSize: '1.2rem',
                    textDecoration: d.type === 'extra' ? 'line-through' : 'none',
                  }}>
                    {d.word}
                    {d.type === 'wrong' && d.expected && <span style={{ fontSize: '0.7rem', color: '#fbbf24', display: 'block' }}>({d.expected})</span>}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: '0.95rem', color: diffResult.accuracy >= 70 ? '#4ade80' : '#f87171', fontWeight: '700', marginBottom: '0.5rem' }}>
              {diffResult.accuracy}% match ({diffResult.correct}/{diffResult.total} words)
            </div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
              Reference English: {currentItem.l1}
            </div>
            <button style={styles.nextBtn} onClick={handleNext}>{currentIdx < items.length - 1 ? 'Next Sentence →' : 'Finish'}</button>
          </>
        )}
      </div>
      <div style={styles.scoreBar}><span>Score: {score}/{currentIdx + (step === 3 ? 1 : 0)}</span><span>XP: +{xpEarned}</span></div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' },
  progressBar: { width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden', maxWidth: '600px', margin: '0 auto 2rem' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #ffd700, #ffed4e)', transition: 'width 0.3s ease' },
  card: { maxWidth: '600px', margin: '0 auto', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '2rem', textAlign: 'center', border: '1px solid rgba(255,215,0,0.2)' },
  stepRow: { display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' },
  stepDot: { padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', color: '#1a1a2e' },
  instruction: { fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' },
  sentenceDisplay: { fontSize: '1.5rem', fontWeight: '700', color: '#ffd700', marginBottom: '1rem', lineHeight: 1.3 },
  ttsBtn: { background: 'rgba(77,171,247,0.2)', border: '1px solid rgba(77,171,247,0.4)', color: '#4dabf7', padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: '1rem' },
  input: { width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1.1rem', fontFamily: 'inherit', outline: 'none', textAlign: 'center', boxSizing: 'border-box', marginBottom: '1rem' },
  submitBtn: { background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none', color: '#1a1a2e', padding: '0.75rem 2rem', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  nextBtn: { background: 'linear-gradient(135deg, #51cf66, #37b24d)', border: 'none', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  actionBtn: { background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none', color: '#1a1a2e', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '1rem' },
  scoreBar: { display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', maxWidth: '600px', margin: '1.5rem auto 0', fontSize: '1rem', color: '#ffd700', fontWeight: '600' },
};

import React, { useState, useCallback, useEffect, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { getAllVocabularyWords } from '../../utils/dictionaryBuilder.js';

/**
 * Shadowing Mode
 *
 * Research: Shadowing (Alexander Arguelles) involves simultaneously repeating
 * audio as you hear it. Significantly improves intonation, fluency, word
 * pronunciation, and overall pronunciation. Combines auditory, visual, and
 * kinesthetic modalities. Develops "language reflexes" — automatized processing.
 *
 * Flow: Play sentence → user repeats simultaneously → STT captures → score
 * Progressive: phrases → sentences → passages
 */
export default function ShadowingMode({
  langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress
}) {
  const langNames = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' };
  const langName = langNames[langCode] || 'Ukrainian';

  const [phase, setPhase] = useState('picker');
  const [difficulty, setDifficulty] = useState('phrases');
  const [items, setItems] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selfRating, setSelfRating] = useState(null); // null, 'good', 'ok', 'hard'
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const startSession = useCallback(async (diff) => {
    setDifficulty(diff);
    const targetField = langCode === 'en' ? 'en' : langCode;

    let source = [];
    if (diff === 'phrases') {
      // Short phrases from vocabulary examples
      const allWords = getAllVocabularyWords(langCode);
      for (const w of allWords) {
        if (w.examples && w.examples[0]) {
          const text = w.examples[0];
          const wordCount = text.split(/\s+/).length;
          if (wordCount >= 2 && wordCount <= 4) {
            source.push({ text, en: w.examplesEn?.[0] || w.en || '' });
          }
        }
      }
      // Also add common phrases
      source.push(
        ...[
          { text: langCode === 'uk' ? 'Добрий ранок' : 'Good morning', en: 'Good morning' },
          { text: langCode === 'uk' ? 'Як справи?' : 'How are you?', en: 'How are you?' },
          { text: langCode === 'uk' ? 'Дуже дякую' : 'Thank you very much', en: 'Thank you very much' },
          { text: langCode === 'uk' ? 'Будь ласка' : 'Please', en: 'Please' },
          { text: langCode === 'uk' ? 'До побачення' : 'Goodbye', en: 'Goodbye' },
        ]
      );
    } else {
      // Full sentences
      try {
        let data;
        if (langCode === 'uk') {
          data = (await import('../../data/sentences.json')).default;
        } else {
          data = (await import(`../../data/${langCode}/sentences.json`)).default;
        }
        source = (data.sentences || []).map(s => ({ text: s[langCode] || s.uk, en: s.en }));
      } catch {}

      // Add longer vocabulary examples
      const allWords = getAllVocabularyWords(langCode);
      for (const w of allWords) {
        if (w.examples && w.examples[0]) {
          const wordCount = w.examples[0].split(/\s+/).length;
          if (diff === 'sentences' ? wordCount >= 3 : wordCount >= 5) {
            source.push({ text: w.examples[0], en: w.examplesEn?.[0] || '' });
          }
        }
      }
    }

    const shuffled = source.filter(s => s.text).sort(() => Math.random() - 0.5).slice(0, 10);
    setItems(shuffled);
    setCurrentIdx(0);
    setScore(0);
    setXpEarned(0);
    setSelfRating(null);
    setPhase(shuffled.length > 0 ? 'playing' : 'nodata');
  }, [langCode]);

  const currentItem = items[currentIdx];

  const handlePlay = useCallback(() => {
    if (!currentItem || !ttsEnabled || !onSpeak) return;
    setIsPlaying(true);
    onSpeak(currentItem.text, 0.85, ttsVolume);
    // Estimate playback duration and reset
    const wordCount = currentItem.text.split(/\s+/).length;
    const estimatedMs = Math.max(2000, wordCount * 500);
    setTimeout(() => { if (mountedRef.current) setIsPlaying(false); }, estimatedMs);
  }, [currentItem, ttsEnabled, onSpeak, ttsVolume]);

  // Auto-play on new item
  useEffect(() => {
    if (phase === 'playing' && currentItem) {
      const timer = setTimeout(() => { if (mountedRef.current) handlePlay(); }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentIdx, phase]);

  const handleRate = useCallback((rating) => {
    setSelfRating(rating);
    const points = rating === 'good' ? 15 : rating === 'ok' ? 8 : 3;
    if (rating === 'good' || rating === 'ok') setScore(prev => prev + 1);
    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);

    if (onTrackProgress && currentItem) {
      onTrackProgress('shadowing', {
        word: currentItem.text.split(/\s+/)[0] || currentItem.text,
        correct: rating === 'good' || rating === 'ok',
      });
    }
  }, [onAddXP, onTrackProgress, currentItem]);

  const handleNext = useCallback(() => {
    if (!selfRating) return;
    if (currentIdx < items.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelfRating(null);
      setIsPlaying(false);
    } else {
      setPhase('complete');
      if (onComplete) onComplete({ mode: 'shadowing', score, total: items.length, xpEarned });
    }
  }, [selfRating, currentIdx, items.length, score, xpEarned, onComplete]);

  if (phase === 'picker') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Shadowing" subtitle="Listen and repeat simultaneously" icon="🪞" onExit={onExit} />
        <div style={styles.pickerTitle}>Choose difficulty</div>
        <div style={styles.pickerGrid}>
          <div style={styles.pickerCard} onClick={() => startSession('phrases')}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Phrases</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>2-4 word phrases</div>
          </div>
          <div style={styles.pickerCard} onClick={() => startSession('sentences')}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Sentences</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Full sentences</div>
          </div>
          <div style={styles.pickerCard} onClick={() => startSession('passages')}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📖</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Passages</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Longer text</div>
          </div>
        </div>
        <div style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          <strong style={{ color: '#ffd700' }}>How to shadow:</strong> Press play, then <strong>repeat along with the audio simultaneously</strong> — not after. Try to match the rhythm, speed, and intonation. Use headphones for best results.
        </div>
      </div>
    );
  }

  if (phase === 'nodata') return <div className="mode-container" style={styles.container}><ModeHeader title="Shadowing" icon="🪞" onExit={onExit} /><div style={styles.card}><p>Not enough content for shadowing yet.</p><button style={styles.actionBtn} onClick={() => setPhase('picker')}>Back</button></div></div>;
  if (phase === 'complete') return <div className="mode-container" style={styles.container}><CompletionScreen stats={{ title: 'Shadowing Complete!', score, total: items.length, xpEarned, accuracy: items.length > 0 ? Math.round((score / items.length) * 100) : 0 }} onRetry={() => startSession(difficulty)} onExit={() => setPhase('picker')} exitLabel="Back to Levels" /></div>;

  const progress = ((currentIdx + 1) / items.length) * 100;

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader title="Shadowing" subtitle={`${difficulty === 'phrases' ? 'Phrase' : 'Sentence'} ${currentIdx + 1} of ${items.length}`} icon="🪞" onExit={() => setPhase('picker')} />
      <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: `${progress}%` }} /></div>

      <div style={styles.card}>
        <p style={styles.instruction}>Listen and repeat <strong>simultaneously</strong></p>

        <div style={styles.sentenceText}>{currentItem.text}</div>
        {currentItem.en && <div style={styles.translationSmall}>{currentItem.en}</div>}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <button style={{ ...styles.playBtn, opacity: isPlaying ? 0.6 : 1 }} onClick={handlePlay} disabled={isPlaying}>
            {isPlaying ? '🔊 Playing...' : '🔊 Play & Shadow'}
          </button>
          <button style={{ ...styles.playBtn, background: 'linear-gradient(135deg, #ff922b, #e8590c)' }} onClick={() => ttsEnabled && onSpeak && onSpeak(currentItem.text, 0.6, ttsVolume)}>
            🐢 Slow
          </button>
        </div>

        {!selfRating ? (
          <>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>How did your shadowing go?</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button style={{ ...styles.rateBtn, borderColor: '#4ade80' }} onClick={() => handleRate('good')}>
                <span style={{ display: 'block', fontSize: '1.3rem' }}>😊</span>Kept up well
              </button>
              <button style={{ ...styles.rateBtn, borderColor: '#fbbf24' }} onClick={() => handleRate('ok')}>
                <span style={{ display: 'block', fontSize: '1.3rem' }}>😐</span>Mostly ok
              </button>
              <button style={{ ...styles.rateBtn, borderColor: '#f87171' }} onClick={() => handleRate('hard')}>
                <span style={{ display: 'block', fontSize: '1.3rem' }}>😓</span>Struggled
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: selfRating === 'good' ? '#4ade80' : selfRating === 'ok' ? '#fbbf24' : '#f87171', marginBottom: '1rem' }}>
              {selfRating === 'good' ? 'Great shadowing!' : selfRating === 'ok' ? 'Keep practicing!' : 'Try playing it slower next time'}
            </div>
            <button style={styles.nextBtn} onClick={handleNext}>{currentIdx < items.length - 1 ? 'Next →' : 'Finish'}</button>
          </div>
        )}
      </div>
      <div style={styles.scoreBar}><span>Score: {score}/{currentIdx + (selfRating ? 1 : 0)}</span><span>XP: +{xpEarned}</span></div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' },
  progressBar: { width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden', maxWidth: '600px', margin: '0 auto 2rem' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #ffd700, #ffed4e)', transition: 'width 0.3s ease' },
  card: { maxWidth: '600px', margin: '0 auto', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '2rem', textAlign: 'center', border: '1px solid rgba(255,215,0,0.2)' },
  instruction: { fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' },
  sentenceText: { fontSize: '1.6rem', fontWeight: '700', color: '#ffd700', marginBottom: '0.5rem', lineHeight: 1.3 },
  translationSmall: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' },
  playBtn: { background: 'linear-gradient(135deg, #4dabf7, #339af0)', border: 'none', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  rateBtn: { background: 'rgba(255,255,255,0.05)', border: '2px solid', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '12px', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', minWidth: '110px' },
  nextBtn: { background: 'linear-gradient(135deg, #51cf66, #37b24d)', border: 'none', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  actionBtn: { background: 'linear-gradient(135deg, #ffd700, #e6c200)', border: 'none', color: '#1a1a2e', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '1rem' },
  scoreBar: { display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', maxWidth: '600px', margin: '1.5rem auto 0', fontSize: '1rem', color: '#ffd700', fontWeight: '600' },
  pickerTitle: { textAlign: 'center', fontSize: '1.3rem', fontWeight: '600', color: '#ffd700', marginTop: '1.5rem', marginBottom: '1.5rem' },
  pickerGrid: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' },
  pickerCard: { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', minWidth: '160px' },
};

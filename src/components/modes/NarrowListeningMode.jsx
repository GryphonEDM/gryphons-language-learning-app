import React, { useState, useCallback, useEffect, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';

/**
 * Narrow Listening Mode
 *
 * Research: Listening to multiple speakers discussing the same topic provides
 * natural vocabulary recycling in varied acoustic contexts. The redundancy
 * across passages provides natural spaced repetition while the speaker
 * variability forces generalization of phonetic categories.
 */
export default function NarrowListeningMode({
  langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress
}) {
  const langNames = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' };
  const langName = langNames[langCode] || 'Ukrainian';

  const [phase, setPhase] = useState('picker');
  const [currentTopic, setCurrentTopic] = useState(null);
  const [passageIdx, setPassageIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [questionAnswer, setQuestionAnswer] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Topic data — same topic narrated from different perspectives/speeds
  const topics = [
    {
      id: 'restaurant',
      title: 'At the Restaurant',
      icon: '🍽️',
      passages: [
        { text: langCode === 'uk' ? 'Я хочу замовити каву з молоком. Скільки це коштує? Також дайте мені меню, будь ласка.' : 'I want to order coffee with milk. How much is it? Also give me the menu, please.', speed: 0.8, voice: 'slow', en: 'I want to order coffee with milk. How much is it? Also give me the menu, please.' },
        { text: langCode === 'uk' ? 'У цьому ресторані дуже смачна їжа. Офіціант порадив мені замовити борщ. Я також взяв каву.' : 'This restaurant has very tasty food. The waiter recommended I order borscht. I also got coffee.', speed: 1.0, voice: 'normal', en: 'This restaurant has very tasty food. The waiter recommended I order borscht. I also got coffee.' },
        { text: langCode === 'uk' ? 'Ми прийшли в ресторан на вечерю. Замовили борщ і каву. Рахунок був недорогий.' : 'We came to the restaurant for dinner. We ordered borscht and coffee. The bill was not expensive.', speed: 1.1, voice: 'fast', en: 'We came to the restaurant for dinner. We ordered borscht and coffee. The bill was not expensive.' },
      ],
      questions: [
        { q: langCode === 'uk' ? 'Що замовили в ресторані?' : 'What was ordered at the restaurant?', options: [langCode === 'uk' ? 'Каву і борщ' : 'Coffee and borscht', langCode === 'uk' ? 'Чай і торт' : 'Tea and cake', langCode === 'uk' ? 'Воду і салат' : 'Water and salad'], correct: 0 },
        { q: langCode === 'uk' ? 'Хто порадив замовити борщ?' : 'Who recommended ordering borscht?', options: [langCode === 'uk' ? 'Друг' : 'A friend', langCode === 'uk' ? 'Офіціант' : 'The waiter', langCode === 'uk' ? 'Кухар' : 'The chef'], correct: 1 },
      ],
      keyVocabulary: langCode === 'uk' ? ['ресторан', 'замовити', 'каву', 'борщ', 'рахунок', 'офіціант'] : ['restaurant', 'order', 'coffee', 'borscht', 'bill', 'waiter'],
    },
    {
      id: 'weather',
      title: 'Weather Today',
      icon: '🌤️',
      passages: [
        { text: langCode === 'uk' ? 'Сьогодні гарна погода. Сонце світить яскраво. Температура двадцять градусів.' : 'Today the weather is nice. The sun is shining brightly. The temperature is twenty degrees.', speed: 0.8, voice: 'slow', en: 'Today the weather is nice. The sun is shining brightly. The temperature is twenty degrees.' },
        { text: langCode === 'uk' ? 'Погода сьогодні чудова, тепло і сонячно. Вчора був дощ, але сьогодні небо чисте.' : 'The weather today is wonderful, warm and sunny. Yesterday it rained, but today the sky is clear.', speed: 1.0, voice: 'normal', en: 'The weather today is wonderful, warm and sunny. Yesterday it rained, but today the sky is clear.' },
        { text: langCode === 'uk' ? 'Яка гарна погода! Треба йти на прогулянку. Сонце і тепло — ідеальний день.' : 'What nice weather! We should go for a walk. Sun and warmth — a perfect day.', speed: 1.1, voice: 'fast', en: 'What nice weather! We should go for a walk. Sun and warmth — a perfect day.' },
      ],
      questions: [
        { q: langCode === 'uk' ? 'Яка погода сьогодні?' : 'What is the weather like today?', options: [langCode === 'uk' ? 'Дощ' : 'Rain', langCode === 'uk' ? 'Сонячно і тепло' : 'Sunny and warm', langCode === 'uk' ? 'Сніг' : 'Snow'], correct: 1 },
        { q: langCode === 'uk' ? 'Яка була погода вчора?' : 'What was the weather like yesterday?', options: [langCode === 'uk' ? 'Сонячно' : 'Sunny', langCode === 'uk' ? 'Дощ' : 'Rain', langCode === 'uk' ? 'Вітер' : 'Wind'], correct: 1 },
      ],
      keyVocabulary: langCode === 'uk' ? ['погода', 'сонце', 'тепло', 'дощ', 'температура', 'прогулянка'] : ['weather', 'sun', 'warm', 'rain', 'temperature', 'walk'],
    },
  ];

  const handleStartTopic = useCallback((topic) => {
    setCurrentTopic(topic);
    setPassageIdx(0);
    setScore(0);
    setXpEarned(0);
    setQuestionAnswer(null);
    setRevealed(false);
    setPhase('listening');
  }, []);

  const playPassage = useCallback(() => {
    if (!currentTopic || !ttsEnabled || !onSpeak) return;
    const passage = currentTopic.passages[passageIdx];
    if (passage) onSpeak(passage.text, passage.speed, ttsVolume);
  }, [currentTopic, passageIdx, ttsEnabled, onSpeak, ttsVolume]);

  // Auto-play passage
  useEffect(() => {
    if (phase === 'listening' && currentTopic) {
      const timer = setTimeout(() => { if (mountedRef.current) playPassage(); }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, passageIdx]);

  const handleMoveToQuestion = useCallback(() => {
    setPhase('question');
    setQuestionAnswer(null);
    setRevealed(false);
  }, []);

  const handleAnswerQuestion = useCallback((answerIdx) => {
    if (revealed || !currentTopic) return;
    const qIdx = Math.min(passageIdx, currentTopic.questions.length - 1);
    const question = currentTopic.questions[qIdx];
    const isCorrect = answerIdx === question.correct;

    setQuestionAnswer(answerIdx);
    setRevealed(true);
    const points = isCorrect ? 10 : 2;
    if (isCorrect) setScore(prev => prev + 1);
    setXpEarned(prev => prev + points);
    if (onAddXP) onAddXP(points);
  }, [revealed, currentTopic, passageIdx, onAddXP]);

  const handleNextPassage = useCallback(() => {
    if (!currentTopic) return;
    if (passageIdx < currentTopic.passages.length - 1) {
      setPassageIdx(prev => prev + 1);
      setPhase('listening');
      setQuestionAnswer(null);
      setRevealed(false);
    } else {
      // Show vocab recap
      setPhase('recap');
    }
  }, [currentTopic, passageIdx]);

  const handleFinish = useCallback(() => {
    setPhase('complete');
    if (onComplete) onComplete({ mode: 'narrow-listening', score, total: currentTopic?.questions?.length || 0, xpEarned });
  }, [score, xpEarned, currentTopic, onComplete]);

  if (phase === 'picker') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Narrow Listening" subtitle="Same topic, multiple perspectives" icon="🔁" onExit={onExit} />
        <div style={styles.pickerTitle}>Choose a topic</div>
        <div style={styles.pickerGrid}>
          {topics.map(t => (
            <div key={t.id} style={styles.pickerCard} onClick={() => handleStartTopic(t)}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{t.icon}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{t.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{t.passages.length} passages</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return <div className="mode-container" style={styles.container}><CompletionScreen stats={{ title: 'Narrow Listening Complete!', score, total: currentTopic?.questions?.length || 0, xpEarned, accuracy: 0 }} onRetry={() => handleStartTopic(currentTopic)} onExit={() => setPhase('picker')} exitLabel="Back to Topics" /></div>;
  }

  const passage = currentTopic?.passages?.[passageIdx];
  const qIdx = Math.min(passageIdx, (currentTopic?.questions?.length || 1) - 1);
  const question = currentTopic?.questions?.[qIdx];

  return (
    <div className="mode-container" style={styles.container}>
      <ModeHeader title="Narrow Listening" subtitle={`${currentTopic?.title} — Passage ${passageIdx + 1} of ${currentTopic?.passages?.length}`} icon="🔁" onExit={() => setPhase('picker')} />

      <div style={styles.card}>
        {phase === 'listening' && passage && (
          <>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
              Speaker {passageIdx + 1} — {passage.voice === 'slow' ? '🐢 Slow' : passage.voice === 'normal' ? '🚶 Normal' : '🏃 Fast'} ({passage.speed}x)
            </div>
            <p style={styles.instruction}>Listen carefully to this passage</p>
            <button style={styles.playBtn} onClick={playPassage}>🔊 Play Passage</button>
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
              {passage.en}
            </div>
            <button style={styles.nextBtn} onClick={handleMoveToQuestion}>I'm Ready — Check Understanding →</button>
          </>
        )}

        {phase === 'question' && question && (
          <>
            <p style={styles.instruction}>{question.q}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {question.options.map((opt, i) => {
                let bg = 'rgba(255,255,255,0.08)';
                let border = 'rgba(255,255,255,0.15)';
                if (revealed) {
                  if (i === question.correct) { bg = 'rgba(74,222,128,0.15)'; border = '#4ade80'; }
                  else if (i === questionAnswer) { bg = 'rgba(248,113,113,0.15)'; border = '#f87171'; }
                }
                return (
                  <button key={i} style={{ ...styles.optionBtn, background: bg, borderColor: border }} onClick={() => handleAnswerQuestion(i)} disabled={revealed}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <button style={styles.nextBtn} onClick={handleNextPassage}>
                {passageIdx < currentTopic.passages.length - 1 ? 'Next Passage →' : 'See Vocabulary →'}
              </button>
            )}
          </>
        )}

        {phase === 'recap' && (
          <>
            <p style={styles.instruction}>Key vocabulary from this topic:</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.5rem' }}>
              {(currentTopic?.keyVocabulary || []).map((word, i) => (
                <span key={i} style={styles.vocabChip} onClick={() => ttsEnabled && onSpeak && onSpeak(word, 0.8, ttsVolume)}>
                  🔊 {word}
                </span>
              ))}
            </div>
            <button style={styles.nextBtn} onClick={handleFinish}>Finish</button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' },
  card: { maxWidth: '600px', margin: '0 auto', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '2rem', textAlign: 'center', border: '1px solid rgba(255,215,0,0.2)' },
  instruction: { fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' },
  playBtn: { background: 'linear-gradient(135deg, #4dabf7, #339af0)', border: 'none', color: '#fff', padding: '1rem 2.5rem', borderRadius: '16px', fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '1rem' },
  nextBtn: { background: 'linear-gradient(135deg, #51cf66, #37b24d)', border: 'none', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '1rem' },
  optionBtn: { background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s' },
  vocabChip: { background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '1rem', color: '#ffd700', cursor: 'pointer' },
  pickerTitle: { textAlign: 'center', fontSize: '1.3rem', fontWeight: '600', color: '#ffd700', marginTop: '1.5rem', marginBottom: '1.5rem' },
  pickerGrid: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' },
  pickerCard: { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', minWidth: '180px' },
};

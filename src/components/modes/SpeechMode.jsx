import React, { useState, useCallback, useEffect } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import CompletionScreen from '../shared/CompletionScreen.jsx';
import { WordToolbar, ClickableText } from '../shared/WordToolbar.jsx';
import { useWordClick } from '../../hooks/useWordClick.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';
import useSpeechPractice from '../../hooks/useSpeechPractice.js';
import SpeechPracticeWidget from '../shared/SpeechPracticeWidget.jsx';
import { getAllVocabularyWords } from '../../utils/dictionaryBuilder.js';
import { speakUkrainian, stopSpeaking } from '../../App.jsx';
import { cefrMatches } from '../../utils/speechUtils.js';
import useNextShortcut from '../../hooks/useNextShortcut.js';

// --- Helpers ---

function buildItems(langCode, difficulty, vocabularyWords = null, cefrFilter = null) {
  let all = vocabularyWords || getAllVocabularyWords(langCode);

  // Apply CEFR filter if set
  if (cefrFilter && cefrFilter !== 'all') {
    all = all.filter(w => cefrMatches(w.difficulty || '', cefrFilter));
    // If filtering leaves too few words, fall back to all
    if (all.length < 5) {
      all = vocabularyWords || getAllVocabularyWords(langCode);
    }
  }

  const targetField = langCode; // matches the word field name ('uk', 'ru', or 'de') — all also have .uk as alias

  if (difficulty === 'words') {
    const singles = all.filter(w => w[targetField] && !w[targetField].includes(' '));
    const shuffled = [...singles].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10).map(w => ({
      target: w[targetField],
      english: w.en || '',
      phonetic: w.phonetic || '',
    }));
  }

  if (difficulty === 'phrases') {
    const phrases = all.filter(w => {
      const wc = (w[targetField] || '').split(' ').length;
      return wc >= 2 && wc <= 4;
    });
    const examplePhrases = [];
    all.forEach(w => {
      if (w.examples && w.examplesEn) {
        w.examples.forEach((ex, i) => {
          const wc = (ex || '').split(' ').length;
          if (wc >= 2 && wc <= 4 && w.examplesEn[i]) {
            examplePhrases.push({ target: ex, english: w.examplesEn[i], phonetic: '' });
          }
        });
      }
    });
    const fromVocab = phrases.map(w => ({ target: w[targetField], english: w.en || '', phonetic: w.phonetic || '' }));
    const combined = [...fromVocab, ...examplePhrases];
    const shuffled = [...combined].sort(() => Math.random() - 0.5);
    if (shuffled.length >= 10) return shuffled.slice(0, 10);
    const singles = all.filter(w => w[targetField] && !w[targetField].includes(' '))
      .sort(() => Math.random() - 0.5)
      .slice(0, 10 - shuffled.length)
      .map(w => ({ target: w[targetField], english: w.en || '', phonetic: w.phonetic || '' }));
    return [...shuffled, ...singles].slice(0, 10);
  }

  // sentences
  const sentences = [];
  all.forEach(w => {
    if (w.examples && w.examplesEn) {
      w.examples.forEach((ex, i) => {
        if ((ex || '').split(' ').length >= 5 && w.examplesEn[i]) {
          sentences.push({ target: ex, english: w.examplesEn[i], phonetic: '' });
        }
      });
    }
  });
  const shuffled = [...sentences].sort(() => Math.random() - 0.5);
  if (shuffled.length >= 8) return shuffled.slice(0, 8);
  const long = all.filter(w => (w[targetField] || '').split(' ').length >= 3)
    .sort(() => Math.random() - 0.5)
    .slice(0, 8 - shuffled.length)
    .map(w => ({ target: w[targetField], english: w.en || '', phonetic: w.phonetic || '' }));
  return [...shuffled, ...long].slice(0, 8);
}

const DIFFICULTY_MULTIPLIER = { words: 1, phrases: 1.5, sentences: 2 };
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2'];

// --- Component ---

export default function SpeechMode({ langCode = 'uk', vocabularySets = [], onSpeak, ttsEnabled, ttsVolume, onExit, onComplete, onAddXP, onTrackProgress, onMarkMastered, masteredWordsList = [] }) {
  const langName = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' }[langCode] || 'Ukrainian';

  // Phase
  const [phase, setPhase] = useState('picker'); // picker, playing, complete
  const [pickerStep, setPickerStep] = useState('category'); // category, cefr, format
  const [selectedCategory, setSelectedCategory] = useState(null); // null = all words
  const [cefrFilter, setCefrFilter] = useState('all');
  const [difficulty, setDifficulty] = useState(null);
  const [items, setItems] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Scoring
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [similarityScores, setSimilarityScores] = useState([]);

  // TTS
  const [playbackRate, setPlaybackRate] = useState(1);
  const [tipsSpeaking, setTipsSpeaking] = useState(false);

  // Shared hooks
  const { selectedWord, handleWordClick, dismissWord } = useWordClick({ langCode, onSpeak, ttsEnabled, ttsVolume });
  const chat = useLessonChat({
    langName, langCode,
    systemPrompt: `You are a helpful ${langName} pronunciation coach. The student is practicing speaking ${langName} words and phrases aloud. Answer questions about pronunciation, stress patterns, or specific sounds concisely. Keep responses under 150 words.`,
    onSpeak, ttsEnabled, ttsVolume,
  });

  const onResult = useCallback((result) => {
    setTotalAttempts(p => p + 1);
    setAttempts(p => p + 1);
    setSimilarityScores(p => [...p, result.similarity]);

    const mult = DIFFICULTY_MULTIPLIER[difficulty] || 1;
    let xp = 0;
    if (result.match === 'correct') {
      xp = Math.round((attempts === 0 ? 25 : 15) * mult);
      setScore(p => p + 1);
      setStreak(p => {
        const ns = p + 1;
        setBestStreak(b => Math.max(b, ns));
        if (ns % 3 === 0 && onAddXP) onAddXP(Math.round(10 * mult));
        return ns;
      });
    } else {
      xp = Math.round((result.match === 'close' ? 10 : 5) * mult);
      setStreak(0);
    }
    setXpEarned(p => p + xp);
    if (onAddXP) onAddXP(xp);
  }, [difficulty, attempts, onAddXP]);

  const speech = useSpeechPractice({ langCode, langName, onResult });

  const currentItem = items[currentIdx] || null;

  // Update speech target when current item changes
  useEffect(() => {
    if (currentItem) {
      speech.setTarget(currentItem.target);
    }
  }, [currentItem, speech.setTarget]);

  const handlePlay = useCallback(() => {
    if (ttsEnabled && onSpeak && currentItem) {
      onSpeak(currentItem.target, playbackRate, ttsVolume);
    }
  }, [ttsEnabled, onSpeak, currentItem, playbackRate, ttsVolume]);

  const handleRetry = useCallback(() => {
    speech.retry();
  }, [speech]);

  const handleNext = useCallback(() => {
    if (onTrackProgress && currentItem) {
      onTrackProgress('speech', {
        word: currentItem.target,
        correct: speech.feedback?.match === 'correct',
      });
    }

    if (currentIdx < items.length - 1) {
      setCurrentIdx(p => p + 1);
      speech.reset();
      setAttempts(0);
    } else {
      setPhase('complete');
      if (onComplete) {
        onComplete({
          mode: 'speech',
          score,
          total: items.length,
          xpEarned,
          difficulty,
        });
      }
    }
  }, [currentIdx, items, speech, currentItem, score, xpEarned, difficulty, onComplete, onTrackProgress]);

  useNextShortcut(handleNext, !!speech.feedback);

  // Get vocabulary words for the selected category
  const getSelectedVocabWords = useCallback(() => {
    if (!selectedCategory) {
      // "All Words" mode: if CEFR filter is active, build from vocabulary sets to get difficulty info
      if (cefrFilter && cefrFilter !== 'all' && vocabularySets.length > 0) {
        const words = [];
        const seen = new Set();
        vocabularySets.forEach(set => {
          if (!cefrMatches(set.difficulty || '', cefrFilter)) return;
          (set.words || []).forEach(w => {
            const key = (w[langCode] || w.uk || '').toLowerCase();
            if (key && !seen.has(key)) {
              seen.add(key);
              words.push({
                [langCode]: w[langCode] || w.uk,
                uk: w.uk,
                en: w.en,
                phonetic: w.phonetic || '',
                source: w.source || set.setId,
                difficulty: set.difficulty || '',
                examples: w.examples || [],
                examplesEn: w.examplesEn || [],
              });
            }
          });
        });
        return words.length >= 5 ? words : null; // fall back to all if too few
      }
      return null; // null means use all words
    }
    // Specific category selected
    return (selectedCategory.words || []).map(w => ({
      [langCode]: w[langCode] || w.uk,
      uk: w.uk,
      en: w.en,
      phonetic: w.phonetic || '',
      source: w.source || selectedCategory.setId,
      difficulty: selectedCategory.difficulty || '',
      examples: w.examples || [],
      examplesEn: w.examplesEn || [],
    }));
  }, [selectedCategory, cefrFilter, vocabularySets]);

  const handleStartDifficulty = useCallback((diff) => {
    setDifficulty(diff);
    const vocabWords = getSelectedVocabWords();
    setItems(buildItems(langCode, diff, vocabWords, cefrFilter));
    setCurrentIdx(0);
    setScore(0);
    setXpEarned(0);
    setStreak(0);
    setBestStreak(0);
    setAttempts(0);
    setTotalAttempts(0);
    setSimilarityScores([]);
    speech.reset();
    setPhase('playing');
  }, [langCode, cefrFilter, getSelectedVocabWords, speech]);

  const handleSessionRetry = useCallback(() => {
    if (difficulty) handleStartDifficulty(difficulty);
  }, [difficulty, handleStartDifficulty]);

  const handleSelectCategory = useCallback((cat) => {
    setSelectedCategory(cat);
    // If the category has a clear single CEFR level, skip the CEFR step
    const diff = cat ? cat.difficulty : 'Mixed';
    const hasMixedLevels = !diff || diff === 'Mixed' || diff.includes('-');
    if (hasMixedLevels) {
      setCefrFilter('all');
      setPickerStep('cefr');
    } else {
      setCefrFilter('all');
      setPickerStep('format');
    }
  }, []);

  const handleSelectAllWords = useCallback(() => {
    setSelectedCategory(null);
    setCefrFilter('all');
    setPickerStep('cefr');
  }, []);

  const handleSelectCefr = useCallback((level) => {
    setCefrFilter(level);
    setPickerStep('format');
  }, []);

  const handleBackToPicker = useCallback(() => {
    if (pickerStep === 'format') {
      const diff = selectedCategory ? selectedCategory.difficulty : 'Mixed';
      const hasMixedLevels = !diff || diff === 'Mixed' || diff.includes('-');
      setPickerStep(hasMixedLevels ? 'cefr' : 'category');
    } else if (pickerStep === 'cefr') {
      setPickerStep('category');
    }
  }, [pickerStep, selectedCategory]);

  // --- Picker Phase ---
  if (phase === 'picker') {
    return (
      <div className="mode-container" style={styles.container}>
        <ModeHeader title="Speech Practice" subtitle="Practice your pronunciation" icon="🎙️" onExit={onExit} />

        {pickerStep === 'category' && (
          <>
            <div style={styles.pickerSectionTitle}>Choose a word category</div>
            <div style={styles.categoryGrid}>
              {/* All Words option */}
              <div
                style={{ ...styles.categoryCard, border: '2px solid #ffd700' }}
                onClick={handleSelectAllWords}
              >
                <div style={styles.categoryIcon}>🎲</div>
                <div style={styles.categoryName}>All Words</div>
                <div style={styles.categoryMeta}>Random from all categories</div>
              </div>

              {/* Vocabulary sets */}
              {vocabularySets.map(set => (
                <div
                  key={set.setId}
                  style={styles.categoryCard}
                  onClick={() => handleSelectCategory(set)}
                >
                  <div style={styles.categoryIcon}>{set.icon}</div>
                  <div style={styles.categoryName}>{set.nameEn}</div>
                  <div style={styles.categoryMeta}>
                    <span style={styles.categoryDifficulty}>{set.difficulty}</span>
                    {' · '}
                    <span>{set.totalWords || set.words?.length || 0} words</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={styles.pickerHint}>
              Speak into your microphone — if the speech recognition understands you, your pronunciation is on track!
            </div>
          </>
        )}

        {pickerStep === 'cefr' && (
          <>
            <button style={styles.backStepBtn} onClick={handleBackToPicker}>
              ← Back to categories
            </button>
            <div style={styles.pickerSectionTitle}>
              Filter by difficulty level
              {selectedCategory && <span style={styles.pickerCategoryBadge}>{selectedCategory.icon} {selectedCategory.nameEn}</span>}
            </div>
            <div style={styles.cefrGrid}>
              <div
                style={{ ...styles.cefrCard, ...(cefrFilter === 'all' ? styles.cefrCardActive : {}) }}
                onClick={() => handleSelectCefr('all')}
              >
                <div style={styles.cefrLevel}>All Levels</div>
                <div style={styles.cefrDesc}>Include all difficulty levels</div>
              </div>
              {CEFR_LEVELS.map(level => (
                <div
                  key={level}
                  style={{ ...styles.cefrCard, ...(cefrFilter === level ? styles.cefrCardActive : {}) }}
                  onClick={() => handleSelectCefr(level)}
                >
                  <div style={styles.cefrLevel}>{level}</div>
                  <div style={styles.cefrDesc}>
                    {level === 'A1' ? 'Beginner' : level === 'A2' ? 'Elementary' : level === 'B1' ? 'Intermediate' : 'Upper Intermediate'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {pickerStep === 'format' && (
          <>
            <button style={styles.backStepBtn} onClick={handleBackToPicker}>
              ← Back
            </button>
            <div style={styles.pickerSectionTitle}>
              Choose practice format
              {selectedCategory && <span style={styles.pickerCategoryBadge}>{selectedCategory.icon} {selectedCategory.nameEn}</span>}
              {cefrFilter !== 'all' && <span style={styles.pickerCefrBadge}>{cefrFilter}</span>}
            </div>
            <div style={styles.pickerGrid}>
              {[
                { key: 'words', icon: '🔤', title: 'Words', desc: 'Start with individual words', count: '10 words' },
                { key: 'phrases', icon: '💬', title: 'Phrases', desc: 'Common 2-4 word phrases', count: '10 phrases' },
                { key: 'sentences', icon: '📝', title: 'Sentences', desc: 'Full sentences', count: '8 sentences' },
              ].map(d => (
                <div key={d.key} style={styles.pickerCard} onClick={() => handleStartDifficulty(d.key)}>
                  <div style={styles.pickerIcon}>{d.icon}</div>
                  <div style={styles.pickerTitle}>{d.title}</div>
                  <div style={styles.pickerDesc}>{d.desc}</div>
                  <div style={styles.pickerCount}>{d.count}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // --- Complete Phase ---
  if (phase === 'complete') {
    const accuracy = items.length > 0 ? Math.round((score / items.length) * 100) : 0;
    const avgSim = similarityScores.length > 0 ? Math.round(similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length) : 0;
    return (
      <div className="mode-container" style={styles.container}>
        <CompletionScreen
          stats={{ title: 'Speech Practice Complete!', score, total: items.length, xpEarned, accuracy }}
          onRetry={handleSessionRetry}
          onExit={() => setPhase('picker')}
          exitLabel="Back to List"
        />
        <div style={styles.extraStats}>
          <div style={styles.extraStat}>
            <span style={styles.extraStatLabel}>Best Streak</span>
            <span style={styles.extraStatValue}>{bestStreak}</span>
          </div>
          <div style={styles.extraStat}>
            <span style={styles.extraStatLabel}>Avg Similarity</span>
            <span style={styles.extraStatValue}>{avgSim}%</span>
          </div>
          <div style={styles.extraStat}>
            <span style={styles.extraStatLabel}>Total Attempts</span>
            <span style={styles.extraStatValue}>{totalAttempts}</span>
          </div>
        </div>
      </div>
    );
  }

  // --- Playing Phase ---
  const progress = ((currentIdx + 1) / items.length) * 100;
  const diffLabel = difficulty === 'words' ? 'Word' : difficulty === 'phrases' ? 'Phrase' : 'Sentence';

  return (
    <div className="mode-container" style={styles.playContainer}>
      <ModeHeader
        title="Speech Practice"
        subtitle={`${diffLabel} ${currentIdx + 1} of ${items.length}${selectedCategory ? ` · ${selectedCategory.nameEn}` : ''}`}
        icon="🎙️"
        onExit={() => setPhase('picker')}
      />

      <div className="content-row" style={styles.playContentRow}>
        {/* Left stats card */}
        <div style={styles.statsCard}>
          <div style={styles.statsProgress}>
            <div style={styles.statsProgressBar}>
              <div style={{ ...styles.statsProgressFill, width: `${progress}%` }} />
            </div>
            <div style={styles.statsProgressLabel}>{currentIdx + 1} of {items.length}</div>
          </div>

          <div style={styles.statsDivider} />

          <div style={styles.statItem}>
            <div style={styles.statLabel}>Score</div>
            <div style={styles.statValue}>{score}/{currentIdx + (speech.feedback ? 1 : 0)}</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statLabel}>Streak</div>
            <div style={styles.statValue}>{streak}</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statLabel}>XP</div>
            <div style={styles.statValue}>+{xpEarned}</div>
          </div>
        </div>

        {/* Center practice area */}
        <div style={styles.main}>
          <div style={styles.card}>
            {/* Target display */}
            <div style={styles.targetText}>
              <ClickableText text={currentItem?.target || ''} onWordClick={handleWordClick} activeWord={selectedWord?.word} />
            </div>
            {currentItem?.phonetic && (
              <div style={styles.phonetic}>{currentItem.phonetic}</div>
            )}
            {currentItem?.english && (
              <div style={styles.english}>{currentItem.english}</div>
            )}

            {/* TTS controls */}
            <div style={styles.ttsRow}>
              <button style={styles.playBtn} onClick={handlePlay}>
                🔊 Listen
              </button>
              <div style={styles.speedControls}>
                {[0.5, 0.75, 1].map(rate => (
                  <button
                    key={rate}
                    style={{ ...styles.speedBtn, ...(playbackRate === rate ? styles.speedBtnActive : {}) }}
                    onClick={() => setPlaybackRate(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={styles.divider} />

            {/* Speech practice widget */}
            <SpeechPracticeWidget
              speech={speech}
              target={currentItem?.target}
              compact={false}
              showRetryNext={true}
              onRetry={handleRetry}
              onNext={handleNext}
              nextLabel={currentIdx < items.length - 1 ? 'Next →' : 'Finish'}
              onSpeakTips={(text) => { setTipsSpeaking(true); speakUkrainian(text, 0.8, ttsVolume, 'en').then(() => setTipsSpeaking(false)); }}
              tipsSpeaking={tipsSpeaking}
              onStopTips={() => { stopSpeaking(); setTipsSpeaking(false); }}
            />
          </div>
        </div>

        <LessonChat {...chat} onWordClick={handleWordClick} activeWord={selectedWord?.word} onSpeak={onSpeak} />
      </div>
      <WordToolbar selectedWord={selectedWord} onDismiss={dismissWord} onSpeak={onSpeak} ttsEnabled={ttsEnabled} ttsVolume={ttsVolume} langName={langName} langCode={langCode} onMarkMastered={onMarkMastered} isMastered={masteredWordsList.some(m => m.word === selectedWord?.word)} />
    </div>
  );
}

// --- Styles ---

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  playContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    padding: '1rem 0.75rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box',
    width: '100vw',
    marginLeft: 'calc(-50vw + 50%)',
  },
  playContentRow: { display: 'flex', gap: '0.15rem', alignItems: 'stretch', flex: 1, minHeight: 0 },
  contentRow: { display: 'flex', gap: '1.5rem', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0, overflowY: 'auto' },

  // Picker - section title
  pickerSectionTitle: {
    textAlign: 'center',
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#ffd700',
    marginTop: '1.5rem',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  pickerCategoryBadge: {
    fontSize: '0.9rem',
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.3)',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    color: '#ffd700',
    fontWeight: '500',
  },
  pickerCefrBadge: {
    fontSize: '0.85rem',
    background: 'rgba(77,171,247,0.15)',
    border: '1px solid rgba(77,171,247,0.3)',
    padding: '0.2rem 0.6rem',
    borderRadius: '20px',
    color: '#4dabf7',
    fontWeight: '600',
  },
  backStepBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.7)',
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    marginTop: '0.5rem',
  },

  // Category grid
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem',
    maxWidth: '900px',
    margin: '0 auto',
  },
  categoryCard: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,215,0,0.15)',
    borderRadius: '16px',
    padding: '1.25rem 1rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  categoryIcon: { fontSize: '2rem', marginBottom: '0.5rem' },
  categoryName: { fontSize: '1rem', fontWeight: '600', marginBottom: '0.3rem' },
  categoryMeta: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' },
  categoryDifficulty: { color: '#4dabf7', fontWeight: '600' },

  // CEFR grid
  cefrGrid: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '1rem',
  },
  cefrCard: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
    padding: '1.5rem 2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '140px',
  },
  cefrCardActive: {
    border: '2px solid #ffd700',
    background: 'rgba(255,215,0,0.1)',
  },
  cefrLevel: { fontSize: '1.4rem', fontWeight: '700', color: '#ffd700', marginBottom: '0.3rem' },
  cefrDesc: { fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' },

  // Picker format cards
  pickerGrid: {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '1rem',
  },
  pickerCard: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: '20px',
    padding: '2rem 1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    width: '220px',
    transition: 'all 0.2s',
  },
  pickerIcon: { fontSize: '3rem', marginBottom: '0.75rem' },
  pickerTitle: { fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.5rem' },
  pickerDesc: { fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' },
  pickerCount: { fontSize: '0.85rem', color: '#ffd700', fontWeight: '600' },
  pickerHint: {
    textAlign: 'center',
    marginTop: '2rem',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.95rem',
    maxWidth: '500px',
    margin: '2rem auto 0',
  },

  // Stats card (left sidebar in playing phase)
  statsCard: {
    width: '150px',
    flexShrink: 0,
    alignSelf: 'flex-start',
    position: 'sticky',
    top: '2rem',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: '16px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  statsProgress: {
    textAlign: 'center',
  },
  statsProgressBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '0.4rem',
  },
  statsProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ffd700, #ffed4e)',
    transition: 'width 0.3s ease',
  },
  statsProgressLabel: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.6)',
  },
  statsDivider: {
    height: '1px',
    background: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.15rem',
  },
  statValue: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#ffd700',
  },

  // Progress (used in picker phases)
  progressBar: {
    width: '100%',
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    marginBottom: '2rem',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ffd700, #ffed4e)',
    transition: 'width 0.3s ease',
  },

  // Card
  card: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '1.25rem 1.5rem',
    textAlign: 'center',
    border: '1px solid rgba(255,215,0,0.2)',
  },
  targetText: {
    fontSize: '1.6rem',
    fontWeight: '700',
    marginBottom: '0.3rem',
    lineHeight: 1.3,
  },
  phonetic: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    marginBottom: '0.2rem',
  },
  english: {
    fontSize: '0.95rem',
    color: '#4dabf7',
    marginBottom: '0.75rem',
  },

  // TTS
  ttsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  playBtn: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    border: 'none',
    color: '#fff',
    padding: '0.5rem 1.4rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  speedControls: {
    display: 'flex',
    gap: '0.4rem',
  },
  speedBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '0.35rem 0.7rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  speedBtnActive: {
    background: 'rgba(255,215,0,0.2)',
    borderColor: '#ffd700',
    color: '#ffd700',
    fontWeight: '600',
  },

  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.1)',
    margin: '0.75rem 0 1rem',
  },

  // Extra stats on complete
  extraStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginTop: '1.5rem',
    flexWrap: 'wrap',
  },
  extraStat: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    padding: '1rem 1.5rem',
    textAlign: 'center',
    minWidth: '120px',
  },
  extraStatLabel: {
    display: 'block',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.3rem',
  },
  extraStatValue: {
    display: 'block',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffd700',
  },
};

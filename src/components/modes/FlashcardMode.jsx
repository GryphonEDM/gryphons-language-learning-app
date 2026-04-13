import React, { useState, useEffect, useCallback, useRef } from 'react';
import { storageGet, storageSet } from '../../utils/storage.js';
import { buildDictionary } from '../../utils/dictionaryBuilder.js';
import { getUserDict, saveToUserDict as saveToUserDictUtil, lookupUserDict } from '../../utils/userDictionary.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';
import { speakUkrainian, stopSpeaking } from '../../App.jsx';
import useSpeechPractice from '../../hooks/useSpeechPractice.js';
import SpeechPracticeWidget from '../shared/SpeechPracticeWidget.jsx';
import useNextShortcut from '../../hooks/useNextShortcut.js';
import useSelfCorrection from '../../hooks/useSelfCorrection.js';
import { loadSentenceBank, getSentences, formatGrammarLabels } from '../../utils/sentenceBankLoader.js';

/**
 * Flashcard Mode Component
 * Practice vocabulary with flashcard-style learning
 * Features: flip cards, spaced repetition, progress tracking
 */
export default function FlashcardMode({
  langCode = 'uk',
  vocabularySet,
  ttsEnabled,
  ttsVolume,
  onSpeak,
  onComplete,
  onExit,
  onAddXP,
  onTrackProgress,
  onMarkMastered,
  masteredWordsList = [],
  struggleContext
}) {
  const langName = { uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' }[langCode] || 'Ukrainian';
  const langNative = { uk: 'Українська', ru: 'Русский', de: 'Deutsch', es: 'Español', fr: 'Français', el: 'Ελληνικά', hi: 'हिन्दी', ar: 'العربية', ko: '한국어', zh: '中文', ja: '日本語' }[langCode] || 'Українська';
  const chat = useLessonChat({ langName, langCode, systemPrompt: `You are a helpful ${langName} language tutor. The student is practicing vocabulary with flashcards. Answer questions about vocabulary, pronunciation, grammar, or usage concisely. Keep responses under 150 words.${struggleContext ? `\n\nStudent's known weak areas:\n${struggleContext}\nIf relevant, proactively offer a brief mnemonic or usage tip for these words.` : ''}`, onSpeak, ttsEnabled, ttsVolume });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredWords, setMasteredWords] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [sessionStats, setSessionStats] = useState({ studied: 0, mastered: 0 });
  const [selectedExampleWord, setSelectedExampleWord] = useState(null);
  const [addWordForm, setAddWordForm] = useState(null); // null or { word, en }
  const [userDict, setUserDict] = useState(() => getUserDict(langCode));
  const dict = buildDictionary(langCode);
  const [sentenceBank, setSentenceBank] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadSentenceBank(langCode).then(bank => { if (mountedRef.current) setSentenceBank(bank); });
    return () => { mountedRef.current = false; };
  }, [langCode]);

  // Production vs Recognition mode
  const [flashcardMode, setFlashcardMode] = useState(() => storageGet('flashcardMode') || 'production');
  const [productionInput, setProductionInput] = useState('');
  const [productionSubmitted, setProductionSubmitted] = useState(false);
  const [productionFeedback, setProductionFeedback] = useState(null); // { correct }
  const selfCorrection = useSelfCorrection({ maxAttempts: 3 });
  const productionInputRef = useRef(null);
  const [productionStartTime, setProductionStartTime] = useState(() => Date.now());

  // Speech practice integration
  const [showSpeechPractice, setShowSpeechPractice] = useState(false);
  const [tipsSpeaking, setTipsSpeaking] = useState(false);
  const speech = useSpeechPractice({ langCode, langName });
  const speechPracticeRef = useRef(null);

  const currentWord = vocabularySet.words[currentIndex];
  const totalWords = vocabularySet.words.length;
  const progress = ((currentIndex + 1) / totalWords) * 100;

  // Color map for color-themed flashcards
  const COLOR_MAP = {
    'red': '#e74c3c', 'blue': '#2980b9', 'yellow': '#f1c40f', 'green': '#27ae60',
    'white': '#ecf0f1', 'black': '#2c3e50', 'gray': '#95a5a6', 'brown': '#8b4513',
    'pink': '#ff69b4', 'orange': '#ff8c00', 'purple': '#8e44ad', 'violet': '#8e44ad',
    'light blue': '#87ceeb', 'beige': '#f5f5dc', 'burgundy': '#800020', 'maroon': '#800000',
    'gold': '#ffd700', 'golden': '#ffd700', 'silver': '#c0c0c0', 'turquoise': '#40e0d0',
    'crimson': '#dc143c', 'cream': '#fffdd0', 'lime green': '#32cd32', 'bronze': '#cd7f32'
  };
  const isColorSet = vocabularySet.setId === 'colors';
  const colorValue = isColorSet ? COLOR_MAP[currentWord?.en?.toLowerCase()] : null;
  const colorTextColor = colorValue && ['#f1c40f', '#ecf0f1', '#ffd700', '#87ceeb', '#f5f5dc', '#fffdd0', '#c0c0c0', '#40e0d0'].includes(colorValue) ? '#1a1a2e' : '#fff';

  // Initialize review queue with all words
  useEffect(() => {
    if (vocabularySet && vocabularySet.words) {
      setReviewQueue(vocabularySet.words.map((_, idx) => idx));
    }
  }, [vocabularySet]);

  // Reset speech practice when card changes
  useEffect(() => {
    setShowSpeechPractice(false);
    speech.reset();
  }, [currentIndex]);

  // Speak English word using Silero en_70 voice
  const speakEnglish = useCallback((text) => {
    if (!ttsEnabled) return;
    const cleanText = text.split('/')[0].trim();
    speakUkrainian(cleanText, 0.9, ttsVolume, 'en');
  }, [ttsEnabled, ttsVolume]);

  // Auto-speak English word when a new card appears (English side shown)
  useEffect(() => {
    if (!isFlipped && currentWord && ttsEnabled) {
      const timer = setTimeout(() => {
        speakEnglish(currentWord.en);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isFlipped, speakEnglish, currentWord, ttsEnabled]);

  const [cardShowTime, setCardShowTime] = useState(() => Date.now());

  // Reset card timer when card changes
  useEffect(() => {
    setCardShowTime(Date.now());
  }, [currentIndex]);

  // Reset production state when card changes
  useEffect(() => {
    setProductionInput('');
    setProductionSubmitted(false);
    setProductionFeedback(null);
    selfCorrection.reset();
    setProductionStartTime(Date.now());
    // Auto-focus input in production mode
    if (flashcardMode === 'production') {
      setTimeout(() => productionInputRef.current?.focus(), 100);
    }
  }, [currentIndex]);

  const handleToggleFlashcardMode = useCallback(() => {
    const newMode = flashcardMode === 'production' ? 'recognition' : 'production';
    setFlashcardMode(newMode);
    storageSet('flashcardMode', newMode);
  }, [flashcardMode]);

  const getProductionAccepted = useCallback(() => {
    if (!currentWord) return [];
    const target = currentWord[langCode] || currentWord.uk || '';
    return target.split('/').map(a => a.trim().toLowerCase()).filter(Boolean);
  }, [currentWord, langCode]);

  const handleProductionSubmit = useCallback(() => {
    if (!productionInput.trim() || productionSubmitted) return;

    const accepted = getProductionAccepted();

    const result = selfCorrection.handleAttempt(productionInput.trim(), (input) => ({
      correct: accepted.includes(input.toLowerCase()),
    }));

    if (!result.resolved) {
      // Not resolved yet — clear input for retry
      setProductionInput('');
      setTimeout(() => productionInputRef.current?.focus(), 50);
      return;
    }

    // Resolved
    setProductionFeedback({ correct: result.correct });
    setProductionSubmitted(true);

    // Pronounce the correct word
    if (ttsEnabled && onSpeak) {
      onSpeak(currentWord[langCode] || currentWord.uk, 0.8, ttsVolume);
    }

    const pointsEarned = result.correct ? (vocabularySet.xpPerWord || 15) : 5;
    if (onAddXP) onAddXP(pointsEarned);

    if (result.correct) {
      setSessionStats(prev => ({ ...prev, mastered: prev.mastered + 1 }));
      if (onMarkMastered) onMarkMastered(currentWord[langCode] || currentWord.uk);
    }

    if (onTrackProgress) {
      onTrackProgress('flashcards', {
        setId: vocabularySet.setId,
        word: currentWord[langCode] || currentWord.uk,
        correct: result.correct,
        userAnswer: productionInput.trim(),
        expected: currentWord[langCode] || currentWord.uk,
        responseMs: result.responseMs,
        selfCorrected: result.selfCorrected,
        attemptsBeforeCorrect: result.attemptsUsed,
      });
    }
  }, [productionInput, productionSubmitted, getProductionAccepted, selfCorrection, currentWord, langCode, ttsEnabled, onSpeak, ttsVolume, vocabularySet, onAddXP, onTrackProgress, onMarkMastered]);

  const moveToNext = () => {
    setIsFlipped(false);
    setSelectedExampleWord(null);
    setAddWordForm(null);
    setShowSpeechPractice(false);
    speech.reset();
    setProductionInput('');
    setProductionSubmitted(false);
    setProductionFeedback(null);
    selfCorrection.reset();
    setSessionStats(prev => ({ ...prev, studied: prev.studied + 1 }));

    if (currentIndex < totalWords - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Reached end of set
      if (reviewQueue.length > 0) {
        // Go back to first word in review queue
        setCurrentIndex(reviewQueue[0]);
      } else {
        // All words mastered - complete!
        if (onComplete) {
          onComplete({
            setId: vocabularySet.setId,
            totalWords,
            masteredWords: masteredWords.length,
            sessionStats
          });
        }
      }
    }
  };

  const handleProductionNext = useCallback(() => {
    if (productionFeedback && !productionFeedback.correct) {
      // Wrong answer — add to review queue
      if (!reviewQueue.includes(currentIndex)) {
        setReviewQueue(prev => [...prev, currentIndex]);
      }
    } else if (productionFeedback?.correct) {
      // Correct — remove from review queue
      setReviewQueue(prev => prev.filter(idx => idx !== currentIndex));
      if (!masteredWords.includes(currentIndex)) {
        setMasteredWords(prev => [...prev, currentIndex]);
      }
    }
    moveToNext();
  }, [productionFeedback, currentIndex, reviewQueue, masteredWords, moveToNext]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped && ttsEnabled && onSpeak) {
      // Pronounce when flipping to Ukrainian side
      onSpeak(currentWord.uk, 0.8, ttsVolume);
    }
  };

  const handleKnowIt = () => {
    // Mark as mastered
    if (!masteredWords.includes(currentIndex)) {
      setMasteredWords([...masteredWords, currentIndex]);
      setSessionStats(prev => ({ ...prev, mastered: prev.mastered + 1 }));

      // Persist to mastered words list
      if (onMarkMastered) onMarkMastered(currentWord.uk);

      // Award XP
      if (onAddXP) {
        onAddXP(vocabularySet.xpPerWord || 15);
      }

      // Track progress
      if (onTrackProgress) {
        onTrackProgress('flashcards', {
          setId: vocabularySet.setId,
          word: currentWord.uk,
          mastered: true,
          responseMs: Date.now() - cardShowTime,
        });
      }
    }

    // Remove from review queue
    setReviewQueue(prev => prev.filter(idx => idx !== currentIndex));

    moveToNext();
  };

  const handleReviewAgain = () => {
    // Report failure to SRS
    if (onTrackProgress) {
      onTrackProgress('flashcards', {
        setId: vocabularySet.setId,
        word: currentWord.uk,
        mastered: false,
        responseMs: Date.now() - cardShowTime,
      });
    }

    // Add back to review queue if not already there
    if (!reviewQueue.includes(currentIndex)) {
      setReviewQueue(prev => [...prev, currentIndex]);
    }

    moveToNext();
  };

  const handleToggleSpeechPractice = useCallback((e) => {
    e.stopPropagation();
    const newShow = !showSpeechPractice;
    setShowSpeechPractice(newShow);
    if (newShow && currentWord) {
      speech.setTarget(currentWord.uk);
      speech.retry();
      // Auto-start recording
      setTimeout(() => speech.toggleRecord(), 100);
      // Scroll to speech practice widget
      setTimeout(() => speechPracticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
    } else {
      speech.reset();
    }
  }, [showSpeechPractice, currentWord, speech]);

  // Scroll to show full results when speech feedback or pronunciation tips arrive
  useEffect(() => {
    if (speech.feedback && speechPracticeRef.current) {
      setTimeout(() => speechPracticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
    }
  }, [speech.feedback]);

  useEffect(() => {
    if (speech.llmFeedback && speechPracticeRef.current) {
      setTimeout(() => speechPracticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
    }
  }, [speech.llmFeedback]);

  useNextShortcut(moveToNext, isFlipped && !addWordForm);

  const handlePronounce = () => {
    if (ttsEnabled && onSpeak) {
      onSpeak(currentWord[langCode] || currentWord.uk, 0.8, ttsVolume);
    }
  };

  const lookupWord = useCallback((word) => {
    const cleaned = word.toLowerCase().replace(/[.,!?;:"""()—–\-…'ʼ]/g, '');
    if (!cleaned) return null;
    if (userDict[cleaned]) return userDict[cleaned];
    const translation = dict.targetToEn[cleaned];
    if (translation) return translation;
    for (let i = cleaned.length - 1; i >= Math.max(1, cleaned.length - 3); i--) {
      const prefix = cleaned.slice(0, i);
      if (userDict[prefix]) return userDict[prefix];
      if (dict.targetToEn[prefix]) return dict.targetToEn[prefix];
    }
    return null;
  }, [dict, userDict]);

  const translateWithLLM = useCallback(async (word, contextSentence) => {
    try {
      const messages = [
        { role: 'system', content: `You are a ${langName}-to-English translator. Respond with ONLY the English translation of the given word (1-4 words max, no explanation, no punctuation, no quotes).` },
        { role: 'user', content: contextSentence
          ? `Translate the ${langName} word "${word}" as used in this sentence: "${contextSentence}"`
          : `Translate the ${langName} word: "${word}"` }
      ];
      const res = await fetch('/llm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'local-model', messages, temperature: 0.1, max_tokens: 15, stream: false }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }, [langName]);

  const saveToUserDict = useCallback((word, en) => {
    if (!word || !en) return;
    saveToUserDictUtil(word, en, langCode);
    setUserDict(getUserDict(langCode));
    setSelectedExampleWord(prev => prev ? { ...prev, translation: en } : prev);
    setAddWordForm(null);
  }, [langCode]);

  const handleExampleWordClick = useCallback((word, index) => {
    const cleaned = word.replace(/[.,!?;:"""()—–\-…]/g, '').trim();
    if (!cleaned) return;
    const translation = lookupWord(cleaned);
    setSelectedExampleWord({ word: cleaned, translation, index });
    if (ttsEnabled && onSpeak) {
      onSpeak(cleaned, 0.8, ttsVolume);
    }
  }, [lookupWord, ttsEnabled, onSpeak, ttsVolume]);

  if (!currentWord) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mode-container" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onExit}>
          ← Back
        </button>
        <div style={styles.headerInfo}>
          <h2 style={styles.title}>
            {vocabularySet.icon} {vocabularySet.nameEn} / {vocabularySet.nameUk}
          </h2>
          <p style={styles.subtitle}>Difficulty: {vocabularySet.difficulty}</p>
        </div>
      </div>

      <div className="content-row" style={styles.contentRow}>
      {/* Left Sidebar - Progress & Stats */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarCard}>
          <div style={styles.sidebarTitle}>Progress</div>
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${progress}%`}}></div>
            </div>
            <div style={styles.progressText}>
              {currentIndex + 1} / {totalWords} words
            </div>
          </div>

          <div style={styles.sidebarDivider} />

          <div style={styles.sidebarStats}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Studied</span>
              <span style={styles.statValue}>{sessionStats.studied}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Mastered</span>
              <span style={styles.statValue}>{sessionStats.mastered}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Review Queue</span>
              <span style={styles.statValue}>{reviewQueue.length}</span>
            </div>
          </div>
        </div>

      {/* Interactive Example Sentences (sentence bank with fallback to word examples) */}
      {isFlipped && (() => {
        const bankSentences = getSentences(sentenceBank, currentWord.uk || currentWord[langCode]);
        const hasBankSentences = bankSentences.length > 0;
        const hasLegacyExamples = currentWord.examples && currentWord.examples.length > 0;
        return hasBankSentences || hasLegacyExamples;
      })() && (
        <div style={{...styles.sidebarCard, marginTop: '1rem'}}>
          <div style={styles.exampleHeader}>
            <div style={{...styles.sidebarTitle, marginBottom: 0}}>Use in a sentence</div>
            <button
              style={styles.exampleReadBtn}
              onClick={(e) => {
                e.stopPropagation();
                if (!ttsEnabled || !onSpeak) return;
                const bankSentences = getSentences(sentenceBank, currentWord.uk || currentWord[langCode]);
                const text = bankSentences.length > 0
                  ? bankSentences.map(s => s.s).join('. ')
                  : (currentWord.examples || []).join('. ');
                onSpeak(text, 0.85, ttsVolume);
              }}
            >
              🔊 Read
            </button>
          </div>
          {(() => {
            const bankSentences = getSentences(sentenceBank, currentWord.uk || currentWord[langCode]);
            if (bankSentences.length > 0) {
              return bankSentences.map((entry, exIdx) => {
                const tokens = entry.s.split(/(\s+)/);
                const grammarLabels = formatGrammarLabels(entry.g);
                return (
                  <div key={exIdx} style={styles.exampleBlock}>
                    <div style={styles.exampleSentence}>
                      {tokens.map((token, i) => {
                        const isWhitespace = /^\s+$/.test(token);
                        if (isWhitespace) return <span key={`${exIdx}-${i}`}>{token}</span>;
                        const tokenKey = `${exIdx}-${i}`;
                        const isSelected = selectedExampleWord && selectedExampleWord.index === tokenKey;
                        return (
                          <span
                            key={tokenKey}
                            style={{
                              ...styles.exampleWord,
                              ...(isSelected ? styles.exampleWordSelected : {})
                            }}
                            onClick={(e) => { e.stopPropagation(); handleExampleWordClick(token, tokenKey); }}
                          >
                            {token}
                          </span>
                        );
                      })}
                    </div>
                    {entry.en && <div style={styles.exampleTranslation}>{entry.en}</div>}
                    {grammarLabels.length > 0 && (
                      <div style={styles.grammarPills}>
                        {grammarLabels.map((label, gi) => (
                          <span key={gi} style={styles.grammarPill}>{label}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            }
            // Fallback to legacy examples
            return currentWord.examples.map((ex, exIdx) => {
              const tokens = ex.split(/(\s+)/);
              const enTranslation = currentWord.examplesEn && currentWord.examplesEn[exIdx];
              return (
                <div key={exIdx} style={styles.exampleBlock}>
                  <div style={styles.exampleSentence}>
                    {tokens.map((token, i) => {
                      const isWhitespace = /^\s+$/.test(token);
                      if (isWhitespace) return <span key={`${exIdx}-${i}`}>{token}</span>;
                      const tokenKey = `${exIdx}-${i}`;
                      const isSelected = selectedExampleWord && selectedExampleWord.index === tokenKey;
                      return (
                        <span
                          key={tokenKey}
                          style={{
                            ...styles.exampleWord,
                            ...(isSelected ? styles.exampleWordSelected : {})
                          }}
                          onClick={(e) => { e.stopPropagation(); handleExampleWordClick(token, tokenKey); }}
                        >
                          {token}
                        </span>
                      );
                    })}
                  </div>
                  {enTranslation && <div style={styles.exampleTranslation}>{enTranslation}</div>}
                </div>
              );
            });
          })()}

          {/* Word Info Panel */}
          {selectedExampleWord && (
            <div style={styles.wordPanel}>
              <div style={styles.wordPanelWord}>{selectedExampleWord.word}</div>
              {selectedExampleWord.translation ? (
                <div style={styles.wordPanelTranslation}>= "{selectedExampleWord.translation}"</div>
              ) : (
                <>
                  <div style={styles.wordPanelNoResult}>No translation found</div>
                  {!addWordForm && (
                    <button
                      style={styles.addWordBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        const exIdx = parseInt((selectedExampleWord.index || '0').split('-')[0]);
                        const contextSentence = currentWord.examples?.[exIdx] || '';
                        setAddWordForm({ word: selectedExampleWord.word, en: '', translating: true });
                        translateWithLLM(selectedExampleWord.word, contextSentence).then(translation => {
                          setAddWordForm(prev => prev ? { ...prev, en: translation || '', translating: false } : null);
                        });
                      }}
                    >
                      + Add to dictionary
                    </button>
                  )}
                </>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  style={styles.wordPanelSpeak}
                  onClick={(e) => { e.stopPropagation(); ttsEnabled && onSpeak && onSpeak(selectedExampleWord.word, 0.7, ttsVolume); }}
                >
                  🔊 Hear again
                </button>
                {onMarkMastered && (() => {
                  const isMastered = masteredWordsList.some(m => m.word === selectedExampleWord.word);
                  return (
                    <button
                      style={{ ...styles.wordPanelSpeak, background: isMastered ? 'rgba(76,175,80,0.25)' : 'rgba(76,175,80,0.12)', color: isMastered ? '#81c784' : '#4caf50', opacity: isMastered ? 0.7 : 1 }}
                      onClick={(e) => { e.stopPropagation(); if (!isMastered) onMarkMastered(selectedExampleWord.word); }}
                      disabled={isMastered}
                    >
                      {isMastered ? '⭐ Mastered' : '⭐ Mark mastered'}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Add Word Form */}
          {addWordForm && (
            <div style={styles.addWordForm} onClick={e => e.stopPropagation()}>
              <div style={styles.addWordTitle}>Add to dictionary</div>
              <div style={{...styles.addWordRow, flexDirection: 'column'}}>
                <div style={styles.addWordField}>
                  <label style={styles.addWordLabel}>Ukrainian</label>
                  <input style={styles.addWordInput} value={addWordForm.word} readOnly />
                </div>
                <div style={{...styles.addWordArrow, textAlign: 'center'}}>↓</div>
                <div style={styles.addWordField}>
                  <label style={styles.addWordLabel}>
                    English meaning {addWordForm.translating && <span style={styles.translatingLabel}>translating…</span>}
                  </label>
                  <input
                    style={{ ...styles.addWordInput, ...(addWordForm.translating ? { opacity: 0.5 } : {}) }}
                    value={addWordForm.en}
                    onChange={e => setAddWordForm(prev => ({ ...prev, en: e.target.value }))}
                    placeholder={addWordForm.translating ? 'Getting translation…' : 'Enter translation...'}
                    autoFocus={!addWordForm.translating}
                    disabled={addWordForm.translating}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveToUserDict(addWordForm.word, addWordForm.en);
                      if (e.key === 'Escape') setAddWordForm(null);
                    }}
                  />
                </div>
              </div>
              <div style={styles.addWordActions}>
                <button style={styles.addWordCancel} onClick={() => setAddWordForm(null)}>Cancel</button>
                <button
                  style={styles.addWordSave}
                  onClick={() => saveToUserDict(addWordForm.word, addWordForm.en)}
                  disabled={addWordForm.translating || !addWordForm.en.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Main Content */}
      <div style={styles.main}>

      {/* Mode Toggle */}
      <div style={styles.modeToggle}>
        <button
          style={{ ...styles.modeToggleBtn, ...(flashcardMode === 'production' ? styles.modeToggleBtnActive : {}) }}
          onClick={handleToggleFlashcardMode}
        >
          Production
        </button>
        <button
          style={{ ...styles.modeToggleBtn, ...(flashcardMode === 'recognition' ? styles.modeToggleBtnActive : {}) }}
          onClick={handleToggleFlashcardMode}
        >
          Recognition
        </button>
      </div>

      {flashcardMode === 'production' ? (
        /* --- PRODUCTION MODE --- */
        <div style={styles.productionCard}>
          <div style={{ ...styles.cardLabel, color: 'rgba(255,255,255,0.5)' }}>Translate to {langNative}</div>
          <div style={{ ...styles.cardWord, color: '#ffd700', marginBottom: '1.5rem' }}>{currentWord.en}</div>

          {/* Self-correction retry message */}
          {selfCorrection.retryMessage && !productionSubmitted && (
            <div style={styles.retryArea}>
              <div style={styles.retryMessage}>{selfCorrection.retryMessage}</div>
              {selfCorrection.hintLevel > 0 && (
                <div style={styles.retryHint}>
                  {selfCorrection.getHintFor(currentWord[langCode] || currentWord.uk)}
                </div>
              )}
              <div style={styles.retryAttempts}>Attempt {selfCorrection.attempt} of 3</div>
            </div>
          )}

          {!productionSubmitted ? (
            <div style={styles.productionInputArea}>
              <input
                ref={productionInputRef}
                style={styles.productionInput}
                value={productionInput}
                onChange={e => setProductionInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleProductionSubmit();
                }}
                placeholder={`Type in ${langNative}...`}
                autoFocus
              />
              <button style={styles.productionSubmitBtn} onClick={handleProductionSubmit}>
                Check
              </button>
            </div>
          ) : (
            <>
              <div style={{
                ...styles.productionFeedback,
                borderColor: productionFeedback?.correct ? '#4ade80' : '#f87171',
              }}>
                <div style={{
                  fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.5rem',
                  color: productionFeedback?.correct ? '#4ade80' : '#f87171',
                }}>
                  {productionFeedback?.correct
                    ? (selfCorrection.attempt > 1 ? 'Got it on retry!' : 'Correct!')
                    : 'Not quite...'}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#ffd700', marginBottom: '0.25rem' }}>
                  {currentWord[langCode] || currentWord.uk}
                </div>
                <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)' }}>
                  ({currentWord.phonetic})
                </div>
                {!productionFeedback?.correct && (
                  <div style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    You typed: <span style={{ color: '#f87171' }}>{productionInput}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                <button style={{ ...styles.button, ...styles.pronounceButton }} onClick={(e) => { e.stopPropagation(); handlePronounce(); }}>
                  🔊 Hear it
                </button>
                <button style={{ ...styles.button, ...styles.knowButton }} onClick={handleProductionNext}>
                  {currentIndex < totalWords - 1 ? 'Next →' : 'Finish'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
      /* --- RECOGNITION MODE --- */
      <>
      <div
        style={styles.cardContainer}
        onClick={handleFlip}
      >
        <div style={{
          ...styles.card,
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}>
          {/* Front (English) */}
          <div style={{
            ...styles.cardFace,
            ...styles.cardFront,
            ...(colorValue ? { background: colorValue, color: colorTextColor } : {}),
            opacity: isFlipped ? 0 : 1,
            pointerEvents: isFlipped ? 'none' : 'auto'
          }}>
            <div style={{...styles.cardLabel, ...(colorValue ? { color: colorTextColor, opacity: 0.7 } : {})}}>English</div>
            <div style={{...styles.cardWord, ...(colorValue ? { color: colorTextColor } : {})}}>{currentWord.en}</div>
            <div style={{...styles.cardHint, ...(colorValue ? { color: colorTextColor, opacity: 0.6 } : {})}}>Click to see {langName} →</div>
          </div>

          {/* Back (Target language) */}
          <div style={{
            ...styles.cardFace,
            ...styles.cardBack,
            ...(langCode === 'ru' ? { background: 'linear-gradient(135deg, #0039A6 0%, #D52B1E 100%)' } : {}),
            ...(colorValue ? { background: colorValue, color: colorTextColor } : {}),
            transform: 'rotateY(180deg)',
            opacity: isFlipped ? 1 : 0,
            pointerEvents: isFlipped ? 'auto' : 'none'
          }}>
            <div style={{...styles.cardLabel, ...(colorValue ? { color: colorTextColor, opacity: 0.7 } : {})}}>{langNative}</div>
            <div style={{...styles.cardWord, ...(colorValue ? { color: colorTextColor } : {})}}>{currentWord[langCode] || currentWord.uk}</div>
            <div style={{...styles.cardPhonetic, ...(colorValue ? { color: colorTextColor } : {})}}>({currentWord.phonetic})</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isFlipped && (
        <div style={styles.actions}>
          <button
            style={{...styles.button, ...styles.pronounceButton}}
            onClick={(e) => { e.stopPropagation(); handlePronounce(); }}
          >
            🔊 Hear it again
          </button>
          <button
            style={{...styles.button, ...(showSpeechPractice ? styles.speakButtonActive : styles.speakButton)}}
            onClick={handleToggleSpeechPractice}
          >
            🎤 Speak
          </button>
          <button
            style={{...styles.button, ...styles.reviewButton}}
            onClick={(e) => { e.stopPropagation(); handleReviewAgain(); }}
          >
            📝 Next Word
          </button>
          <button
            style={{...styles.button, ...styles.knowButton}}
            onClick={(e) => { e.stopPropagation(); handleKnowIt(); }}
          >
            ✓ Mastered it!
          </button>
        </div>
      )}

      {/* Inline Speech Practice */}
      {isFlipped && showSpeechPractice && (
        <div ref={speechPracticeRef} style={styles.speechPracticeContainer} onClick={e => e.stopPropagation()}>
          <div style={styles.speechPracticeHeader}>🎙️ Practice saying: <strong>{currentWord.uk}</strong></div>
          <SpeechPracticeWidget
            speech={speech}
            target={currentWord.uk}
            compact={true}
            onSpeakTips={(text) => { setTipsSpeaking(true); speakUkrainian(text, 0.8, 0.8, 'en').then(() => setTipsSpeaking(false)); }}
            tipsSpeaking={tipsSpeaking}
            onStopTips={() => { stopSpeaking(); setTipsSpeaking(false); }}
          />
        </div>
      )}


      {!isFlipped && (
        <div style={styles.flipHint}>
          💡 Click the card to flip it
        </div>
      )}
      </>
      ) /* end recognition mode ternary */}
      </div>
      <LessonChat {...chat} onSpeak={onSpeak} />
      </div>{/* end contentRow */}
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    padding: '1rem 0.75rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    width: '100vw',
    marginLeft: 'calc(-50vw + 50%)',
    boxSizing: 'border-box'
  },
  contentRow: {
    display: 'flex',
    gap: '0.15rem',
    alignItems: 'flex-start',
  },
  sidebar: {
    width: '380px',
    flexShrink: 0,
    position: 'sticky',
    top: '2rem',
    alignSelf: 'flex-start',
  },
  sidebarCard: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '1.25rem',
    border: '1px solid rgba(255,215,0,0.12)',
  },
  sidebarTitle: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '1rem',
    fontWeight: '600',
  },
  sidebarDivider: {
    height: '1px',
    background: 'rgba(255,255,255,0.08)',
    margin: '1rem 0',
  },
  sidebarStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem'
  },
  backButton: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s'
  },
  headerInfo: {
    flex: 1
  },
  title: {
    margin: 0,
    fontSize: '1.8rem',
    color: '#ffd700'
  },
  subtitle: {
    margin: '0.25rem 0 0 0',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.9rem'
  },
  progressContainer: {
    marginBottom: '0'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.5rem'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ffd700, #ffed4e)',
    transition: 'width 0.3s ease'
  },
  progressText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.85rem'
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
  },
  statValue: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#ffd700'
  },
  cardContainer: {
    perspective: '1000px',
    marginBottom: '2rem',
    cursor: 'pointer'
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '600px',
    height: '400px',
    margin: '0 auto',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.6s',
    borderRadius: '20px'
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    borderRadius: '20px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    transition: 'opacity 0.3s'
  },
  cardFront: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  cardBack: {
    background: 'linear-gradient(135deg, #0057b7 0%, #ffd700 100%)'
  },
  cardLabel: {
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    marginBottom: '1rem',
    opacity: 0.8
  },
  cardWord: {
    fontSize: '3rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  cardPhonetic: {
    fontSize: '1.2rem',
    opacity: 0.9,
    marginBottom: '1.5rem'
  },
  cardHint: {
    fontSize: '0.9rem',
    opacity: 0.7,
    marginTop: '2rem'
  },
  exampleSection: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '1.25rem 1.5rem',
    border: '1px solid rgba(255,215,0,0.15)'
  },
  exampleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem'
  },
  exampleLabel: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'rgba(255,255,255,0.5)'
  },
  exampleReadBtn: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    border: 'none',
    color: '#fff',
    padding: '0.35rem 0.9rem',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  exampleBlock: {
    marginBottom: '0.75rem'
  },
  exampleSentence: {
    fontSize: '1rem',
    lineHeight: '1.8',
    letterSpacing: '0.02em',
    marginBottom: '0.15rem'
  },
  exampleTranslation: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    paddingLeft: '0.25rem'
  },
  grammarPills: { display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem', paddingLeft: '0.25rem' },
  grammarPill: {
    display: 'inline-block', fontSize: '0.65rem', padding: '0.1rem 0.4rem',
    borderRadius: '8px', background: 'rgba(77,171,247,0.15)', color: 'rgba(77,171,247,0.8)',
    border: '1px solid rgba(77,171,247,0.2)', fontWeight: 500,
  },
  exampleWord: {
    cursor: 'pointer',
    borderRadius: '4px',
    padding: '2px 1px',
    transition: 'all 0.15s'
  },
  exampleWordSelected: {
    background: 'rgba(255,215,0,0.25)',
    color: '#ffd700',
    borderBottom: '2px solid #ffd700'
  },
  wordPanel: {
    maxWidth: '600px',
    margin: '0 auto 1.5rem',
    background: 'rgba(77,171,247,0.12)',
    border: '1px solid rgba(77,171,247,0.3)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  wordPanelWord: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#ffd700'
  },
  wordPanelTranslation: {
    fontSize: '1.1rem',
    color: '#4dabf7',
    fontStyle: 'italic'
  },
  wordPanelNoResult: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic'
  },
  addWordBtn: {
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid rgba(255,215,0,0.4)',
    color: '#ffd700',
    padding: '0.3rem 0.8rem',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    fontFamily: 'inherit'
  },
  addWordForm: {
    maxWidth: '600px',
    margin: '0 auto 1.5rem',
    background: 'rgba(255,215,0,0.07)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '12px',
    padding: '1rem 1.25rem'
  },
  addWordTitle: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.75rem'
  },
  addWordRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '0.75rem',
    marginBottom: '0.75rem'
  },
  addWordField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    flex: 1
  },
  addWordLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)'
  },
  translatingLabel: {
    color: '#4dabf7',
    fontStyle: 'italic',
  },
  addWordInput: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#fff',
    padding: '0.5rem 0.75rem',
    fontSize: '1rem',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  },
  addWordArrow: {
    fontSize: '1.2rem',
    color: 'rgba(255,255,255,0.4)',
    paddingBottom: '0.5rem'
  },
  addWordActions: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end'
  },
  addWordCancel: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    padding: '0.4rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontFamily: 'inherit'
  },
  addWordSave: {
    background: 'linear-gradient(135deg, #ffd700, #ffb700)',
    border: 'none',
    color: '#1a1a2e',
    padding: '0.4rem 1.2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '700',
    fontFamily: 'inherit'
  },
  wordPanelSpeak: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    border: 'none',
    color: '#fff',
    padding: '0.4rem 1rem',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    fontFamily: 'inherit',
    marginLeft: 'auto'
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  button: {
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
  },
  pronounceButton: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    color: '#fff'
  },
  reviewButton: {
    background: 'linear-gradient(135deg, #ffa94d, #fd7e14)',
    color: '#fff'
  },
  knowButton: {
    background: 'linear-gradient(135deg, #51cf66, #37b24d)',
    color: '#fff'
  },
  speakButton: {
    background: 'linear-gradient(135deg, #845ef7, #7048e8)',
    color: '#fff'
  },
  speakButtonActive: {
    background: 'linear-gradient(135deg, #e64980, #d6336c)',
    color: '#fff',
    boxShadow: '0 4px 16px rgba(230,73,128,0.4)',
  },
  speechPracticeContainer: {
    maxWidth: '600px',
    margin: '1rem auto 1.5rem',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '1.25rem 1.5rem',
    border: '1px solid rgba(132,94,247,0.3)',
  },
  speechPracticeHeader: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '0.75rem',
    textAlign: 'center',
  },
  flipHint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '1rem',
    marginTop: '1rem'
  },
  // Production mode styles
  modeToggle: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.25rem',
    marginBottom: '1.5rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '0.25rem',
    maxWidth: '300px',
    margin: '0 auto 1.5rem',
  },
  modeToggleBtn: {
    flex: 1,
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  modeToggleBtnActive: {
    background: 'rgba(255,215,0,0.2)',
    color: '#ffd700',
  },
  productionCard: {
    maxWidth: '500px',
    margin: '0 auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    padding: '2rem',
    textAlign: 'center',
    border: '1px solid rgba(255,215,0,0.2)',
  },
  productionInputArea: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  productionInput: {
    flex: 1,
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '1.2rem',
    fontFamily: 'inherit',
    outline: 'none',
    textAlign: 'center',
  },
  productionSubmitBtn: {
    background: 'linear-gradient(135deg, #ffd700, #e6c200)',
    border: 'none',
    color: '#1a1a2e',
    padding: '0.85rem 1.5rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  productionFeedback: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '1.25rem',
    borderLeft: '4px solid',
    textAlign: 'center',
  },
  retryArea: {
    background: 'rgba(255,165,0,0.1)',
    border: '1px solid rgba(255,165,0,0.3)',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  retryMessage: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#ffa94d',
    marginBottom: '0.5rem',
  },
  retryHint: {
    fontFamily: 'monospace',
    fontSize: '1.3rem',
    letterSpacing: '3px',
    color: '#ffd700',
    marginBottom: '0.4rem',
  },
  retryAttempts: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.4)',
  },
};

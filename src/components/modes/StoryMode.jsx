import React, { useState, useCallback, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import { buildDictionary } from '../../utils/dictionaryBuilder.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';

export default function StoryMode({ langCode = 'uk', stories, onSpeak, ttsEnabled, ttsVolume, onExit, onAddXP }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';
  const langField = langCode === 'ru' ? 'ru' : 'uk';
  const dict = buildDictionary(langCode);

  const [phase, setPhase] = useState('picker'); // picker, reading
  const chat = useLessonChat({ langName, systemPrompt: `You are a helpful ${langName} language tutor. The student is reading a ${langName} story and can click words to hear and translate them. Answer questions about vocabulary, grammar, or the story content concisely. Keep responses under 150 words.` });
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null); // { word, translation, index }
  const [showEnglish, setShowEnglish] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const stopRef = useRef(false);
  const readingRef = useRef(false);

  // Look up a word in the dictionary
  const lookupWord = useCallback((word) => {
    const cleaned = word.toLowerCase().replace(/[.,!?;:"""()—–\-…]/g, '');
    if (!cleaned) return null;
    const translation = dict.ukToEn[cleaned];
    if (translation) return translation;
    // Try without trailing soft signs or common suffixes
    for (let i = cleaned.length - 1; i >= Math.max(1, cleaned.length - 3); i--) {
      const prefix = cleaned.slice(0, i);
      if (dict.ukToEn[prefix]) return dict.ukToEn[prefix];
    }
    return null;
  }, [dict]);

  // Split story text into words (preserving punctuation attached to words)
  const getWords = useCallback((text) => {
    if (!text) return [];
    return text.split(/(\s+)/).filter(Boolean);
  }, []);

  // Speak a sequence of words from startIdx to end
  const readAloud = useCallback(async (text, fromIndex = 0) => {
    if (!ttsEnabled || !onSpeak) return;
    stopRef.current = false;
    readingRef.current = true;
    setIsReading(true);

    // Split into sentences for more natural reading
    const sentences = text.split(/(?<=[.!?])\s+/);
    let wordOffset = 0;

    for (const sentence of sentences) {
      if (stopRef.current) break;

      const sentenceWords = sentence.split(/\s+/);
      const sentenceEnd = wordOffset + sentenceWords.length;

      if (sentenceEnd <= fromIndex) {
        wordOffset = sentenceEnd;
        continue;
      }

      // If we're starting mid-sentence, only read from the start word
      let textToSpeak = sentence;
      if (wordOffset < fromIndex) {
        const wordsToSkip = fromIndex - wordOffset;
        textToSpeak = sentenceWords.slice(wordsToSkip).join(' ');
      }

      setHighlightIndex(Math.max(wordOffset, fromIndex));

      try {
        await onSpeak(textToSpeak, 0.85, ttsVolume);
      } catch (e) {
        // TTS error, continue
      }

      wordOffset = sentenceEnd;

      if (stopRef.current) break;
    }

    setIsReading(false);
    readingRef.current = false;
    setHighlightIndex(-1);
  }, [ttsEnabled, onSpeak, ttsVolume]);

  const handleStop = useCallback(() => {
    stopRef.current = true;
    setIsReading(false);
    setHighlightIndex(-1);
  }, []);

  // Handle single click on a word
  const handleWordClick = useCallback((word, wordIndex) => {
    if (isReading) return;
    const cleaned = word.replace(/[.,!?;:"""()—–\-…]/g, '').trim();
    if (!cleaned) return;

    const translation = lookupWord(cleaned);
    setSelectedWord({ word: cleaned, translation, index: wordIndex });

    if (ttsEnabled && onSpeak) {
      onSpeak(cleaned, 0.8, ttsVolume);
    }
  }, [lookupWord, ttsEnabled, onSpeak, ttsVolume, isReading]);

  // Handle double click - read from this word to end
  const handleWordDoubleClick = useCallback((word, wordIndex, fullText) => {
    handleStop();
    setTimeout(() => {
      // Count actual word index (excluding whitespace tokens)
      const allTokens = fullText.split(/(\s+)/).filter(Boolean);
      let realWordIdx = 0;
      for (let i = 0; i < allTokens.length; i++) {
        if (!/^\s+$/.test(allTokens[i])) {
          if (i === wordIndex) break;
          realWordIdx++;
        }
      }
      readAloud(fullText, realWordIdx);
    }, 100);
  }, [readAloud, handleStop]);

  const handleSelectStory = (story) => {
    setSelectedStory(story);
    setSelectedWord(null);
    setShowEnglish(false);
    setPhase('reading');
    if (onAddXP) onAddXP(5);
  };

  // PICKER PHASE
  if (phase === 'picker') {
    return (
      <div style={styles.container}>
        <ModeHeader
          title="Story Time"
          subtitle={`Read along in ${langName}`}
          icon="📖"
          onExit={onExit}
        />
        <div style={styles.levelList}>
          {stories.map((levelGroup) => (
            <div key={levelGroup.level} style={styles.levelSection}>
              <h3 style={styles.levelTitle}>
                {levelGroup.level}
                <span style={styles.levelNative}>
                  {' '}/ {langCode === 'ru' ? levelGroup.levelRu : levelGroup.levelUk}
                </span>
              </h3>
              <div style={styles.storyGrid}>
                {levelGroup.stories.map((story) => (
                  <div
                    key={story.id}
                    style={styles.storyCard}
                    onClick={() => handleSelectStory(story)}
                  >
                    <div style={styles.storyTitle}>{story.title}</div>
                    <div style={styles.storyPreview}>
                      {story[langField].slice(0, 80)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // READING PHASE
  const storyText = selectedStory[langField];
  const tokens = getWords(storyText);

  return (
    <div style={styles.container}>
      <ModeHeader
        title={selectedStory.title}
        subtitle="Click a word to hear it and see its meaning"
        icon="📖"
        onExit={() => { handleStop(); setPhase('picker'); setSelectedWord(null); }}
      />

      {/* Controls */}
      <div style={styles.controls}>
        <button
          style={{
            ...styles.controlBtn,
            ...(isReading ? styles.controlBtnDisabled : styles.controlBtnPrimary)
          }}
          onClick={() => readAloud(storyText, 0)}
          disabled={isReading}
        >
          🔊 Read Aloud
        </button>
        {isReading && (
          <button
            style={{ ...styles.controlBtn, ...styles.controlBtnStop }}
            onClick={handleStop}
          >
            ⏹ Stop
          </button>
        )}
        <button
          style={{
            ...styles.controlBtn,
            ...(showEnglish ? styles.controlBtnActive : styles.controlBtnSecondary)
          }}
          onClick={() => setShowEnglish(!showEnglish)}
        >
          {showEnglish ? '🇬🇧 Hide English' : '🇬🇧 Show English'}
        </button>
        <button
          style={styles.controlBtn}
          onClick={() => { handleStop(); setPhase('picker'); setSelectedWord(null); }}
        >
          ← Stories
        </button>
      </div>

      <div style={styles.contentRow}>
        <div style={styles.main}>
      {/* Story text with clickable words */}
      <div style={styles.storyContainer}>
        <div style={styles.storyText}>
          {tokens.map((token, i) => {
            const isWhitespace = /^\s+$/.test(token);
            if (isWhitespace) {
              return <span key={i}>{token}</span>;
            }

            const isHighlighted = highlightIndex >= 0 && (() => {
              // Count which real word index this token is
              let count = 0;
              for (let j = 0; j < i; j++) {
                if (!/^\s+$/.test(tokens[j])) count++;
              }
              return count >= highlightIndex;
            })();

            const isSelected = selectedWord && selectedWord.index === i;

            return (
              <span
                key={i}
                style={{
                  ...styles.word,
                  ...(isSelected ? styles.wordSelected : {}),
                  ...(isHighlighted && isReading ? styles.wordHighlighted : {})
                }}
                onClick={() => handleWordClick(token, i)}
                onDoubleClick={() => handleWordDoubleClick(token, i, storyText)}
              >
                {token}
              </span>
            );
          })}
        </div>
      </div>

      {/* Word info panel */}
      {selectedWord && (
        <div style={styles.wordPanel}>
          <div style={styles.wordPanelWord}>{selectedWord.word}</div>
          {selectedWord.translation ? (
            <div style={styles.wordPanelTranslation}>= "{selectedWord.translation}"</div>
          ) : (
            <div style={styles.wordPanelNoResult}>No translation found</div>
          )}
          <button
            style={styles.wordPanelSpeak}
            onClick={() => ttsEnabled && onSpeak && onSpeak(selectedWord.word, 0.7, ttsVolume)}
          >
            🔊 Hear again
          </button>
        </div>
      )}

      {/* English translation */}
      {showEnglish && (
        <div style={styles.englishSection}>
          <div style={styles.englishLabel}>English Translation</div>
          <div style={styles.englishText}>{selectedStory.en}</div>
        </div>
      )}

          <div style={styles.tipBar}>
            💡 Click a word to hear it & see its meaning. Double-click to read from that word onward.
          </div>
        </div>
        <LessonChat {...chat} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  contentRow: { display: 'flex', gap: '1.5rem', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },
  levelList: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  levelSection: {
    marginBottom: '2rem'
  },
  levelTitle: {
    fontSize: '1.4rem',
    color: '#ffd700',
    marginBottom: '1rem',
    borderBottom: '1px solid rgba(255,215,0,0.3)',
    paddingBottom: '0.5rem'
  },
  levelNative: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '400'
  },
  storyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1rem'
  },
  storyCard: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: '12px',
    padding: '1.25rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  storyTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#ffd700',
    marginBottom: '0.5rem'
  },
  storyPreview: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: '1.4'
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    maxWidth: '800px',
    margin: '0 auto 1.5rem'
  },
  controlBtn: {
    border: 'none',
    padding: '0.6rem 1.25rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff'
  },
  controlBtnPrimary: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    color: '#fff'
  },
  controlBtnStop: {
    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
    color: '#fff'
  },
  controlBtnSecondary: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff'
  },
  controlBtnActive: {
    background: 'rgba(255,215,0,0.2)',
    border: '1px solid rgba(255,215,0,0.4)',
    color: '#ffd700'
  },
  controlBtnDisabled: {
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.3)',
    cursor: 'not-allowed'
  },
  storyContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '2rem',
    border: '1px solid rgba(255,215,0,0.15)',
    marginBottom: '1.5rem'
  },
  storyText: {
    fontSize: '1.3rem',
    lineHeight: '2.2',
    letterSpacing: '0.02em'
  },
  word: {
    cursor: 'pointer',
    borderRadius: '4px',
    padding: '2px 1px',
    transition: 'all 0.15s',
    position: 'relative'
  },
  wordSelected: {
    background: 'rgba(255,215,0,0.25)',
    color: '#ffd700',
    borderBottom: '2px solid #ffd700'
  },
  wordHighlighted: {
    background: 'rgba(77,171,247,0.15)',
    color: '#4dabf7'
  },
  wordPanel: {
    maxWidth: '800px',
    margin: '0 auto 1.5rem',
    background: 'rgba(77,171,247,0.12)',
    border: '1px solid rgba(77,171,247,0.3)',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    flexWrap: 'wrap'
  },
  wordPanelWord: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffd700'
  },
  wordPanelTranslation: {
    fontSize: '1.2rem',
    color: '#4dabf7',
    fontStyle: 'italic'
  },
  wordPanelNoResult: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic'
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
  englishSection: {
    maxWidth: '800px',
    margin: '0 auto 1.5rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  englishLabel: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.75rem'
  },
  englishText: {
    fontSize: '1.1rem',
    lineHeight: '1.8',
    color: 'rgba(255,255,255,0.8)'
  },
  tipBar: {
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.4)',
    padding: '1rem'
  }
};

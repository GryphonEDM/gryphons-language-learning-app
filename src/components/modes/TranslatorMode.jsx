import React, { useState, useEffect, useRef } from 'react';
import ModeHeader from '../shared/ModeHeader.jsx';
import { buildDictionary } from '../../utils/dictionaryBuilder.js';
import { translatePhraseWithLLM } from '../../utils/userDictionary.js';
import LessonChat from '../shared/LessonChat.jsx';
import { useLessonChat } from '../../hooks/useLessonChat.js';

export default function TranslatorMode({ langCode = 'uk', onSpeak, ttsEnabled, ttsVolume, onExit, onAddXP }) {
  const langName = langCode === 'ru' ? 'Russian' : 'Ukrainian';
  const chat = useLessonChat({ langName, langCode, systemPrompt: `You are a helpful ${langName} language tutor. The student is using a dictionary/translator tool to look up ${langName} words and phrases. Answer questions about meanings, usage, grammar, or pronunciation concisely. Keep responses under 150 words.`, onSpeak, ttsEnabled, ttsVolume });
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [direction, setDirection] = useState('en-uk'); // en-uk or uk-en
  const [translationMode, setTranslationMode] = useState('llm'); // 'llm' or 'dict'
  const [isLoading, setIsLoading] = useState(false);
  const [lookupCount, setLookupCount] = useState(0);
  const [speakCount, setSpeakCount] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);
  const dict = buildDictionary(langCode);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!inputText.trim()) {
      setOutputText('');
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      translateInput(inputText.trim());
    }, translationMode === 'llm' ? 600 : 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputText, direction, translationMode]);

  const translateWithDict = (text) => {
    const source = direction === 'en-uk' ? dict.enToUk : dict.ukToEn;
    const lower = text.toLowerCase();

    // Exact match
    if (source[lower]) {
      setOutputText(source[lower]);
      setSuggestions([]);
      setLookupCount(prev => prev + 1);
      if (onAddXP && lookupCount === 0) onAddXP(5);
      return true;
    }

    // Word-by-word translation
    const words = lower.split(/\s+/);
    const translated = words.map(w => source[w] || w);
    const result = translated.join(' ');

    if (result !== lower) {
      setOutputText(result);
      setSuggestions([]);
      setLookupCount(prev => prev + 1);
      return true;
    }

    // Prefix fuzzy suggestions
    const matches = Object.keys(source).filter(key =>
      key.startsWith(lower)
    ).slice(0, 5);

    if (matches.length > 0) {
      setSuggestions(matches.map(key => ({ key, value: source[key] })));
      setOutputText('');
    } else {
      setOutputText('');
      setSuggestions([]);
    }
    return false;
  };

  const translateInput = async (text) => {
    if (translationMode === 'llm') {
      setIsLoading(true);
      setOutputText('');
      setSuggestions([]);
      const fromLang = direction === 'en-uk' ? 'English' : langName;
      const toLang = direction === 'en-uk' ? langName : 'English';
      const result = await translatePhraseWithLLM(text, fromLang, toLang);
      setIsLoading(false);
      if (result) {
        setOutputText(result);
        setLookupCount(prev => prev + 1);
        if (onAddXP && lookupCount === 0) onAddXP(5);
      } else {
        // LLM failed — fall back to dictionary
        translateWithDict(text);
      }
    } else {
      translateWithDict(text);
    }
  };

  const handleSpeak = (text) => {
    if (ttsEnabled && onSpeak && text) {
      onSpeak(text, 0.8, ttsVolume);
      setSpeakCount(prev => prev + 1);
    }
  };

  const toggleDirection = () => {
    const newDir = direction === 'en-uk' ? 'uk-en' : 'en-uk';
    setDirection(newDir);
    setInputText(outputText || '');
    setOutputText('');
    setSuggestions([]);
  };

  const selectSuggestion = (key) => {
    setInputText(key);
  };

  const langNative = langCode === 'ru' ? 'Русский' : 'Українська';
  const fromLabel = direction === 'en-uk' ? 'English' : langNative;
  const toLabel = direction === 'en-uk' ? langNative : 'English';
  const outputIsUkrainian = direction === 'en-uk';

  return (
    <div style={styles.container}>
      <ModeHeader
        title="Translator"
        subtitle="Look up words and phrases"
        icon="📖"
        onExit={onExit}
      />

      <div style={styles.directionToggle}>
        <span style={styles.langLabel}>{fromLabel}</span>
        <button style={styles.swapBtn} onClick={toggleDirection}>⇄</button>
        <span style={styles.langLabel}>{toLabel}</span>
      </div>

      <div style={styles.modeToggle}>
        <button
          style={{ ...styles.modeBtn, ...(translationMode === 'llm' ? styles.modeBtnActive : {}) }}
          onClick={() => setTranslationMode('llm')}
        >✨ AI</button>
        <button
          style={{ ...styles.modeBtn, ...(translationMode === 'dict' ? styles.modeBtnActive : {}) }}
          onClick={() => setTranslationMode('dict')}
        >📚 Dictionary</button>
      </div>

      <div style={styles.contentRow}>
        <div style={styles.main}>
      <div style={styles.translatorBody}>
        <div style={styles.panel}>
          <label style={styles.panelLabel}>{fromLabel}</label>
          <textarea
            style={styles.textarea}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`Type ${fromLabel.toLowerCase()} word or phrase...`}
            rows={4}
          />
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <label style={styles.panelLabel}>{toLabel}</label>
            {outputText && outputIsUkrainian && ttsEnabled && (
              <button style={styles.speakBtn} onClick={() => handleSpeak(outputText)}>
                🔊 Speak
              </button>
            )}
            {outputText && !outputIsUkrainian && ttsEnabled && (
              <button style={styles.speakBtn} onClick={() => handleSpeak(inputText)}>
                🔊 Speak Input
              </button>
            )}
          </div>
          <div style={styles.outputArea}>
            {isLoading ? (
              <span style={styles.loading}>Translating...</span>
            ) : outputText ? (
              <span style={styles.outputText}>{outputText}</span>
            ) : suggestions.length > 0 ? (
              <div style={styles.suggestionsArea}>
                <span style={styles.suggestLabel}>Did you mean:</span>
                {suggestions.map((s, i) => (
                  <button key={i} style={styles.suggestion} onClick={() => selectSuggestion(s.key)}>
                    <span style={styles.sugKey}>{s.key}</span>
                    <span style={styles.sugArrow}> → </span>
                    <span style={styles.sugVal}>{s.value}</span>
                  </button>
                ))}
              </div>
            ) : inputText.trim() ? (
              <span style={styles.notFound}>{translationMode === 'llm' ? 'Could not translate' : 'Word not in dictionary'}</span>
            ) : (
              <span style={styles.placeholder}>Translation will appear here...</span>
            )}
          </div>
        </div>
      </div>

          <div style={styles.stats}>
            <span style={styles.statItem}>Lookups: {lookupCount}</span>
            <span style={styles.statItem}>TTS Used: {speakCount}</span>
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
  directionToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '2rem'
  },
  langLabel: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#ffd700'
  },
  swapBtn: {
    background: 'rgba(255,215,0,0.2)',
    border: '2px solid #ffd700',
    color: '#ffd700',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    fontSize: '1.5rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    fontFamily: 'inherit'
  },
  translatorBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    maxWidth: '700px',
    margin: '0 auto'
  },
  panel: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '1.25rem',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  panelLabel: {
    display: 'block',
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '0.75rem'
  },
  textarea: {
    width: '100%',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '1.2rem',
    padding: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box'
  },
  outputArea: {
    minHeight: '100px',
    padding: '1rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  outputText: {
    fontSize: '1.4rem',
    fontWeight: '600',
    color: '#ffd700'
  },
  notFound: {
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic'
  },
  placeholder: {
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic'
  },
  speakBtn: {
    background: 'linear-gradient(135deg, #4dabf7, #339af0)',
    border: 'none',
    color: '#fff',
    padding: '0.4rem 1rem',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    fontFamily: 'inherit'
  },
  suggestionsArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    width: '100%'
  },
  suggestLabel: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.25rem'
  },
  suggestion: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    color: '#fff',
    textAlign: 'left',
    fontSize: '1rem',
    fontFamily: 'inherit',
    transition: 'background 0.2s'
  },
  sugKey: {
    color: '#ffd700',
    fontWeight: '600'
  },
  sugArrow: {
    color: 'rgba(255,255,255,0.4)'
  },
  sugVal: {
    color: '#4dabf7'
  },
  modeToggle: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  modeBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.6)',
    padding: '0.4rem 1.2rem',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  modeBtnActive: {
    background: 'rgba(255,215,0,0.15)',
    border: '1px solid #ffd700',
    color: '#ffd700',
    fontWeight: '700',
  },
  loading: {
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    animation: 'pulse 1s infinite',
  },
  stats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginTop: '2rem',
    padding: '1rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '10px',
    maxWidth: '700px',
    margin: '2rem auto 0'
  },
  statItem: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.7)'
  }
};

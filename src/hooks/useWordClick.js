import { useState, useCallback, useRef } from 'react';
import { buildDictionary } from '../utils/dictionaryBuilder.js';
import { lookupUserDict, translateWithLLM, saveToUserDict } from '../utils/userDictionary.js';

export function useWordClick({ langCode = 'uk', langName, onSpeak, ttsEnabled, ttsVolume }) {
  const resolvedLangName = langName || ({ uk: 'Ukrainian', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', el: 'Greek', hi: 'Hindi', ar: 'Arabic', ko: 'Korean', zh: 'Chinese', ja: 'Japanese' }[langCode] || 'Ukrainian');
  const dict = buildDictionary(langCode);
  const [selectedWord, setSelectedWord] = useState(null); // { word, translation, rect }
  const pendingRef = useRef(null);

  const lookupWord = useCallback((word) => {
    const cleaned = word.toLowerCase().replace(/[.,!?;:"""''()—–\-…«»\[\]*]/g, '');
    if (!cleaned) return null;
    // Check user dictionary first
    const userTranslation = lookupUserDict(cleaned);
    if (userTranslation) return userTranslation;
    // Fall back to built-in dictionary
    if (dict.targetToEn[cleaned]) return dict.targetToEn[cleaned];
    for (let i = cleaned.length - 1; i >= Math.max(1, cleaned.length - 3); i--) {
      const prefix = cleaned.slice(0, i);
      if (dict.targetToEn[prefix]) return dict.targetToEn[prefix];
    }
    return null;
  }, [dict]);

  const handleWordClick = useCallback((e, word, contextSentence = '') => {
    const cleaned = word.replace(/[.,!?;:"""''()—–\-…«»\[\]*]/g, '').trim();
    if (!cleaned) return;
    const translation = lookupWord(cleaned);
    const rect = e.target.getBoundingClientRect();
    setSelectedWord({ word: cleaned, translation, rect, contextSentence });
    if (ttsEnabled && onSpeak) onSpeak(cleaned, 0.8, ttsVolume);

    // Auto-translate with LLM and save to dictionary if no translation found
    if (!translation) {
      const requestId = Date.now();
      pendingRef.current = requestId;
      translateWithLLM(cleaned, resolvedLangName, contextSentence).then(llmTranslation => {
        if (llmTranslation && pendingRef.current === requestId) {
          saveToUserDict(cleaned, llmTranslation);
          setSelectedWord(prev =>
            prev && prev.word === cleaned
              ? { ...prev, translation: llmTranslation }
              : prev
          );
        }
      });
    }
  }, [lookupWord, ttsEnabled, onSpeak, ttsVolume, resolvedLangName]);

  const dismissWord = useCallback(() => { pendingRef.current = null; setSelectedWord(null); }, []);

  return { selectedWord, handleWordClick, dismissWord };
}

import { useState, useCallback } from 'react';
import { buildDictionary } from '../utils/dictionaryBuilder.js';
import { lookupUserDict } from '../utils/userDictionary.js';

export function useWordClick({ langCode = 'uk', onSpeak, ttsEnabled, ttsVolume }) {
  const dict = buildDictionary(langCode);
  const [selectedWord, setSelectedWord] = useState(null); // { word, translation, rect }

  const lookupWord = useCallback((word) => {
    const cleaned = word.toLowerCase().replace(/[.,!?;:"""''()—–\-…«»\[\]]/g, '');
    if (!cleaned) return null;
    // Check user dictionary first
    const userTranslation = lookupUserDict(cleaned);
    if (userTranslation) return userTranslation;
    // Fall back to built-in dictionary
    if (dict.ukToEn[cleaned]) return dict.ukToEn[cleaned];
    for (let i = cleaned.length - 1; i >= Math.max(1, cleaned.length - 3); i--) {
      const prefix = cleaned.slice(0, i);
      if (dict.ukToEn[prefix]) return dict.ukToEn[prefix];
    }
    return null;
  }, [dict]);

  const handleWordClick = useCallback((e, word, contextSentence = '') => {
    const cleaned = word.replace(/[.,!?;:"""''()—–\-…«»\[\]]/g, '').trim();
    if (!cleaned) return;
    const translation = lookupWord(cleaned);
    const rect = e.target.getBoundingClientRect();
    setSelectedWord({ word: cleaned, translation, rect, contextSentence });
    if (ttsEnabled && onSpeak) onSpeak(cleaned, 0.8, ttsVolume);
  }, [lookupWord, ttsEnabled, onSpeak, ttsVolume]);

  const dismissWord = useCallback(() => setSelectedWord(null), []);

  return { selectedWord, handleWordClick, dismissWord };
}

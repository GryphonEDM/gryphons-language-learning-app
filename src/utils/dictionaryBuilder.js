import { TRANSLATIONS } from '../data/translations.js';
import colorsData from '../data/vocabulary/themes/colors.json';
import animalsData from '../data/vocabulary/themes/animals.json';
import familyData from '../data/vocabulary/themes/family.json';
import emotionsData from '../data/vocabulary/themes/emotions.json';
import weatherData from '../data/vocabulary/themes/weather.json';
import travelData from '../data/vocabulary/themes/travel.json';
import bodyData from '../data/vocabulary/themes/body.json';
import houseData from '../data/vocabulary/themes/house.json';
import comprehensiveDict from '../data/vocabulary/comprehensive-dictionary.json';
import comprehensiveDictExt from '../data/vocabulary/comprehensive-dictionary-ext.json';
import comprehensiveDictExt2 from '../data/vocabulary/comprehensive-dictionary-ext2.json';
import comprehensiveDictExt3 from '../data/vocabulary/comprehensive-dictionary-ext3.json';
import comprehensiveDictExt4 from '../data/vocabulary/comprehensive-dictionary-ext4.json';
import comprehensiveDictExt5 from '../data/vocabulary/comprehensive-dictionary-ext5.json';
import comprehensiveDictExt6 from '../data/vocabulary/comprehensive-dictionary-ext6.json';
import comprehensiveDictExt7 from '../data/vocabulary/comprehensive-dictionary-ext7.json';
import comprehensiveDictExt8 from '../data/vocabulary/comprehensive-dictionary-ext8.json';
import comprehensiveDictExt9 from '../data/vocabulary/comprehensive-dictionary-ext9.json';
import comprehensiveDictExt10 from '../data/vocabulary/comprehensive-dictionary-ext10.json';
import comprehensiveDictExt11 from '../data/vocabulary/comprehensive-dictionary-ext11.json';
import comprehensiveDictExt12 from '../data/vocabulary/comprehensive-dictionary-ext12.json';

import { RU_TRANSLATIONS } from '../data/ru/translations.js';
import { DE_TRANSLATIONS } from '../data/de/translations.js';

const THEME_DATA = [colorsData, animalsData, familyData, emotionsData, weatherData, travelData, bodyData, houseData];
const COMPREHENSIVE = [comprehensiveDict, comprehensiveDictExt, comprehensiveDictExt2, comprehensiveDictExt3, comprehensiveDictExt4, comprehensiveDictExt5, comprehensiveDictExt6, comprehensiveDictExt7, comprehensiveDictExt8, comprehensiveDictExt9, comprehensiveDictExt10, comprehensiveDictExt11, comprehensiveDictExt12];

// Per-category CEFR level assignment for accurate difficulty filtering
export const CATEGORY_DIFFICULTY = {
  // A1 — Basic, everyday vocabulary
  'colors': 'A1', 'weather': 'A1', 'family': 'A1', 'greetings': 'A1',
  'particles': 'A1', 'pronouns': 'A1', 'numbers': 'A1', 'time': 'A1',
  'food': 'A1', 'fruits': 'A1', 'beverages': 'A1', 'food-spices': 'A1',
  'animals': 'A1', 'nature-geography': 'A1', 'body-parts': 'A1',
  'everyday': 'A1', 'clothing': 'A1', 'furniture': 'A1', 'shapes': 'A1',
  'phrases': 'A1', 'directions': 'A1', 'names': 'A1', 'weather-adj': 'A1',

  // A2 — Common but broader vocabulary
  'verbs': 'A2', 'adjectives': 'A2', 'adverbs': 'A2', 'common-adj': 'A2',
  'food-extra': 'A2', 'cooking': 'A2', 'seafood': 'A2', 'cooking-verbs': 'A2',
  'nature': 'A2', 'flowers': 'A2', 'birds': 'A2', 'insects': 'A2',
  'places': 'A2', 'nouns-places': 'A2', 'transport': 'A2',
  'professions': 'A2', 'school': 'A2', 'household': 'A2',
  'sports': 'A2', 'sports-hobbies': 'A2', 'hobbies': 'A2', 'toys': 'A2',
  'music-arts': 'A2', 'music-instruments': 'A2',
  'prepositions': 'A2', 'conjunctions': 'A2',
  'body': 'A2', 'shopping': 'A2', 'entertainment': 'A2',
  'cosmetics': 'A2', 'outdoor': 'A2', 'clothing-extra': 'A2',

  // B1 — Intermediate vocabulary
  'verbs-motion': 'B1', 'verbs-social': 'B1', 'verbs-daily': 'B1',
  'verbs-general': 'B1', 'emotions': 'B1', 'expressions': 'B1',
  'communication': 'B1', 'education': 'B1', 'business': 'B1',
  'travel': 'B1', 'geography': 'B1', 'technology': 'B1',
  'Technology & Internet': 'B1', 'computing': 'B1',
  'agriculture': 'B1', 'medicine': 'B1', 'medical': 'B1', 'medical-extra': 'B1',
  'culture-arts': 'B1', 'religion': 'B1', 'holidays': 'B1', 'life-events': 'B1',
  'dance': 'B1', 'photography': 'B1', 'crafts': 'B1', 'gardening': 'B1',
  'marine': 'B1', 'materials': 'B1', 'nouns-people': 'B1',
  'office': 'B1', 'financial': 'B1', 'society': 'B1', 'shipping': 'B1',
  'nature-extra': 'B1', 'card-games': 'B1',

  // B2 — Advanced vocabulary
  'abstract': 'B2', 'verbs-misc': 'B2', 'adverbs-conjunctions': 'B2',
  'animals-extra': 'B2', 'architecture': 'B2', 'astronomy': 'B2',
  'automotive': 'B2', 'body-organs': 'B2', 'business-extra': 'B2',
  'culture': 'B2', 'ecology': 'B2', 'emergency': 'B2',
  'geology': 'B2', 'jewelry': 'B2', 'law-government': 'B2', 'legal': 'B2',
  'military': 'B2', 'military-extra': 'B2', 'psychology': 'B2',
  'science': 'B2', 'tech-extra': 'B2', 'tech-extra2': 'B2',
  'textiles': 'B2', 'tools': 'B2', 'tools-extra': 'B2',
  'nouns': 'B2', 'nouns-objects': 'B2', 'dictionary': 'B2', 'misc': 'B2',
  'professions-extra': 'B2',

  // Theme sets (from vocabulary/themes/*.json)
  'translations': 'A2',
};

const cache = { uk: { dictionary: null, vocabulary: null }, ru: { dictionary: null, vocabulary: null }, de: { dictionary: null, vocabulary: null } };

function getDataForLang(langCode) {
  const targetField = langCode === 'ru' ? 'ru' : langCode === 'de' ? 'de' : 'uk';
  const phoneticField = langCode === 'ru' ? 'phoneticRu' : langCode === 'de' ? 'phoneticDe' : 'phoneticUk';
  const translations = langCode === 'ru' ? RU_TRANSLATIONS : langCode === 'de' ? DE_TRANSLATIONS : TRANSLATIONS;
  return { targetField, phoneticField, themeData: THEME_DATA, comprehensiveData: COMPREHENSIVE, translations };
}

function addEntry(targetToEn, enToTarget, target, en) {
  const targetLower = target.toLowerCase();
  const enLower = en.toLowerCase();
  if (!targetToEn[targetLower]) targetToEn[targetLower] = en;
  enLower.split('/').forEach(meaning => {
    const trimmed = meaning.trim();
    if (trimmed && !enToTarget[trimmed]) {
      enToTarget[trimmed] = target;
    }
  });
  if (!enToTarget[enLower]) enToTarget[enLower] = target;
}

export function buildDictionary(langCode = 'uk') {
  if (cache[langCode]?.dictionary) return cache[langCode].dictionary;

  const { targetField, themeData, comprehensiveData, translations } = getDataForLang(langCode);
  const targetToEn = {};
  const enToTarget = {};

  // Add comprehensive dictionaries first
  comprehensiveData.forEach(dict => {
    if (dict && dict.words) {
      dict.words.forEach(word => {
        if (word[targetField]) {
          addEntry(targetToEn, enToTarget, word[targetField], word.en);
        }
      });
    }
  });

  // Add vocabulary themes
  themeData.forEach(theme => {
    if (!theme || !theme.words) return;
    theme.words.forEach(word => {
      if (word[targetField]) {
        addEntry(targetToEn, enToTarget, word[targetField], word.en);
      }
    });
  });

  // Add translations last
  if (typeof translations === 'object' && !Array.isArray(translations)) {
    Object.entries(translations).forEach(([target, en]) => {
      addEntry(targetToEn, enToTarget, target, en);
    });
  }

  // Use generic key names
  const result = { ukToEn: targetToEn, enToUk: enToTarget };
  if (!cache[langCode]) cache[langCode] = {};
  cache[langCode].dictionary = result;
  return result;
}

export function getAllVocabularyWords(langCode = 'uk') {
  if (cache[langCode]?.vocabulary) return cache[langCode].vocabulary;

  const { targetField, phoneticField, themeData, comprehensiveData, translations } = getDataForLang(langCode);
  const words = [];
  const seen = new Set();

  // Add from comprehensive dictionaries
  comprehensiveData.forEach(dict => {
    if (dict && dict.words) {
      dict.words.forEach(word => {
        const targetWord = word[targetField];
        if (targetWord && !seen.has(targetWord.toLowerCase())) {
          seen.add(targetWord.toLowerCase());
          const examples = word.examples
            ? (Array.isArray(word.examples) ? word.examples : (word.examples[targetField] || []))
            : [];
          const examplesEn = word.examples && !Array.isArray(word.examples) ? (word.examples.en || []) : [];
          const source = word.category || 'dictionary';
          words.push({
            [targetField]: targetWord,
            uk: targetWord, // backward compat: always expose as .uk too
            en: word.en,
            phonetic: word[phoneticField] || '',
            source,
            difficulty: CATEGORY_DIFFICULTY[source] || 'B2',
            examples,
            examplesEn
          });
        }
      });
    }
  });

  // Add from vocabulary themes
  themeData.forEach(theme => {
    if (!theme || !theme.words) return;
    theme.words.forEach(word => {
      const targetWord = word[targetField];
      if (targetWord && !seen.has(targetWord.toLowerCase())) {
        seen.add(targetWord.toLowerCase());
        words.push({
          [targetField]: targetWord,
          uk: targetWord,
          en: word.en,
          phonetic: word[phoneticField] || '',
          source: theme.setId,
          difficulty: theme.difficulty || CATEGORY_DIFFICULTY[theme.setId] || 'A2'
        });
      }
    });
  });

  // Add from translations
  if (typeof translations === 'object' && !Array.isArray(translations)) {
    Object.entries(translations).forEach(([target, en]) => {
      if (!seen.has(target.toLowerCase())) {
        seen.add(target.toLowerCase());
        words.push({
          [targetField]: target,
          uk: target,
          en,
          phonetic: '',
          source: 'translations',
          difficulty: 'A2'
        });
      }
    });
  }

  if (!cache[langCode]) cache[langCode] = {};
  cache[langCode].vocabulary = words;
  return words;
}

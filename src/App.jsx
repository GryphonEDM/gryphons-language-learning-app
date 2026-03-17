import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UKRAINIAN_KEYBOARD, UK_TO_QWERTY, LETTER_INFO } from './data/keyboard.js';
import { LESSONS, ALPHABET_CHALLENGE } from './data/lessons.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { TRANSLATIONS } from './data/translations.js';
import { getAllVocabularyWords } from './utils/dictionaryBuilder.js';
import { ENCOURAGEMENTS, MISTAKE_MESSAGES, ENCOURAGEMENTS_RU, MISTAKE_MESSAGES_RU } from './utils/encouragement.js';
import { getLanguageData, LANGUAGES } from './data/languageConfig.js';
import { createAudioContext, playSound } from './utils/soundEffects.js';
import FlashcardMode from './components/modes/FlashcardMode.jsx';
import CustomFlashcardManager from './components/modes/CustomFlashcardManager.jsx';
import TranslatorMode from './components/modes/TranslatorMode.jsx';
import ListeningMode from './components/modes/ListeningMode.jsx';
import TranslationPracticeMode from './components/modes/TranslationPracticeMode.jsx';
import GrammarMode from './components/modes/GrammarMode.jsx';
import SentenceMode from './components/modes/SentenceMode.jsx';
import DialogueMode from './components/modes/DialogueMode.jsx';
import ReadingMode from './components/modes/ReadingMode.jsx';
import StoryMode from './components/modes/StoryMode.jsx';
import ChatMode from './components/modes/ChatMode.jsx';

// Import story data
import veryBeginnerStories from './data/stories/very-beginner.json';
import beginnerStories from './data/stories/beginner.json';
import earlyIntermediateStories from './data/stories/early-intermediate.json';

const ALL_STORIES = [veryBeginnerStories, beginnerStories, earlyIntermediateStories];

// Import grammar data
import casesData from './data/grammar/cases.json';
import verbsData from './data/grammar/verbs.json';
import pronounsData from './data/grammar/pronouns.json';
import adjectivesData from './data/grammar/adjectives.json';
import wordOrderData from './data/grammar/wordOrder.json';

// Import sentence data
import sentenceData from './data/sentences.json';

// Import dialogue data
import restaurantDialogue from './data/dialogues/restaurant.json';
import directionsDialogue from './data/dialogues/directions.json';
import shoppingDialogue from './data/dialogues/shopping.json';
import greetingDialogue from './data/dialogues/greeting.json';

// Import reading data
import beginnerReading from './data/reading/beginner.json';
import intermediateReading from './data/reading/intermediate.json';
import advancedReading from './data/reading/advanced.json';

// Import Russian grammar data
import ruCasesData from './data/ru/grammar/cases.json';
import ruVerbsData from './data/ru/grammar/verbs.json';
import ruPronounsData from './data/ru/grammar/pronouns.json';
import ruAdjectivesData from './data/ru/grammar/adjectives.json';
import ruWordOrderData from './data/ru/grammar/wordOrder.json';

// Import Russian sentence data
import ruSentenceData from './data/ru/sentences.json';

// Import Russian dialogue data
import ruRestaurantDialogue from './data/ru/dialogues/restaurant.json';
import ruDirectionsDialogue from './data/ru/dialogues/directions.json';
import ruShoppingDialogue from './data/ru/dialogues/shopping.json';
import ruGreetingDialogue from './data/ru/dialogues/greeting.json';

// Import Russian reading data
import ruBeginnerReading from './data/ru/reading/beginner.json';
import ruIntermediateReading from './data/ru/reading/intermediate.json';
import ruAdvancedReading from './data/ru/reading/advanced.json';

// Import vocabulary theme data
import colorsData from './data/vocabulary/themes/colors.json';
import animalsData from './data/vocabulary/themes/animals.json';
import familyData from './data/vocabulary/themes/family.json';
import emotionsData from './data/vocabulary/themes/emotions.json';
import weatherData from './data/vocabulary/themes/weather.json';
import travelData from './data/vocabulary/themes/travel.json';
import bodyData from './data/vocabulary/themes/body.json';
import houseData from './data/vocabulary/themes/house.json';
import adultData from './data/vocabulary/adult-vocabulary.json';


const VOCABULARY_THEMES = [
  colorsData,
  animalsData,
  familyData,
  emotionsData,
  weatherData,
  travelData,
  bodyData,
  houseData
];

const ADULT_VOCABULARY = adultData;

// Build category-grouped flashcard sets from the full dictionary
const CATEGORY_GROUPS = {
  'verbs-all': { nameEn: 'All Verbs', nameUk: 'Всі дієслова', nameRu: 'Все глаголы', icon: '🏃', difficulty: 'A1-B2', categories: ['verbs', 'verbs-general', 'verbs-motion', 'verbs-social', 'verbs-daily', 'verbs-misc', 'cooking-verbs'] },
  'adjectives-all': { nameEn: 'Adjectives & Adverbs', nameUk: 'Прикметники та прислівники', nameRu: 'Прилагательные и наречия', icon: '🌈', difficulty: 'A1-B2', categories: ['adjectives', 'adverbs', 'adverbs-conjunctions', 'common-adj', 'weather-adj'] },
  'food-all': { nameEn: 'Food, Drinks & Cooking', nameUk: 'Їжа, напої та кулінарія', nameRu: 'Еда, напитки и кулинария', icon: '🍽️', difficulty: 'A1-B1', categories: ['food', 'food-extra', 'food-spices', 'cooking', 'fruits', 'beverages', 'seafood'] },
  'nature-all': { nameEn: 'Nature & Animals', nameUk: 'Природа та тварини', nameRu: 'Природа и животные', icon: '🌿', difficulty: 'A1-B1', categories: ['animals', 'animals-extra', 'nature', 'nature-extra', 'birds', 'insects', 'flowers', 'marine', 'agriculture', 'gardening', 'outdoor'] },
  'body-medical': { nameEn: 'Body & Medicine', nameUk: 'Тіло та медицина', nameRu: 'Тело и медицина', icon: '🏥', difficulty: 'A2-B2', categories: ['body', 'body-parts', 'body-organs', 'medical', 'medical-extra', 'medicine'] },
  'colors-weather': { nameEn: 'Colors & Weather', nameUk: 'Кольори та погода', nameRu: 'Цвета и погода', icon: '🌤️', difficulty: 'A1', categories: ['colors', 'weather'] },
  'places-geo': { nameEn: 'Places & Geography', nameUk: 'Місця та географія', nameRu: 'Места и география', icon: '🗺️', difficulty: 'A2-B1', categories: ['nouns-places', 'places', 'geography', 'directions', 'architecture', 'outdoor'] },
  'people-family': { nameEn: 'People & Professions', nameUk: 'Люди та професії', nameRu: 'Люди и профессии', icon: '👨‍👩‍👧‍👦', difficulty: 'A1-B1', categories: ['family', 'nouns-people', 'professions', 'professions-extra', 'society'] },
  'travel-all': { nameEn: 'Travel & Transport', nameUk: 'Подорожі та транспорт', nameRu: 'Путешествия и транспорт', icon: '✈️', difficulty: 'A2-B1', categories: ['travel', 'transport', 'automotive'] },
  'tech-computing': { nameEn: 'Technology & Computing', nameUk: 'Технології та комп\'ютери', nameRu: 'Технологии и компьютеры', icon: '💻', difficulty: 'B1-B2', categories: ['technology', 'computing', 'tech-extra', 'tech-extra2'] },
  'society-law': { nameEn: 'Society, Law & Culture', nameUk: 'Суспільство, право та культура', nameRu: 'Общество, право и культура', icon: '⚖️', difficulty: 'B1-B2', categories: ['law-government', 'legal', 'culture', 'religion', 'holidays', 'life-events'] },
  'military-emergency': { nameEn: 'Military & Emergency', nameUk: 'Військова справа та надзвичайні ситуації', nameRu: 'Военное дело и чрезвычайные ситуации', icon: '🎖️', difficulty: 'B1-B2', categories: ['military', 'military-extra', 'emergency'] },
  'everyday-home': { nameEn: 'Everyday Life & Home', nameUk: 'Повсякденне життя та дім', nameRu: 'Повседневная жизнь и дом', icon: '🏠', difficulty: 'A1-B1', categories: ['everyday', 'household', 'house', 'clothing', 'clothing-extra', 'furniture', 'shopping', 'cosmetics'] },
  'sports-hobbies': { nameEn: 'Sports & Entertainment', nameUk: 'Спорт та розваги', nameRu: 'Спорт и развлечения', icon: '⚽', difficulty: 'A2-B1', categories: ['sports', 'hobbies', 'entertainment', 'toys', 'card-games', 'dance'] },
  'abstract-emotions': { nameEn: 'Abstract & Emotions', nameUk: 'Абстрактні поняття та емоції', nameRu: 'Абстрактные понятия и эмоции', icon: '💭', difficulty: 'B1-B2', categories: ['abstract', 'emotions', 'expressions', 'psychology'] },
  'education-comm': { nameEn: 'Education & Communication', nameUk: 'Освіта та спілкування', nameRu: 'Образование и общение', icon: '📖', difficulty: 'A2-B1', categories: ['education', 'school', 'communication'] },
  'business-finance': { nameEn: 'Business & Finance', nameUk: 'Бізнес та фінанси', nameRu: 'Бизнес и финансы', icon: '💼', difficulty: 'B1-B2', categories: ['business', 'business-extra', 'financial', 'office', 'shipping'] },
  'music-arts': { nameEn: 'Music & Arts', nameUk: 'Музика та мистецтво', nameRu: 'Музыка и искусство', icon: '🎵', difficulty: 'A2-B1', categories: ['music-arts', 'music-instruments', 'photography', 'crafts'] },
  'science-materials': { nameEn: 'Science & Materials', nameUk: 'Наука та матеріали', nameRu: 'Наука и материалы', icon: '🔬', difficulty: 'B1-B2', categories: ['science', 'materials', 'textiles', 'geology', 'ecology', 'astronomy', 'tools', 'tools-extra', 'jewelry'] },
  'grammar-phrases': { nameEn: 'Phrases & Grammar Words', nameUk: 'Фрази та граматика', nameRu: 'Фразы и грамматика', icon: '📝', difficulty: 'A1-B2', categories: ['phrases', 'prepositions', 'conjunctions', 'pronouns', 'time', 'numbers', 'shapes', 'translations'] },
  'miscellaneous': { nameEn: 'Miscellaneous', nameUk: 'Різне', nameRu: 'Разное', icon: '📦', difficulty: 'Mixed', categories: ['dictionary', 'misc', 'nouns-objects'] },
};

function buildCategoryFlashcardSets() {
  const allWords = getAllVocabularyWords();
  const sets = [];
  for (const [groupId, group] of Object.entries(CATEGORY_GROUPS)) {
    const catSet = new Set(group.categories);
    const words = allWords.filter(w => catSet.has(w.source));
    if (words.length === 0) continue;
    sets.push({
      setId: groupId,
      nameEn: group.nameEn,
      nameUk: group.nameUk,
      icon: group.icon,
      difficulty: group.difficulty,
      words: words.map(w => ({ uk: w.uk, en: w.en, phonetic: w.phonetic || '', examples: w.examples || [], examplesEn: w.examplesEn || [] })),
      totalWords: words.length,
      xpPerWord: 10
    });
  }
  return sets;
}

const DICTIONARY_FLASHCARD_SETS = buildCategoryFlashcardSets();

const GRAMMAR_LESSONS = [casesData, verbsData, pronounsData, adjectivesData, wordOrderData];
const DIALOGUES = [restaurantDialogue, directionsDialogue, shoppingDialogue, greetingDialogue];
const ALL_READING_PASSAGES = [
  ...beginnerReading.passages,
  ...intermediateReading.passages,
  ...advancedReading.passages
];

const RU_GRAMMAR_LESSONS = [ruCasesData, ruVerbsData, ruPronounsData, ruAdjectivesData, ruWordOrderData];
const RU_DIALOGUES = [ruRestaurantDialogue, ruDirectionsDialogue, ruShoppingDialogue, ruGreetingDialogue];
const RU_ALL_READING_PASSAGES = [
  ...ruBeginnerReading.passages,
  ...ruIntermediateReading.passages,
  ...ruAdvancedReading.passages
];

function buildCategoryFlashcardSetsForLang(langCode) {
  const allWords = getAllVocabularyWords(langCode);
  const nameField = langCode === 'ru' ? 'nameRu' : 'nameUk';
  const sets = [];
  for (const [groupId, group] of Object.entries(CATEGORY_GROUPS)) {
    const catSet = new Set(group.categories);
    const words = allWords.filter(w => catSet.has(w.source));
    if (words.length === 0) continue;
    sets.push({
      setId: groupId,
      nameEn: group.nameEn,
      nameUk: group[nameField] || group.nameUk,
      icon: group.icon,
      difficulty: group.difficulty,
      words: words.map(w => ({ uk: w.uk, en: w.en, phonetic: w.phonetic || '', examples: w.examples || [], examplesEn: w.examplesEn || [] })),
      totalWords: words.length,
      xpPerWord: 10
    });
  }
  return sets;
}

// All data constants are now imported from separate files (see imports above)

// Text-to-Speech for Ukrainian using local Hugging Face server
let currentAudio = null;
let ttsCancelled = false;

/** Stop any currently playing TTS audio immediately. */
export const stopSpeaking = () => {
  ttsCancelled = true;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
};

export const speakUkrainian = async (text, rate = 0.8, volume = 0.8, lang = 'uk') => {
  if (ttsCancelled) return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  try {
    console.log(`[TTS] Requesting (${lang}): "${text}"`);
    const response = await fetch('/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang })
    });

    if (ttsCancelled) return;
    if (!response.ok) {
      console.log('[TTS] Server error:', response.statusText);
      return;
    }

    const audioBlob = await response.blob();
    if (ttsCancelled) return;
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.playbackRate = rate;
    audio.volume = volume;
    currentAudio = audio;

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = () => resolve();
      audio.onpause = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.play().then(() => {
        console.log(`[TTS] Playing: "${text}"`);
      }).catch(err => {
        console.log('[TTS] Play error:', err.message);
        resolve();
      });
    });
  } catch (err) {
    console.log('[TTS] Error:', err.message);
  }
};

/** Split text into alternating cyrillic/latin chunks for mixed TTS. */
function splitByScript(text) {
  const tokens = text.split(/(\s+)/);
  const chunks = [];
  let current = null;
  for (const token of tokens) {
    const isCyrillic = /[а-яёіїєґА-ЯЁІЇЄҐ]/.test(token);
    const isLatin = /[a-zA-Z]/.test(token);
    const type = isCyrillic ? 'cyrillic' : isLatin ? 'latin' : null;
    if (type === null) {
      if (current) current.text += token;
    } else if (current && current.type === type) {
      current.text += token;
    } else {
      if (current && current.text.trim()) chunks.push(current);
      current = { type, text: token };
    }
  }
  if (current && current.text.trim()) chunks.push(current);
  return chunks;
}

/** Speak mixed-language text: Cyrillic via local model, Latin via English Silero. */
const speakMixed = async (text, rate = 0.8, volume = 0.8, lang = 'uk') => {
  const chunks = splitByScript(text);
  if (chunks.length <= 1 && (!chunks[0] || chunks[0].type === 'cyrillic')) {
    return speakUkrainian(text, rate, volume, lang);
  }
  for (const chunk of chunks) {
    if (ttsCancelled) break;
    if (chunk.type === 'cyrillic') {
      await speakUkrainian(chunk.text, rate, volume, lang);
    } else {
      await speakUkrainian(chunk.text, rate, volume, 'en');
    }
  }
};

export default function UkrainianTypingGame() {
  // Language state
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    try { return localStorage.getItem('typingGameLanguage') || 'uk'; } catch { return 'uk'; }
  });
  const langData = getLanguageData(currentLanguage);

  // TTS wrapper that passes current language, handles mixed Cyrillic/Latin text
  const speak = useCallback((text, rate = 0.8, volume = 0.8) => {
    ttsCancelled = false;
    return speakMixed(text, rate, volume, currentLanguage);
  }, [currentLanguage]);

  // Derived data based on current language
  const CURRENT_KEYBOARD = langData.keyboard;
  const CURRENT_KEY_TO_QWERTY = langData.keyToQwerty;
  const CURRENT_LETTER_INFO = langData.letterInfo;
  const CURRENT_LESSONS = langData.lessons;
  const CURRENT_ALPHABET = langData.alphabetChallenge;
  const CURRENT_TRANSLATIONS = langData.translations;
  const letterField = langData.targetField; // 'uk' or 'ru' - used to access keyboard data
  const phoneticField = langData.phoneticField; // 'ukrainianPhonetic' or 'russianPhonetic'
  const CURRENT_ENCOURAGEMENTS = currentLanguage === 'ru' ? ENCOURAGEMENTS_RU : ENCOURAGEMENTS;
  const CURRENT_MISTAKE_MESSAGES = currentLanguage === 'ru' ? MISTAKE_MESSAGES_RU : MISTAKE_MESSAGES;
  const normalizeVocabSet = (set) => ({
    ...set,
    nameUk: currentLanguage === 'ru' ? set.nameRu || set.nameUk : set.nameUk,
    words: set.words.map(w => ({
      ...w,
      uk: currentLanguage === 'ru' ? (w.ru || w.uk) : w.uk,
      phonetic: currentLanguage === 'ru' ? (w.phoneticRu || w.phonetic || '') : (w.phoneticUk || w.phonetic || ''),
      examples: Array.isArray(w.examples) ? w.examples :
        (w.examples ? (currentLanguage === 'ru' ? (w.examples.ru || []) : (w.examples.uk || [])) : []),
      examplesEn: Array.isArray(w.examples) ? [] :
        (w.examples ? (w.examples.en || []) : [])
    }))
  });
  const CURRENT_VOCAB_THEMES = VOCABULARY_THEMES.map(normalizeVocabSet);
  const CURRENT_ADULT_VOCAB = normalizeVocabSet(ADULT_VOCABULARY);
  const CURRENT_GRAMMAR = currentLanguage === 'ru' ? RU_GRAMMAR_LESSONS : GRAMMAR_LESSONS;
  const CURRENT_DIALOGUES = currentLanguage === 'ru' ? RU_DIALOGUES : DIALOGUES;
  const CURRENT_SENTENCES = currentLanguage === 'ru' ? ruSentenceData : sentenceData;
  const CURRENT_READING = currentLanguage === 'ru' ? RU_ALL_READING_PASSAGES : ALL_READING_PASSAGES;
  const CURRENT_DICT_SETS = buildCategoryFlashcardSetsForLang(currentLanguage);

  // Game state
  const [gameMode, setGameMode] = useState('menu');
  const [exploreSelectedKey, setExploreSelectedKey] = useState(null);
  const [selectedVocabSet, setSelectedVocabSet] = useState(null);
  const [customFlashcards, setCustomFlashcards] = useState([]);
  const audioContextRef = useRef(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showKeyboardSetup, setShowKeyboardSetup] = useState(false);
  
  // Progress tracking (persisted)
  const [xp, setXp] = useState(0);
  const [totalLettersTyped, setTotalLettersTyped] = useState(0);
  const [totalWordsCompleted, setTotalWordsCompleted] = useState(0);
  const [perfectWordsCount, setPerfectWordsCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [recentAchievement, setRecentAchievement] = useState(null);
  const [typedVowels, setTypedVowels] = useState([]);
  const [modeProgress, setModeProgress] = useState({});
  const [vocabularyMastery, setVocabularyMastery] = useState({});
  
  // Settings (persisted)
  const [showTranslations, setShowTranslations] = useState(true);
  const [showPronunciation, setShowPronunciation] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true); // Text-to-speech pronunciation
  const [ttsVolume, setTtsVolume] = useState(0.8); // TTS volume (0.0 to 1.0)
  
  // Current exercise state
  const [currentTarget, setCurrentTarget] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wordMistakes, setWordMistakes] = useState(0);
  const [encouragement, setEncouragement] = useState('');
  const [mistakeMessage, setMistakeMessage] = useState('');
  const [highlightKey, setHighlightKey] = useState('');
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [levelProgress, setLevelProgress] = useState(0);
  const [completedWordInfo, setCompletedWordInfo] = useState(null); // { word, meaning }
  
  // Timing for speed achievement
  const [recentKeyTimes, setRecentKeyTimes] = useState([]);

  // Alphabet mode timing
  const [alphabetLoopHistory, setAlphabetLoopHistory] = useState([]);
  const [alphabetBestTime, setAlphabetBestTime] = useState(null);
  const [alphabetLoopStartTime, setAlphabetLoopStartTime] = useState(null);
  const [showGreenFlash, setShowGreenFlash] = useState(false);

  // Refs
  const inputRef = useRef(null);
  const hasLoadedRef = useRef(false);

  // Load saved progress for current language
  const loadProgress = useCallback((langCode) => {
    const lang = getLanguageData(langCode);
    try {
      const saved = localStorage.getItem(lang.storageKey);
      console.log(`[Save] Loading ${langCode} progress:`, saved ? 'found' : 'none');
      if (saved) {
        const data = JSON.parse(saved);
        setXp(data.xp || 0);
        setTotalLettersTyped(data.totalLettersTyped || 0);
        setTotalWordsCompleted(data.totalWordsCompleted || 0);
        setPerfectWordsCount(data.perfectWordsCount || 0);
        setBestStreak(data.bestStreak || 0);
        setAchievements(data.achievements || []);
        setTypedVowels(data.typedVowels || []);
        setShowTranslations(data.showTranslations !== false);
        setShowPronunciation(data.showPronunciation !== false);
        setSoundEnabled(data.soundEnabled !== false);
        setTtsEnabled(data.ttsEnabled !== false);
        setTtsVolume(data.ttsVolume !== undefined ? data.ttsVolume : 0.8);
        setModeProgress(data.modeProgress || {});
        setVocabularyMastery(data.vocabularyMastery || {});
        setCustomFlashcards(data.customFlashcards || []);
        console.log(`[Save] Restored ${langCode} XP:`, data.xp, 'Letters:', data.totalLettersTyped);
      } else {
        // Reset to defaults for new language
        setXp(0); setTotalLettersTyped(0); setTotalWordsCompleted(0);
        setPerfectWordsCount(0); setBestStreak(0); setAchievements([]);
        setTypedVowels([]); setModeProgress({}); setVocabularyMastery({});
        setCustomFlashcards([]);
      }
    } catch (e) {
      console.log('[Save] Could not load saved progress:', e);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadProgress(currentLanguage);
    setTimeout(() => {
      hasLoadedRef.current = true;
      console.log('[Save] Ready to save');
    }, 100);
  }, []);

  // Save progress when it changes (only after initial load)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      console.log('[Save] Skipping save - not loaded yet');
      return;
    }
    try {
      const data = {
        xp, totalLettersTyped, totalWordsCompleted, perfectWordsCount,
        bestStreak, achievements, typedVowels,
        showTranslations, showPronunciation, soundEnabled, ttsEnabled, ttsVolume,
        modeProgress, vocabularyMastery, customFlashcards
      };
      localStorage.setItem(langData.storageKey, JSON.stringify(data));
      console.log(`[Save] Saved ${currentLanguage} progress - XP:`, xp, 'Letters:', totalLettersTyped);
    } catch (e) {
      console.log('[Save] Could not save progress:', e);
    }
  }, [xp, totalLettersTyped, totalWordsCompleted, perfectWordsCount, bestStreak, achievements, typedVowels, showTranslations, showPronunciation, soundEnabled, ttsEnabled, ttsVolume, modeProgress, vocabularyMastery, customFlashcards, langData.storageKey]);

  // Language switching handler
  const switchLanguage = useCallback((newLang) => {
    if (newLang === currentLanguage) return;
    // Save current progress first (already saved via effect)
    hasLoadedRef.current = false;
    setCurrentLanguage(newLang);
    localStorage.setItem('typingGameLanguage', newLang);
    setGameMode('menu');
    setStreak(0);
    setExploreSelectedKey(null);
    setSelectedVocabSet(null);
    // Load new language progress
    loadProgress(newLang);
    setTimeout(() => { hasLoadedRef.current = true; }, 100);
  }, [currentLanguage, loadProgress]);
  
  // Get unlocked levels based on XP
  const getUnlockedLevels = useCallback(() => {
    const unlocked = [1];
    Object.entries(CURRENT_LESSONS).forEach(([num, lesson]) => {
      if (xp >= lesson.requiredXp) {
        unlocked.push(parseInt(num));
      }
    });
    return [...new Set(unlocked)];
  }, [xp, CURRENT_LESSONS]);
  
  const unlockedLevels = getUnlockedLevels();
  
  // Calculate player level from XP
  const getPlayerLevel = (xp) => {
    if (xp < 150) return 1;
    if (xp < 350) return 2;
    if (xp < 600) return 3;
    if (xp < 900) return 4;
    if (xp < 1250) return 5;
    if (xp < 1650) return 6;
    if (xp < 2100) return 7;
    if (xp < 2600) return 8;
    if (xp < 3200) return 9;
    return 10;
  };
  
  const xpForPlayerLevel = (level) => {
    const thresholds = [0, 150, 350, 600, 900, 1250, 1650, 2100, 2600, 3200, 99999];
    return thresholds[level] || 0;
  };
  
  const playerLevel = getPlayerLevel(xp);

  // Check and award achievements
  const checkAchievements = useCallback((stats) => {
    const { newXp, newStreak, newTotalLetters, newWordsCompleted, newPerfectWords, newTypedVowels } = stats;
    const newAchievements = [...achievements];
    let awarded = null;

    const tryAward = (id) => {
      if (!newAchievements.includes(id)) {
        const achievement = ACHIEVEMENTS.find(a => a.id === id);
        if (achievement) {
          newAchievements.push(id);
          awarded = achievement;
          setXp(prev => prev + achievement.xp);
        }
      }
    };

    // Letter milestones
    if (newTotalLetters >= 1) tryAward('first_letter');
    if (newTotalLetters >= 100) tryAward('hundred_letters');
    if (newTotalLetters >= 500) tryAward('five_hundred');
    if (newTotalLetters >= 1000) tryAward('thousand_letters');
    
    // Streak achievements
    if (newStreak >= 10) tryAward('ten_streak');
    if (newStreak >= 20) tryAward('twenty_streak');
    if (newStreak >= 50) tryAward('fifty_streak');
    
    // Word achievements
    if (newWordsCompleted >= 1) tryAward('first_word');
    
    // Perfect word achievements
    if (newPerfectWords >= 1) tryAward('perfect_word');
    if (newPerfectWords >= 10) tryAward('ten_perfect');
    
    // Level unlocks based on XP thresholds
    if (newXp >= CURRENT_LESSONS[3]?.requiredXp) tryAward('level_3');
    if (newXp >= CURRENT_LESSONS[5]?.requiredXp) tryAward('level_5');
    if (newXp >= CURRENT_LESSONS[10]?.requiredXp) tryAward('level_10');
    if (unlockedLevels.length >= 10) tryAward('polyglot');
    
    // Time-based achievements
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 5) tryAward('night_owl');
    if (hour >= 5 && hour < 7) tryAward('early_bird');
    
    // Vowel master - check if all vowels have been typed
    const allVowels = langData.vowels;
    if (newTypedVowels && allVowels.every(v => newTypedVowels.includes(v))) {
      tryAward('vowel_master');
    }

    if (awarded) {
      setAchievements(newAchievements);
      setRecentAchievement(awarded);
      setTimeout(() => setRecentAchievement(null), 3500);
    }
  }, [achievements, unlockedLevels]);

  // Check speed achievement
  const checkSpeedAchievement = useCallback(() => {
    const now = Date.now();
    const recent = [...recentKeyTimes, now].filter(t => now - t < 3000);
    setRecentKeyTimes(recent);
    
    if (recent.length >= 5 && !achievements.includes('speed_demon')) {
      const achievement = ACHIEVEMENTS.find(a => a.id === 'speed_demon');
      setAchievements(prev => [...prev, 'speed_demon']);
      setXp(prev => prev + achievement.xp);
      setRecentAchievement(achievement);
      setTimeout(() => setRecentAchievement(null), 3000);
    }
  }, [recentKeyTimes, achievements]);

  // Get next target (letter or word)
  const getNextTarget = useCallback((mode, level, currentLetterIndex = 0) => {
    // Alphabet mode
    if (mode === 'alphabet') {
      return CURRENT_ALPHABET.letters[currentLetterIndex % CURRENT_ALPHABET.letters.length];
    }

    const lesson = CURRENT_LESSONS[level];
    if (mode === 'letters' && lesson.letters.length > 0) {
      return lesson.letters[Math.floor(Math.random() * lesson.letters.length)];
    } else {
      return lesson.words[Math.floor(Math.random() * lesson.words.length)];
    }
  }, [CURRENT_LESSONS, CURRENT_ALPHABET]);

  // Start an exercise
  const startExercise = useCallback((mode, level) => {
    setGameMode(mode);
    setCurrentLevel(level);
    setCurrentTarget(getNextTarget(mode, level, 0));
    setCurrentInput('');
    setCurrentIndex(0);
    setMistakes(0);
    setWordMistakes(0);
    setEncouragement('');
    setMistakeMessage('');
    setWordsCompleted(0);
    setLevelProgress(0);

    // Start timer for alphabet mode
    if (mode === 'alphabet') {
      setAlphabetLoopStartTime(Date.now());
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [getNextTarget]);

  // Handle key press
  const handleKeyPress = useCallback((e) => {
    if (gameMode === 'menu') return;

    // In explore mode, map physical key to Ukrainian key and select it
    if (gameMode === 'explore') {
      const pressedKey = e.key.toLowerCase();
      for (const row of CURRENT_KEYBOARD) {
        const keyData = row.find(k => k.qwerty === pressedKey);
        if (keyData) {
          setExploreSelectedKey(keyData);
          if (ttsEnabled) {
            const textToSpeak = keyData[phoneticField] || keyData[letterField];
            speak(textToSpeak, 0.8, ttsVolume);
          }
          break;
        }
      }
      return;
    }
    
    const key = e.key.toLowerCase();
    const targetChar = currentTarget[currentIndex]?.toLowerCase();
    
    if (!targetChar) return;
    
    // Show which key should be pressed
    setHighlightKey(targetChar);
    
    if (key === targetChar || e.key === targetChar) {
      checkSpeedAchievement();

      // Track vowels for achievement
      const vowels = langData.vowels;
      let newTypedVowels = [...typedVowels];
      if (vowels.includes(targetChar) && !typedVowels.includes(targetChar)) {
        newTypedVowels = [...typedVowels, targetChar];
        setTypedVowels(newTypedVowels);
      }

      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setCurrentInput(prev => prev + currentTarget[currentIndex]);

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      const newTotalLetters = totalLettersTyped + 1;
      setTotalLettersTyped(newTotalLetters);

      const lesson = gameMode === 'alphabet' ? CURRENT_ALPHABET : CURRENT_LESSONS[currentLevel];
      setXp(prev => prev + lesson.xpPerLetter);
      setMistakeMessage('');

      // Word/target completed
      if (newIndex >= currentTarget.length) {
        // ALPHABET MODE - Special handling
        if (gameMode === 'alphabet') {
          const nextLetterIndex = wordsCompleted + 1;

          // Speak the letter that was just typed
          if (ttsEnabled) {
            const letterData = CURRENT_LETTER_INFO[targetChar];
            const letterSound = letterData?.[phoneticField] || targetChar;
            speak(letterSound, 0.9, ttsVolume);
          }

          // Check if completed full loop (33 letters)
          if (nextLetterIndex >= lesson.letters.length) {
            // Calculate loop time
            const loopTime = Date.now() - alphabetLoopStartTime;
            const newHistory = [...alphabetLoopHistory, loopTime];
            setAlphabetLoopHistory(newHistory);

            // Update best time
            if (alphabetBestTime === null || loopTime < alphabetBestTime) {
              setAlphabetBestTime(loopTime);
            }

            // Flash green
            setShowGreenFlash(true);
            setTimeout(() => setShowGreenFlash(false), 200);

            // Restart loop immediately after a brief delay
            setTimeout(() => {
              setWordsCompleted(0);
              setCurrentTarget(getNextTarget(gameMode, currentLevel, 0));
              setCurrentInput('');
              setCurrentIndex(0);
              setWordMistakes(0);
              setAlphabetLoopStartTime(Date.now());
            }, 300);
          } else {
            // Move to next letter in alphabet immediately
            setWordsCompleted(nextLetterIndex);
            setCurrentTarget(getNextTarget(gameMode, currentLevel, nextLetterIndex));
            setCurrentInput('');
            setCurrentIndex(0);
            setWordMistakes(0);
          }
        } else {
          // NORMAL MODE
          const newWordsCompleted = wordsCompleted + 1;
          setWordsCompleted(newWordsCompleted);
          setTotalWordsCompleted(prev => prev + 1);
          setXp(prev => prev + lesson.xpPerWord);
          setEncouragement(CURRENT_ENCOURAGEMENTS[Math.floor(Math.random() * CURRENT_ENCOURAGEMENTS.length)]);

          // Show completed word meaning
          const completedTranslation = CURRENT_TRANSLATIONS[currentTarget];
          if (completedTranslation) {
            setCompletedWordInfo({ word: currentTarget, meaning: completedTranslation });
          }

          // Track perfect words
          let newPerfectWords = perfectWordsCount;
          if (wordMistakes === 0) {
            newPerfectWords = perfectWordsCount + 1;
            setPerfectWordsCount(newPerfectWords);
          }

          // Progress tracking (need 10 words to "complete" a session)
          const newProgress = Math.min(100, (newWordsCompleted / 10) * 100);
          setLevelProgress(newProgress);

          // Check all achievements
          checkAchievements({
            newXp: xp + lesson.xpPerLetter + lesson.xpPerWord,
            newStreak,
            newTotalLetters,
            newWordsCompleted: totalWordsCompleted + 1,
            newPerfectWords,
            newTypedVowels
          });

          // Speak letter, then word, then move to next word - all sequentially
          if (ttsEnabled) {
            (async () => {
              const letterData = CURRENT_LETTER_INFO[targetChar];
              const letterSound = letterData?.[phoneticField] || targetChar;
              await speak(letterSound, 0.9, ttsVolume); // Wait for letter to finish
              await speak(currentTarget, 0.75, ttsVolume); // Wait for word to finish

              // Move to next word only after all speech is done
              setCompletedWordInfo(null);
              setCurrentTarget(getNextTarget(gameMode, currentLevel));
              setCurrentInput('');
              setCurrentIndex(0);
              setWordMistakes(0);
              setEncouragement('');
            })();
          } else {
            // If TTS is disabled, move to next word after brief pause
            setTimeout(() => {
              setCompletedWordInfo(null);
              setCurrentTarget(getNextTarget(gameMode, currentLevel));
              setCurrentInput('');
              setCurrentIndex(0);
              setWordMistakes(0);
              setEncouragement('');
            }, 1500); // longer pause to show word meaning
          }
        }
      } else {
        // Not word completion - just speak the letter
        if (ttsEnabled) {
          const letterData = CURRENT_LETTER_INFO[targetChar];
          const textToSpeak = letterData?.[phoneticField] || targetChar;
          speak(textToSpeak, 0.9, ttsVolume);
        }
        // Check achievements for letter progress
        checkAchievements({
          newXp: xp + lesson.xpPerLetter,
          newStreak,
          newTotalLetters,
          newWordsCompleted: totalWordsCompleted,
          newPerfectWords: perfectWordsCount,
          newTypedVowels
        });
      }
    } else if (key.length === 1) {
      // Wrong key
      if (soundEnabled) {
        if (!audioContextRef.current) {
          audioContextRef.current = createAudioContext();
        }
        playSound('wrong', audioContextRef.current);
      }
      setMistakes(prev => prev + 1);
      setWordMistakes(prev => prev + 1);
      setStreak(0);
      setMistakeMessage(CURRENT_MISTAKE_MESSAGES[Math.floor(Math.random() * CURRENT_MISTAKE_MESSAGES.length)]);
      setEncouragement('');
    }
  }, [gameMode, currentTarget, currentIndex, currentLevel, streak, bestStreak, xp,
      totalLettersTyped, totalWordsCompleted, wordsCompleted, wordMistakes, perfectWordsCount,
      typedVowels, soundEnabled, ttsEnabled, checkAchievements, checkSpeedAchievement, getNextTarget,
      alphabetLoopStartTime, alphabetLoopHistory, alphabetBestTime, letterField, phoneticField, langData]);

  // Keyboard listener
  useEffect(() => {
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [handleKeyPress]);

  // Finger color mapping
  const fingerColors = {
    'pinky-l': '#e74c3c',
    'ring-l': '#e67e22', 
    'middle-l': '#f1c40f',
    'index-l': '#2ecc71',
    'index-r': '#2ecc71',
    'middle-r': '#f1c40f',
    'ring-r': '#e67e22',
    'pinky-r': '#e74c3c',
  };

  // Virtual keyboard component with pronunciation hints
  const VirtualKeyboard = ({ highlight }) => (
    <div className="keyboard">
      {CURRENT_KEYBOARD.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard-row">
          {row.map((keyData) => {
            const letter = keyData[letterField];
            const isHighlight = highlight === letter;
            return (
              <div
                key={letter}
                className={`key ${isHighlight ? 'highlight' : ''} ${rowIndex === 1 ? 'home-row' : ''}`}
                style={{ '--finger-color': fingerColors[keyData.finger] }}
                title={showPronunciation ? `Sound: ${keyData.sound}` : ''}
              >
                <span className="uk-letter">{letter}</span>
                <span className="qwerty-letter">{keyData.qwerty}</span>
                {showPronunciation && isHighlight && keyData.sound && (
                  <span className="sound-hint">{keyData.sound}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <div className="keyboard-row">
        <div className={`key space-key ${highlight === ' ' ? 'highlight' : ''}`}>
          <span className="uk-letter">{langData.spaceLabel}</span>
        </div>
      </div>
      <div className="finger-legend">
        <span style={{color: fingerColors['pinky-l']}}>● {currentLanguage === 'ru' ? 'Мизинец' : 'Мізинець'} (Pinky)</span>
        <span style={{color: fingerColors['ring-l']}}>● {currentLanguage === 'ru' ? 'Безымянный' : 'Безіменний'} (Ring)</span>
        <span style={{color: fingerColors['middle-l']}}>● {currentLanguage === 'ru' ? 'Средний' : 'Середній'} (Middle)</span>
        <span style={{color: fingerColors['index-l']}}>● {currentLanguage === 'ru' ? 'Указательный' : 'Вказівний'} (Index)</span>
      </div>
    </div>
  );

  // Progress bar component
  const ProgressBar = ({ value, max, label }) => (
    <div className="progress-container">
      <div className="progress-label">{label}</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <div className="progress-text">{value} / {max}</div>
    </div>
  );

  // Achievement popup with Ukrainian name
  const AchievementPopup = ({ achievement }) => (
    <div className="achievement-popup">
      <div className="achievement-icon">{achievement.icon}</div>
      <div className="achievement-info">
        <div className="achievement-title">🎉 Achievement Unlocked!</div>
        <div className="achievement-name">{achievement.name}</div>
        {achievement.nameUk && <div className="achievement-name-uk">{achievement.nameUk}</div>}
        <div className="achievement-xp">+{achievement.xp} XP</div>
      </div>
    </div>
  );

  // Keyboard setup modal
  const KeyboardSetupModal = () => {
    const langName = langData.name;
    const exampleA = currentLanguage === 'ru' ? 'Ф' : 'Ф';
    const exampleS = currentLanguage === 'ru' ? 'Ы' : 'І';
    const gotIt = currentLanguage === 'ru' ? 'Понятно!' : 'Зрозуміло!';
    return (
      <div className="modal-overlay" onClick={() => setShowKeyboardSetup(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h2>⌨️ Setting Up Your {langName} Keyboard</h2>

          <div className="setup-section">
            <h3>🪟 Windows</h3>
            <ol>
              <li>Go to <strong>Settings → Time & Language → Language</strong></li>
              <li>Click <strong>Add a language</strong></li>
              <li>Search for <strong>{langName}</strong> and install it</li>
              <li>Press <strong>Win + Space</strong> to switch between languages</li>
            </ol>
          </div>

          <div className="setup-section">
            <h3>🍎 Mac</h3>
            <ol>
              <li>Go to <strong>System Preferences → Keyboard → Input Sources</strong></li>
              <li>Click <strong>+</strong> and search for <strong>{langName}</strong></li>
              <li>Add it and check "Show Input menu in menu bar"</li>
              <li>Press <strong>Ctrl + Space</strong> to switch</li>
            </ol>
          </div>

          <div className="setup-section">
            <h3>🐧 Linux</h3>
            <ol>
              <li>Go to <strong>Settings → Region & Language</strong></li>
              <li>Click <strong>+</strong> under Input Sources</li>
              <li>Select <strong>{langName}</strong></li>
              <li>Press <strong>Super + Space</strong> to switch</li>
            </ol>
          </div>

          <div className="setup-tip">
            <strong>💡 Pro Tip:</strong> Your physical keyboard stays the same! When you switch to {langName}, pressing 'A' types '{exampleA}', pressing 'S' types '{exampleS}', etc. The virtual keyboard shows you which physical key to press.
          </div>

          <button className="modal-close-btn" onClick={() => setShowKeyboardSetup(false)}>
            Got it! {gotIt} ✓
          </button>
        </div>
      </div>
    );
  };

  // Level select card with icons and mode selection
  const LevelCard = ({ level, unlocked }) => {
    const lesson = CURRENT_LESSONS[level];
    return (
      <div className={`level-card ${unlocked ? 'unlocked' : 'locked'}`}>
        <div className="level-header">
          <span className="level-icon">{lesson.icon}</span>
          <span className="level-number">Lesson {level}</span>
        </div>
        <div className="level-name">{lesson.name}</div>
        {lesson.nameUk && <div className="level-name-uk">{lesson.nameUk}</div>}
        <div className="level-desc">
          {unlocked ? lesson.description : `🔒 Requires ${lesson.requiredXp} XP`}
        </div>
        {unlocked && (
          <>
            <div className="level-preview">
              {lesson.letters.length > 0 
                ? `Letters: ${lesson.letters.slice(0, 5).join(' ')}${lesson.letters.length > 5 ? '...' : ''}`
                : `Words: ${lesson.words.slice(0, 3).join(', ')}...`
              }
            </div>
            <div className="level-actions">
              {lesson.letters.length > 0 && (
                <button 
                  className="level-btn letters-btn"
                  onClick={(e) => { e.stopPropagation(); startExercise('letters', level); }}
                >
                  Letters
                </button>
              )}
              <button 
                className="level-btn words-btn"
                onClick={(e) => { e.stopPropagation(); startExercise('words', level); }}
              >
                Words
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const currentPlayerLevel = playerLevel;
  const currentLevelXp = xpForPlayerLevel(currentPlayerLevel - 1);
  const nextLevelXp = xpForPlayerLevel(currentPlayerLevel);

  return (
    <div className="game-container">
      {/* Green flash on alphabet loop completion */}
      {showGreenFlash && <div className="green-flash-overlay" />}

      {/* Achievement popup */}
      {recentAchievement && <AchievementPopup achievement={recentAchievement} />}

      {/* Keyboard setup modal */}
      {showKeyboardSetup && <KeyboardSetupModal />}
      
      {/* Header stats */}
      <header className="game-header">
        <div className="header-left">
          <div className="logo" onClick={() => setGameMode('menu')} style={{cursor: 'pointer'}}>
            <span className="logo-icon">{langData.flag}</span>
            <span className="logo-text">{langData.gameName}</span>
          </div>
          <div className="language-switcher">
            {Object.entries(LANGUAGES).map(([code, lang]) => (
              <button
                key={code}
                className={`lang-btn ${currentLanguage === code ? 'active' : ''}`}
                onClick={() => switchLanguage(code)}
                title={lang.name}
              >
                {lang.flag}
              </button>
            ))}
          </div>
        </div>
        <div className="header-center">
          <div className="stat-group">
            <div className="stat">
              <span className="stat-icon">⭐</span>
              <span className="stat-value">Lvl {currentPlayerLevel}</span>
            </div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100}%` }} />
              <span className="xp-text">{xp} XP</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="stat">
            <span className="stat-icon">🔥</span>
            <span className="stat-value">{streak}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">🏆</span>
            <span className="stat-value">{bestStreak}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="game-main">
        {gameMode === 'menu' ? (
          <div className="menu-screen">
            <div className="menu-hero">
              <h1>Learn {langData.name} Typing</h1>
              <p>Master the {langData.name} keyboard one letter at a time!</p>
              
              <div className="quick-stats">
                <div className="quick-stat">
                  <span className="qs-value">{totalLettersTyped}</span>
                  <span className="qs-label">Letters Typed</span>
                </div>
                <div className="quick-stat">
                  <span className="qs-value">{totalWordsCompleted}</span>
                  <span className="qs-label">Words Completed</span>
                </div>
                <div className="quick-stat">
                  <span className="qs-value">{bestStreak}</span>
                  <span className="qs-label">Best Streak</span>
                </div>
              </div>
              
              <div className="menu-actions">
                <button className="explore-button" onClick={() => setGameMode('explore')}>
                  🔍 Explore Keyboard
                </button>
                <button className="setup-button" onClick={() => setShowKeyboardSetup(true)}>
                  ⌨️ Keyboard Setup Guide
                </button>
              </div>
            </div>

            {/* Learning Modes */}
            <div className="new-modes-section">
              <h2>🎯 Learning Modes</h2>
              <p className="section-subtitle">Practice {langData.name} in different ways</p>
              <div className="modes-grid">
                <div className="mode-card" onClick={() => setGameMode('translator')}>
                  <div className="mode-icon">📖</div>
                  <div className="mode-info">
                    <h3>Translator</h3>
                    <p>Look up words and phrases</p>
                  </div>
                </div>
                <div className="mode-card" onClick={() => setGameMode('listening')}>
                  <div className="mode-icon">👂</div>
                  <div className="mode-info">
                    <h3>Listening Practice</h3>
                    <p>Hear words and type what you hear</p>
                  </div>
                </div>
                <div className="mode-card" onClick={() => setGameMode('translation')}>
                  <div className="mode-icon">🔄</div>
                  <div className="mode-info">
                    <h3>Translation Practice</h3>
                    <p>Translate words between languages</p>
                  </div>
                </div>
                <div className="mode-card" onClick={() => setGameMode('grammar')}>
                  <div className="mode-icon">📐</div>
                  <div className="mode-info">
                    <h3>Grammar Lessons</h3>
                    <p>Cases, verbs, pronouns, and more</p>
                  </div>
                </div>
                <div className="mode-card" onClick={() => setGameMode('sentences')}>
                  <div className="mode-icon">🧱</div>
                  <div className="mode-info">
                    <h3>Build Sentences</h3>
                    <p>Arrange words into sentences</p>
                  </div>
                </div>
                <div className="mode-card" onClick={() => setGameMode('dialogue')}>
                  <div className="mode-icon">💬</div>
                  <div className="mode-info">
                    <h3>Dialogue Practice</h3>
                    <p>Practice real conversations</p>
                  </div>
                </div>
                <div className="mode-card" onClick={() => setGameMode('reading')}>
                  <div className="mode-icon">📖</div>
                  <div className="mode-info">
                    <h3>Reading Practice</h3>
                    <p>Read texts and answer questions</p>
                  </div>
                </div>
                <div className="mode-card" onClick={() => setGameMode('stories')}>
                  <div className="mode-icon">📚</div>
                  <div className="mode-info">
                    <h3>Story Time</h3>
                    <p>Read along with stories, click words to learn</p>
                  </div>
                </div>
                <div className="mode-card" onClick={() => setGameMode('chat')}>
                  <div className="mode-icon">🤖</div>
                  <div className="mode-info">
                    <h3>Chat Practice</h3>
                    <p>Free conversation with AI tutor</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alphabet Speed Run Challenge */}
            <div className="alphabet-challenge-section">
              <h2>⚡ Mini-Game Challenge</h2>
              <div className="alphabet-challenge-card">
                <div className="challenge-info">
                  <h3>🔤 {CURRENT_ALPHABET.name}</h3>
                  <p className="challenge-desc">{CURRENT_ALPHABET.description}</p>
                  <p className="challenge-hint">{CURRENT_ALPHABET.hint}</p>
                  {alphabetBestTime && (
                    <p className="challenge-record">🏆 Your Best: {(alphabetBestTime / 1000).toFixed(2)}s</p>
                  )}
                </div>
                <button
                  className="challenge-start-btn"
                  onClick={() => startExercise('alphabet', 0)}
                >
                  Start Challenge
                </button>
              </div>
            </div>

            {/* Vocabulary Flashcards Section */}
            <div className="vocabulary-section">
              <h2>📚 Vocabulary Flashcards</h2>
              <p className="section-subtitle">Master 4000+ {langData.name} words across {CURRENT_DICT_SETS.length + CURRENT_VOCAB_THEMES.length} themed categories</p>

              {/* Random mode */}
              <div className="vocab-themes-grid">
                <div
                  className="vocab-theme-card"
                  style={{ border: '2px solid #ffd700' }}
                  onClick={() => {
                    const allWords = getAllVocabularyWords(currentLanguage);
                    // Fisher-Yates shuffle for no-repeat random
                    const shuffled = [...allWords];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    setSelectedVocabSet({
                      setId: 'random',
                      nameEn: 'Random (All Words)',
                      nameUk: currentLanguage === 'ru' ? 'Случайные (Все слова)' : 'Випадкові (Всі слова)',
                      difficulty: 'Mixed',
                      icon: '🎲',
                      words: shuffled.map(w => ({
                        uk: w.uk,
                        en: w.en,
                        phonetic: w.phonetic || '',
                        examples: w.examples || [],
                        examplesEn: w.examplesEn || []
                      })),
                      totalWords: shuffled.length,
                      xpPerWord: 10
                    });
                    setGameMode('flashcards');
                  }}
                >
                  <div className="theme-icon">🎲</div>
                  <div className="theme-info">
                    <h3>Random (All Words)</h3>
                    <p className="theme-name-uk">{currentLanguage === 'ru' ? 'Случайные (Все слова)' : 'Випадкові (Всі слова)'}</p>
                    <div className="theme-meta">
                      <span className="theme-difficulty" style={{ color: '#ffd700' }}>Mixed</span>
                      <span className="theme-word-count">{getAllVocabularyWords(currentLanguage).length} words</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dictionary category sets - the main bulk of 4000+ words */}
              <h3 style={{ color: '#ffd700', margin: '2rem 0 1rem', fontSize: '1.3rem' }}>📂 By Category</h3>
              <div className="vocab-themes-grid">
                {CURRENT_DICT_SETS.map(set => (
                  <div
                    key={set.setId}
                    className="vocab-theme-card"
                    onClick={() => {
                      setSelectedVocabSet(set);
                      setGameMode('flashcards');
                    }}
                  >
                    <div className="theme-icon">{set.icon}</div>
                    <div className="theme-info">
                      <h3>{set.nameEn}</h3>
                      <p className="theme-name-uk">{set.nameUk}</p>
                      <div className="theme-meta">
                        <span className="theme-difficulty">{set.difficulty}</span>
                        <span className="theme-word-count">{set.totalWords} words</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Beginner themed sets */}
              <h3 style={{ color: '#ffd700', margin: '2rem 0 1rem', fontSize: '1.3rem' }}>🌱 Beginner Sets (with examples)</h3>
              <div className="vocab-themes-grid">
                {CURRENT_VOCAB_THEMES.map(theme => (
                  <div
                    key={theme.setId}
                    className="vocab-theme-card"
                    onClick={() => {
                      setSelectedVocabSet(theme);
                      setGameMode('flashcards');
                    }}
                  >
                    <div className="theme-icon">{theme.icon}</div>
                    <div className="theme-info">
                      <h3>{theme.nameEn}</h3>
                      <p className="theme-name-uk">{theme.nameUk}</p>
                      <div className="theme-meta">
                        <span className="theme-difficulty">{theme.difficulty}</span>
                        <span className="theme-word-count">{theme.totalWords} words</span>
                      </div>
                    </div>
                  </div>
                ))}
                {/* My Words custom flashcard card */}
                {customFlashcards.length > 0 && (
                  <div
                    className="vocab-theme-card custom-words-card"
                    onClick={() => {
                      setSelectedVocabSet({
                        setId: 'custom',
                        nameEn: 'My Words',
                        nameUk: 'Мої слова',
                        difficulty: 'Custom',
                        icon: '✏️',
                        words: customFlashcards.map(w => ({
                          uk: w.uk,
                          en: w.en,
                          phonetic: w.phonetic || '',
                          examples: w.examples || []
                        })),
                        totalWords: customFlashcards.length,
                        xpPerWord: 15
                      });
                      setGameMode('flashcards');
                    }}
                  >
                    <div className="theme-icon">✏️</div>
                    <div className="theme-info">
                      <h3>My Words</h3>
                      <p className="theme-name-uk">Мої слова</p>
                      <div className="theme-meta">
                        <span className="theme-difficulty">Custom</span>
                        <span className="theme-word-count">{customFlashcards.length} words</span>
                      </div>
                    </div>
                  </div>
                )}
                {/* Adult 18+ vocabulary */}
                <div
                  className="vocab-theme-card"
                  style={{ border: '2px solid #e74c3c', opacity: 0.9 }}
                  onClick={() => {
                    setSelectedVocabSet(CURRENT_ADULT_VOCAB);
                    setGameMode('flashcards');
                  }}
                >
                  <div className="theme-icon">{CURRENT_ADULT_VOCAB.icon}</div>
                  <div className="theme-info">
                    <h3>{CURRENT_ADULT_VOCAB.nameEn}</h3>
                    <p className="theme-name-uk">{CURRENT_ADULT_VOCAB.nameUk}</p>
                    <div className="theme-meta">
                      <span className="theme-difficulty" style={{ color: '#e74c3c' }}>{CURRENT_ADULT_VOCAB.difficulty}</span>
                      <span className="theme-word-count">{CURRENT_ADULT_VOCAB.totalWords} words</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Flashcard Manager */}
              <CustomFlashcardManager
                langCode={currentLanguage}
                customWords={customFlashcards}
                onSave={(updated) => setCustomFlashcards(updated)}
                onSpeak={speak}
                ttsEnabled={ttsEnabled}
                ttsVolume={ttsVolume}
              />
            </div>

            <div className="level-grid">
              {Object.keys(CURRENT_LESSONS).map(level => (
                <LevelCard
                  key={level}
                  level={parseInt(level)}
                  unlocked={unlockedLevels.includes(parseInt(level))}
                />
              ))}
            </div>

            <div className="achievements-section">
              <h2>🏅 Achievements ({achievements.length}/{ACHIEVEMENTS.length})</h2>
              <div className="achievements-grid">
                {ACHIEVEMENTS.map(a => (
                  <div 
                    key={a.id} 
                    className={`achievement-badge ${achievements.includes(a.id) ? 'earned' : 'locked'}`}
                    title={`${a.name}: ${a.desc}`}
                  >
                    <span className="badge-icon">{a.icon}</span>
                    <span className="badge-name">{a.name}</span>
                    {a.nameUk && achievements.includes(a.id) && (
                      <span className="badge-name-uk">{a.nameUk}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="settings-section">
              <h2>⚙️ Settings / Налаштування</h2>
              <div className="settings-grid">
                <label className="setting-toggle">
                  <input 
                    type="checkbox" 
                    checked={showTranslations} 
                    onChange={e => setShowTranslations(e.target.checked)} 
                  />
                  <span>Show English translations</span>
                </label>
                <label className="setting-toggle">
                  <input 
                    type="checkbox" 
                    checked={showPronunciation} 
                    onChange={e => setShowPronunciation(e.target.checked)} 
                  />
                  <span>Show pronunciation hints</span>
                </label>
                <label className="setting-toggle">
                  <input 
                    type="checkbox" 
                    checked={soundEnabled} 
                    onChange={e => setSoundEnabled(e.target.checked)} 
                  />
                  <span>Sound effects</span>
                </label>
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={ttsEnabled}
                    onChange={e => setTtsEnabled(e.target.checked)}
                  />
                  <span>🔊 Speak letters & words (TTS)</span>
                </label>
                <label className="setting-slider">
                  <span>🔊 TTS Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ttsVolume * 100}
                    onChange={e => setTtsVolume(e.target.value / 100)}
                    disabled={!ttsEnabled}
                  />
                  <span className="slider-value">{Math.round(ttsVolume * 100)}%</span>
                </label>
                <div className="tts-test">
                  <button
                    className="tts-test-btn"
                    onClick={() => speak(langData.ttsTestText, 0.8, ttsVolume)}
                  >
                    🔊 Test TTS: "{langData.ttsTestPhrase}"
                  </button>
                  <span className="tts-hint">Click to test if {langData.name} speech works on your browser</span>
                </div>
              </div>
            </div>
          </div>
        ) : gameMode === 'explore' ? (
          <div className="explore-screen">
            <button className="back-button" onClick={() => { setGameMode('menu'); setExploreSelectedKey(null); }}>
              ← Back to Menu
            </button>
            
            <div className="explore-header">
              <h2>🔍 Explore the {langData.name} Keyboard</h2>
              <p>Click any key to learn about it! {currentLanguage === 'ru' ? 'Познакомься с клавиатурой!' : 'Познайомся з клавіатурою!'}</p>
            </div>

            <div className="keyboard explore-mode">
              {CURRENT_KEYBOARD.map((row, rowIndex) => (
                <div key={rowIndex} className="keyboard-row">
                  {row.map((keyData) => {
                    const keyLetter = keyData[letterField];
                    const isSelected = exploreSelectedKey?.[letterField] === keyLetter;
                    return (
                      <div
                        key={keyLetter}
                        className={`key ${isSelected ? 'selected' : ''} ${rowIndex === 1 ? 'home-row' : ''}`}
                        onClick={() => {
                          setExploreSelectedKey(keyData);
                          if (ttsEnabled) {
                            const textToSpeak = keyData[phoneticField] || keyLetter;
                            speak(textToSpeak, 0.8, ttsVolume);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="uk-letter">{keyLetter}</span>
                        <span className="qwerty-letter">{keyData.qwerty}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="keyboard-row">
                <div
                  className="key space-key"
                  onClick={() => {
                    if (ttsEnabled) {
                      speak(currentLanguage === 'ru' ? 'пробел' : 'пробіл', 0.8, ttsVolume);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="uk-letter">{langData.spaceLabel}</span>
                </div>
              </div>
            </div>
            
            {exploreSelectedKey ? (
              <div className="key-info-panel">
                <div className="key-info-main">
                  <div className="key-info-letter">{exploreSelectedKey[letterField].toUpperCase()}</div>
                  <div className="key-info-letter-lower">{exploreSelectedKey[letterField]}</div>
                  <button
                    className="hear-button"
                    onClick={() => speak(exploreSelectedKey[letterField], 0.7, ttsVolume)}
                  >
                    🔊 Hear it
                  </button>
                </div>
                <div className="key-info-details">
                  <div className="info-row">
                    <span className="info-label">Physical key:</span>
                    <span className="info-value keyboard-key">{exploreSelectedKey.qwerty.toUpperCase()}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Sound:</span>
                    <span className="info-value sound-value">{exploreSelectedKey.sound}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Finger:</span>
                    <span className="info-value">{exploreSelectedKey.finger.replace('-l', ' (left hand)').replace('-r', ' (right hand)')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="key-info-panel empty">
                <p>👆 Click a key above to see details</p>
                <p className="hint-uk">{currentLanguage === 'ru' ? 'Нажми на клавишу выше' : 'Натисни на клавішу вище'}</p>
              </div>
            )}
            
            <div className="explore-tips">
              <h3>💡 Quick Tips</h3>
              <ul>
                <li><strong>Home row:</strong> Keep your fingers on {langData.homeRowLetters} (middle row)</li>
                <li><strong>Vowels:</strong> {langData.vowelsNote}</li>
                <li><strong>{langData.softSignNote}</strong></li>
                <li><strong>Unique letters:</strong> {langData.uniqueLettersNote}</li>
              </ul>
            </div>
          </div>
        ) : gameMode === 'flashcards' ? (
          <FlashcardMode
            langCode={currentLanguage}
            vocabularySet={selectedVocabSet}
            ttsEnabled={ttsEnabled}
            ttsVolume={ttsVolume}
            onSpeak={speak}
            onExit={() => {
              setGameMode('menu');
              setSelectedVocabSet(null);
            }}
            onComplete={(stats) => {
              console.log('[Flashcards] Session complete:', stats);
              // Award bonus XP for completing the set
              setXp(prev => prev + 50);
              // Check achievements
              const totalMastered = Object.keys(vocabularyMastery).length;
              if (totalMastered >= 10 && !achievements.includes('vocab_10')) {
                setAchievements(prev => [...prev, 'vocab_10']);
                setRecentAchievement(ACHIEVEMENTS.find(a => a.id === 'vocab_10'));
              }
              if (totalMastered >= 50 && !achievements.includes('vocab_50')) {
                setAchievements(prev => [...prev, 'vocab_50']);
                setRecentAchievement(ACHIEVEMENTS.find(a => a.id === 'vocab_50'));
              }
              // Return to menu
              setGameMode('menu');
              setSelectedVocabSet(null);
            }}
            onAddXP={(amount) => setXp(prev => prev + amount)}
            onTrackProgress={(mode, data) => {
              setModeProgress(prev => ({
                ...prev,
                [mode]: {
                  ...(prev[mode] || {}),
                  ...data,
                  lastStudied: new Date().toISOString()
                }
              }));
              // Track vocabulary mastery
              if (data.word) {
                setVocabularyMastery(prev => ({
                  ...prev,
                  [data.word]: {
                    ...(prev[data.word] || { timesCorrect: 0, timesWrong: 0 }),
                    timesCorrect: (prev[data.word]?.timesCorrect || 0) + (data.mastered ? 1 : 0),
                    lastReviewed: new Date().toISOString(),
                    masteryLevel: data.mastered ? 1 : (prev[data.word]?.masteryLevel || 0),
                    modesUsed: ['flashcards']
                  }
                }));
              }
            }}
          />
        ) : gameMode === 'translator' ? (
          <TranslatorMode
            langCode={currentLanguage}
            onSpeak={speak}
            ttsEnabled={ttsEnabled}
            ttsVolume={ttsVolume}
            onExit={() => setGameMode('menu')}
            onAddXP={(amount) => setXp(prev => prev + amount)}
          />
        ) : gameMode === 'listening' ? (
          <ListeningMode
            langCode={currentLanguage}
            onSpeak={speak}
            ttsEnabled={ttsEnabled}
            ttsVolume={ttsVolume}
            onExit={() => setGameMode('menu')}
            onComplete={(stats) => {
              console.log('[Listening] Session complete:', stats);
              setGameMode('menu');
            }}
            onAddXP={(amount) => setXp(prev => prev + amount)}
            onTrackProgress={(mode, data) => {
              setModeProgress(prev => ({
                ...prev,
                [mode]: { ...(prev[mode] || {}), ...data, lastStudied: new Date().toISOString() }
              }));
            }}
          />
        ) : gameMode === 'translation' ? (
          <TranslationPracticeMode
            langCode={currentLanguage}
            onSpeak={speak}
            ttsEnabled={ttsEnabled}
            ttsVolume={ttsVolume}
            onExit={() => setGameMode('menu')}
            onComplete={(stats) => {
              console.log('[Translation] Session complete:', stats);
              setGameMode('menu');
            }}
            onAddXP={(amount) => setXp(prev => prev + amount)}
            onTrackProgress={(mode, data) => {
              setModeProgress(prev => ({
                ...prev,
                [mode]: { ...(prev[mode] || {}), ...data, lastStudied: new Date().toISOString() }
              }));
            }}
          />
        ) : gameMode === 'grammar' ? (
          <GrammarMode
            langCode={currentLanguage}
            grammarLessons={CURRENT_GRAMMAR}
            onSpeak={speak}
            ttsEnabled={ttsEnabled}
            ttsVolume={ttsVolume}
            onExit={() => setGameMode('menu')}
            onComplete={(stats) => {
              console.log('[Grammar] Lesson complete:', stats);
            }}
            onAddXP={(amount) => setXp(prev => prev + amount)}
            onTrackProgress={(mode, data) => {
              setModeProgress(prev => ({
                ...prev,
                [mode]: { ...(prev[mode] || {}), ...data, lastStudied: new Date().toISOString() }
              }));
            }}
          />
        ) : gameMode === 'sentences' ? (
          <SentenceMode
            langCode={currentLanguage}
            sentenceData={CURRENT_SENTENCES.sentences}
            onSpeak={speak}
            ttsEnabled={ttsEnabled}
            ttsVolume={ttsVolume}
            onExit={() => setGameMode('menu')}
            onComplete={(stats) => {
              console.log('[Sentences] Session complete:', stats);
              setGameMode('menu');
            }}
            onAddXP={(amount) => setXp(prev => prev + amount)}
            onTrackProgress={(mode, data) => {
              setModeProgress(prev => ({
                ...prev,
                [mode]: { ...(prev[mode] || {}), ...data, lastStudied: new Date().toISOString() }
              }));
            }}
          />
        ) : gameMode === 'dialogue' ? (
          <DialogueMode
            langCode={currentLanguage}
            dialogues={CURRENT_DIALOGUES}
            onSpeak={speak}
            ttsEnabled={ttsEnabled}
            ttsVolume={ttsVolume}
            onExit={() => setGameMode('menu')}
            onComplete={(stats) => {
              console.log('[Dialogue] Complete:', stats);
            }}
            onAddXP={(amount) => setXp(prev => prev + amount)}
            onTrackProgress={(mode, data) => {
              setModeProgress(prev => ({
                ...prev,
                [mode]: { ...(prev[mode] || {}), ...data, lastStudied: new Date().toISOString() }
              }));
            }}
          />
        ) : gameMode === 'reading' ? (
          <ReadingMode
            langCode={currentLanguage}
            passages={CURRENT_READING}
            onSpeak={speak}
            ttsEnabled={ttsEnabled}
            ttsVolume={ttsVolume}
            onExit={() => setGameMode('menu')}
            onComplete={(stats) => {
              console.log('[Reading] Complete:', stats);
            }}
            onAddXP={(amount) => setXp(prev => prev + amount)}
            onTrackProgress={(mode, data) => {
              setModeProgress(prev => ({
                ...prev,
                [mode]: { ...(prev[mode] || {}), ...data, lastStudied: new Date().toISOString() }
              }));
            }}
          />
        ) : gameMode === 'stories' ? (
          <StoryMode
            langCode={currentLanguage}
            stories={ALL_STORIES}
            onSpeak={speak}
            ttsEnabled={ttsEnabled}
            ttsVolume={ttsVolume}
            onExit={() => setGameMode('menu')}
            onAddXP={(amount) => setXp(prev => prev + amount)}
          />
        ) : gameMode === 'chat' ? (
          <ChatMode
            langCode={currentLanguage}
            onSpeak={speak}
            ttsEnabled={ttsEnabled}
            ttsVolume={ttsVolume}
            onExit={() => setGameMode('menu')}
            onAddXP={(amount) => setXp(prev => prev + amount)}
          />
        ) : (
          <div className="practice-screen">
            <button className="back-button" onClick={() => setGameMode('menu')}>
              ← Back to Menu
            </button>

            {gameMode !== 'alphabet' && (
              <div className="lesson-header">
                <h2>{CURRENT_LESSONS[currentLevel].name}</h2>
                {CURRENT_LESSONS[currentLevel].nameUk && <p className="lesson-name-uk">{CURRENT_LESSONS[currentLevel].nameUk}</p>}
                <p>{CURRENT_LESSONS[currentLevel].hint}</p>
              </div>
            )}

            {/* Alphabet mode header and stats */}
            {gameMode === 'alphabet' && (
              <>
                <div className="lesson-header">
                  <h2>{CURRENT_ALPHABET.name}</h2>
                  <p className="lesson-name-uk">{CURRENT_ALPHABET.nameUk}</p>
                  <p>{CURRENT_ALPHABET.hint}</p>
                </div>
                <div className="alphabet-stats">
                  <div className="stat-box">
                    <div className="stat-label">Current Progress</div>
                    <div className="stat-value">{wordsCompleted + 1} / {CURRENT_ALPHABET.letters.length}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Best Time</div>
                    <div className="stat-value">
                      {alphabetBestTime ? `${(alphabetBestTime / 1000).toFixed(2)}s` : '--'}
                    </div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Last Loop</div>
                    <div className="stat-value">
                      {alphabetLoopHistory.length > 0
                        ? `${(alphabetLoopHistory[alphabetLoopHistory.length - 1] / 1000).toFixed(2)}s`
                        : '--'}
                    </div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Total Loops</div>
                    <div className="stat-value">{alphabetLoopHistory.length}</div>
                  </div>
                </div>
              </>
            )}

            {gameMode !== 'alphabet' && (
              <div className="progress-section">
                <ProgressBar
                  value={wordsCompleted}
                  max={10}
                  label="Session Progress"
                />
              </div>
            )}

            <div className="typing-area">
              <div className="target-display">
                {currentTarget.split('').map((char, i) => (
                  <span 
                    key={i}
                    className={`target-char ${i < currentIndex ? 'completed' : ''} ${i === currentIndex ? 'current' : ''}`}
                  >
                    {char === ' ' ? '␣' : char}
                  </span>
                ))}
              </div>
              
              {/* Show translation if enabled */}
              {showTranslations && CURRENT_TRANSLATIONS[currentTarget] && (
                <div className="word-translation">
                  "{CURRENT_TRANSLATIONS[currentTarget]}"
                </div>
              )}

              {/* Show completed word meaning */}
              {completedWordInfo && (
                <div className="completed-word-meaning">
                  <span className="completed-word">{completedWordInfo.word}</span>
                  <span className="completed-equals"> = </span>
                  <span className="completed-meaning">"{completedWordInfo.meaning}"</span>
                </div>
              )}

              <div className="feedback-area">
                {encouragement && <div className="encouragement">{encouragement}</div>}
                {mistakeMessage && <div className="mistake-message">{mistakeMessage}</div>}
              </div>

              <div className="input-hint">
                {currentIndex < currentTarget.length && (
                  <p>
                    Type: <strong>{currentTarget[currentIndex]}</strong> 
                    {CURRENT_KEY_TO_QWERTY[currentTarget[currentIndex]?.toLowerCase()] && (
                      <span className="key-hint"> (press '{CURRENT_KEY_TO_QWERTY[currentTarget[currentIndex]?.toLowerCase()]}' key)</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <VirtualKeyboard highlight={currentTarget[currentIndex]} />

            <div className="session-stats">
              <div className="session-stat">
                <span className="stat-label">Letters typed</span>
                <span className="stat-number">{currentIndex}</span>
              </div>
              <div className="session-stat">
                <span className="stat-label">Mistakes</span>
                <span className="stat-number">{mistakes}</span>
              </div>
              <div className="session-stat">
                <span className="stat-label">Accuracy</span>
                <span className="stat-number">
                  {currentIndex > 0 ? Math.round((currentIndex / (currentIndex + mistakes)) * 100) : 100}%
                </span>
              </div>
            </div>

            {/* Hidden input for mobile */}
            <input 
              ref={inputRef}
              className="hidden-input"
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@400;600;700;800&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .game-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          color: #fff;
          font-family: 'Nunito', sans-serif;
          overflow-x: hidden;
        }

        /* Pixel pattern overlay */
        .game-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 25% 25%, rgba(255,215,0,0.03) 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, rgba(0,87,183,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
          z-index: 0;
        }

        /* Header */
        .game-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: rgba(0,0,0,0.3);
          border-bottom: 3px solid #ffd700;
          position: relative;
          z-index: 10;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-icon {
          font-size: 2rem;
        }

        .logo-text {
          font-family: 'Press Start 2P', cursive;
          font-size: 1rem;
          color: #ffd700;
          text-shadow: 2px 2px 0 #0057b7;
        }

        .language-switcher {
          display: flex;
          gap: 0.25rem;
          margin-left: 0.75rem;
        }

        .lang-btn {
          background: rgba(255,255,255,0.1);
          border: 2px solid transparent;
          border-radius: 8px;
          font-size: 1.3rem;
          padding: 0.25rem 0.4rem;
          cursor: pointer;
          transition: all 0.2s;
          line-height: 1;
        }

        .lang-btn:hover {
          background: rgba(255,255,255,0.2);
          transform: scale(1.1);
        }

        .lang-btn.active {
          border-color: #ffd700;
          background: rgba(255,215,0,0.2);
          box-shadow: 0 0 8px rgba(255,215,0,0.4);
        }

        .header-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .stat-group {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,255,255,0.1);
          padding: 0.5rem 1rem;
          border-radius: 20px;
        }

        .stat-icon {
          font-size: 1.2rem;
        }

        .stat-value {
          font-weight: 700;
          font-size: 1.1rem;
        }

        .xp-bar {
          width: 150px;
          height: 24px;
          background: rgba(0,0,0,0.4);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          border: 2px solid #ffd700;
        }

        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #ffd700, #ffed4a);
          transition: width 0.3s ease;
        }

        .xp-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.75rem;
          font-weight: 700;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }

        .header-right {
          display: flex;
          gap: 1rem;
        }

        /* Main content */
        .game-main {
          padding: 2rem;
          position: relative;
          z-index: 5;
        }

        .game-main:has(.chat-root) {
          padding: 0;
          height: calc(100vh - 60px);
        }

        /* Menu screen */
        .menu-screen {
          max-width: 1200px;
          margin: 0 auto;
        }

        .menu-hero {
          text-align: center;
          margin-bottom: 3rem;
        }

        .menu-hero h1 {
          font-family: 'Press Start 2P', cursive;
          font-size: 1.5rem;
          color: #ffd700;
          text-shadow: 3px 3px 0 #0057b7;
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .menu-hero p {
          font-size: 1.2rem;
          opacity: 0.9;
        }

        .hint-text {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(255,215,0,0.1);
          border-radius: 10px;
          border: 1px solid rgba(255,215,0,0.3);
          font-size: 1rem !important;
        }

        /* Level grid */
        .level-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .level-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          border-radius: 16px;
          padding: 1.5rem;
          cursor: default;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .level-card.unlocked:hover {
          transform: translateY(-5px);
          border-color: #ffd700;
          box-shadow: 0 10px 30px rgba(255,215,0,0.2);
        }

        .level-card.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .level-card.locked::after {
          content: '🔒';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 3rem;
          opacity: 0.3;
        }

        .level-number {
          font-family: 'Press Start 2P', cursive;
          font-size: 2rem;
          color: #ffd700;
          margin-bottom: 0.5rem;
        }

        .level-name {
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .level-desc {
          font-size: 0.95rem;
          opacity: 0.8;
          margin-bottom: 0.75rem;
        }

        .level-preview {
          font-size: 0.85rem;
          padding: 0.5rem;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          font-family: monospace;
        }

        /* Achievements */
        .achievements-section {
          background: rgba(0,0,0,0.2);
          border-radius: 20px;
          padding: 2rem;
        }

        .achievements-section h2 {
          text-align: center;
          margin-bottom: 1.5rem;
          color: #ffd700;
        }

        .achievements-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
        }

        .achievement-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          min-width: 100px;
          transition: all 0.3s ease;
        }

        .achievement-badge.earned {
          background: linear-gradient(145deg, rgba(255,215,0,0.2), rgba(255,215,0,0.1));
          border: 2px solid #ffd700;
        }

        .achievement-badge.locked {
          opacity: 0.4;
          filter: grayscale(1);
        }

        .badge-icon {
          font-size: 2rem;
        }

        .badge-name {
          font-size: 0.75rem;
          text-align: center;
          font-weight: 600;
        }

        /* Practice screen */
        .practice-screen {
          max-width: 900px;
          margin: 0 auto;
        }

        .back-button {
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          color: #fff;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-family: inherit;
          transition: all 0.3s ease;
          margin-bottom: 1.5rem;
        }

        .back-button:hover {
          background: rgba(255,255,255,0.2);
          border-color: #ffd700;
        }

        .lesson-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .lesson-header h2 {
          font-family: 'Press Start 2P', cursive;
          font-size: 1.2rem;
          color: #ffd700;
          margin-bottom: 0.75rem;
        }

        .lesson-header p {
          opacity: 0.8;
        }

        /* Progress section */
        .progress-section {
          margin-bottom: 2rem;
        }

        .progress-container {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .progress-label {
          font-weight: 600;
          min-width: 140px;
        }

        .progress-bar {
          flex: 1;
          height: 20px;
          background: rgba(0,0,0,0.4);
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.2);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #0057b7, #ffd700);
          transition: width 0.3s ease;
        }

        .progress-text {
          min-width: 60px;
          text-align: right;
          font-weight: 600;
        }

        /* Typing area */
        .typing-area {
          background: rgba(0,0,0,0.3);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          text-align: center;
          border: 3px solid rgba(255,215,0,0.3);
        }

        .target-display {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          letter-spacing: 0.1em;
          min-height: 4rem;
        }

        .target-char {
          display: inline-block;
          padding: 0.2em 0.1em;
          transition: all 0.2s ease;
        }

        .target-char.completed {
          color: #4ade80;
          text-shadow: 0 0 10px rgba(74,222,128,0.5);
        }

        .target-char.current {
          color: #ffd700;
          background: rgba(255,215,0,0.2);
          border-radius: 8px;
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .feedback-area {
          min-height: 2rem;
          margin-bottom: 1rem;
        }

        .encouragement {
          font-size: 1.5rem;
          color: #4ade80;
          font-weight: 700;
          animation: bounceIn 0.5s ease;
        }

        .mistake-message {
          font-size: 1.2rem;
          color: #f87171;
          font-weight: 600;
        }

        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }

        .input-hint {
          font-size: 1.1rem;
        }

        .input-hint strong {
          font-size: 1.5rem;
          color: #ffd700;
        }

        .key-hint {
          opacity: 0.7;
          font-size: 0.95rem;
        }

        /* Virtual keyboard */
        .keyboard {
          background: rgba(0,0,0,0.4);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .keyboard-row {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .keyboard-row:nth-child(2) {
          margin-left: 20px;
        }

        .keyboard-row:nth-child(3) {
          margin-left: 40px;
        }

        .key {
          width: 50px;
          height: 55px;
          background: linear-gradient(145deg, #3a3a5c, #2a2a4c);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          border: 2px solid rgba(255,255,255,0.1);
          position: relative;
        }

        .key.home-row {
          border-bottom: 3px solid rgba(255,215,0,0.5);
        }

        .key.highlight {
          background: linear-gradient(145deg, #ffd700, #e6c200);
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(255,215,0,0.5);
          border-color: #fff;
        }

        .key.highlight .uk-letter {
          color: #1a1a2e;
        }

        .uk-letter {
          font-size: 1.3rem;
          font-weight: 700;
          color: #fff;
        }

        .qwerty-letter {
          font-size: 0.65rem;
          opacity: 0.5;
          margin-top: 2px;
          text-transform: uppercase;
        }

        .space-key {
          width: 250px;
        }

        /* Session stats */
        .session-stats {
          display: flex;
          justify-content: center;
          gap: 2rem;
        }

        .session-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .stat-label {
          font-size: 0.85rem;
          opacity: 0.7;
        }

        .stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffd700;
        }

        /* Achievement popup */
        .achievement-popup {
          position: fixed;
          top: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(145deg, #2a2a4c, #1a1a2e);
          border: 3px solid #ffd700;
          border-radius: 16px;
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          z-index: 100;
          animation: slideDown 0.5s ease, fadeOut 0.5s ease 2.5s forwards;
          box-shadow: 0 10px 40px rgba(255,215,0,0.3);
        }

        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        @keyframes fadeOut {
          to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }

        .achievement-icon {
          font-size: 3rem;
        }

        .achievement-info {
          display: flex;
          flex-direction: column;
        }

        .achievement-title {
          font-size: 0.85rem;
          opacity: 0.8;
          margin-bottom: 0.25rem;
        }

        .achievement-name {
          font-size: 1.3rem;
          font-weight: 700;
          color: #ffd700;
        }

        .achievement-xp {
          color: #4ade80;
          font-weight: 600;
        }

        /* Hidden input for mobile */
        .hidden-input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .game-header {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }

          .header-center {
            order: -1;
          }

          .menu-hero h1 {
            font-size: 1rem;
          }

          .target-display {
            font-size: 2rem;
          }

          .key {
            width: 32px;
            height: 40px;
          }

          .uk-letter {
            font-size: 1rem;
          }

          .qwerty-letter {
            font-size: 0.5rem;
          }

          .space-key {
            width: 150px;
          }

          .level-grid {
            grid-template-columns: 1fr;
          }

          .session-stats {
            flex-wrap: wrap;
          }
        }
        
        /* New styles for v2 features */
        
        .quick-stats {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin: 1.5rem 0;
        }
        
        .quick-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .qs-value {
          font-size: 2rem;
          font-weight: 800;
          color: #ffd700;
        }
        
        .qs-label {
          font-size: 0.85rem;
          opacity: 0.7;
        }
        
        .menu-actions {
          margin-top: 1.5rem;
          gap: 1rem;
        }
        
        .explore-button {
          background: linear-gradient(135deg, rgba(0,87,183,0.3), rgba(0,87,183,0.2));
          border: 2px solid rgba(0,87,183,0.5);
          color: #fff;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          cursor: pointer;
          font-size: 1rem;
          font-family: inherit;
          transition: all 0.3s;
        }
        
        .explore-button:hover {
          background: rgba(0,87,183,0.4);
          border-color: #4dabf7;
          transform: translateY(-2px);
        }
        
        .setup-button {
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          color: #fff;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          cursor: pointer;
          font-size: 1rem;
          font-family: inherit;
          transition: all 0.3s;
        }
        
        .setup-button:hover {
          background: rgba(255,255,255,0.2);
          border-color: #ffd700;
        }
        
        /* Explore Screen */
        .explore-screen {
          max-width: 900px;
          margin: 0 auto;
        }
        
        .explore-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .explore-header h2 {
          font-family: 'Press Start 2P', cursive;
          font-size: 1rem;
          color: #ffd700;
          margin-bottom: 0.5rem;
        }
        
        .explore-header p {
          opacity: 0.8;
        }
        
        .keyboard.explore-mode .key {
          transition: all 0.2s;
        }
        
        .keyboard.explore-mode .key:hover {
          transform: scale(1.15);
          z-index: 10;
        }
        
        .keyboard.explore-mode .key.selected {
          background: linear-gradient(145deg, #ffd700, #e6c200);
          transform: scale(1.15);
          box-shadow: 0 0 25px rgba(255,215,0,0.6);
          border-color: #fff;
        }
        
        .keyboard.explore-mode .key.selected .uk-letter {
          color: #1a1a2e;
        }
        
        .key-info-panel {
          margin-top: 2rem;
          background: rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          gap: 2rem;
          border: 2px solid rgba(255,215,0,0.2);
        }
        
        .key-info-panel.empty {
          flex-direction: column;
          text-align: center;
          opacity: 0.7;
        }
        
        .key-info-panel.empty .hint-uk {
          font-size: 0.9rem;
          opacity: 0.6;
        }
        
        .key-info-main {
          text-align: center;
        }
        
        .key-info-letter {
          font-size: 4rem;
          font-weight: 800;
          color: #ffd700;
          line-height: 1;
        }
        
        .key-info-letter-lower {
          font-size: 1.5rem;
          opacity: 0.6;
        }
        
        .hear-button {
          margin-top: 0.75rem;
          background: linear-gradient(135deg, #4dabf7, #339af0);
          border: none;
          color: #fff;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: inherit;
          transition: all 0.2s;
        }
        
        .hear-button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(77,171,247,0.4);
        }
        
        .hear-button:active {
          transform: scale(0.98);
        }
        
        .key-info-details {
          flex: 1;
        }
        
        .info-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .info-label {
          font-weight: 600;
          opacity: 0.7;
          min-width: 100px;
        }
        
        .info-value {
          font-size: 1.1rem;
        }
        
        .keyboard-key {
          background: rgba(255,215,0,0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-family: monospace;
          font-weight: 700;
          color: #ffd700;
        }
        
        .sound-value {
          font-style: italic;
          color: #4dabf7;
        }
        
        .explore-tips {
          margin-top: 2rem;
          background: rgba(0,0,0,0.2);
          border-radius: 16px;
          padding: 1.5rem;
        }
        
        .explore-tips h3 {
          color: #ffd700;
          margin-bottom: 1rem;
        }
        
        .explore-tips ul {
          list-style: none;
          padding: 0;
        }
        
        .explore-tips li {
          margin-bottom: 0.75rem;
          padding-left: 1.5rem;
          position: relative;
        }
        
        .explore-tips li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: #ffd700;
        }
        
        .level-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .level-icon {
          font-size: 1.5rem;
        }
        
        .level-name-uk, .lesson-name-uk {
          font-size: 0.9rem;
          opacity: 0.7;
          margin-bottom: 0.25rem;
        }
        
        .lesson-icon {
          font-size: 2rem;
          margin-right: 0.5rem;
        }
        
        .level-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        
        .level-btn {
          flex: 1;
          padding: 0.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          font-family: inherit;
          transition: all 0.2s;
        }
        
        .letters-btn {
          background: rgba(255,215,0,0.2);
          color: #ffd700;
        }
        
        .letters-btn:hover {
          background: rgba(255,215,0,0.3);
        }
        
        .words-btn {
          background: rgba(0,87,183,0.3);
          color: #4dabf7;
        }
        
        .words-btn:hover {
          background: rgba(0,87,183,0.4);
        }
        
        .word-translation {
          font-size: 1.1rem;
          color: #4dabf7;
          margin-bottom: 1rem;
          font-style: italic;
        }

        .completed-word-meaning {
          font-size: 1.3rem;
          margin: 0.75rem 0;
          padding: 0.75rem 1.5rem;
          background: rgba(77,171,247,0.15);
          border: 1px solid rgba(77,171,247,0.3);
          border-radius: 12px;
          animation: fadeInMeaning 0.3s ease;
        }

        .completed-word {
          color: #ffd700;
          font-weight: 700;
        }

        .completed-equals {
          color: rgba(255,255,255,0.5);
        }

        .completed-meaning {
          color: #4dabf7;
          font-style: italic;
          font-weight: 600;
        }

        @keyframes fadeInMeaning {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .settings-section {
          background: rgba(0,0,0,0.2);
          border-radius: 20px;
          padding: 1.5rem 2rem;
          margin-top: 2rem;
        }
        
        .settings-section h2 {
          margin-bottom: 1rem;
        }
        
        .settings-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .setting-toggle {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: background 0.2s;
        }
        
        .setting-toggle:hover {
          background: rgba(255,255,255,0.05);
        }
        
        .setting-toggle input[type="checkbox"] {
          width: 20px;
          height: 20px;
          accent-color: #ffd700;
        }

        .setting-slider {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .setting-slider:hover {
          background: rgba(255,255,255,0.05);
        }

        .setting-slider input[type="range"] {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: rgba(255,255,255,0.2);
          outline: none;
          -webkit-appearance: none;
        }

        .setting-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffd700;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .setting-slider input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .setting-slider input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffd700;
          cursor: pointer;
          border: none;
          transition: transform 0.2s;
        }

        .setting-slider input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
        }

        .setting-slider input[type="range"]:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .slider-value {
          min-width: 45px;
          text-align: right;
          font-weight: 600;
          color: #ffd700;
        }

        .tts-test {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .tts-test-btn {
          background: linear-gradient(135deg, #4dabf7, #339af0);
          border: none;
          color: #fff;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          font-family: inherit;
          transition: all 0.2s;
        }
        
        .tts-test-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(77,171,247,0.4);
        }
        
        .tts-test-btn:active {
          transform: translateY(0);
        }
        
        .tts-hint {
          font-size: 0.8rem;
          opacity: 0.6;
          text-align: center;
        }
        
        .finger-legend {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1rem;
          font-size: 0.8rem;
        }
        
        .sound-hint {
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: #4dabf7;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.65rem;
          white-space: nowrap;
          z-index: 10;
        }
        
        .achievement-name-uk {
          font-size: 0.9rem;
          opacity: 0.7;
        }
        
        .badge-name-uk {
          font-size: 0.65rem;
          opacity: 0.6;
          display: block;
        }
        
        /* Modal styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 1rem;
        }
        
        .modal-content {
          background: linear-gradient(145deg, #2a2a4c, #1a1a2e);
          border-radius: 20px;
          padding: 2rem;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          border: 2px solid #ffd700;
        }
        
        .modal-content h2 {
          color: #ffd700;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .setup-section {
          margin-bottom: 1.5rem;
          background: rgba(0,0,0,0.2);
          padding: 1rem;
          border-radius: 12px;
        }
        
        .setup-section h3 {
          color: #4dabf7;
          margin-bottom: 0.75rem;
        }
        
        .setup-section ol {
          margin-left: 1.25rem;
        }
        
        .setup-section li {
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        
        .setup-tip {
          background: rgba(255,215,0,0.1);
          border: 1px solid rgba(255,215,0,0.3);
          padding: 1rem;
          border-radius: 12px;
          margin: 1.5rem 0;
        }
        
        .modal-close-btn {
          display: block;
          width: 100%;
          background: linear-gradient(135deg, #ffd700, #e6c200);
          color: #1a1a2e;
          border: none;
          padding: 1rem;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.3s;
        }
        
        .modal-close-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(255,215,0,0.3);
        }

        /* Alphabet mode styles */
        .alphabet-stats {
          display: flex;
          gap: 1rem;
          margin: 1.5rem 0;
          justify-content: center;
          flex-wrap: wrap;
        }

        .alphabet-stats .stat-box {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          min-width: 140px;
          text-align: center;
        }

        .alphabet-stats .stat-label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 0.5rem;
        }

        .alphabet-stats .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffd700;
        }

        /* Green flash overlay */
        .green-flash-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 255, 0, 0.3);
          pointer-events: none;
          z-index: 9999;
          animation: flashFade 0.2s ease-out;
        }

        @keyframes flashFade {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* Alphabet Challenge Section */
        .alphabet-challenge-section {
          margin: 2rem 0;
        }

        .alphabet-challenge-section h2 {
          font-size: 1.8rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .alphabet-challenge-card {
          background: linear-gradient(145deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.1));
          border: 2px solid #ffd700;
          border-radius: 20px;
          padding: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
          transition: all 0.3s;
        }

        .alphabet-challenge-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
        }

        .challenge-info h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #ffd700;
        }

        .challenge-desc {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          opacity: 0.9;
        }

        .challenge-hint {
          font-size: 0.95rem;
          opacity: 0.7;
          font-style: italic;
        }

        .challenge-record {
          font-size: 1.2rem;
          color: #ffd700;
          font-weight: 700;
          margin-top: 1rem;
        }

        .challenge-start-btn {
          background: linear-gradient(145deg, #ffd700, #ffb700);
          color: #1a1a2e;
          border: none;
          padding: 1.2rem 2.5rem;
          border-radius: 12px;
          font-size: 1.2rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .challenge-start-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
        }

        @media (max-width: 768px) {
          .alphabet-challenge-card {
            flex-direction: column;
            text-align: center;
          }
        }

        /* Vocabulary Section */
        .vocabulary-section {
          margin: 2rem 0;
          padding: 2rem;
          background: rgba(0,0,0,0.2);
          border-radius: 20px;
        }

        .vocabulary-section h2 {
          color: #ffd700;
          margin-bottom: 0.5rem;
        }

        .section-subtitle {
          color: rgba(255,255,255,0.7);
          margin-bottom: 1.5rem;
          font-size: 1rem;
        }

        .vocab-themes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .vocab-theme-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          border: 2px solid rgba(255, 215, 0, 0.2);
          border-radius: 15px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .vocab-theme-card:hover {
          transform: translateY(-5px);
          border-color: #ffd700;
          box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
        }

        .theme-icon {
          font-size: 3rem;
          flex-shrink: 0;
        }

        .theme-info {
          flex: 1;
        }

        .theme-info h3 {
          margin: 0 0 0.25rem 0;
          color: #fff;
          font-size: 1.2rem;
        }

        .theme-name-uk {
          color: rgba(255,255,255,0.7);
          font-size: 0.9rem;
          margin: 0 0 0.5rem 0;
        }

        .theme-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.85rem;
        }

        .theme-difficulty {
          color: #ffd700;
          font-weight: 600;
        }

        .theme-word-count {
          color: rgba(255,255,255,0.6);
        }

        /* Custom Words Card */
        .custom-words-card {
          border-style: dashed !important;
          border-color: rgba(255,215,0,0.4) !important;
          background: linear-gradient(135deg, rgba(255,215,0,0.05), rgba(255,215,0,0.02)) !important;
        }

        /* New Learning Modes Section */
        .new-modes-section {
          margin: 2rem 0;
          padding: 2rem;
          background: rgba(0,0,0,0.2);
          border-radius: 20px;
        }

        .new-modes-section h2 {
          color: #ffd700;
          margin-bottom: 0.5rem;
        }

        .modes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        .mode-card {
          background: linear-gradient(135deg, rgba(0,87,183,0.1), rgba(0,87,183,0.05));
          border: 2px solid rgba(0,87,183,0.2);
          border-radius: 15px;
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .mode-card:hover {
          transform: translateY(-4px);
          border-color: #ffd700;
          box-shadow: 0 8px 25px rgba(255,215,0,0.2);
          background: linear-gradient(135deg, rgba(0,87,183,0.2), rgba(0,87,183,0.1));
        }

        .mode-icon {
          font-size: 2.5rem;
          flex-shrink: 0;
        }

        .mode-info h3 {
          margin: 0 0 0.25rem 0;
          color: #fff;
          font-size: 1.1rem;
        }

        .mode-info p {
          margin: 0;
          color: rgba(255,255,255,0.6);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

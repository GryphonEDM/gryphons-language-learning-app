// Add this entry to the LANGUAGES object in src/data/languageConfig.js
// Also add these imports at the top of languageConfig.js:
// import { SPANISH_KEYBOARD, ES_TO_QWERTY, ES_LETTER_INFO, cleanSoundForTTS as esCleanSound } from './es/keyboard.js';
// import { SPANISH_LESSONS, SPANISH_ALPHABET_CHALLENGE } from './es/lessons.js';
// import { ES_TRANSLATIONS } from './es/translations.js';

const ES_CONFIG = {
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    targetField: 'es',
    nameField: 'nameEs',
    storageKey: 'spanishTypingProgress',
    vowels: ['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú'],
    alphabetSize: 27,
    keyboard: SPANISH_KEYBOARD,
    keyToQwerty: ES_TO_QWERTY,
    letterInfo: ES_LETTER_INFO,
    cleanSoundForTTS: esCleanSound,
    lessons: SPANISH_LESSONS,
    alphabetChallenge: SPANISH_ALPHABET_CHALLENGE,
    translations: ES_TRANSLATIONS,
    phoneticField: 'esPhonetic',
    spaceLabel: 'espacio (space)',
    homeRowLetters: 'A S D F G H J K L Ñ',
    uniqueLettersNote: 'Ñ (eñe) is unique to Spanish — sounds like ny in canyon',
    softSignNote: 'The letter H is always silent in Spanish: hola = OH-la',
    vowelsNote: 'Spanish has 5 pure vowels — a, e, i, o, u — always pronounced the same way',
    ttsTestText: '¡Hola! Esto es una prueba.',
    ttsTestPhrase: 'Hola',
    ttsTestLabel: '🔊 Test TTS: "Hola"',
    gameName: 'Spanish',
  }
};

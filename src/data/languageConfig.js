// Central language configuration registry
import { UKRAINIAN_KEYBOARD, UK_TO_QWERTY, LETTER_INFO, cleanSoundForTTS as ukCleanSound } from './keyboard.js';
import { LESSONS, ALPHABET_CHALLENGE } from './lessons.js';
import { TRANSLATIONS } from './translations.js';
import { RUSSIAN_KEYBOARD, RU_TO_QWERTY, RU_LETTER_INFO, cleanSoundForTTS as ruCleanSound } from './ru/keyboard.js';
import { RU_LESSONS, RU_ALPHABET_CHALLENGE } from './ru/lessons.js';
import { RU_TRANSLATIONS } from './ru/translations.js';
import { GERMAN_KEYBOARD, DE_TO_QWERTY, DE_LETTER_INFO, cleanSoundForTTS as deCleanSound } from './de/keyboard.js';
import { DE_LESSONS, DE_ALPHABET_CHALLENGE } from './de/lessons.js';
import { DE_TRANSLATIONS } from './de/translations.js';

export const LANGUAGES = {
  uk: {
    code: 'uk',
    name: 'Ukrainian',
    nativeName: 'Українська',
    flag: '🇺🇦',
    targetField: 'uk',
    nameField: 'nameUk',
    storageKey: 'ukrainianTypingProgress',
    vowels: ['а', 'е', 'и', 'і', 'о', 'у', 'є', 'ї', 'ю', 'я'],
    alphabetSize: 32,
    keyboard: UKRAINIAN_KEYBOARD,
    keyToQwerty: UK_TO_QWERTY,
    letterInfo: LETTER_INFO,
    cleanSoundForTTS: ukCleanSound,
    lessons: LESSONS,
    alphabetChallenge: ALPHABET_CHALLENGE,
    translations: TRANSLATIONS,
    phoneticField: 'ukrainianPhonetic',
    spaceLabel: 'пробіл (space)',
    homeRowLetters: 'Ф І В А П Р О Л Д',
    uniqueLettersNote: 'Ї (yee), Є (yeh), and Ґ (hard g) are unique to Ukrainian',
    softSignNote: "Soft sign (ь): Doesn't make a sound itself, but softens the preceding consonant",
    vowelsNote: 'Ukrainian has 10 vowels - а, е, и, і, о, у, є, ї, ю, я',
    ttsTestText: 'Привіт! Це тест.',
    ttsTestPhrase: 'Привіт',
    ttsTestLabel: '🔊 Test TTS: "Привіт"',
    gameName: 'Ukrainian',
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    targetField: 'ru',
    nameField: 'nameRu',
    storageKey: 'russianTypingProgress',
    vowels: ['а', 'е', 'ё', 'и', 'о', 'у', 'э', 'ю', 'я', 'ы'],
    alphabetSize: 33,
    keyboard: RUSSIAN_KEYBOARD,
    keyToQwerty: RU_TO_QWERTY,
    letterInfo: RU_LETTER_INFO,
    cleanSoundForTTS: ruCleanSound,
    lessons: RU_LESSONS,
    alphabetChallenge: RU_ALPHABET_CHALLENGE,
    translations: RU_TRANSLATIONS,
    phoneticField: 'russianPhonetic',
    spaceLabel: 'пробел (space)',
    homeRowLetters: 'Ф Ы В А П Р О Л Д',
    uniqueLettersNote: 'Ъ (hard sign), Ы (hard i), and Э (hard e) are unique to Russian',
    softSignNote: "Soft sign (ь): Doesn't make a sound itself, but softens the preceding consonant",
    vowelsNote: 'Russian has 10 vowels - а, е, ё, и, о, у, э, ю, я, ы',
    ttsTestText: 'Привет! Это тест.',
    ttsTestPhrase: 'Привет',
    ttsTestLabel: '🔊 Test TTS: "Привет"',
    gameName: 'Russian',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    targetField: 'de',
    nameField: 'nameDe',
    storageKey: 'germanTypingProgress',
    vowels: ['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü'],
    alphabetSize: 30,
    keyboard: GERMAN_KEYBOARD,
    keyToQwerty: DE_TO_QWERTY,
    letterInfo: DE_LETTER_INFO,
    cleanSoundForTTS: deCleanSound,
    lessons: DE_LESSONS,
    alphabetChallenge: DE_ALPHABET_CHALLENGE,
    translations: DE_TRANSLATIONS,
    phoneticField: 'germanPhonetic',
    spaceLabel: 'Leerzeichen (space)',
    homeRowLetters: 'A S D F G H J K L Ö Ä',
    uniqueLettersNote: 'Umlauts Ä (ae), Ö (oe), Ü (ue) and ß (sharp-s / ss) are unique to German',
    softSignNote: 'ß (Eszett/sharp S) represents a double-s sound after long vowels — e.g. heiß (hot), Straße (street)',
    vowelsNote: 'German has 8 vowels — a, e, i, o, u, ä, ö, ü',
    ttsTestText: 'Hallo! Das ist ein Test.',
    ttsTestPhrase: 'Hallo',
    ttsTestLabel: '🔊 Test TTS: "Hallo"',
    gameName: 'German',
  }
};

export function getLanguageData(langCode) {
  return LANGUAGES[langCode] || LANGUAGES.uk;
}

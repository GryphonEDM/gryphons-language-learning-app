// Russian JCUKEN keyboard layout data with pronunciation guides and finger positions
export const RUSSIAN_KEYBOARD = [
  [
    { ru: 'й', qwerty: 'q', sound: 'y (short)', russianPhonetic: 'и краткое', finger: 'pinky-l' },
    { ru: 'ц', qwerty: 'w', sound: 'ts', russianPhonetic: 'це', finger: 'ring-l' },
    { ru: 'у', qwerty: 'e', sound: 'oo', russianPhonetic: 'у', finger: 'middle-l' },
    { ru: 'к', qwerty: 'r', sound: 'k', russianPhonetic: 'ка', finger: 'index-l' },
    { ru: 'е', qwerty: 't', sound: 'ye', russianPhonetic: 'е', finger: 'index-l' },
    { ru: 'н', qwerty: 'y', sound: 'n', russianPhonetic: 'эн', finger: 'index-r' },
    { ru: 'г', qwerty: 'u', sound: 'g (hard)', russianPhonetic: 'гэ', finger: 'index-r' },
    { ru: 'ш', qwerty: 'i', sound: 'sh', russianPhonetic: 'ша', finger: 'middle-r' },
    { ru: 'щ', qwerty: 'o', sound: 'shch', russianPhonetic: 'ща', finger: 'ring-r' },
    { ru: 'з', qwerty: 'p', sound: 'z', russianPhonetic: 'зэ', finger: 'pinky-r' },
    { ru: 'х', qwerty: '[', sound: 'kh', russianPhonetic: 'ха', finger: 'pinky-r' },
    { ru: 'ъ', qwerty: ']', sound: '(hard sign)', russianPhonetic: 'твёрдый знак', finger: 'pinky-r' },
    { ru: 'ё', qwerty: '\\', sound: 'yo', russianPhonetic: 'йо', finger: 'pinky-r' },
  ],
  [
    { ru: 'ф', qwerty: 'a', sound: 'f', russianPhonetic: 'эф', finger: 'pinky-l' },
    { ru: 'ы', qwerty: 's', sound: 'ɨ (hard i)', russianPhonetic: 'ы', finger: 'ring-l' },
    { ru: 'в', qwerty: 'd', sound: 'v', russianPhonetic: 'вэ', finger: 'middle-l' },
    { ru: 'а', qwerty: 'f', sound: 'ah', russianPhonetic: 'а', finger: 'index-l' },
    { ru: 'п', qwerty: 'g', sound: 'p', russianPhonetic: 'пэ', finger: 'index-l' },
    { ru: 'р', qwerty: 'h', sound: 'r (rolled)', russianPhonetic: 'эр', finger: 'index-r' },
    { ru: 'о', qwerty: 'j', sound: 'oh', russianPhonetic: 'о', finger: 'index-r' },
    { ru: 'л', qwerty: 'k', sound: 'l', russianPhonetic: 'эль', finger: 'middle-r' },
    { ru: 'д', qwerty: 'l', sound: 'd', russianPhonetic: 'дэ', finger: 'ring-r' },
    { ru: 'ж', qwerty: ';', sound: 'zh (pleasure)', russianPhonetic: 'жэ', finger: 'pinky-r' },
    { ru: 'э', qwerty: "'", sound: 'eh (hard)', russianPhonetic: 'э', finger: 'pinky-r' },
  ],
  [
    { ru: 'я', qwerty: 'z', sound: 'ya', russianPhonetic: 'я', finger: 'pinky-l' },
    { ru: 'ч', qwerty: 'x', sound: 'ch', russianPhonetic: 'че', finger: 'ring-l' },
    { ru: 'с', qwerty: 'c', sound: 's', russianPhonetic: 'эс', finger: 'middle-l' },
    { ru: 'м', qwerty: 'v', sound: 'm', russianPhonetic: 'эм', finger: 'index-l' },
    { ru: 'и', qwerty: 'b', sound: 'ee', russianPhonetic: 'и', finger: 'index-l' },
    { ru: 'т', qwerty: 'n', sound: 't', russianPhonetic: 'тэ', finger: 'index-r' },
    { ru: 'ь', qwerty: 'm', sound: '(soft sign)', russianPhonetic: 'мягкий знак', finger: 'index-r' },
    { ru: 'б', qwerty: ',', sound: 'b', russianPhonetic: 'бэ', finger: 'middle-r' },
    { ru: 'ю', qwerty: '.', sound: 'yu', russianPhonetic: 'ю', finger: 'ring-r' },
    { ru: '.', qwerty: '/', sound: '(period)', russianPhonetic: 'точка', finger: 'pinky-r' },
  ]
];

// Build lookup maps from keyboard data
export const RU_TO_QWERTY = {};
export const RU_LETTER_INFO = {};

RUSSIAN_KEYBOARD.forEach(row => {
  row.forEach(key => {
    RU_TO_QWERTY[key.ru] = key.qwerty;
    RU_TO_QWERTY[key.ru.toUpperCase()] = key.qwerty.toUpperCase();
    RU_LETTER_INFO[key.ru] = key;
  });
});

RU_TO_QWERTY[' '] = ' ';
RU_TO_QWERTY["'"] = "'";

// Helper function to clean phonetic sounds for TTS
export const cleanSoundForTTS = (sound) => {
  if (!sound) return '';
  return sound.replace(/\([^)]*\)/g, '').trim();
};

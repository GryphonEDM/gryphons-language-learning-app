// Ukrainian keyboard layout data with pronunciation guides and finger positions
export const UKRAINIAN_KEYBOARD = [
  [
    { uk: 'й', qwerty: 'q', sound: 'y (short)', ukrainianPhonetic: 'йот', finger: 'pinky-l' },
    { uk: 'ц', qwerty: 'w', sound: 'ts', ukrainianPhonetic: 'це', finger: 'ring-l' },
    { uk: 'у', qwerty: 'e', sound: 'oo', ukrainianPhonetic: 'у', finger: 'middle-l' },
    { uk: 'к', qwerty: 'r', sound: 'k', ukrainianPhonetic: 'ка', finger: 'index-l' },
    { uk: 'е', qwerty: 't', sound: 'eh', ukrainianPhonetic: 'е', finger: 'index-l' },
    { uk: 'н', qwerty: 'y', sound: 'n', ukrainianPhonetic: 'ен', finger: 'index-r' },
    { uk: 'г', qwerty: 'u', sound: 'h (voiced)', ukrainianPhonetic: 'ге', finger: 'index-r' },
    { uk: 'ш', qwerty: 'i', sound: 'sh', ukrainianPhonetic: 'ша', finger: 'middle-r' },
    { uk: 'щ', qwerty: 'o', sound: 'shch', ukrainianPhonetic: 'ща', finger: 'ring-r' },
    { uk: 'з', qwerty: 'p', sound: 'z', ukrainianPhonetic: 'зе', finger: 'pinky-r' },
    { uk: 'х', qwerty: '[', sound: 'kh', ukrainianPhonetic: 'ха', finger: 'pinky-r' },
    { uk: 'ї', qwerty: ']', sound: 'yee', ukrainianPhonetic: 'ї', finger: 'pinky-r' },
  ],
  [
    { uk: 'ф', qwerty: 'a', sound: 'f', ukrainianPhonetic: 'еф', finger: 'pinky-l' },
    { uk: 'і', qwerty: 's', sound: 'ee', ukrainianPhonetic: 'і', finger: 'ring-l' },
    { uk: 'в', qwerty: 'd', sound: 'v', ukrainianPhonetic: 'ве', finger: 'middle-l' },
    { uk: 'а', qwerty: 'f', sound: 'ah', ukrainianPhonetic: 'а', finger: 'index-l' },
    { uk: 'п', qwerty: 'g', sound: 'p', ukrainianPhonetic: 'пе', finger: 'index-l' },
    { uk: 'р', qwerty: 'h', sound: 'r (rolled)', ukrainianPhonetic: 'ер', finger: 'index-r' },
    { uk: 'о', qwerty: 'j', sound: 'oh', ukrainianPhonetic: 'о', finger: 'index-r' },
    { uk: 'л', qwerty: 'k', sound: 'l', ukrainianPhonetic: 'ел', finger: 'middle-r' },
    { uk: 'д', qwerty: 'l', sound: 'd', ukrainianPhonetic: 'де', finger: 'ring-r' },
    { uk: 'ж', qwerty: ';', sound: 'zh (pleasure)', ukrainianPhonetic: 'же', finger: 'pinky-r' },
    { uk: 'є', qwerty: "'", sound: 'yeh', ukrainianPhonetic: 'є', finger: 'pinky-r' },
  ],
  [
    { uk: 'я', qwerty: 'z', sound: 'ya', ukrainianPhonetic: 'йа', finger: 'pinky-l' },
    { uk: 'ч', qwerty: 'x', sound: 'ch', ukrainianPhonetic: 'че', finger: 'ring-l' },
    { uk: 'с', qwerty: 'c', sound: 's', ukrainianPhonetic: 'ес', finger: 'middle-l' },
    { uk: 'м', qwerty: 'v', sound: 'm', ukrainianPhonetic: 'ем', finger: 'index-l' },
    { uk: 'и', qwerty: 'b', sound: 'ɪ (short i)', ukrainianPhonetic: 'и', finger: 'index-l' },
    { uk: 'т', qwerty: 'n', sound: 't', ukrainianPhonetic: 'те', finger: 'index-r' },
    { uk: 'ь', qwerty: 'm', sound: '(soft sign)', ukrainianPhonetic: 'м\'який знак', finger: 'index-r' },
    { uk: 'б', qwerty: ',', sound: 'b', ukrainianPhonetic: 'бе', finger: 'middle-r' },
    { uk: 'ю', qwerty: '.', sound: 'yu', ukrainianPhonetic: 'ю', finger: 'ring-r' },
    { uk: '.', qwerty: '/', sound: '(period)', ukrainianPhonetic: 'крапка', finger: 'pinky-r' },
  ]
];

// Build lookup maps from keyboard data
export const UK_TO_QWERTY = {};
export const LETTER_INFO = {};

UKRAINIAN_KEYBOARD.forEach(row => {
  row.forEach(key => {
    UK_TO_QWERTY[key.uk] = key.qwerty;
    UK_TO_QWERTY[key.uk.toUpperCase()] = key.qwerty.toUpperCase();
    LETTER_INFO[key.uk] = key;
  });
});

UK_TO_QWERTY[' '] = ' ';
UK_TO_QWERTY["'"] = "'";
UK_TO_QWERTY['ґ'] = '`';
UK_TO_QWERTY['Ґ'] = '~';

// ґ is on the backtick key, outside the three main rows
LETTER_INFO['ґ'] = { uk: 'ґ', qwerty: '`', sound: 'g (hard)', ukrainianPhonetic: 'ґе', finger: 'pinky-l' };

// Helper function to clean phonetic sounds for TTS
// Removes parenthetical explanations like "y (short)" -> "y"
export const cleanSoundForTTS = (sound) => {
  if (!sound) return '';
  // Remove anything in parentheses and trim whitespace
  return sound.replace(/\([^)]*\)/g, '').trim();
};

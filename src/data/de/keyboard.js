// German QWERTZ keyboard layout with pronunciation guides and finger positions
// QWERTZ differs from QWERTY: Z↔Y swapped; umlauts ä('), ö(;), ü([) and ß(-) added
export const GERMAN_KEYBOARD = [
  [
    { de: 'q', qwerty: 'q', sound: 'koo', germanPhonetic: 'ku', finger: 'pinky-l' },
    { de: 'w', qwerty: 'w', sound: 'veh (like v)', germanPhonetic: 'we', finger: 'ring-l' },
    { de: 'e', qwerty: 'e', sound: 'eh', germanPhonetic: 'e', finger: 'middle-l' },
    { de: 'r', qwerty: 'r', sound: 'er (rolled)', germanPhonetic: 'er', finger: 'index-l' },
    { de: 't', qwerty: 't', sound: 'teh', germanPhonetic: 'te', finger: 'index-l' },
    { de: 'z', qwerty: 'y', sound: 'tset (like ts)', germanPhonetic: 'zet', finger: 'index-r' },
    { de: 'u', qwerty: 'u', sound: 'oo', germanPhonetic: 'u', finger: 'index-r' },
    { de: 'i', qwerty: 'i', sound: 'ee', germanPhonetic: 'i', finger: 'middle-r' },
    { de: 'o', qwerty: 'o', sound: 'oh', germanPhonetic: 'o', finger: 'ring-r' },
    { de: 'p', qwerty: 'p', sound: 'peh', germanPhonetic: 'pe', finger: 'pinky-r' },
    { de: 'ü', qwerty: '[', sound: 'ue (round lips)', germanPhonetic: 'ü', finger: 'pinky-r' },
  ],
  [
    { de: 'a', qwerty: 'a', sound: 'ah', germanPhonetic: 'a', finger: 'pinky-l' },
    { de: 's', qwerty: 's', sound: 'ess', germanPhonetic: 'es', finger: 'ring-l' },
    { de: 'd', qwerty: 'd', sound: 'deh', germanPhonetic: 'de', finger: 'middle-l' },
    { de: 'f', qwerty: 'f', sound: 'ef', germanPhonetic: 'ef', finger: 'index-l' },
    { de: 'g', qwerty: 'g', sound: 'geh', germanPhonetic: 'ge', finger: 'index-l' },
    { de: 'h', qwerty: 'h', sound: 'hah', germanPhonetic: 'ha', finger: 'index-r' },
    { de: 'j', qwerty: 'j', sound: 'yot (like y in yes)', germanPhonetic: 'jot', finger: 'index-r' },
    { de: 'k', qwerty: 'k', sound: 'kah', germanPhonetic: 'ka', finger: 'middle-r' },
    { de: 'l', qwerty: 'l', sound: 'el', germanPhonetic: 'el', finger: 'ring-r' },
    { de: 'ö', qwerty: ';', sound: 'oe (round lips, like French eu)', germanPhonetic: 'ö', finger: 'pinky-r' },
    { de: 'ä', qwerty: "'", sound: 'ae (like air)', germanPhonetic: 'ä', finger: 'pinky-r' },
  ],
  [
    { de: 'y', qwerty: 'z', sound: 'uep-si-lon', germanPhonetic: 'ypsilon', finger: 'pinky-l' },
    { de: 'x', qwerty: 'x', sound: 'ix', germanPhonetic: 'ix', finger: 'ring-l' },
    { de: 'c', qwerty: 'c', sound: 'tseh', germanPhonetic: 'ze', finger: 'middle-l' },
    { de: 'v', qwerty: 'v', sound: 'fow (like f)', germanPhonetic: 'vau', finger: 'index-l' },
    { de: 'b', qwerty: 'b', sound: 'beh', germanPhonetic: 'be', finger: 'index-l' },
    { de: 'n', qwerty: 'n', sound: 'en', germanPhonetic: 'en', finger: 'index-r' },
    { de: 'm', qwerty: 'm', sound: 'em', germanPhonetic: 'em', finger: 'index-r' },
    { de: 'ß', qwerty: '-', sound: 'ess-tset (sharp s)', germanPhonetic: 'scharfes S', finger: 'pinky-r' },
  ]
];

// Build lookup maps from keyboard data
export const DE_TO_QWERTY = {};
export const DE_LETTER_INFO = {};

GERMAN_KEYBOARD.forEach(row => {
  row.forEach(key => {
    DE_TO_QWERTY[key.de] = key.qwerty;
    DE_TO_QWERTY[key.de.toUpperCase()] = key.qwerty.toUpperCase();
    DE_LETTER_INFO[key.de] = key;
  });
});

DE_TO_QWERTY[' '] = ' ';
DE_TO_QWERTY["'"] = "'";

// Helper function to clean phonetic sounds for TTS
export const cleanSoundForTTS = (sound) => {
  if (!sound) return '';
  return sound.replace(/\([^)]*\)/g, '').trim();
};

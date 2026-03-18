// Spanish QWERTY keyboard layout with pronunciation guides and finger positions
// Spanish uses standard QWERTY; ñ replaces ; position; accented vowels via composition
export const SPANISH_KEYBOARD = [
  [
    { es: 'q', qwerty: 'q', sound: 'koo', esPhonetic: 'cu', finger: 'pinky-l' },
    { es: 'w', qwerty: 'w', sound: 'doh-bleh veh', esPhonetic: 'doble v', finger: 'ring-l' },
    { es: 'e', qwerty: 'e', sound: 'eh', esPhonetic: 'e', finger: 'middle-l' },
    { es: 'r', qwerty: 'r', sound: 'eh-reh (rolled)', esPhonetic: 'erre', finger: 'index-l' },
    { es: 't', qwerty: 't', sound: 'teh', esPhonetic: 'te', finger: 'index-l' },
    { es: 'y', qwerty: 'y', sound: 'ee-gree-eh-gah', esPhonetic: 'ye', finger: 'index-r' },
    { es: 'u', qwerty: 'u', sound: 'oo', esPhonetic: 'u', finger: 'index-r' },
    { es: 'i', qwerty: 'i', sound: 'ee', esPhonetic: 'i', finger: 'middle-r' },
    { es: 'o', qwerty: 'o', sound: 'oh', esPhonetic: 'o', finger: 'ring-r' },
    { es: 'p', qwerty: 'p', sound: 'peh', esPhonetic: 'pe', finger: 'pinky-r' },
  ],
  [
    { es: 'a', qwerty: 'a', sound: 'ah', esPhonetic: 'a', finger: 'pinky-l' },
    { es: 's', qwerty: 's', sound: 'eh-seh', esPhonetic: 'ese', finger: 'ring-l' },
    { es: 'd', qwerty: 'd', sound: 'deh', esPhonetic: 'de', finger: 'middle-l' },
    { es: 'f', qwerty: 'f', sound: 'eh-feh', esPhonetic: 'efe', finger: 'index-l' },
    { es: 'g', qwerty: 'g', sound: 'heh', esPhonetic: 'ge', finger: 'index-l' },
    { es: 'h', qwerty: 'h', sound: 'ah-cheh (silent in most words)', esPhonetic: 'hache', finger: 'index-r' },
    { es: 'j', qwerty: 'j', sound: 'hoh-tah (like English h)', esPhonetic: 'jota', finger: 'index-r' },
    { es: 'k', qwerty: 'k', sound: 'kah', esPhonetic: 'ka', finger: 'middle-r' },
    { es: 'l', qwerty: 'l', sound: 'eh-leh', esPhonetic: 'ele', finger: 'ring-r' },
    { es: 'ñ', qwerty: ';', sound: 'eh-nyeh (like ny in canyon)', esPhonetic: 'eñe', finger: 'pinky-r' },
  ],
  [
    { es: 'z', qwerty: 'z', sound: 'seh-tah (like s in Latin America)', esPhonetic: 'zeta', finger: 'pinky-l' },
    { es: 'x', qwerty: 'x', sound: 'eh-kis', esPhonetic: 'equis', finger: 'ring-l' },
    { es: 'c', qwerty: 'c', sound: 'seh', esPhonetic: 'ce', finger: 'middle-l' },
    { es: 'v', qwerty: 'v', sound: 'veh (like b)', esPhonetic: 've', finger: 'index-l' },
    { es: 'b', qwerty: 'b', sound: 'beh', esPhonetic: 'be', finger: 'index-l' },
    { es: 'n', qwerty: 'n', sound: 'eh-neh', esPhonetic: 'ene', finger: 'index-r' },
    { es: 'm', qwerty: 'm', sound: 'eh-meh', esPhonetic: 'eme', finger: 'index-r' },
  ]
];

// Build lookup maps from keyboard data
export const ES_TO_QWERTY = {};
export const ES_LETTER_INFO = {};

SPANISH_KEYBOARD.forEach(row => {
  row.forEach(key => {
    ES_TO_QWERTY[key.es] = key.qwerty;
    ES_TO_QWERTY[key.es.toUpperCase()] = key.qwerty.toUpperCase();
    ES_LETTER_INFO[key.es] = key;
  });
});

// Accented vowels map to their base vowel qwerty key
ES_TO_QWERTY['á'] = 'a';
ES_TO_QWERTY['é'] = 'e';
ES_TO_QWERTY['í'] = 'i';
ES_TO_QWERTY['ó'] = 'o';
ES_TO_QWERTY['ú'] = 'u';
ES_TO_QWERTY['ü'] = 'u';
ES_TO_QWERTY['Á'] = 'A';
ES_TO_QWERTY['É'] = 'E';
ES_TO_QWERTY['Í'] = 'I';
ES_TO_QWERTY['Ó'] = 'O';
ES_TO_QWERTY['Ú'] = 'U';
ES_TO_QWERTY[' '] = ' ';
ES_TO_QWERTY["'"] = "'";

// Per-letter info for all 27 Spanish letters (a–z plus ñ)
export const ES_LETTER_INFO_FULL = {
  a: { name: 'a', sound: 'ah — like "a" in "father"', example: 'amigo' },
  b: { name: 'be', sound: 'beh — like English "b"', example: 'boca' },
  c: { name: 'ce', sound: 'seh — like "s" before e/i, like "k" before a/o/u', example: 'casa' },
  d: { name: 'de', sound: 'deh — like English "d"', example: 'dedo' },
  e: { name: 'e', sound: 'eh — like "e" in "bed"', example: 'el' },
  f: { name: 'efe', sound: 'eh-feh — like English "f"', example: 'falda' },
  g: { name: 'ge', sound: 'heh — like English "h" before e/i, like "g" before a/o/u', example: 'gas' },
  h: { name: 'hache', sound: 'ah-cheh — always silent in Spanish', example: 'hola' },
  i: { name: 'i', sound: 'ee — like "ee" in "see"', example: 'isla' },
  j: { name: 'jota', sound: 'hoh-tah — like a strong English "h"', example: 'jala' },
  k: { name: 'ka', sound: 'kah — like English "k"', example: 'kilo' },
  l: { name: 'ele', sound: 'eh-leh — like English "l"', example: 'las' },
  m: { name: 'eme', sound: 'eh-meh — like English "m"', example: 'mono' },
  n: { name: 'ene', sound: 'eh-neh — like English "n"', example: 'nada' },
  ñ: { name: 'eñe', sound: 'eh-nyeh — like "ny" in "canyon"', example: 'año' },
  o: { name: 'o', sound: 'oh — like "o" in "core"', example: 'oro' },
  p: { name: 'pe', sound: 'peh — like English "p"', example: 'pie' },
  q: { name: 'cu', sound: 'koo — always followed by "u", sounds like "k"', example: 'quiero' },
  r: { name: 'erre', sound: 'eh-reh — tapped/rolled r', example: 'ruta' },
  s: { name: 'ese', sound: 'eh-seh — like English "s"', example: 'sal' },
  t: { name: 'te', sound: 'teh — like English "t"', example: 'tipo' },
  u: { name: 'u', sound: 'oo — like "oo" in "food"', example: 'uva' },
  v: { name: 've', sound: 'veh — nearly identical to "b" in Spanish', example: 'vino' },
  w: { name: 'doble v', sound: 'doh-bleh veh — used mainly in foreign words', example: 'wifi' },
  x: { name: 'equis', sound: 'eh-kis — like "ks" or "s"', example: 'mix' },
  y: { name: 'ye', sound: 'yeh — like English "y"', example: 'yo' },
  z: { name: 'zeta', sound: 'seh-tah — like "s" in Latin America', example: 'vez' },
};

// Helper: normalize Spanish text for TTS — espeak handles Spanish natively
export const cleanSoundForTTS = (text) => {
  if (!text) return '';
  return text;
};

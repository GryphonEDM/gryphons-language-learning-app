// French QWERTY keyboard layout with pronunciation guides and finger positions
// French uses standard QWERTY on US keyboard; accented letters via composition keys
export const FRENCH_KEYBOARD = [
  [
    { fr: 'a', qwerty: 'a', sound: 'ah', frPhonetic: 'a', finger: 'pinky-l' },
    { fr: 'z', qwerty: 'z', sound: 'zed', frPhonetic: 'zède', finger: 'ring-l' },
    { fr: 'e', qwerty: 'e', sound: 'euh', frPhonetic: 'e', finger: 'middle-l' },
    { fr: 'r', qwerty: 'r', sound: 'air', frPhonetic: 'erre', finger: 'index-l' },
    { fr: 't', qwerty: 't', sound: 'tay', frPhonetic: 'té', finger: 'index-l' },
    { fr: 'y', qwerty: 'y', sound: 'ee-grek', frPhonetic: 'i grec', finger: 'index-r' },
    { fr: 'u', qwerty: 'u', sound: 'oo (rounded)', frPhonetic: 'u', finger: 'index-r' },
    { fr: 'i', qwerty: 'i', sound: 'ee', frPhonetic: 'i', finger: 'middle-r' },
    { fr: 'o', qwerty: 'o', sound: 'oh', frPhonetic: 'o', finger: 'ring-r' },
    { fr: 'p', qwerty: 'p', sound: 'pay', frPhonetic: 'pé', finger: 'pinky-r' },
  ],
  [
    { fr: 'q', qwerty: 'q', sound: 'koo', frPhonetic: 'qu', finger: 'pinky-l' },
    { fr: 's', qwerty: 's', sound: 'ess', frPhonetic: 'esse', finger: 'ring-l' },
    { fr: 'd', qwerty: 'd', sound: 'day', frPhonetic: 'dé', finger: 'middle-l' },
    { fr: 'f', qwerty: 'f', sound: 'ef', frPhonetic: 'effe', finger: 'index-l' },
    { fr: 'g', qwerty: 'g', sound: 'zhay', frPhonetic: 'gé', finger: 'index-l' },
    { fr: 'h', qwerty: 'h', sound: 'ash (usually silent)', frPhonetic: 'hache', finger: 'index-r' },
    { fr: 'j', qwerty: 'j', sound: 'zhee (like measure)', frPhonetic: 'ji', finger: 'index-r' },
    { fr: 'k', qwerty: 'k', sound: 'kah', frPhonetic: 'ka', finger: 'middle-r' },
    { fr: 'l', qwerty: 'l', sound: 'el', frPhonetic: 'elle', finger: 'ring-r' },
    { fr: 'm', qwerty: 'm', sound: 'em', frPhonetic: 'emme', finger: 'pinky-r' },
  ],
  [
    { fr: 'w', qwerty: 'w', sound: 'doo-bluh vay', frPhonetic: 'double vé', finger: 'pinky-l' },
    { fr: 'x', qwerty: 'x', sound: 'ix', frPhonetic: 'ixe', finger: 'ring-l' },
    { fr: 'c', qwerty: 'c', sound: 'say', frPhonetic: 'cé', finger: 'middle-l' },
    { fr: 'v', qwerty: 'v', sound: 'vay', frPhonetic: 'vé', finger: 'index-l' },
    { fr: 'b', qwerty: 'b', sound: 'bay', frPhonetic: 'bé', finger: 'index-l' },
    { fr: 'n', qwerty: 'n', sound: 'en', frPhonetic: 'enne', finger: 'index-r' },
  ]
];

// Build lookup maps from keyboard data
export const FR_TO_QWERTY = {};
export const FR_LETTER_INFO = {};

FRENCH_KEYBOARD.forEach(row => {
  row.forEach(key => {
    FR_TO_QWERTY[key.fr] = key.qwerty;
    FR_TO_QWERTY[key.fr.toUpperCase()] = key.qwerty.toUpperCase();
    FR_LETTER_INFO[key.fr] = key;
  });
});

// Accented letters map to their base qwerty key
FR_TO_QWERTY['à'] = 'a';  FR_TO_QWERTY['â'] = 'a';  FR_TO_QWERTY['á'] = 'a';
FR_TO_QWERTY['é'] = 'e';  FR_TO_QWERTY['è'] = 'e';  FR_TO_QWERTY['ê'] = 'e';  FR_TO_QWERTY['ë'] = 'e';
FR_TO_QWERTY['î'] = 'i';  FR_TO_QWERTY['ï'] = 'i';
FR_TO_QWERTY['ô'] = 'o';  FR_TO_QWERTY['ó'] = 'o';
FR_TO_QWERTY['ù'] = 'u';  FR_TO_QWERTY['û'] = 'u';  FR_TO_QWERTY['ü'] = 'u';
FR_TO_QWERTY['ç'] = 'c';
FR_TO_QWERTY['œ'] = 'o';  FR_TO_QWERTY['æ'] = 'a';
FR_TO_QWERTY['À'] = 'A';  FR_TO_QWERTY['Â'] = 'A';
FR_TO_QWERTY['É'] = 'E';  FR_TO_QWERTY['È'] = 'E';  FR_TO_QWERTY['Ê'] = 'E';
FR_TO_QWERTY['Î'] = 'I';  FR_TO_QWERTY['Ï'] = 'I';
FR_TO_QWERTY['Ô'] = 'O';
FR_TO_QWERTY['Ù'] = 'U';  FR_TO_QWERTY['Û'] = 'U';
FR_TO_QWERTY['Ç'] = 'C';
FR_TO_QWERTY[' '] = ' ';
FR_TO_QWERTY["'"] = "'";
FR_TO_QWERTY['\u2019'] = "'"; // right single quote (French apostrophe)

// Per-letter info for all 26 French letters
export const FR_LETTER_INFO_FULL = {
  a: { name: 'a', sound: 'ah — like "a" in "father"', example: 'ami' },
  b: { name: 'bé', sound: 'bay — like English "b"', example: 'bonjour' },
  c: { name: 'cé', sound: 'say — like "s" before e/i, like "k" before a/o/u', example: 'café' },
  d: { name: 'dé', sound: 'day — like English "d"', example: 'deux' },
  e: { name: 'e', sound: 'euh — like "u" in "butter"', example: 'et' },
  f: { name: 'effe', sound: 'ef — like English "f"', example: 'femme' },
  g: { name: 'gé', sound: 'zhay — like "s" in "measure" before e/i', example: 'garçon' },
  h: { name: 'hache', sound: 'ash — usually silent in French', example: 'heure' },
  i: { name: 'i', sound: 'ee — like "ee" in "see"', example: 'ici' },
  j: { name: 'ji', sound: 'zhee — like "s" in "measure"', example: 'jour' },
  k: { name: 'ka', sound: 'kah — like English "k"', example: 'kilo' },
  l: { name: 'elle', sound: 'el — like English "l"', example: 'lune' },
  m: { name: 'emme', sound: 'em — like English "m"', example: 'maison' },
  n: { name: 'enne', sound: 'en — like English "n"', example: 'non' },
  o: { name: 'o', sound: 'oh — like "o" in "go"', example: 'ou' },
  p: { name: 'pé', sound: 'pay — like English "p"', example: 'père' },
  q: { name: 'qu', sound: 'koo — always written as "qu", sounds like "k"', example: 'qui' },
  r: { name: 'erre', sound: 'air — French r is guttural, from the back of throat', example: 'rue' },
  s: { name: 'esse', sound: 'ess — like "s" in "sun"', example: 'soir' },
  t: { name: 'té', sound: 'tay — like English "t"', example: 'tu' },
  u: { name: 'u', sound: 'oo with rounded lips — no English equivalent', example: 'une' },
  v: { name: 'vé', sound: 'vay — like English "v"', example: 'vous' },
  w: { name: 'double vé', sound: 'doo-bluh vay — used mainly in foreign words', example: 'wifi' },
  x: { name: 'ixe', sound: 'ix — like "ks" or "gz"', example: 'six' },
  y: { name: 'i grec', sound: 'ee-grek — like English "y"', example: 'yeux' },
  z: { name: 'zède', sound: 'zed — like English "z"', example: 'zéro' },
};

// Helper: normalize French text for TTS
export const cleanSoundForTTS = (text) => {
  if (!text) return '';
  return text;
};

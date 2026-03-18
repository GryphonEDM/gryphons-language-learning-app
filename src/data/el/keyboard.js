// Greek (Modern) QWERTY keyboard layout with pronunciation guides and finger positions
// Modern Greek monotonic system — standard Greek keyboard mapping
export const GREEK_KEYBOARD = [
  [
    { el: 'ε', qwerty: 'e', sound: 'eh', elPhonetic: 'epsilon', finger: 'middle-l' },
    { el: 'ρ', qwerty: 'r', sound: 'r (rolled)', elPhonetic: 'ro', finger: 'index-l' },
    { el: 'τ', qwerty: 't', sound: 'teh', elPhonetic: 'taf', finger: 'index-l' },
    { el: 'υ', qwerty: 'y', sound: 'ee (like French u)', elPhonetic: 'ypsilon', finger: 'index-r' },
    { el: 'θ', qwerty: 'u', sound: 'th (like English "think")', elPhonetic: 'thita', finger: 'index-r' },
    { el: 'ι', qwerty: 'i', sound: 'ee', elPhonetic: 'iota', finger: 'middle-r' },
    { el: 'ο', qwerty: 'o', sound: 'oh', elPhonetic: 'omikron', finger: 'ring-r' },
    { el: 'π', qwerty: 'p', sound: 'peh', elPhonetic: 'pi', finger: 'pinky-r' },
  ],
  [
    { el: 'α', qwerty: 'a', sound: 'ah', elPhonetic: 'alfa', finger: 'pinky-l' },
    { el: 'σ', qwerty: 's', sound: 'seh', elPhonetic: 'sigma', finger: 'ring-l' },
    { el: 'δ', qwerty: 'd', sound: 'th (like English "this")', elPhonetic: 'delta', finger: 'middle-l' },
    { el: 'φ', qwerty: 'f', sound: 'feh', elPhonetic: 'fi', finger: 'index-l' },
    { el: 'γ', qwerty: 'g', sound: 'gh / y (before e, i)', elPhonetic: 'gamma', finger: 'index-l' },
    { el: 'η', qwerty: 'h', sound: 'ee', elPhonetic: 'ita', finger: 'index-r' },
    { el: 'ξ', qwerty: 'j', sound: 'ks', elPhonetic: 'ksi', finger: 'index-r' },
    { el: 'κ', qwerty: 'k', sound: 'keh', elPhonetic: 'kapa', finger: 'middle-r' },
    { el: 'λ', qwerty: 'l', sound: 'leh', elPhonetic: 'lamda', finger: 'ring-r' },
  ],
  [
    { el: 'ζ', qwerty: 'z', sound: 'zeh', elPhonetic: 'zita', finger: 'pinky-l' },
    { el: 'χ', qwerty: 'x', sound: 'kh (guttural, like ch in "loch")', elPhonetic: 'hi', finger: 'ring-l' },
    { el: 'ψ', qwerty: 'c', sound: 'ps', elPhonetic: 'psi', finger: 'middle-l' },
    { el: 'ω', qwerty: 'v', sound: 'oh', elPhonetic: 'omega', finger: 'index-l' },
    { el: 'β', qwerty: 'b', sound: 'veh', elPhonetic: 'vita', finger: 'index-l' },
    { el: 'ν', qwerty: 'n', sound: 'neh', elPhonetic: 'ni', finger: 'index-r' },
    { el: 'μ', qwerty: 'm', sound: 'meh', elPhonetic: 'mi', finger: 'index-r' },
  ]
];

// Build lookup maps from keyboard data
export const EL_TO_QWERTY = {};
export const EL_LETTER_INFO = {};

GREEK_KEYBOARD.forEach(row => {
  row.forEach(key => {
    EL_TO_QWERTY[key.el] = key.qwerty;
    EL_TO_QWERTY[key.el.toUpperCase()] = key.qwerty.toUpperCase();
    EL_LETTER_INFO[key.el] = key;
  });
});

// Final sigma (used at end of words)
EL_TO_QWERTY['ς'] = 'w';
EL_TO_QWERTY['Σ'] = 'S';

// Accented vowels (monotonic) map to same QWERTY keys as base vowels
EL_TO_QWERTY['ά'] = 'a';
EL_TO_QWERTY['έ'] = 'e';
EL_TO_QWERTY['ή'] = 'h';
EL_TO_QWERTY['ί'] = 'i';
EL_TO_QWERTY['ό'] = 'o';
EL_TO_QWERTY['ύ'] = 'y';
EL_TO_QWERTY['ώ'] = 'v';
EL_TO_QWERTY['ϊ'] = 'i';
EL_TO_QWERTY['ϋ'] = 'y';
EL_TO_QWERTY['ΐ'] = 'i';
EL_TO_QWERTY['ΰ'] = 'y';
EL_TO_QWERTY['Ά'] = 'A';
EL_TO_QWERTY['Έ'] = 'E';
EL_TO_QWERTY['Ή'] = 'H';
EL_TO_QWERTY['Ί'] = 'I';
EL_TO_QWERTY['Ό'] = 'O';
EL_TO_QWERTY['Ύ'] = 'Y';
EL_TO_QWERTY['Ώ'] = 'V';
EL_TO_QWERTY[' '] = ' ';
EL_TO_QWERTY["'"] = "'";

// Per-letter info for all 24 Greek letters
export const EL_LETTER_INFO_FULL = {
  α: { name: 'άλφα', sound: 'ah — like "a" in "father"', example: 'αγάπη (love)' },
  β: { name: 'βήτα', sound: 'veh — like English "v"', example: 'βιβλίο (book)' },
  γ: { name: 'γάμα', sound: 'gh/y — guttural before a/o/u, like "y" before e/i', example: 'γάτα (cat)' },
  δ: { name: 'δέλτα', sound: 'th — like "th" in "this" (voiced)', example: 'δρόμος (road)' },
  ε: { name: 'έψιλον', sound: 'eh — like "e" in "bed"', example: 'εδώ (here)' },
  ζ: { name: 'ζήτα', sound: 'zeh — like English "z"', example: 'ζωή (life)' },
  η: { name: 'ήτα', sound: 'ee — like "ee" in "see"', example: 'ήλιος (sun)' },
  θ: { name: 'θήτα', sound: 'th — like "th" in "think" (unvoiced)', example: 'θάλασσα (sea)' },
  ι: { name: 'ιώτα', sound: 'ee — like "ee" in "see"', example: 'ιδέα (idea)' },
  κ: { name: 'κάπα', sound: 'keh — like English "k"', example: 'καλός (good)' },
  λ: { name: 'λάμδα', sound: 'leh — like English "l"', example: 'λεμόνι (lemon)' },
  μ: { name: 'μι', sound: 'meh — like English "m"', example: 'μαμά (mom)' },
  ν: { name: 'νι', sound: 'neh — like English "n"', example: 'νερό (water)' },
  ξ: { name: 'ξι', sound: 'ks — like "x" in "fox"', example: 'ξύλο (wood)' },
  ο: { name: 'όμικρον', sound: 'oh — like "o" in "core"', example: 'όνομα (name)' },
  π: { name: 'πι', sound: 'peh — like English "p"', example: 'πατέρας (father)' },
  ρ: { name: 'ρο', sound: 'r — slightly rolled', example: 'ρολόι (clock)' },
  σ: { name: 'σίγμα', sound: 'seh — like English "s"', example: 'σπίτι (house)' },
  τ: { name: 'ταυ', sound: 'teh — like English "t"', example: 'τραπέζι (table)' },
  υ: { name: 'ύψιλον', sound: 'ee — same as ι, η in Modern Greek', example: 'υιός (son)' },
  φ: { name: 'φι', sound: 'feh — like English "f"', example: 'φίλος (friend)' },
  χ: { name: 'χι', sound: 'kh — guttural like "ch" in "loch"', example: 'χέρι (hand)' },
  ψ: { name: 'ψι', sound: 'ps — like "ps" in "lapse"', example: 'ψωμί (bread)' },
  ω: { name: 'ωμέγα', sound: 'oh — same as ο in Modern Greek', example: 'ώρα (hour)' },
};

// Helper: normalize Greek text for TTS
export const cleanSoundForTTS = (text) => {
  if (!text) return '';
  return text;
};

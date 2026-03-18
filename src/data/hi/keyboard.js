// Hindi (Devanagari) InScript keyboard layout with pronunciation guides and finger positions
// Standard InScript layout — official Indian government keyboard mapping
export const HINDI_KEYBOARD = [
  [
    { hi: 'ौ', qwerty: 'q', sound: 'au matra (diphthong "ow")', hiPhonetic: 'au', finger: 'pinky-l' },
    { hi: 'ै', qwerty: 'w', sound: 'ai matra (diphthong "ay")', hiPhonetic: 'ai', finger: 'ring-l' },
    { hi: 'ा', qwerty: 'e', sound: 'aa matra (long "ah")', hiPhonetic: 'aa', finger: 'middle-l' },
    { hi: 'ी', qwerty: 'r', sound: 'ee matra (long "ee")', hiPhonetic: 'ii', finger: 'index-l' },
    { hi: 'ू', qwerty: 't', sound: 'oo matra (long "oo")', hiPhonetic: 'uu', finger: 'index-l' },
    { hi: 'ब', qwerty: 'y', sound: 'ba', hiPhonetic: 'ba', finger: 'index-r' },
    { hi: 'ह', qwerty: 'u', sound: 'ha', hiPhonetic: 'ha', finger: 'index-r' },
    { hi: 'ग', qwerty: 'i', sound: 'ga', hiPhonetic: 'ga', finger: 'middle-r' },
    { hi: 'द', qwerty: 'o', sound: 'da (dental)', hiPhonetic: 'da', finger: 'ring-r' },
    { hi: 'ज', qwerty: 'p', sound: 'ja', hiPhonetic: 'ja', finger: 'pinky-r' },
  ],
  [
    { hi: 'ो', qwerty: 'a', sound: 'o matra ("oh")', hiPhonetic: 'o', finger: 'pinky-l' },
    { hi: 'े', qwerty: 's', sound: 'e matra ("ay")', hiPhonetic: 'e', finger: 'ring-l' },
    { hi: '्', qwerty: 'd', sound: 'virama (halant — removes inherent "a")', hiPhonetic: 'halant', finger: 'middle-l' },
    { hi: 'ि', qwerty: 'f', sound: 'i matra (short "i")', hiPhonetic: 'i', finger: 'index-l' },
    { hi: 'ु', qwerty: 'g', sound: 'u matra (short "u")', hiPhonetic: 'u', finger: 'index-l' },
    { hi: 'प', qwerty: 'h', sound: 'pa', hiPhonetic: 'pa', finger: 'index-r' },
    { hi: 'र', qwerty: 'j', sound: 'ra', hiPhonetic: 'ra', finger: 'index-r' },
    { hi: 'क', qwerty: 'k', sound: 'ka', hiPhonetic: 'ka', finger: 'middle-r' },
    { hi: 'त', qwerty: 'l', sound: 'ta (dental)', hiPhonetic: 'ta', finger: 'ring-r' },
    { hi: 'च', qwerty: ';', sound: 'cha', hiPhonetic: 'cha', finger: 'pinky-r' },
  ],
  [
    { hi: '्र', qwerty: 'z', sound: 'ra conjunct (virama + ra)', hiPhonetic: 'halant-ra', finger: 'pinky-l' },
    { hi: 'ं', qwerty: 'x', sound: 'anusvara (nasal "n/m")', hiPhonetic: 'anusvara', finger: 'ring-l' },
    { hi: 'म', qwerty: 'c', sound: 'ma', hiPhonetic: 'ma', finger: 'middle-l' },
    { hi: 'न', qwerty: 'v', sound: 'na (dental)', hiPhonetic: 'na', finger: 'index-l' },
    { hi: 'व', qwerty: 'b', sound: 'va/wa', hiPhonetic: 'va', finger: 'index-l' },
    { hi: 'ल', qwerty: 'n', sound: 'la', hiPhonetic: 'la', finger: 'index-r' },
    { hi: 'स', qwerty: 'm', sound: 'sa', hiPhonetic: 'sa', finger: 'index-r' },
  ]
];

// Build lookup maps from keyboard data
export const HI_TO_QWERTY = {};
export const HI_LETTER_INFO = {};

HINDI_KEYBOARD.forEach(row => {
  row.forEach(key => {
    HI_TO_QWERTY[key.hi] = key.qwerty;
    HI_LETTER_INFO[key.hi] = key;
  });
});

// Independent vowels (used at the start of words / standalone)
HI_TO_QWERTY['अ'] = 'o';   // a (inherent, mapped contextually)
HI_TO_QWERTY['आ'] = 'e';   // aa
HI_TO_QWERTY['इ'] = 'f';   // i
HI_TO_QWERTY['ई'] = 'r';   // ii
HI_TO_QWERTY['उ'] = 'g';   // u
HI_TO_QWERTY['ऊ'] = 't';   // uu
HI_TO_QWERTY['ए'] = 's';   // e
HI_TO_QWERTY['ऐ'] = 'w';   // ai
HI_TO_QWERTY['ओ'] = 'a';   // o
HI_TO_QWERTY['औ'] = 'q';   // au
HI_TO_QWERTY['ऋ'] = 'z';   // ri (contextual)

// Additional matras and signs
HI_TO_QWERTY['ँ'] = 'x';   // chandrabindu (nasalization)
HI_TO_QWERTY['ः'] = ':';   // visarga
HI_TO_QWERTY['ॉ'] = ']';   // candra o matra (for English loanwords)
HI_TO_QWERTY['ॅ'] = '[';   // candra e matra

// Additional consonants from shifted / extended InScript positions
HI_TO_QWERTY['ड'] = '[';
HI_TO_QWERTY['ट'] = "'";
HI_TO_QWERTY['ख'] = 'K';   // shifted k
HI_TO_QWERTY['थ'] = 'L';   // shifted l
HI_TO_QWERTY['छ'] = ':';   // shifted ;
HI_TO_QWERTY['ठ'] = '"';   // shifted '
HI_TO_QWERTY['ढ'] = '{';   // shifted [
HI_TO_QWERTY['ण'] = 'C';   // shifted c
HI_TO_QWERTY['घ'] = 'I';   // shifted i
HI_TO_QWERTY['झ'] = 'P';   // shifted p
HI_TO_QWERTY['ञ'] = 'V';   // shifted v
HI_TO_QWERTY['ध'] = 'O';   // shifted o
HI_TO_QWERTY['भ'] = 'Y';   // shifted y
HI_TO_QWERTY['श'] = 'M';   // shifted m
HI_TO_QWERTY['ष'] = '<';   // shifted ,
HI_TO_QWERTY['फ'] = 'H';   // shifted h
HI_TO_QWERTY['ङ'] = 'G';   // shifted g (rare)
HI_TO_QWERTY['ऑ'] = 'A';   // shifted a (candra o — for English loans)
HI_TO_QWERTY['य'] = '/';   // slash key

// Nukta letters (consonant + nukta ़ — for Urdu/Persian/Arabic loanwords)
HI_TO_QWERTY['क़'] = 'k';
HI_TO_QWERTY['ख़'] = 'K';
HI_TO_QWERTY['ग़'] = 'i';
HI_TO_QWERTY['ज़'] = 'p';
HI_TO_QWERTY['ड़'] = '[';
HI_TO_QWERTY['ढ़'] = '{';
HI_TO_QWERTY['फ़'] = 'H';

// Common punctuation
HI_TO_QWERTY['।'] = '.';   // Devanagari danda (full stop)
HI_TO_QWERTY['॥'] = '.';   // double danda
HI_TO_QWERTY[' '] = ' ';
HI_TO_QWERTY[','] = ',';
HI_TO_QWERTY['.'] = '.';
HI_TO_QWERTY["'"] = "'";
HI_TO_QWERTY['?'] = '?';
HI_TO_QWERTY['!'] = '!';

// Helper: normalize Hindi text for TTS (no transformation needed)
export const cleanSoundForTTS = (text) => {
  if (!text) return '';
  return text;
};

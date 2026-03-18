// Arabic QWERTY keyboard layout with pronunciation guides and finger positions
// Standard Arabic keyboard mapping (IBM Arabic 101)
export const ARABIC_KEYBOARD = [
  [
    { ar: 'ض', qwerty: 'q', sound: 'dad (emphatic d)', arPhonetic: 'daad', finger: 'pinky-l' },
    { ar: 'ص', qwerty: 'w', sound: 'sad (emphatic s)', arPhonetic: 'saad', finger: 'ring-l' },
    { ar: 'ث', qwerty: 'e', sound: 'th (like English "think")', arPhonetic: 'thaa', finger: 'middle-l' },
    { ar: 'ق', qwerty: 'r', sound: 'q (deep guttural k)', arPhonetic: 'qaaf', finger: 'index-l' },
    { ar: 'ف', qwerty: 't', sound: 'f', arPhonetic: 'faa', finger: 'index-l' },
    { ar: 'غ', qwerty: 'y', sound: 'gh (like French r)', arPhonetic: 'ghayn', finger: 'index-r' },
    { ar: 'ع', qwerty: 'u', sound: 'ayn (pharyngeal voiced)', arPhonetic: 'ayn', finger: 'index-r' },
    { ar: 'ه', qwerty: 'i', sound: 'h (breathy)', arPhonetic: 'haa', finger: 'middle-r' },
    { ar: 'خ', qwerty: 'o', sound: 'kh (like ch in "loch")', arPhonetic: 'khaa', finger: 'ring-r' },
    { ar: 'ح', qwerty: 'p', sound: 'h (pharyngeal voiceless)', arPhonetic: 'haa', finger: 'pinky-r' },
  ],
  [
    { ar: 'ش', qwerty: 'a', sound: 'sh (like English "ship")', arPhonetic: 'shiin', finger: 'pinky-l' },
    { ar: 'س', qwerty: 's', sound: 's', arPhonetic: 'siin', finger: 'ring-l' },
    { ar: 'ي', qwerty: 'd', sound: 'y (like English "yes")', arPhonetic: 'yaa', finger: 'middle-l' },
    { ar: 'ب', qwerty: 'f', sound: 'b', arPhonetic: 'baa', finger: 'index-l' },
    { ar: 'ل', qwerty: 'g', sound: 'l', arPhonetic: 'laam', finger: 'index-l' },
    { ar: 'ا', qwerty: 'h', sound: 'a (alef — long vowel / glottal stop)', arPhonetic: 'alif', finger: 'index-r' },
    { ar: 'ت', qwerty: 'j', sound: 't', arPhonetic: 'taa', finger: 'index-r' },
    { ar: 'ن', qwerty: 'k', sound: 'n', arPhonetic: 'nuun', finger: 'middle-r' },
    { ar: 'م', qwerty: 'l', sound: 'm', arPhonetic: 'miim', finger: 'ring-r' },
  ],
  [
    { ar: 'ئ', qwerty: 'z', sound: 'hamza on yaa', arPhonetic: 'hamza-yaa', finger: 'pinky-l' },
    { ar: 'ء', qwerty: 'x', sound: 'hamza (glottal stop)', arPhonetic: 'hamza', finger: 'ring-l' },
    { ar: 'ؤ', qwerty: 'c', sound: 'hamza on waw', arPhonetic: 'hamza-waw', finger: 'middle-l' },
    { ar: 'ر', qwerty: 'v', sound: 'r (rolled)', arPhonetic: 'raa', finger: 'index-l' },
    { ar: 'لا', qwerty: 'b', sound: 'laa (lam-alef ligature)', arPhonetic: 'laam-alif', finger: 'index-l' },
    { ar: 'ى', qwerty: 'n', sound: 'alef maqsura (like aa)', arPhonetic: 'alif-maqsuura', finger: 'index-r' },
    { ar: 'ة', qwerty: 'm', sound: 'taa marbuta (t/h at word end)', arPhonetic: 'taa-marbuuta', finger: 'index-r' },
  ]
];

// Build lookup maps from keyboard data
export const AR_TO_QWERTY = {};
export const AR_LETTER_INFO = {};

ARABIC_KEYBOARD.forEach(row => {
  row.forEach(key => {
    AR_TO_QWERTY[key.ar] = key.qwerty;
    AR_LETTER_INFO[key.ar] = key;
  });
});

// Additional Arabic letters not on default layer (Shift or special positions)
const extraLetters = [
  { ar: 'ذ', qwerty: 'z', sound: 'dhaal — voiced "th" as in "this"', example: 'ذَهَبَ (he went)' },
  { ar: 'ظ', qwerty: 'z', sound: 'zhaa — emphatic "th"', example: 'ظَلَّ (he remained)' },
  { ar: 'ط', qwerty: 'q', sound: 'taa — emphatic "t"', example: 'طَعَام (food)' },
  { ar: 'ج', qwerty: '[', sound: 'jiim — "j" as in "jump"', example: 'جَمِيل (beautiful)' },
  { ar: 'د', qwerty: ']', sound: 'daal — "d" as in "door"', example: 'دَرْس (lesson)' },
  { ar: 'ز', qwerty: '.', sound: 'zayn — "z" as in "zoo"', example: 'زَهْرَة (flower)' },
  { ar: 'و', qwerty: ',', sound: 'waw — "w" as in "water" or long "oo"', example: 'وَلَد (boy)' },
  { ar: 'ك', qwerty: ';', sound: 'kaaf — "k" as in "king"', example: 'كِتَاب (book)' },
];
extraLetters.forEach(key => {
  AR_TO_QWERTY[key.ar] = key.qwerty;
  AR_LETTER_INFO[key.ar] = key;
});

// Hamza forms
const hamzaForms = [
  { ar: 'أ', qwerty: 'h', sound: 'alef with hamza above — glottal stop + "a"', example: 'أَكَلَ (he ate)' },
  { ar: 'إ', qwerty: 'h', sound: 'alef with hamza below — glottal stop + "i"', example: 'إِسْلَام (Islam)' },
  { ar: 'آ', qwerty: 'h', sound: 'alef with madda — long "aa"', example: 'آمِين (amen)' },
];
hamzaForms.forEach(key => {
  AR_TO_QWERTY[key.ar] = key.qwerty;
  AR_LETTER_INFO[key.ar] = key;
});

// Tashkeel (diacritics) — mapped to Shift combos, use base key
AR_TO_QWERTY['\u064E'] = 'q';   // fatha (فتحة)
AR_TO_QWERTY['\u064F'] = 'e';   // damma (ضمة)
AR_TO_QWERTY['\u0650'] = 'a';   // kasra (كسرة)
AR_TO_QWERTY['\u0652'] = 'x';   // sukun (سكون)
AR_TO_QWERTY['\u0651'] = 'w';   // shadda (شدة)
AR_TO_QWERTY['\u064B'] = 'r';   // tanwin fath (تنوين فتح)
AR_TO_QWERTY['\u064C'] = 't';   // tanwin damm (تنوين ضم)
AR_TO_QWERTY['\u064D'] = 'y';   // tanwin kasr (تنوين كسر)

// Common punctuation and space
AR_TO_QWERTY[' '] = ' ';
AR_TO_QWERTY['،'] = ',';   // Arabic comma
AR_TO_QWERTY['؛'] = ';';   // Arabic semicolon
AR_TO_QWERTY['؟'] = '?';   // Arabic question mark
AR_TO_QWERTY["'"] = "'";

// Helper: return Arabic text as-is for TTS
export const cleanSoundForTTS = (text) => {
  if (!text) return '';
  return text;
};

// Chinese (Mandarin) pinyin-based keyboard layout with pronunciation guides and finger positions
// Pinyin uses Latin letters on a standard QWERTY keyboard — mapping is identity
export const CHINESE_KEYBOARD = [
  [
    { zh: 'q', qwerty: 'q', sound: 'q — like "ch" in "cheese" (pinyin initial)', zhPhonetic: 'qī', finger: 'pinky-l' },
    { zh: 'w', qwerty: 'w', sound: 'w — like "w" in "water" (pinyin initial)', zhPhonetic: 'wā', finger: 'ring-l' },
    { zh: 'e', qwerty: 'e', sound: 'e — like "uh" in "duh" (pinyin final)', zhPhonetic: 'é', finger: 'middle-l' },
    { zh: 'r', qwerty: 'r', sound: 'r — like "r" in "run" with tongue curled (pinyin initial)', zhPhonetic: 'rì', finger: 'index-l' },
    { zh: 't', qwerty: 't', sound: 't — like "t" in "top" (pinyin initial)', zhPhonetic: 'tā', finger: 'index-l' },
    { zh: 'y', qwerty: 'y', sound: 'y — like "y" in "yes" (pinyin initial)', zhPhonetic: 'yā', finger: 'index-r' },
    { zh: 'u', qwerty: 'u', sound: 'u — like "oo" in "moon" (pinyin final)', zhPhonetic: 'wū', finger: 'index-r' },
    { zh: 'i', qwerty: 'i', sound: 'i — like "ee" in "see" (pinyin final)', zhPhonetic: 'yī', finger: 'middle-r' },
    { zh: 'o', qwerty: 'o', sound: 'o — like "o" in "more" (pinyin final)', zhPhonetic: 'ō', finger: 'ring-r' },
    { zh: 'p', qwerty: 'p', sound: 'p — like "p" in "pop" (pinyin initial)', zhPhonetic: 'pā', finger: 'pinky-r' },
  ],
  [
    { zh: 'a', qwerty: 'a', sound: 'a — like "a" in "father" (pinyin final)', zhPhonetic: 'ā', finger: 'pinky-l' },
    { zh: 's', qwerty: 's', sound: 's — like "s" in "sun" (pinyin initial)', zhPhonetic: 'sī', finger: 'ring-l' },
    { zh: 'd', qwerty: 'd', sound: 'd — like "d" in "day" (pinyin initial)', zhPhonetic: 'dā', finger: 'middle-l' },
    { zh: 'f', qwerty: 'f', sound: 'f — like "f" in "fun" (pinyin initial)', zhPhonetic: 'fā', finger: 'index-l' },
    { zh: 'g', qwerty: 'g', sound: 'g — like "g" in "go" (pinyin initial)', zhPhonetic: 'gē', finger: 'index-l' },
    { zh: 'h', qwerty: 'h', sound: 'h — like "h" in "hat" (pinyin initial)', zhPhonetic: 'hā', finger: 'index-r' },
    { zh: 'j', qwerty: 'j', sound: 'j — like "j" in "jeep" (pinyin initial)', zhPhonetic: 'jī', finger: 'index-r' },
    { zh: 'k', qwerty: 'k', sound: 'k — like "k" in "kite" (pinyin initial)', zhPhonetic: 'kē', finger: 'middle-r' },
    { zh: 'l', qwerty: 'l', sound: 'l — like "l" in "love" (pinyin initial)', zhPhonetic: 'lā', finger: 'ring-r' },
  ],
  [
    { zh: 'z', qwerty: 'z', sound: 'z — like "dz" in "adze" (pinyin initial)', zhPhonetic: 'zī', finger: 'pinky-l' },
    { zh: 'x', qwerty: 'x', sound: 'x — like "sh" in "she" but sharper (pinyin initial)', zhPhonetic: 'xī', finger: 'ring-l' },
    { zh: 'c', qwerty: 'c', sound: 'c — like "ts" in "cats" (pinyin initial)', zhPhonetic: 'cī', finger: 'middle-l' },
    { zh: 'v', qwerty: 'v', sound: 'v — used for ü input in some IMEs (not standard pinyin)', zhPhonetic: 'vē', finger: 'index-l' },
    { zh: 'b', qwerty: 'b', sound: 'b — like "b" in "boy" (pinyin initial)', zhPhonetic: 'bā', finger: 'index-l' },
    { zh: 'n', qwerty: 'n', sound: 'n — like "n" in "no" (pinyin initial/final)', zhPhonetic: 'nā', finger: 'index-r' },
    { zh: 'm', qwerty: 'm', sound: 'm — like "m" in "mom" (pinyin initial)', zhPhonetic: 'mā', finger: 'index-r' },
  ]
];

// Build lookup maps from keyboard data
export const ZH_TO_QWERTY = {};
export const ZH_LETTER_INFO = {};

CHINESE_KEYBOARD.forEach(row => {
  row.forEach(key => {
    ZH_TO_QWERTY[key.zh] = key.qwerty;
    ZH_LETTER_INFO[key.zh] = key;
  });
});

// Whitespace and punctuation pass-through
ZH_TO_QWERTY[' '] = ' ';
ZH_TO_QWERTY["'"] = "'";

// Per-letter info for all pinyin initials and finals
export const ZH_LETTER_INFO_FULL = {
  // Initials — labials
  b: { name: 'bē', sound: 'b — unaspirated, like "b" in "boy"', example: '爸 bà (father)' },
  p: { name: 'pē', sound: 'p — aspirated, like "p" in "pop"', example: '朋友 péngyou (friend)' },
  m: { name: 'ēm', sound: 'm — like "m" in "mom"', example: '妈 mā (mother)' },
  f: { name: 'ēf', sound: 'f — like "f" in "fun"', example: '飞 fēi (fly)' },
  // Initials — alveolars
  d: { name: 'dē', sound: 'd — unaspirated, like "d" in "day"', example: '大 dà (big)' },
  t: { name: 'tē', sound: 't — aspirated, like "t" in "top"', example: '天 tiān (sky)' },
  n: { name: 'nē', sound: 'n — like "n" in "no"', example: '你 nǐ (you)' },
  l: { name: 'ēl', sound: 'l — like "l" in "love"', example: '来 lái (come)' },
  // Initials — velars
  g: { name: 'gē', sound: 'g — unaspirated, like "g" in "go"', example: '高 gāo (tall)' },
  k: { name: 'kē', sound: 'k — aspirated, like "k" in "kite"', example: '看 kàn (look)' },
  h: { name: 'hā', sound: 'h — like "h" in "hat"', example: '好 hǎo (good)' },
  // Initials — palatals
  j: { name: 'jī', sound: 'j — like "j" in "jeep", tongue touches palate', example: '家 jiā (home)' },
  q: { name: 'qī', sound: 'q — like "ch" in "cheese", aspirated palatal', example: '去 qù (go)' },
  x: { name: 'xī', sound: 'x — like "sh" in "she", but with tongue closer to teeth', example: '小 xiǎo (small)' },
  // Initials — retroflexes
  zh: { name: 'zhī', sound: 'zh — like "j" in "judge", tongue curled back', example: '中 zhōng (middle)' },
  ch: { name: 'chī', sound: 'ch — like "ch" in "church", tongue curled back', example: '吃 chī (eat)' },
  sh: { name: 'shī', sound: 'sh — like "sh" in "ship", tongue curled back', example: '是 shì (is)' },
  r: { name: 'rì', sound: 'r — like "r" in "run", tongue curled back', example: '人 rén (person)' },
  // Initials — dental sibilants
  z: { name: 'zī', sound: 'z — like "dz" in "adze", unaspirated', example: '在 zài (at)' },
  c: { name: 'cī', sound: 'c — like "ts" in "cats", aspirated', example: '菜 cài (vegetable)' },
  s: { name: 'sī', sound: 's — like "s" in "sun"', example: '三 sān (three)' },
  // Initials — semivowels
  y: { name: 'yā', sound: 'y — like "y" in "yes"', example: '一 yī (one)' },
  w: { name: 'wā', sound: 'w — like "w" in "water"', example: '我 wǒ (I/me)' },
  // Finals — simple vowels
  a: { name: 'ā', sound: 'a — open, like "a" in "father"', example: '大 dà (big)' },
  o: { name: 'ō', sound: 'o — rounded, like "o" in "more"', example: '多 duō (many)' },
  e: { name: 'é', sound: 'e — like "uh" in "duh" (standalone) or "eh" in compounds', example: '的 de (possessive particle)' },
  i: { name: 'yī', sound: 'i — like "ee" in "see"', example: '一 yī (one)' },
  u: { name: 'wū', sound: 'u — like "oo" in "moon"', example: '五 wǔ (five)' },
  ü: { name: 'yǔ', sound: 'ü — like French "u" or German "ü", round lips and say "ee"', example: '鱼 yú (fish)' },
};

// Helper: normalize Chinese text for TTS (pass-through for pinyin)
export const cleanSoundForTTS = (text) => {
  if (!text) return '';
  return text;
};

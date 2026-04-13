// Korean (Hangul) 2-set keyboard layout (두벌식) with pronunciation guides and finger positions
// Standard Korean keyboard mapping used in South Korea
export const KOREAN_KEYBOARD = [
  [
    { ko: 'ㅂ', qwerty: 'q', sound: 'b/p', koPhonetic: 'bieup', finger: 'pinky-l' },
    { ko: 'ㅈ', qwerty: 'w', sound: 'j/ch', koPhonetic: 'jieut', finger: 'ring-l' },
    { ko: 'ㄷ', qwerty: 'e', sound: 'd/t', koPhonetic: 'digeut', finger: 'middle-l' },
    { ko: 'ㄱ', qwerty: 'r', sound: 'g/k', koPhonetic: 'giyeok', finger: 'index-l' },
    { ko: 'ㅅ', qwerty: 't', sound: 's', koPhonetic: 'siot', finger: 'index-l' },
    { ko: 'ㅛ', qwerty: 'y', sound: 'yo', koPhonetic: 'yo', finger: 'index-r' },
    { ko: 'ㅕ', qwerty: 'u', sound: 'yeo', koPhonetic: 'yeo', finger: 'index-r' },
    { ko: 'ㅑ', qwerty: 'i', sound: 'ya', koPhonetic: 'ya', finger: 'middle-r' },
    { ko: 'ㅐ', qwerty: 'o', sound: 'ae', koPhonetic: 'ae', finger: 'ring-r' },
    { ko: 'ㅔ', qwerty: 'p', sound: 'e', koPhonetic: 'e', finger: 'pinky-r' },
  ],
  [
    { ko: 'ㅁ', qwerty: 'a', sound: 'm', koPhonetic: 'mieum', finger: 'pinky-l' },
    { ko: 'ㄴ', qwerty: 's', sound: 'n', koPhonetic: 'nieun', finger: 'ring-l' },
    { ko: 'ㅇ', qwerty: 'd', sound: 'ng (silent as initial)', koPhonetic: 'ieung', finger: 'middle-l' },
    { ko: 'ㄹ', qwerty: 'f', sound: 'r/l', koPhonetic: 'rieul', finger: 'index-l' },
    { ko: 'ㅎ', qwerty: 'g', sound: 'h', koPhonetic: 'hieut', finger: 'index-l' },
    { ko: 'ㅗ', qwerty: 'h', sound: 'o', koPhonetic: 'o', finger: 'index-r' },
    { ko: 'ㅓ', qwerty: 'j', sound: 'eo', koPhonetic: 'eo', finger: 'index-r' },
    { ko: 'ㅏ', qwerty: 'k', sound: 'a', koPhonetic: 'a', finger: 'middle-r' },
    { ko: 'ㅣ', qwerty: 'l', sound: 'i', koPhonetic: 'i', finger: 'ring-r' },
  ],
  [
    { ko: 'ㅋ', qwerty: 'z', sound: 'k (aspirated)', koPhonetic: 'kieuk', finger: 'pinky-l' },
    { ko: 'ㅌ', qwerty: 'x', sound: 't (aspirated)', koPhonetic: 'tieut', finger: 'ring-l' },
    { ko: 'ㅊ', qwerty: 'c', sound: 'ch (aspirated)', koPhonetic: 'chieut', finger: 'middle-l' },
    { ko: 'ㅍ', qwerty: 'v', sound: 'p (aspirated)', koPhonetic: 'pieup', finger: 'index-l' },
    { ko: 'ㅠ', qwerty: 'b', sound: 'yu', koPhonetic: 'yu', finger: 'index-l' },
    { ko: 'ㅜ', qwerty: 'n', sound: 'u', koPhonetic: 'u', finger: 'index-r' },
    { ko: 'ㅡ', qwerty: 'm', sound: 'eu', koPhonetic: 'eu', finger: 'index-r' },
  ]
];

// Build lookup maps from keyboard data
export const KO_TO_QWERTY = {};
export const KO_LETTER_INFO = {};

KOREAN_KEYBOARD.forEach(row => {
  row.forEach(key => {
    KO_TO_QWERTY[key.ko] = key.qwerty;
    KO_LETTER_INFO[key.ko] = key;
  });
});

// Double consonants (Shift versions: tense/fortis consonants)
KO_TO_QWERTY['ㅃ'] = 'Q';  // Shift+q — ssang-bieup
KO_TO_QWERTY['ㅉ'] = 'W';  // Shift+w — ssang-jieut
KO_TO_QWERTY['ㄸ'] = 'E';  // Shift+e — ssang-digeut
KO_TO_QWERTY['ㄲ'] = 'R';  // Shift+r — ssang-giyeok
KO_TO_QWERTY['ㅆ'] = 'T';  // Shift+t — ssang-siot

// Shift vowels
KO_TO_QWERTY['ㅒ'] = 'O';  // Shift+o — yae
KO_TO_QWERTY['ㅖ'] = 'P';  // Shift+p — ye

// Compound vowels (typed as two-key sequences on 2-set layout)
// These map to their component keystrokes
KO_TO_QWERTY['ㅘ'] = 'hk';   // ㅗ + ㅏ
KO_TO_QWERTY['ㅙ'] = 'ho';   // ㅗ + ㅐ
KO_TO_QWERTY['ㅚ'] = 'hl';   // ㅗ + ㅣ
KO_TO_QWERTY['ㅝ'] = 'nj';   // ㅜ + ㅓ
KO_TO_QWERTY['ㅞ'] = 'np';   // ㅜ + ㅔ
KO_TO_QWERTY['ㅟ'] = 'nl';   // ㅜ + ㅣ
KO_TO_QWERTY['ㅢ'] = 'ml';   // ㅡ + ㅣ

// Compound (double) final consonants — typed as two-key sequences
KO_TO_QWERTY['ㄳ'] = 'rt';   // ㄱ + ㅅ
KO_TO_QWERTY['ㄵ'] = 'sw';   // ㄴ + ㅈ
KO_TO_QWERTY['ㄶ'] = 'sg';   // ㄴ + ㅎ
KO_TO_QWERTY['ㄺ'] = 'fr';   // ㄹ + ㄱ
KO_TO_QWERTY['ㄻ'] = 'fa';   // ㄹ + ㅁ
KO_TO_QWERTY['ㄼ'] = 'fq';   // ㄹ + ㅂ
KO_TO_QWERTY['ㄽ'] = 'ft';   // ㄹ + ㅅ
KO_TO_QWERTY['ㄾ'] = 'fx';   // ㄹ + ㅌ
KO_TO_QWERTY['ㄿ'] = 'fv';   // ㄹ + ㅍ
KO_TO_QWERTY['ㅀ'] = 'fg';   // ㄹ + ㅎ
KO_TO_QWERTY['ㅄ'] = 'qt';   // ㅂ + ㅅ

// Whitespace and punctuation pass-through
KO_TO_QWERTY[' '] = ' ';
KO_TO_QWERTY["'"] = "'";

// Per-letter info for all Hangul jamo
export const KO_LETTER_INFO_FULL = {
  // Basic consonants (14)
  ㄱ: { name: '기역', sound: 'g/k — like "g" in "go" (initial) or "k" (final)', example: '가방 (bag)' },
  ㄴ: { name: '니은', sound: 'n — like "n" in "no"', example: '나무 (tree)' },
  ㄷ: { name: '디귿', sound: 'd/t — like "d" in "do" (initial) or "t" (final)', example: '다리 (bridge)' },
  ㄹ: { name: '리을', sound: 'r/l — flap "r" (initial) or "l" (final)', example: '라면 (ramen)' },
  ㅁ: { name: '미음', sound: 'm — like "m" in "mom"', example: '마음 (heart)' },
  ㅂ: { name: '비읍', sound: 'b/p — like "b" in "boy" (initial) or "p" (final)', example: '바다 (sea)' },
  ㅅ: { name: '시옷', sound: 's — like "s" in "sun"', example: '사랑 (love)' },
  ㅇ: { name: '이응', sound: 'silent (initial) / ng (final)', example: '아이 (child)' },
  ㅈ: { name: '지읒', sound: 'j/ch — like "j" in "jug"', example: '자동차 (car)' },
  ㅊ: { name: '치읓', sound: 'ch — aspirated, like "ch" in "church"', example: '차 (tea)' },
  ㅋ: { name: '키읔', sound: 'k — aspirated, like "k" in "kite"', example: '커피 (coffee)' },
  ㅌ: { name: '티읕', sound: 't — aspirated, like "t" in "top"', example: '토마토 (tomato)' },
  ㅍ: { name: '피읖', sound: 'p — aspirated, like "p" in "pie"', example: '포도 (grape)' },
  ㅎ: { name: '히읗', sound: 'h — like "h" in "hat"', example: '하늘 (sky)' },
  // Double (tense) consonants (5)
  ㄲ: { name: '쌍기역', sound: 'kk — tense, no aspiration', example: '까치 (magpie)' },
  ㄸ: { name: '쌍디귿', sound: 'tt — tense, no aspiration', example: '떡 (rice cake)' },
  ㅃ: { name: '쌍비읍', sound: 'pp — tense, no aspiration', example: '빵 (bread)' },
  ㅆ: { name: '쌍시옷', sound: 'ss — tense, no aspiration', example: '쓰다 (to write)' },
  ㅉ: { name: '쌍지읒', sound: 'jj — tense, no aspiration', example: '짜다 (salty)' },
  // Basic vowels (10)
  ㅏ: { name: 'ㅏ', sound: 'a — like "a" in "father"', example: '아버지 (father)' },
  ㅑ: { name: 'ㅑ', sound: 'ya — like "ya" in "yard"', example: '야구 (baseball)' },
  ㅓ: { name: 'ㅓ', sound: 'eo — like "u" in "bus"', example: '어머니 (mother)' },
  ㅕ: { name: 'ㅕ', sound: 'yeo — like "you" without the final "oo"', example: '여자 (woman)' },
  ㅗ: { name: 'ㅗ', sound: 'o — like "o" in "go"', example: '오늘 (today)' },
  ㅛ: { name: 'ㅛ', sound: 'yo — like "yo" in "yoga"', example: '요리 (cooking)' },
  ㅜ: { name: 'ㅜ', sound: 'u — like "oo" in "moon"', example: '우유 (milk)' },
  ㅠ: { name: 'ㅠ', sound: 'yu — like "you"', example: '유리 (glass)' },
  ㅡ: { name: 'ㅡ', sound: 'eu — no English equivalent; unrounded "oo"', example: '그림 (picture)' },
  ㅣ: { name: 'ㅣ', sound: 'i — like "ee" in "see"', example: '이름 (name)' },
  // Compound vowels (11)
  ㅐ: { name: 'ㅐ', sound: 'ae — like "a" in "care"', example: '개 (dog)' },
  ㅒ: { name: 'ㅒ', sound: 'yae — like "ya" + "e"', example: '얘기 (story)' },
  ㅔ: { name: 'ㅔ', sound: 'e — like "e" in "bed"', example: '게임 (game)' },
  ㅖ: { name: 'ㅖ', sound: 'ye — like "ye" in "yes"', example: '예 (yes)' },
  ㅘ: { name: 'ㅘ', sound: 'wa — like "wa" in "wand"', example: '과일 (fruit)' },
  ㅙ: { name: 'ㅙ', sound: 'wae — like "we" in "wet"', example: '왜 (why)' },
  ㅚ: { name: 'ㅚ', sound: 'oe — like "we" in "wet"', example: '외국 (foreign country)' },
  ㅝ: { name: 'ㅝ', sound: 'wo — like "wo" in "won"', example: '원 (won, currency)' },
  ㅞ: { name: 'ㅞ', sound: 'we — like "we" in "wet"', example: '웨이터 (waiter)' },
  ㅟ: { name: 'ㅟ', sound: 'wi — like "wee" in "week"', example: '위 (above)' },
  ㅢ: { name: 'ㅢ', sound: 'ui — "eu" + "i" glide', example: '의사 (doctor)' },
};

// Helper: normalize Korean text for TTS
export const cleanSoundForTTS = (text) => {
  if (!text) return '';
  return text;
};

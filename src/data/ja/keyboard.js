// Japanese romaji input keyboard layout with pronunciation guides and finger positions
// Standard QWERTY keys type Latin letters that convert to hiragana/katakana via IME
export const JAPANESE_KEYBOARD = [
  [
    { ja: 'q', qwerty: 'q', sound: 'used in foreign words (qu-)', jaPhonetic: 'kyuu', finger: 'pinky-l' },
    { ja: 'w', qwerty: 'w', sound: 'wa (わ) row', jaPhonetic: 'daburyuu', finger: 'ring-l' },
    { ja: 'e', qwerty: 'e', sound: 'e (え) vowel', jaPhonetic: 'ii', finger: 'middle-l' },
    { ja: 'r', qwerty: 'r', sound: 'ra (ら) row', jaPhonetic: 'aaru', finger: 'index-l' },
    { ja: 't', qwerty: 't', sound: 'ta (た) row', jaPhonetic: 'tii', finger: 'index-l' },
    { ja: 'y', qwerty: 'y', sound: 'ya (や) row', jaPhonetic: 'wai', finger: 'index-r' },
    { ja: 'u', qwerty: 'u', sound: 'u (う) vowel', jaPhonetic: 'yuu', finger: 'index-r' },
    { ja: 'i', qwerty: 'i', sound: 'i (い) vowel', jaPhonetic: 'ai', finger: 'middle-r' },
    { ja: 'o', qwerty: 'o', sound: 'o (お) vowel', jaPhonetic: 'oo', finger: 'ring-r' },
    { ja: 'p', qwerty: 'p', sound: 'pa (ぱ) row (handakuten)', jaPhonetic: 'pii', finger: 'pinky-r' },
  ],
  [
    { ja: 'a', qwerty: 'a', sound: 'a (あ) vowel', jaPhonetic: 'ei', finger: 'pinky-l' },
    { ja: 's', qwerty: 's', sound: 'sa (さ) row', jaPhonetic: 'esu', finger: 'ring-l' },
    { ja: 'd', qwerty: 'd', sound: 'da (だ) row (dakuten)', jaPhonetic: 'dii', finger: 'middle-l' },
    { ja: 'f', qwerty: 'f', sound: 'fu (ふ) kana', jaPhonetic: 'efu', finger: 'index-l' },
    { ja: 'g', qwerty: 'g', sound: 'ga (が) row (dakuten)', jaPhonetic: 'jii', finger: 'index-l' },
    { ja: 'h', qwerty: 'h', sound: 'ha (は) row', jaPhonetic: 'eichi', finger: 'index-r' },
    { ja: 'j', qwerty: 'j', sound: 'ja (じゃ) combination', jaPhonetic: 'jei', finger: 'index-r' },
    { ja: 'k', qwerty: 'k', sound: 'ka (か) row', jaPhonetic: 'kei', finger: 'middle-r' },
    { ja: 'l', qwerty: 'l', sound: 'used for small kana (la→ぁ)', jaPhonetic: 'eru', finger: 'ring-r' },
  ],
  [
    { ja: 'z', qwerty: 'z', sound: 'za (ざ) row (dakuten)', jaPhonetic: 'zetto', finger: 'pinky-l' },
    { ja: 'x', qwerty: 'x', sound: 'used for small kana (xa→ぁ)', jaPhonetic: 'ekkusu', finger: 'ring-l' },
    { ja: 'c', qwerty: 'c', sound: 'chi (ち) kana', jaPhonetic: 'shii', finger: 'middle-l' },
    { ja: 'v', qwerty: 'v', sound: 'used in foreign words (vu→ゔ)', jaPhonetic: 'bui', finger: 'index-l' },
    { ja: 'b', qwerty: 'b', sound: 'ba (ば) row (dakuten)', jaPhonetic: 'bii', finger: 'index-l' },
    { ja: 'n', qwerty: 'n', sound: 'na (な) row / n (ん)', jaPhonetic: 'enu', finger: 'index-r' },
    { ja: 'm', qwerty: 'm', sound: 'ma (ま) row', jaPhonetic: 'emu', finger: 'index-r' },
  ]
];

// Build lookup maps from keyboard data
export const JA_TO_QWERTY = {};
export const JA_LETTER_INFO = {};

JAPANESE_KEYBOARD.forEach(row => {
  row.forEach(key => {
    JA_TO_QWERTY[key.ja] = key.qwerty;
    JA_LETTER_INFO[key.ja] = key;
  });
});

// Whitespace and punctuation pass-through
JA_TO_QWERTY[' '] = ' ';
JA_TO_QWERTY["'"] = "'";

// Per-letter info for all romaji→kana mappings
export const JA_LETTER_INFO_FULL = {
  // Vowels (母音)
  a:   { name: 'あ', sound: 'a — like "a" in "father"', example: 'あめ (rain)' },
  i:   { name: 'い', sound: 'i — like "ee" in "see"', example: 'いぬ (dog)' },
  u:   { name: 'う', sound: 'u — like "oo" in "food"', example: 'うみ (sea)' },
  e:   { name: 'え', sound: 'e — like "e" in "bed"', example: 'えき (station)' },
  o:   { name: 'お', sound: 'o — like "o" in "go"', example: 'おと (sound)' },

  // K-row (か行)
  ka:  { name: 'か', sound: 'ka — like "ca" in "car"', example: 'かさ (umbrella)' },
  ki:  { name: 'き', sound: 'ki — like "kee" in "key"', example: 'きもの (kimono)' },
  ku:  { name: 'く', sound: 'ku — like "coo" in "cool"', example: 'くも (cloud)' },
  ke:  { name: 'け', sound: 'ke — like "ke" in "keg"', example: 'けむり (smoke)' },
  ko:  { name: 'こ', sound: 'ko — like "co" in "coat"', example: 'こども (child)' },

  // S-row (さ行)
  sa:  { name: 'さ', sound: 'sa — like "sa" in "saw"', example: 'さくら (cherry blossom)' },
  shi: { name: 'し', sound: 'shi — like "she" in "she"', example: 'しろ (white)' },
  su:  { name: 'す', sound: 'su — like "sue"', example: 'すし (sushi)' },
  se:  { name: 'せ', sound: 'se — like "se" in "set"', example: 'せんせい (teacher)' },
  so:  { name: 'そ', sound: 'so — like "so" in "so"', example: 'そら (sky)' },

  // T-row (た行)
  ta:  { name: 'た', sound: 'ta — like "ta" in "tall"', example: 'たまご (egg)' },
  chi: { name: 'ち', sound: 'chi — like "chee" in "cheese"', example: 'ちず (map)' },
  tsu: { name: 'つ', sound: 'tsu — like "tsu" in "tsunami"', example: 'つき (moon)' },
  te:  { name: 'て', sound: 'te — like "te" in "ten"', example: 'てがみ (letter)' },
  to:  { name: 'と', sound: 'to — like "to" in "tone"', example: 'ともだち (friend)' },

  // N-row (な行)
  na:  { name: 'な', sound: 'na — like "na" in "nap"', example: 'なつ (summer)' },
  ni:  { name: 'に', sound: 'ni — like "nee" in "knee"', example: 'にほん (Japan)' },
  nu:  { name: 'ぬ', sound: 'nu — like "noo" in "noodle"', example: 'ぬの (cloth)' },
  ne:  { name: 'ね', sound: 'ne — like "ne" in "net"', example: 'ねこ (cat)' },
  no:  { name: 'の', sound: 'no — like "no" in "no"', example: 'のみもの (drink)' },

  // H-row (は行)
  ha:  { name: 'は', sound: 'ha — like "ha" in "hat"', example: 'はな (flower)' },
  hi:  { name: 'ひ', sound: 'hi — like "hee" in "he"', example: 'ひと (person)' },
  fu:  { name: 'ふ', sound: 'fu — between "fu" and "hu"', example: 'ふゆ (winter)' },
  he:  { name: 'へ', sound: 'he — like "he" in "help"', example: 'へや (room)' },
  ho:  { name: 'ほ', sound: 'ho — like "ho" in "home"', example: 'ほん (book)' },

  // M-row (ま行)
  ma:  { name: 'ま', sound: 'ma — like "ma" in "map"', example: 'まど (window)' },
  mi:  { name: 'み', sound: 'mi — like "mee" in "me"', example: 'みず (water)' },
  mu:  { name: 'む', sound: 'mu — like "moo" in "moon"', example: 'むし (insect)' },
  me:  { name: 'め', sound: 'me — like "me" in "met"', example: 'め (eye)' },
  mo:  { name: 'も', sound: 'mo — like "mo" in "more"', example: 'もり (forest)' },

  // Y-row (や行)
  ya:  { name: 'や', sound: 'ya — like "ya" in "yard"', example: 'やま (mountain)' },
  yu:  { name: 'ゆ', sound: 'yu — like "you"', example: 'ゆき (snow)' },
  yo:  { name: 'よ', sound: 'yo — like "yo" in "yoga"', example: 'よる (night)' },

  // R-row (ら行)
  ra:  { name: 'ら', sound: 'ra — flap r, between "r" and "l"', example: 'らいねん (next year)' },
  ri:  { name: 'り', sound: 'ri — flap r + ee', example: 'りんご (apple)' },
  ru:  { name: 'る', sound: 'ru — flap r + oo', example: 'るす (absence)' },
  re:  { name: 'れ', sound: 're — flap r + e', example: 'れいぞうこ (refrigerator)' },
  ro:  { name: 'ろ', sound: 'ro — flap r + o', example: 'ろく (six)' },

  // W-row (わ行) and N (ん)
  wa:  { name: 'わ', sound: 'wa — like "wa" in "wand"', example: 'わたし (I/me)' },
  wo:  { name: 'を', sound: 'wo — particle "o"', example: 'を (object particle)' },
  n:   { name: 'ん', sound: 'n — like "n" in "sun" (standalone)', example: 'さん (three)' },

  // G-row (が行 — dakuten of か行)
  ga:  { name: 'が', sound: 'ga — like "ga" in "garden"', example: 'がっこう (school)' },
  gi:  { name: 'ぎ', sound: 'gi — like "gee" in "geese"', example: 'ぎんこう (bank)' },
  gu:  { name: 'ぐ', sound: 'gu — like "goo" in "goose"', example: 'ぐんて (gloves)' },
  ge:  { name: 'げ', sound: 'ge — like "ge" in "get"', example: 'げんき (energetic)' },
  go:  { name: 'ご', sound: 'go — like "go" in "go"', example: 'ごはん (rice/meal)' },

  // Z-row (ざ行 — dakuten of さ行)
  za:  { name: 'ざ', sound: 'za — like "za" in "pizza"', example: 'ざっし (magazine)' },
  ji:  { name: 'じ', sound: 'ji — like "jee" in "jeep"', example: 'じかん (time)' },
  zu:  { name: 'ず', sound: 'zu — like "zoo"', example: 'ずっと (always)' },
  ze:  { name: 'ぜ', sound: 'ze — like "ze" in "zest"', example: 'ぜんぶ (everything)' },
  zo:  { name: 'ぞ', sound: 'zo — like "zo" in "zone"', example: 'ぞう (elephant)' },

  // D-row (だ行 — dakuten of た行)
  da:  { name: 'だ', sound: 'da — like "da" in "dad"', example: 'だれ (who)' },
  di:  { name: 'ぢ', sound: 'di — like "jee" (same as ji)', example: 'ぢめん (ground)' },
  du:  { name: 'づ', sound: 'du — like "zoo" (same as zu)', example: 'つづく (to continue)' },
  de:  { name: 'で', sound: 'de — like "de" in "den"', example: 'でんわ (telephone)' },
  do:  { name: 'ど', sound: 'do — like "do" in "door"', example: 'どうぶつ (animal)' },

  // B-row (ば行 — dakuten of は行)
  ba:  { name: 'ば', sound: 'ba — like "ba" in "bat"', example: 'ばしょ (place)' },
  bi:  { name: 'び', sound: 'bi — like "bee"', example: 'びじゅつ (art)' },
  bu:  { name: 'ぶ', sound: 'bu — like "boo" in "book"', example: 'ぶんか (culture)' },
  be:  { name: 'べ', sound: 'be — like "be" in "bed"', example: 'べんきょう (study)' },
  bo:  { name: 'ぼ', sound: 'bo — like "bo" in "boat"', example: 'ぼうし (hat)' },

  // P-row (ぱ行 — handakuten of は行)
  pa:  { name: 'ぱ', sound: 'pa — like "pa" in "park"', example: 'ぱん (bread)' },
  pi:  { name: 'ぴ', sound: 'pi — like "pee" in "peek"', example: 'ぴあの (piano)' },
  pu:  { name: 'ぷ', sound: 'pu — like "poo" in "pool"', example: 'ぷーる (pool)' },
  pe:  { name: 'ぺ', sound: 'pe — like "pe" in "pet"', example: 'ぺん (pen)' },
  po:  { name: 'ぽ', sound: 'po — like "po" in "post"', example: 'ぽすと (post)' },
};

// Helper: normalize Japanese text for TTS
export const cleanSoundForTTS = (text) => {
  if (!text) return '';
  return text;
};

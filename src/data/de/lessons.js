// German lesson content organized by keyboard rows (QWERTZ layout)
// Top row:    q w e r t z u i o p ü  (qwerty: q w e r t y u i o p [)
// Middle row: a s d f g h j k l ö ä  (qwerty: a s d f g h j k l ; ')
// Bottom row: y x c v b n m ß        (qwerty: z x c v b n m -)

export const DE_ALPHABET_CHALLENGE = {
  name: "Alphabet Speed Run",
  nameUk: "Alphabet",
  description: "Type the German alphabet A–Z plus the umlauts as fast as you can!",
  hint: "Type each letter in order — loops automatically!",
  letters: ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','ä','ö','ü','ß'],
  words: [],
  xpPerLetter: 5,
  xpPerWord: 0,
  requiredXp: 0,
  isAlphabetMode: true
};

export const DE_LESSONS = {
  1: {
    name: "Home Row",
    nameUk: "Grundreihe",
    icon: "🏠",
    description: "Start with the home row — where your fingers rest!",
    hint: "a s d f g h j k l ö ä",
    letters: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
    words: ['Glas', 'als', 'lag', 'Saal', 'Käse', 'Sahne', 'Lage', 'Haag', 'Salsa', 'Flagge'],
    xpPerLetter: 10,
    xpPerWord: 25,
    requiredXp: 0
  },
  2: {
    name: "Top Row",
    nameUk: "Obere Reihe",
    icon: "⬆️",
    description: "Learn the top row of the German keyboard",
    hint: "q w e r t z u i o p ü",
    letters: ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
    words: ['Tier', 'Uhr', 'rot', 'treu', 'Wort', 'Quiz', 'Würze', 'Trio', 'Oper', 'Zeug'],
    xpPerLetter: 10,
    xpPerWord: 25,
    requiredXp: 0
  },
  3: {
    name: "Bottom Row",
    nameUk: "Untere Reihe",
    icon: "⬇️",
    description: "Learn the bottom row of the keyboard",
    hint: "y x c v b n m ß",
    letters: ['y', 'x', 'c', 'v', 'b', 'n', 'm', 'ß'],
    words: ['Name', 'Verb', 'Bach', 'Mond', 'Buch', 'Nacht', 'man', 'Maß', 'Straße', 'Box'],
    xpPerLetter: 10,
    xpPerWord: 25,
    requiredXp: 0
  },
  4: {
    name: "Umlauts",
    nameUk: "Umlaute",
    icon: "🔤",
    description: "Master the German umlauts: ä, ö, ü, ß",
    hint: "ä ö ü ß — the keys that make German unique!",
    letters: ['ä', 'ö', 'ü', 'ß'],
    words: ['schön', 'über', 'heiß', 'süß', 'Löwe', 'Mäuse', 'Öl', 'Käfer', 'weiß', 'Füße'],
    xpPerLetter: 12,
    xpPerWord: 30,
    requiredXp: 150
  },
  5: {
    name: "All Keys",
    nameUk: "Alle Tasten",
    icon: "⌨️",
    description: "Use the entire German keyboard!",
    hint: "You know all the keys — jetzt geht es los!",
    letters: ['a','s','d','f','g','h','j','k','l','ö','ä','q','w','e','r','t','z','u','i','o','p','ü','y','x','c','v','b','n','m','ß'],
    words: ['Haus', 'Kind', 'Zeit', 'Welt', 'Freude', 'Schule', 'Arbeit', 'Mensch', 'Musik', 'Natur'],
    xpPerLetter: 15,
    xpPerWord: 40,
    requiredXp: 350
  },
  6: {
    name: "Common Words",
    nameUk: "Häufige Wörter",
    icon: "📚",
    description: "Practice the most common German words!",
    hint: "These words appear everywhere in German",
    letters: [],
    words: ['und', 'die', 'der', 'das', 'ist', 'nicht', 'auch', 'ich', 'ein', 'eine', 'mit', 'von', 'zu', 'sie', 'für'],
    xpPerLetter: 15,
    xpPerWord: 50,
    requiredXp: 600
  },
  7: {
    name: "Greetings",
    nameUk: "Begrüßungen",
    icon: "👋",
    description: "Learn essential German greetings and phrases!",
    hint: "Impress your German-speaking friends!",
    letters: [],
    words: ['Hallo', 'Tschüss', 'Danke', 'Bitte', 'ja', 'nein', 'gut', 'Entschuldigung', 'Guten Morgen', 'Auf Wiedersehen'],
    xpPerLetter: 18,
    xpPerWord: 60,
    requiredXp: 900
  },
  8: {
    name: "Numbers",
    nameUk: "Zahlen",
    icon: "🔢",
    description: "Count in German!",
    hint: "eins, zwei, drei... los geht es!",
    letters: [],
    words: ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'hundert', 'tausend'],
    xpPerLetter: 18,
    xpPerWord: 55,
    requiredXp: 1250
  },
  9: {
    name: "Food",
    nameUk: "Essen",
    icon: "🍞",
    description: "Delicious German vocabulary!",
    hint: "German cuisine is amazing!",
    letters: [],
    words: ['Brot', 'Wasser', 'Kaffee', 'Tee', 'Bier', 'Fleisch', 'Käse', 'Wurst', 'Kuchen', 'Suppe', 'Salat', 'Brezel'],
    xpPerLetter: 20,
    xpPerWord: 65,
    requiredXp: 1650
  },
  10: {
    name: "Phrases",
    nameUk: "Phrasen",
    icon: "💬",
    description: "Put it all together with full German sentences!",
    hint: "You're ready for real German text!",
    letters: [],
    words: ['Ich lerne Deutsch', 'Wie geht es Ihnen', 'Es geht mir gut', 'Ich verstehe nicht', 'Sprechen Sie Englisch', 'Ich liebe Deutschland'],
    xpPerLetter: 20,
    xpPerWord: 80,
    requiredXp: 2100
  }
};

// Lesson content organized by keyboard rows
// Top row:    й ц у к е н г ш щ з х ї (qwerty: q w e r t y u i o p [ ])
// Middle row: ф і в а п р о л д ж є (qwerty: a s d f g h j k l ; ')
// Bottom row: я ч с м и т ь б ю (qwerty: z x c v b n m , .)

export const ALPHABET_CHALLENGE = {
  name: "Alphabet Speed Run",
  nameUk: "Абетка",
  description: "Type the Ukrainian alphabet A-Я as fast as you can!",
  hint: "Type each letter in order - loops automatically!",
  letters: ['а', 'б', 'в', 'г', 'ґ', 'д', 'е', 'є', 'ж', 'з', 'и', 'і', 'ї', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ь', 'ю', 'я'],
  words: [],
  xpPerLetter: 5,
  xpPerWord: 0,
  requiredXp: 0,
  isAlphabetMode: true
};

export const LESSONS = {
  1: {
    name: "Top Row",
    nameUk: "Верхній ряд",
    icon: "⬆️",
    description: "Learn the top row of the Ukrainian keyboard",
    hint: "й ц у к е н г ш щ з х ї",
    letters: ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ї'],
    words: ['ще', 'щуку', 'цех', 'неї', 'кущ', 'ген', 'куш'],
    xpPerLetter: 10,
    xpPerWord: 25,
    requiredXp: 0
  },
  2: {
    name: "Middle Row",
    nameUk: "Середній ряд",
    icon: "🏠",
    description: "Learn the home row - where your fingers rest!",
    hint: "ф і в а п р о л д ж є",
    letters: ['ф', 'і', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'є'],
    words: ['від', 'рід', 'вода', 'пора', 'лапа', 'діло', 'воля', 'доля', 'пара', 'рада', 'жар', 'вже'],
    xpPerLetter: 10,
    xpPerWord: 25,
    requiredXp: 0
  },
  3: {
    name: "Bottom Row",
    nameUk: "Нижній ряд",
    icon: "⬇️",
    description: "Learn the bottom row of the keyboard",
    hint: "я ч с м и т ь б ю",
    letters: ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю'],
    words: ['там', 'тут', 'сам', 'мить', 'бути', 'чути', 'сміх', 'миття', 'буття', 'тиша'],
    xpPerLetter: 10,
    xpPerWord: 25,
    requiredXp: 0
  },
  4: {
    name: "Top + Middle",
    nameUk: "Верх + Середина",
    icon: "🔀",
    description: "Combine top and middle rows!",
    hint: "Practice switching between rows",
    letters: ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ї', 'ф', 'і', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'є'],
    words: ['він', 'вона', 'око', 'вухо', 'поле', 'школа', 'дерево', 'озеро', 'кіно', 'кефір'],
    xpPerLetter: 12,
    xpPerWord: 30,
    requiredXp: 150
  },
  5: {
    name: "All Rows",
    nameUk: "Всі ряди",
    icon: "⌨️",
    description: "Use the entire keyboard!",
    hint: "You know all the keys now!",
    letters: ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ї', 'ф', 'і', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'є', 'я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю'],
    words: ['кіт', 'сон', 'мати', 'тато', 'хліб', 'яблуко', 'читати', 'любов', 'будинок'],
    xpPerLetter: 15,
    xpPerWord: 40,
    requiredXp: 350
  },
  6: {
    name: "Common Words",
    nameUk: "Часті слова",
    icon: "📚",
    description: "Practice the most common Ukrainian words!",
    hint: "These words appear everywhere in Ukrainian",
    letters: [],
    words: ['і', 'в', 'на', 'що', 'як', 'але', 'це', 'той', 'весь', 'свій', 'один', 'такий', 'тільки', 'можна', 'треба'],
    xpPerLetter: 15,
    xpPerWord: 50,
    requiredXp: 600
  },
  7: {
    name: "Greetings",
    nameUk: "Привітання",
    icon: "👋",
    description: "Learn essential greetings and phrases!",
    hint: "Impress your Ukrainian friends!",
    letters: [],
    words: ['привіт', 'добрий', 'ранок', 'день', 'вечір', 'дякую', 'будь ласка', 'так', 'ні', 'добре', 'до побачення'],
    xpPerLetter: 18,
    xpPerWord: 60,
    requiredXp: 900
  },
  8: {
    name: "Numbers",
    nameUk: "Числа",
    icon: "🔢",
    description: "Count in Ukrainian!",
    hint: "один, два, три... let's go!",
    letters: [],
    words: ['один', 'два', 'три', 'чотири', "п'ять", 'шість', 'сім', 'вісім', "дев'ять", 'десять', 'сто', 'тисяча'],
    xpPerLetter: 18,
    xpPerWord: 55,
    requiredXp: 1250
  },
  9: {
    name: "Food",
    nameUk: "Їжа",
    icon: "🍲",
    description: "Delicious Ukrainian vocabulary!",
    hint: "Ukrainian cuisine is amazing!",
    letters: [],
    words: ['борщ', 'вареники', 'сало', 'хліб', 'молоко', 'вода', 'кава', 'чай', "м'ясо", 'риба', 'овочі', 'фрукти'],
    xpPerLetter: 20,
    xpPerWord: 65,
    requiredXp: 1650
  },
  10: {
    name: "Phrases",
    nameUk: "Фрази",
    icon: "💬",
    description: "Put it all together with full sentences!",
    hint: "You're ready for real Ukrainian text!",
    letters: [],
    words: ['я люблю', 'це добре', 'як справи', 'все гаразд', 'до зустрічі', 'слава україні', 'я вивчаю', 'дуже дякую'],
    xpPerLetter: 20,
    xpPerWord: 80,
    requiredXp: 2100
  }
};

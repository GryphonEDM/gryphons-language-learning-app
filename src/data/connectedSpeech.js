/**
 * Connected Speech Training Data
 *
 * Research: The #1 reason learners can read but not understand spoken language
 * is connected speech phenomena — linking, reduction, assimilation, elision.
 * Words in fluent speech sound nothing like their dictionary forms.
 */

export const CONNECTED_SPEECH = {
  uk: {
    phenomena: [
      { id: 'linking', name: 'Linking', icon: '🔗', description: 'Words flow together without pauses' },
      { id: 'reduction', name: 'Vowel Reduction', icon: '🔉', description: 'Unstressed vowels become shorter and less distinct' },
      { id: 'assimilation', name: 'Assimilation', icon: '🔄', description: 'Sounds change to match neighboring sounds' },
    ],
    examples: [
      {
        id: 'uk_cs_1',
        phrase: 'Як у вас справи?',
        translation: 'How are you?',
        phenomenon: 'linking',
        citationWords: ['Як', 'у', 'вас', 'справи'],
        tip: 'In natural speech, "як у вас" blends into one flowing unit without pauses between words.',
        difficulty: 'A1',
      },
      {
        id: 'uk_cs_2',
        phrase: 'Не за що',
        translation: "You're welcome / Don't mention it",
        phenomenon: 'reduction',
        citationWords: ['Не', 'за', 'що'],
        tip: 'Spoken quickly, this sounds almost like "нізащо" — the separate words merge together.',
        difficulty: 'A1',
      },
      {
        id: 'uk_cs_3',
        phrase: 'Будь ласка',
        translation: 'Please',
        phenomenon: 'linking',
        citationWords: ['Будь', 'ласка'],
        tip: 'The "дь" ending links directly into "ласка" — no pause between the words.',
        difficulty: 'A1',
      },
      {
        id: 'uk_cs_4',
        phrase: 'Я не знаю',
        translation: "I don't know",
        phenomenon: 'reduction',
        citationWords: ['Я', 'не', 'знаю'],
        tip: 'The "не" is reduced and nearly disappears in fast speech — sounds close to "я знаю" but faster.',
        difficulty: 'A1',
      },
      {
        id: 'uk_cs_5',
        phrase: 'Скажіть будь ласка',
        translation: 'Tell me please',
        phenomenon: 'linking',
        citationWords: ['Скажіть', 'будь', 'ласка'],
        tip: 'Three words flow as one phrase — the "ть" of "скажіть" links into "будь".',
        difficulty: 'A2',
      },
      {
        id: 'uk_cs_6',
        phrase: 'Де знаходиться вокзал?',
        translation: 'Where is the train station?',
        phenomenon: 'reduction',
        citationWords: ['Де', 'знаходиться', 'вокзал'],
        tip: '"Знаходиться" is reduced in speech — the middle syllables get compressed.',
        difficulty: 'A2',
      },
      {
        id: 'uk_cs_7',
        phrase: 'Я хочу замовити каву',
        translation: 'I want to order coffee',
        phenomenon: 'linking',
        citationWords: ['Я', 'хочу', 'замовити', 'каву'],
        tip: '"Хочу замовити" flows together — the "у" connects smoothly to "за".',
        difficulty: 'A2',
      },
      {
        id: 'uk_cs_8',
        phrase: 'З днем народження',
        translation: 'Happy birthday',
        phenomenon: 'assimilation',
        citationWords: ['З', 'днем', 'народження'],
        tip: 'The "з" assimilates to the "д" that follows — the cluster "зд" merges in pronunciation.',
        difficulty: 'A2',
      },
      {
        id: 'uk_cs_9',
        phrase: 'Що ви будете пити?',
        translation: 'What will you drink?',
        phenomenon: 'reduction',
        citationWords: ['Що', 'ви', 'будете', 'пити'],
        tip: '"Будете" is heavily reduced in casual speech — sounds almost like "будте".',
        difficulty: 'B1',
      },
      {
        id: 'uk_cs_10',
        phrase: 'Прошу вибачення',
        translation: 'I apologize',
        phenomenon: 'linking',
        citationWords: ['Прошу', 'вибачення'],
        tip: 'The "у" ending links into "ви" — the phrase flows as one unit.',
        difficulty: 'B1',
      },
    ],
  },
  ru: {
    phenomena: [
      { id: 'linking', name: 'Linking', icon: '🔗', description: 'Words flow together' },
      { id: 'reduction', name: 'Vowel Reduction', icon: '🔉', description: 'Unstressed о→а, е→и' },
      { id: 'assimilation', name: 'Voicing Assimilation', icon: '🔄', description: 'Consonants match voicing of neighbors' },
    ],
    examples: [
      {
        id: 'ru_cs_1',
        phrase: 'Как у вас дела?',
        translation: 'How are you?',
        phenomenon: 'reduction',
        citationWords: ['Как', 'у', 'вас', 'дела'],
        tip: '"Как" sounds like "как" but "дела" has reduced first vowel — sounds like "дила".',
        difficulty: 'A1',
      },
      {
        id: 'ru_cs_2',
        phrase: 'Не за что',
        translation: "You're welcome",
        phenomenon: 'reduction',
        citationWords: ['Не', 'за', 'что'],
        tip: 'Spoken as one unit — "незашто" with reduced vowels.',
        difficulty: 'A1',
      },
      {
        id: 'ru_cs_3',
        phrase: 'Здравствуйте',
        translation: 'Hello (formal)',
        phenomenon: 'reduction',
        citationWords: ['Здравствуйте'],
        tip: 'The first "в" is completely silent in natural speech — "здраствуйте".',
        difficulty: 'A1',
      },
    ],
  },
};

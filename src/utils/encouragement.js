// Fun encouraging messages - Ukrainian
export const ENCOURAGEMENTS = [
  "Чудово! (Wonderful!)",
  "Молодець! (Well done!)",
  "Супер! (Super!)",
  "Відмінно! (Excellent!)",
  "Так тримати! (Keep it up!)",
  "Браво! (Bravo!)",
  "Неймовірно! (Incredible!)",
  "Фантастика! (Fantastic!)"
];

export const MISTAKE_MESSAGES = [
  "Try again! Спробуй ще!",
  "Almost! Майже!",
  "Keep going! Продовжуй!",
  "You've got this! Ти зможеш!",
  "No worries! Не хвилюйся!"
];

// Fun encouraging messages - Russian
export const ENCOURAGEMENTS_RU = [
  "Отлично! (Excellent!)",
  "Молодец! (Well done!)",
  "Супер! (Super!)",
  "Прекрасно! (Wonderful!)",
  "Так держать! (Keep it up!)",
  "Браво! (Bravo!)",
  "Невероятно! (Incredible!)",
  "Фантастика! (Fantastic!)"
];

export const MISTAKE_MESSAGES_RU = [
  "Try again! Попробуй ещё!",
  "Almost! Почти!",
  "Keep going! Продолжай!",
  "You've got this! Ты сможешь!",
  "No worries! Не волнуйся!"
];

// Fun encouraging messages - German
export const ENCOURAGEMENTS_DE = [
  "Ausgezeichnet! (Excellent!)",
  "Sehr gut! (Very good!)",
  "Wunderbar! (Wonderful!)",
  "Fantastisch! (Fantastic!)",
  "Weiter so! (Keep it up!)",
  "Bravo! (Bravo!)",
  "Unglaublich! (Incredible!)",
  "Super! (Super!)"
];

export const MISTAKE_MESSAGES_DE = [
  "Try again! Versuch es nochmal!",
  "Almost! Fast!",
  "Keep going! Weitermachen!",
  "You've got this! Du schaffst das!",
  "No worries! Kein Problem!"
];

// Get a random encouragement message
export const getRandomEncouragement = () => {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
};

// Get a random mistake message
export const getRandomMistakeMessage = () => {
  return MISTAKE_MESSAGES[Math.floor(Math.random() * MISTAKE_MESSAGES.length)];
};

/** Pure utility functions for speech evaluation */

// Map Latin lookalikes to their Cyrillic equivalents (lowercase only)
const LATIN_TO_CYRILLIC = {
  'a': 'а', 'e': 'е', 'o': 'о', 'p': 'р', 'c': 'с', 'x': 'х',
  'y': 'у', 'k': 'к', 'h': 'н', 'b': 'в', 't': 'т', 'i': 'і',
};

function latinToCyrillic(text) {
  return text.replace(/[a-z]/g, ch => LATIN_TO_CYRILLIC[ch] || ch);
}

export function normalize(text) {
  return latinToCyrillic(
    text
      .normalize('NFC')
      .toLowerCase()
      .replace(/[.,!?;:"""''()—–\-…«»\[\]ʼ']/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 100;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - levenshtein(na, nb) / maxLen) * 100);
}

export function computeDiff(target, input) {
  const t = normalize(target);
  const inp = normalize(input);
  const diff = [];
  const maxLen = Math.max(t.length, inp.length);
  for (let i = 0; i < maxLen; i++) {
    if (i >= inp.length) diff.push({ char: t[i], type: 'missing' });
    else if (i >= t.length) diff.push({ char: inp[i], type: 'extra' });
    else if (t[i] === inp[i]) diff.push({ char: inp[i], type: 'correct' });
    else diff.push({ char: inp[i], type: 'wrong', expected: t[i] });
  }
  return diff;
}

/** CEFR level utilities */
const CEFR_ORDER = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4 };

export function parseCefrRange(difficultyStr) {
  if (!difficultyStr) return null;
  const parts = difficultyStr.match(/([AB][12])/g);
  if (!parts || parts.length === 0) return null;
  if (parts.length === 1) return { min: CEFR_ORDER[parts[0]], max: CEFR_ORDER[parts[0]] };
  return {
    min: Math.min(...parts.map(p => CEFR_ORDER[p]).filter(Boolean)),
    max: Math.max(...parts.map(p => CEFR_ORDER[p]).filter(Boolean)),
  };
}

export function cefrMatches(difficultyStr, cefrLevel) {
  if (!cefrLevel) return true;
  const range = parseCefrRange(difficultyStr);
  if (!range) return true; // no difficulty info = include
  const level = CEFR_ORDER[cefrLevel];
  if (!level) return true;
  return level >= range.min && level <= range.max;
}

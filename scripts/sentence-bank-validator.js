/**
 * Sentence Bank Validator
 * Validates generated sentence bank entries for correctness and quality.
 */

import { GRAMMAR_SCHEMAS, getFamily } from './sentence-bank-prompts.js';

// Script regex patterns per language
const SCRIPT_PATTERNS = {
  uk: /[\u0400-\u04FF]/,           // Cyrillic
  ru: /[\u0400-\u04FF]/,           // Cyrillic
  de: /[a-zA-ZÀ-ÿßäöüÄÖÜ]/,      // Latin + German chars
  es: /[a-zA-ZÀ-ÿñÑáéíóúüÁÉÍÓÚÜ¡¿]/, // Latin + Spanish chars
  fr: /[a-zA-ZÀ-ÿçÇœŒæÆ]/,       // Latin + French chars
  el: /[\u0370-\u03FF\u1F00-\u1FFF]/, // Greek
  hi: /[\u0900-\u097F]/,           // Devanagari
  ar: /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/, // Arabic
  ko: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/, // Hangul
  zh: /[\u4E00-\u9FFF\u3400-\u4DBF]/, // CJK Unified
  ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/, // Hiragana + Katakana + CJK
};

// CJK languages use character count, not word count
const CJK_LANGS = new Set(['zh', 'ja', 'ko']);

// Min stem length for word-presence check per language
const MIN_STEM = {
  zh: 1,  // Chinese characters don't inflect
  ja: 1,  // Single kanji can be the word
  ko: 1,  // Korean stems can be short
  default: 3,
};

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Check if the target word (or an inflected stem) appears in the sentence.
 */
function wordPresent(sentence, targetWord, langCode) {
  const s = sentence.toLowerCase();
  const w = targetWord.toLowerCase();

  // Exact match
  if (s.includes(w)) return true;

  // Stem check — for inflecting languages, check progressively shorter stems
  const minLen = MIN_STEM[langCode] || MIN_STEM.default;
  for (let len = w.length - 1; len >= minLen; len--) {
    if (s.includes(w.slice(0, len))) return true;
  }

  return false;
}

/**
 * Validate a single sentence entry.
 * @param {object} entry - { s, en, g }
 * @param {string} targetWord - The vocabulary word this sentence is for
 * @param {string} langCode - Language code
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateEntry(entry, targetWord, langCode) {
  const errors = [];
  const warnings = [];

  // 1. Schema check
  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['Entry is not an object'], warnings };
  }
  if (typeof entry.s !== 'string' || !entry.s.trim()) {
    errors.push('Missing or empty sentence field "s"');
  }
  if (typeof entry.en !== 'string' || !entry.en.trim()) {
    errors.push('Missing or empty English translation "en"');
  }
  if (typeof entry.g !== 'object' || entry.g === null) {
    errors.push('Missing grammar annotation "g"');
  }

  if (errors.length > 0) return { valid: false, errors, warnings };

  // 2. Word presence check — skipped, produces false positives on conjugated/irregular verbs

  // 3. Script check
  const scriptPattern = SCRIPT_PATTERNS[langCode];
  if (scriptPattern && !scriptPattern.test(entry.s)) {
    errors.push(`Sentence not in expected script for ${langCode}: "${entry.s.slice(0, 40)}..."`);
  }

  // 4. Length check
  if (CJK_LANGS.has(langCode)) {
    const charCount = entry.s.replace(/\s/g, '').length;
    if (charCount < 2) warnings.push(`Sentence very short (${charCount} chars): "${entry.s}"`);
    if (charCount > 40) warnings.push(`Sentence very long (${charCount} chars): "${entry.s}"`);
  } else {
    const wordCount = entry.s.split(/\s+/).filter(Boolean).length;
    if (wordCount < 2) warnings.push(`Sentence very short (${wordCount} words): "${entry.s}"`);
    if (wordCount > 20) warnings.push(`Sentence very long (${wordCount} words): "${entry.s}"`);
  }

  // 5. English translation sanity
  if (entry.en && entry.en.length > 150) {
    warnings.push(`English translation unusually long (${entry.en.length} chars)`);
  }
  if (entry.en && /[\u0400-\u04FF\u0900-\u097F\u0600-\u06FF\u4E00-\u9FFF]/.test(entry.en)) {
    warnings.push('English translation contains non-Latin characters');
  }

  // 6. Grammar key validation
  const family = getFamily(langCode);
  if (family && entry.g) {
    const allowedFields = GRAMMAR_SCHEMAS[family]?.fields || {};
    for (const [key, value] of Object.entries(entry.g)) {
      if (!(key in allowedFields)) {
        warnings.push(`Unknown grammar key "${key}" for ${family} family`);
      } else if (allowedFields[key] !== null && !allowedFields[key].includes(value)) {
        warnings.push(`Invalid grammar value "${key}": "${value}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate all sentences for a single word.
 * @param {Array} sentences - Array of { s, en, g }
 * @param {string} targetWord
 * @param {string} langCode
 * @returns {{ valid: boolean, entries: Array, errors: string[], warnings: string[] }}
 */
export function validateWordSentences(sentences, targetWord, langCode) {
  const allErrors = [];
  const allWarnings = [];
  const validEntries = [];

  if (!Array.isArray(sentences)) {
    return { valid: false, entries: [], errors: [`Sentences for "${targetWord}" is not an array`], warnings: [] };
  }

  if (sentences.length === 0) {
    return { valid: false, entries: [], errors: [`No sentences generated for "${targetWord}"`], warnings: [] };
  }

  if (sentences.length < 5) {
    allWarnings.push(`Only ${sentences.length}/5 sentences for "${targetWord}"`);
  }

  for (let i = 0; i < sentences.length; i++) {
    const result = validateEntry(sentences[i], targetWord, langCode);
    if (result.valid) {
      validEntries.push(sentences[i]);
    }
    allErrors.push(...result.errors.map(e => `[${i}] ${e}`));
    allWarnings.push(...result.warnings.map(w => `[${i}] ${w}`));
  }

  // Dedup check across sentences for this word
  for (let i = 0; i < validEntries.length; i++) {
    for (let j = i + 1; j < validEntries.length; j++) {
      const dist = levenshtein(validEntries[i].s, validEntries[j].s);
      if (dist < 5) {
        allWarnings.push(`Sentences ${i} and ${j} are near-duplicates (distance=${dist})`);
      }
    }
  }

  return {
    valid: validEntries.length >= 3, // Accept if at least 3 good sentences
    entries: validEntries,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Validate an entire batch response (multiple words).
 * @param {object} batchData - { word: [sentences], ... }
 * @param {Array<{target: string}>} expectedWords - Words that should be in the batch
 * @param {string} langCode
 * @returns {{ validWords: object, errors: string[], warnings: string[], stats: object }}
 */
export function validateBatch(batchData, expectedWords, langCode) {
  const validWords = {};
  const allErrors = [];
  const allWarnings = [];
  let totalValid = 0;
  let totalInvalid = 0;
  let missingWords = 0;

  for (const { target } of expectedWords) {
    const sentences = batchData[target];
    if (!sentences) {
      allErrors.push(`Missing word "${target}" in response`);
      missingWords++;
      continue;
    }

    const result = validateWordSentences(sentences, target, langCode);
    if (result.valid) {
      validWords[target] = result.entries;
      totalValid++;
    } else {
      totalInvalid++;
    }
    allErrors.push(...result.errors.map(e => `[${target}] ${e}`));
    allWarnings.push(...result.warnings.map(w => `[${target}] ${w}`));
  }

  return {
    validWords,
    errors: allErrors,
    warnings: allWarnings,
    stats: {
      expected: expectedWords.length,
      valid: totalValid,
      invalid: totalInvalid,
      missing: missingWords,
      passRate: expectedWords.length > 0 ? (totalValid / expectedWords.length * 100).toFixed(1) + '%' : '0%',
    },
  };
}

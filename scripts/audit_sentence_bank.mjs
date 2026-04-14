// Comprehensive audit of sentence bank data
// Outputs JSON findings per language so follow-up tooling can target fixes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWordSentences } from './sentence-bank-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANK_DIR = path.resolve(__dirname, '../src/data/sentence-bank');

const LANGS = ['uk', 'ru', 'de', 'es', 'fr', 'el', 'hi', 'ar', 'ko', 'zh', 'ja'];

// Broad artifact signals. Each pattern is scored conservatively — a match is
// flagged, not auto-corrected.
const ARTIFACT_PATTERNS = {
  // English bleed: roman letters inside non-latin sentences (or very long runs in latin langs)
  englishInNonLatin: (s, lang) => {
    if (['de', 'es', 'fr'].includes(lang)) return false;
    // uk/ru/el/hi/ar/ko/zh/ja: any 4+ consecutive a-z characters is suspect
    return /[A-Za-z]{4,}/.test(s);
  },
  // Duplicate punctuation / empty tokens
  doublePunct: (s) => /[.!?]{2,}|,{2,}/.test(s),
  // Leading/trailing whitespace or weird unicode
  whitespace: (s) => s !== s.trim() || /\s{2,}/.test(s),
  // Obvious placeholder tokens
  placeholder: (s) => /\b(TODO|FIXME|XXX|PLACEHOLDER|null|undefined)\b/i.test(s),
  // Broken JSON-escape artifacts
  brokenEscape: (s) => /\\[nrt"]/.test(s),
  // Template leftovers
  templateLeak: (s) => /\{\{?[a-z_]+\}?\}|\$\{/i.test(s),
  // Numeric-only or single-token "sentence"
  tooShort: (s, lang) => {
    if (['zh', 'ja', 'ko'].includes(lang)) return s.replace(/\s/g, '').length < 3;
    return s.split(/\s+/).filter(Boolean).length < 2;
  },
};

// Script expected for each language (any char of this class must appear)
const SCRIPT_REQ = {
  uk: /[\u0400-\u04FF]/,
  ru: /[\u0400-\u04FF]/,
  de: /[A-Za-zÄÖÜäöüß]/,
  es: /[A-Za-zÁÉÍÓÚÑáéíóúñ¡¿]/,
  fr: /[A-Za-zÀ-ÿ]/,
  el: /[\u0370-\u03FF]/,
  hi: /[\u0900-\u097F]/,
  ar: /[\u0600-\u06FF]/,
  ko: /[\uAC00-\uD7AF]/,
  zh: /[\u4E00-\u9FFF]/,
  ja: /[\u3040-\u30FF\u4E00-\u9FFF]/,
};

function auditLang(lang) {
  const file = path.join(BANK_DIR, `${lang}.json`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const sentences = raw.sentences || {};
  const words = Object.keys(sentences);

  const findings = {
    lang,
    wordCount: words.length,
    sentenceCount: 0,
    wordsWithoutSentences: [],
    wordsUnderFive: [],
    emptyFields: [],        // { word, i, which }
    scriptViolations: [],    // { word, i, sentence }
    enMissing: [],           // { word, i }
    duplicateWithinWord: [], // { word, iA, iB }
    artifacts: {},           // pattern -> [{ word, i, s }]
    grammarMissing: [],      // { word, i }
    wordNotPresent: [],      // { word, i, s }
    longSentences: [],       // { word, i, len }
    shortSentences: [],      // { word, i, len }
  };
  for (const p of Object.keys(ARTIFACT_PATTERNS)) findings.artifacts[p] = [];

  const scriptRe = SCRIPT_REQ[lang];

  for (const word of words) {
    const arr = sentences[word];
    if (!Array.isArray(arr) || arr.length === 0) {
      findings.wordsWithoutSentences.push(word);
      continue;
    }
    if (arr.length < 5) findings.wordsUnderFive.push({ word, count: arr.length });
    findings.sentenceCount += arr.length;

    const seen = new Map();

    for (let i = 0; i < arr.length; i++) {
      const e = arr[i];
      if (!e || typeof e !== 'object') {
        findings.emptyFields.push({ word, i, which: 'entry' });
        continue;
      }
      if (!e.s || typeof e.s !== 'string' || !e.s.trim())
        findings.emptyFields.push({ word, i, which: 's' });
      if (!e.en || typeof e.en !== 'string' || !e.en.trim())
        findings.enMissing.push({ word, i });
      if (!e.g || typeof e.g !== 'object')
        findings.grammarMissing.push({ word, i });

      const s = e.s || '';
      if (scriptRe && s && !scriptRe.test(s))
        findings.scriptViolations.push({ word, i, sentence: s.slice(0, 80) });

      // length
      const cjk = ['zh', 'ja', 'ko'].includes(lang);
      const len = cjk ? s.replace(/\s/g, '').length : s.split(/\s+/).filter(Boolean).length;
      if (cjk) {
        if (len > 50) findings.longSentences.push({ word, i, len });
        if (len < 3) findings.shortSentences.push({ word, i, len });
      } else {
        if (len > 25) findings.longSentences.push({ word, i, len });
        if (len < 3) findings.shortSentences.push({ word, i, len });
      }

      // artifacts
      for (const [name, fn] of Object.entries(ARTIFACT_PATTERNS)) {
        try {
          if (fn(s, lang)) findings.artifacts[name].push({ word, i, s: s.slice(0, 100) });
        } catch {}
      }

      // exact duplicate within word
      const key = s.toLowerCase();
      if (seen.has(key)) {
        findings.duplicateWithinWord.push({ word, iA: seen.get(key), iB: i });
      } else {
        seen.set(key, i);
      }
    }
  }

  return findings;
}

const all = {};
for (const lang of LANGS) {
  try {
    all[lang] = auditLang(lang);
    const f = all[lang];
    console.log(`\n=== ${lang.toUpperCase()} ===`);
    console.log(`  words: ${f.wordCount}, sentences: ${f.sentenceCount}`);
    console.log(`  words without sentences: ${f.wordsWithoutSentences.length}`);
    console.log(`  words under 5 sentences: ${f.wordsUnderFive.length}`);
    console.log(`  empty fields: ${f.emptyFields.length}`);
    console.log(`  script violations: ${f.scriptViolations.length}`);
    console.log(`  en missing: ${f.enMissing.length}`);
    console.log(`  grammar missing: ${f.grammarMissing.length}`);
    console.log(`  dup within word: ${f.duplicateWithinWord.length}`);
    console.log(`  long: ${f.longSentences.length}, short: ${f.shortSentences.length}`);
    console.log(`  artifacts:`);
    for (const [k, v] of Object.entries(f.artifacts)) {
      if (v.length) console.log(`    ${k}: ${v.length}`);
    }
  } catch (err) {
    console.error(`ERROR on ${lang}:`, err.message);
  }
}

fs.writeFileSync(path.join(__dirname, '_audit_findings.json'), JSON.stringify(all, null, 2));
console.log('\nWrote scripts/_audit_findings.json');

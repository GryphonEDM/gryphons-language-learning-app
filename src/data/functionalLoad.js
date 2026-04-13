/**
 * Functional Load Data — per-language phonemic contrast rankings.
 *
 * Research: Not all pronunciation errors are equal. High functional load
 * contrasts distinguish more word pairs, so errors on those contrasts
 * cause more communication breakdowns. Focus practice on high-load contrasts.
 *
 * Load values: 0.0 (minimal) to 1.0 (critical for intelligibility)
 */

export const FUNCTIONAL_LOAD = {
  uk: {
    contrasts: {
      'и-і': { load: 0.9, description: 'и vs і — distinguishes hundreds of word pairs' },
      'е-є': { load: 0.7, description: 'е vs є — common in verb conjugations' },
      'о-у': { load: 0.6, description: 'о vs у — different vowel quality' },
      'г-ґ': { load: 0.3, description: 'г vs ґ — very few minimal pairs in modern Ukrainian' },
      'дз-з': { load: 0.4, description: 'дз vs з — affricate vs fricative' },
      'дж-ж': { load: 0.4, description: 'дж vs ж — affricate vs fricative' },
      'б-п': { load: 0.7, description: 'voiced vs voiceless bilabial stop' },
      'д-т': { load: 0.8, description: 'voiced vs voiceless dental stop — very high pair count' },
      'ш-щ': { load: 0.5, description: 'ш vs щ — single vs long/soft sibilant' },
    },
    // Map from minimal pair category IDs to functional load
    categoryLoad: {},
  },
  ru: {
    contrasts: {
      'ш-щ': { load: 0.5, description: 'hard ш vs soft щ' },
      'ы-и': { load: 0.8, description: 'ы vs и — many minimal pairs' },
      'б-п': { load: 0.7, description: 'voiced/voiceless pairs' },
      'д-т': { load: 0.8, description: 'voiced/voiceless dental stop' },
      'о-а': { load: 0.6, description: 'unstressed о reduces to а' },
      'е-и': { load: 0.5, description: 'unstressed е reduces toward и' },
      'hard-soft': { load: 0.9, description: 'palatalization contrast — critical in Russian' },
    },
    categoryLoad: {},
  },
  ja: {
    contrasts: {
      'long-short': { load: 0.9, description: 'vowel length — changes meaning entirely' },
      'geminate': { load: 0.8, description: 'geminate consonants — very common distinction' },
      'pitch': { load: 0.6, description: 'pitch accent — context usually helps but matters for precision' },
      'r-l': { load: 0.3, description: 'Japanese r covers both l and r ranges — few true minimal pairs' },
    },
    categoryLoad: {
      'vl': 0.9,
      'gem': 0.8,
      'pitch': 0.6,
    },
  },
  ko: {
    contrasts: {
      'aspirated-tense-lax': { load: 0.95, description: 'three-way stop contrast — most critical for Korean' },
      'ㅓ-ㅗ': { load: 0.7, description: 'vowel distinction' },
    },
    categoryLoad: {},
  },
  zh: {
    contrasts: {
      'tones': { load: 0.95, description: 'tonal contrast — fundamental to Mandarin intelligibility' },
      'zh-j': { load: 0.6, description: 'retroflex vs palatal' },
      'sh-x': { load: 0.6, description: 'retroflex vs palatal fricative' },
    },
    categoryLoad: {},
  },
};

/**
 * Get the functional load for a phonemic contrast/category.
 * @param {string} langCode
 * @param {string} categoryId - minimal pair category ID
 * @returns {number} 0-1 functional load, defaults to 0.5 if unknown
 */
export function getFunctionalLoad(langCode, categoryId) {
  const langData = FUNCTIONAL_LOAD[langCode];
  if (!langData) return 0.5;
  if (langData.categoryLoad[categoryId] !== undefined) {
    return langData.categoryLoad[categoryId];
  }
  return 0.5; // neutral default for unknown contrasts
}

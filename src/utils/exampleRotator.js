/**
 * Example Rotator — ensures each word is shown in a different example
 * sentence across reviews, rather than the same sentence every time.
 *
 * Research: Context-varied vocabulary practice produces stronger retention
 * than seeing the same context repeatedly. Each different sentence creates
 * a new retrieval pathway (transfer-appropriate processing).
 */

/**
 * Pick the next unseen example for a word.
 *
 * @param {object} wordData - vocabularyMastery entry for the word
 * @param {Array<string>} examples - Available example sentences
 * @param {Array<string>} examplesEn - Corresponding English translations
 * @returns {{ example: string, exampleEn: string|null, index: number }|null}
 */
export function pickNextExample(wordData, examples, examplesEn) {
  if (!examples || examples.length === 0) return null;

  const shown = wordData?.examplesShown || [];
  const total = examples.length;

  // Find the first unseen index
  for (let i = 0; i < total; i++) {
    if (!shown.includes(i)) {
      return {
        example: examples[i],
        exampleEn: examplesEn?.[i] || null,
        index: i,
      };
    }
  }

  // All seen — reset and start from beginning (different order for variety)
  // Use reps count as a rotation offset
  const reps = wordData?.reps || 0;
  const offset = reps % total;
  return {
    example: examples[offset],
    exampleEn: examplesEn?.[offset] || null,
    index: offset,
  };
}

/**
 * Pick an example based on the word's review count for simple rotation.
 * This is a lighter approach that doesn't require tracking shown indices.
 *
 * @param {Array<string>} examples
 * @param {Array<string>} examplesEn
 * @param {number} reviewCount - How many times the word has been reviewed (reps)
 * @returns {{ example: string, exampleEn: string|null, index: number }|null}
 */
export function pickExampleByReps(examples, examplesEn, reviewCount = 0) {
  if (!examples || examples.length === 0) return null;
  const index = reviewCount % examples.length;
  return {
    example: examples[index],
    exampleEn: examplesEn?.[index] || null,
    index,
  };
}

/**
 * Record that an example was shown for a word.
 * Returns updated examplesShown array.
 *
 * @param {number[]} currentShown - Current examplesShown array
 * @param {number} index - Index that was just shown
 * @param {number} maxExamples - Total examples available (for reset detection)
 * @returns {number[]}
 */
export function recordExampleShown(currentShown, index, maxExamples) {
  const shown = [...(currentShown || [])];
  if (!shown.includes(index)) {
    shown.push(index);
  }
  // Reset if all have been shown
  if (shown.length >= maxExamples) {
    return [index]; // Start fresh with just this one
  }
  return shown;
}

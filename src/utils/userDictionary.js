import { storageGet, storageSet } from './storage.js';

const KEY = 'userDictionary';

export function getUserDict() {
  try { return JSON.parse(storageGet(KEY) || '{}'); }
  catch { return {}; }
}

export function saveToUserDict(uk, en) {
  const dict = getUserDict();
  dict[uk.toLowerCase()] = en.trim();
  storageSet(KEY, JSON.stringify(dict));
}

/** Look up a word in the user dictionary, trying exact then prefix match. */
export function lookupUserDict(word) {
  const dict = getUserDict();
  const cleaned = word.toLowerCase().replace(/[.,!?;:"""''()—–\-…«»\[\]]/g, '');
  if (!cleaned) return null;
  if (dict[cleaned]) return dict[cleaned];
  for (let i = cleaned.length - 1; i >= Math.max(1, cleaned.length - 3); i--) {
    const prefix = cleaned.slice(0, i);
    if (dict[prefix]) return dict[prefix];
  }
  return null;
}

/** Call the LLM to translate a full phrase or sentence. */
export async function translatePhraseWithLLM(text, fromLangName, toLangName) {
  try {
    const messages = [
      { role: 'system', content: `You are a translator. Translate from ${fromLangName} to ${toLangName}. Respond with ONLY the translation — no explanation, no notes, no alternatives, just the translated text.` },
      { role: 'user', content: text }
    ];
    const res = await fetch('/llm/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'local-model', messages, temperature: 0.1, max_tokens: 200, stream: false }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/** Call the LLM to translate a single word with optional context sentence. */
export async function translateWithLLM(word, langName, contextSentence = '') {
  try {
    const messages = [
      { role: 'system', content: `You are a ${langName}-to-English translator. Respond with ONLY the English translation of the given word (1-4 words max, no explanation, no punctuation, no quotes).` },
      { role: 'user', content: contextSentence
        ? `Translate the ${langName} word "${word}" as used in: "${contextSentence}"`
        : `Translate the ${langName} word: "${word}"` }
    ];
    const res = await fetch('/llm/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'local-model', messages, temperature: 0.1, max_tokens: 15, stream: false }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * storage.js — server-first storage with in-memory cache.
 *
 * On login, initFromServer() fetches ALL data from the server and
 * populates the in-memory _cache. All reads use the cache (synchronous).
 * All writes go to the server AND update the cache. localStorage is
 * never used for app data — only authToken and authUsername live there.
 */

const ALL_KEYS = [
  'typingGameLanguage',
  'ukrainianTypingProgress',
  'russianTypingProgress',
  'userDictionary',
  'chat_practice_sessions',
  'aiSentenceSets',
  'aiStories',
  'aiDialogues',
  'grammar_completed_uk',
  'grammar_completed_ru',
];

// In-memory cache — populated from server at login
const _cache = {};

let _authToken = localStorage.getItem('authToken');

export function setAuthToken(token) {
  _authToken = token;
  localStorage.setItem('authToken', token);
}

export function clearAuthToken() {
  _authToken = null;
  localStorage.removeItem('authToken');
  Object.keys(_cache).forEach(k => delete _cache[k]);
}

export function getAuthToken() {
  return _authToken;
}

/** Read from in-memory cache (populated from server at login). */
export function storageGet(key) {
  return _cache[key] ?? null;
}

/** Write to server and update cache. Never touches localStorage. */
export function storageSet(key, value) {
  _cache[key] = value;
  if (!_authToken) return;
  fetch(`/api/data/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${_authToken}`,
    },
    body: JSON.stringify({ value }),
  }).catch(() => {});
}

/**
 * Fetch all data from server into the in-memory cache.
 * For new accounts: migrate existing localStorage data to server (awaited).
 * Returns false if token is invalid (401).
 */
export async function initFromServer(token) {
  const t = token || _authToken;
  if (!t) return false;
  try {
    const res = await fetch('/api/data', {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.status === 401) return false;
    if (!res.ok) return true;

    const serverData = await res.json();
    const serverKeys = Object.keys(serverData);

    if (serverKeys.length === 0) {
      // New account — migrate existing localStorage data to server synchronously
      const uploads = [];
      for (const key of ALL_KEYS) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          _cache[key] = val;
          uploads.push(
            fetch(`/api/data/${encodeURIComponent(key)}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${t}`,
              },
              body: JSON.stringify({ value: val }),
            }).catch(() => {})
          );
        }
      }
      await Promise.all(uploads);
    } else {
      // Populate cache from server — server is the source of truth
      for (const [key, value] of Object.entries(serverData)) {
        _cache[key] = value;
      }
    }
    return true;
  } catch {
    return true;
  }
}

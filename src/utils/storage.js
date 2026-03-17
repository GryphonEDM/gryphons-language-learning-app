/**
 * storage.js — server-first storage with in-memory cache.
 *
 * On login, initFromServer() fetches ALL data from the server and
 * populates the in-memory _cache. All reads use the cache (synchronous).
 * All writes update the cache immediately and schedule a debounced server
 * PUT (300ms). storageFlush() forces all pending writes immediately — call
 * it on page hide/unload. localStorage is never used for app data.
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

const DEBOUNCE_MS = 300;

// In-memory cache — populated from server at login
const _cache = {};

// Pending debounce timers per key
const _timers = {};

// Values waiting to be flushed per key
const _pending = {};

let _authToken = localStorage.getItem('authToken');

export function setAuthToken(token) {
  _authToken = token;
  localStorage.setItem('authToken', token);
}

export function clearAuthToken() {
  _authToken = null;
  localStorage.removeItem('authToken');
  Object.keys(_cache).forEach(k => delete _cache[k]);
  Object.keys(_pending).forEach(k => delete _pending[k]);
  Object.values(_timers).forEach(t => clearTimeout(t));
  Object.keys(_timers).forEach(k => delete _timers[k]);
}

export function getAuthToken() {
  return _authToken;
}

/** Read from in-memory cache (populated from server at login). */
export function storageGet(key) {
  return _cache[key] ?? null;
}

async function pushToServer(key, value) {
  if (!_authToken) return;
  try {
    const res = await fetch(`/api/data/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${_authToken}`,
      },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      console.warn(`[storage] Save failed for "${key}": HTTP ${res.status}`);
    }
  } catch (e) {
    console.warn(`[storage] Save failed for "${key}" (network error):`, e.message);
  }
}

/**
 * Write to cache immediately, debounce the server PUT.
 * Drop-in replacement for localStorage.setItem.
 */
export function storageSet(key, value) {
  _cache[key] = value;
  _pending[key] = value;
  clearTimeout(_timers[key]);
  _timers[key] = setTimeout(() => {
    const v = _pending[key];
    delete _pending[key];
    delete _timers[key];
    pushToServer(key, v);
  }, DEBOUNCE_MS);
}

/**
 * Flush all pending debounced writes to the server immediately.
 * Call this on page hide/unload so no data is lost.
 */
export async function storageFlush() {
  const keys = Object.keys(_pending);
  if (keys.length === 0) return;
  // Cancel all pending timers
  keys.forEach(k => { clearTimeout(_timers[k]); delete _timers[k]; });
  // Fire all pushes in parallel
  const entries = keys.map(k => [k, _pending[k]]);
  entries.forEach(([k]) => delete _pending[k]);
  await Promise.all(entries.map(([k, v]) => pushToServer(k, v)));
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
    if (!res.ok) {
      console.warn('[storage] initFromServer: server error', res.status);
      return true;
    }

    const serverData = await res.json();
    const serverKeys = Object.keys(serverData);

    console.log(`[storage] Loaded ${serverKeys.length} keys from server:`, serverKeys);

    if (serverKeys.length === 0) {
      // New account — migrate existing localStorage data to server synchronously
      const uploads = [];
      for (const key of ALL_KEYS) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          _cache[key] = val;
          uploads.push(pushToServer(key, val));
        }
      }
      if (uploads.length > 0) {
        console.log(`[storage] Migrating ${uploads.length} keys from localStorage to server`);
        await Promise.all(uploads);
        console.log('[storage] Migration complete');
      }
    } else {
      // Populate cache from server — server is the source of truth
      for (const [key, value] of Object.entries(serverData)) {
        _cache[key] = value;
      }
    }
    return true;
  } catch (e) {
    console.warn('[storage] initFromServer failed (network?):', e.message);
    return true;
  }
}

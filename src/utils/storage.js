/**
 * storage.js — localStorage + server sync abstraction.
 *
 * localStorage remains the synchronous read/write cache.
 * Every write also fires an async PUT to the server (fire-and-forget).
 * On login, initFromServer() loads all server data into localStorage
 * (or uploads existing localStorage data if the account is new).
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

let _authToken = localStorage.getItem('authToken');

export function setAuthToken(token) {
  _authToken = token;
  localStorage.setItem('authToken', token);
}

export function clearAuthToken() {
  _authToken = null;
  localStorage.removeItem('authToken');
}

export function getAuthToken() {
  return _authToken;
}

function syncToServer(key, value) {
  if (!_authToken) return;
  fetch(`/api/data/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${_authToken}`,
    },
    body: JSON.stringify({ value }),
  }).catch(() => {});
}

/** Write to localStorage and sync to server. Drop-in replacement for localStorage.setItem. */
export function storageSet(key, value) {
  localStorage.setItem(key, value);
  syncToServer(key, value);
}

/**
 * Called once after login/register.
 * - If server has data: loads it into localStorage (server wins).
 * - If server is empty (new account): awaits upload of existing localStorage data so
 *   other devices see it immediately on their next login.
 * Returns false if the token is invalid (401), true otherwise.
 */
export async function initFromServer(token) {
  const t = token || _authToken;
  if (!t) return false;
  try {
    const res = await fetch('/api/data', {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.status === 401) return false;
    if (!res.ok) return true; // server error — assume token is fine, app uses localStorage

    const serverData = await res.json();
    const serverKeys = Object.keys(serverData);

    if (serverKeys.length === 0) {
      // New account — upload existing localStorage data to server synchronously
      // (must await so other devices see it on their very next login)
      const uploads = [];
      for (const key of ALL_KEYS) {
        const val = localStorage.getItem(key);
        if (val !== null) {
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
      // Existing account — server wins, load into localStorage
      for (const [key, value] of Object.entries(serverData)) {
        localStorage.setItem(key, value);
      }
    }
    return true;
  } catch {
    // Network error — assume token is fine, app works from localStorage
    return true;
  }
}

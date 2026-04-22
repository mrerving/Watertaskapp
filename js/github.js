/**
 * github.js — GitHub Contents API integration.
 *
 * Reads/writes tides-data.json in the configured repo using a PAT.
 * Tracks the file SHA needed for PUT operations.
 */

const LS_USERNAME = 'tides_github_username';
const LS_REPO     = 'tides_github_repo';
const LS_PAT      = 'tides_github_pat';
const DATA_FILE   = 'tides-data.json';

let _currentSha = null;

/** Expose current SHA for keepalive sync in sync.js */
export function getCurrentSha() { return _currentSha; }

// === Config helpers ===

export function getConfig() {
  return {
    username: localStorage.getItem(LS_USERNAME) || '',
    repo:     localStorage.getItem(LS_REPO)     || '',
    pat:      localStorage.getItem(LS_PAT)       || '',
  };
}

export function setConfig({ username, repo, pat }) {
  localStorage.setItem(LS_USERNAME, username.trim());
  localStorage.setItem(LS_REPO,     repo.trim());
  localStorage.setItem(LS_PAT,      pat.trim());
}

export function clearConfig() {
  localStorage.removeItem(LS_USERNAME);
  localStorage.removeItem(LS_REPO);
  localStorage.removeItem(LS_PAT);
}

export function isConfigured() {
  const { username, repo, pat } = getConfig();
  return !!(username && repo && pat);
}

// === API helpers ===

function apiUrl(path) {
  const { username, repo } = getConfig();
  return `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/contents/${path}`;
}

function headers() {
  const { pat } = getConfig();
  return {
    'Authorization': `Bearer ${pat}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

/**
 * Decode base64 content returned by GitHub API, handling Unicode correctly.
 */
function decodeContent(base64) {
  // Remove any newlines GitHub inserts into the base64 string
  const clean = base64.replace(/\n/g, '');
  return decodeURIComponent(escape(atob(clean)));
}

/**
 * Encode string to base64, handling Unicode correctly.
 */
function encodeContent(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// === Public API ===

/**
 * Fetch tides-data.json from GitHub.
 * Returns parsed JSON, or null if the file doesn't exist (404).
 * Throws on other errors.
 */
export async function fetchData() {
  const res = await fetch(apiUrl(DATA_FILE), { headers: headers() });

  if (res.status === 404) {
    _currentSha = null;
    return null;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub fetch failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  _currentSha = json.sha;

  return JSON.parse(decodeContent(json.content));
}

/**
 * Save dataObj as tides-data.json to GitHub.
 * Uses _currentSha if the file already exists.
 * Returns true on success.
 */
export async function saveData(dataObj) {
  const content = encodeContent(JSON.stringify(dataObj, null, 2));

  const body = {
    message: 'tides: sync',
    content,
  };

  if (_currentSha) {
    body.sha = _currentSha;
  }

  const res = await fetch(apiUrl(DATA_FILE), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GitHub save failed (${res.status}): ${errBody}`);
  }

  const json = await res.json();
  // Update SHA from response for subsequent writes
  _currentSha = json.content.sha;

  return true;
}

/**
 * Test the connection and optionally create tides-data.json if absent.
 * Returns { ok: true, created: bool } or throws.
 */
export async function initRepo() {
  let data = await fetchData();

  if (data === null) {
    // File doesn't exist — create it with blank template
    const template = {
      _meta: {
        version: '1.0',
        schema: 'tides',
        lastModifiedBy: 'app',
        updatedAt: new Date().toISOString(),
      },
      tides: [],
      horizons: [],
    };
    await saveData(template);
    return { ok: true, created: true, data: template };
  }

  return { ok: true, created: false, data };
}

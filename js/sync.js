/**
 * sync.js — Sync orchestration.
 *
 * Flushes dirty state to GitHub on:
 *  - 30-second interval
 *  - visibilitychange → hidden
 *  - beforeunload (best-effort via fetch keepalive)
 */

import { state, emit } from './state.js';
import * as github from './github.js';
import { qs } from './utils/dom.js';

let _intervalId = null;
let _isSyncing  = false;

/**
 * Flush pending changes to GitHub.
 * Respects the write lock to prevent concurrent PUTs.
 */
export async function flush() {
  if (!state.ui.isDirty)    return;
  if (_isSyncing)           return;
  if (!github.isConfigured()) return;

  _isSyncing = true;
  setSyncStatus('syncing');

  try {
    await github.saveData(state.data);
    state.ui.isDirty       = false;
    state.ui.lastSyncedAt  = Date.now();
    setSyncStatus('synced');
  } catch (err) {
    console.error('[tides] sync failed:', err);
    setSyncStatus('error');
  } finally {
    _isSyncing = false;
  }
}

/**
 * Best-effort flush using fetch keepalive (survives page close).
 * This is fire-and-forget — we can't await it in beforeunload.
 */
function flushKeepAlive() {
  if (!state.ui.isDirty)    return;
  if (!github.isConfigured()) return;

  const { username, repo, pat } = github.getConfig();
  // We can't use the normal saveData here because we need keepalive.
  // Instead we re-encode and fire the fetch directly.
  try {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(state.data, null, 2))));
    const sha = github.getCurrentSha();
    const body = JSON.stringify({
      message: 'tides: sync (page close)',
      content,
      ...(sha ? { sha } : {}),
    });
    fetch(
      `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/contents/tides-data.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body,
        keepalive: true,
      }
    );
  } catch (_) { /* best-effort */ }
}

/**
 * Update the sync status indicator in the header.
 */
function setSyncStatus(status) {
  state.ui.syncStatus = status;
  emit('sync:status', status);

  const el = qs('#sync-status');
  if (!el) return;

  el.className = status;
  const labels = {
    synced:  '● synced',
    syncing: '● syncing…',
    unsaved: '● unsaved',
    error:   '● sync error',
  };
  el.textContent = labels[status] || status;
}

/**
 * Initialize sync — call once from app.js after successful setup.
 */
export function init() {
  // 30-second auto-sync
  _intervalId = setInterval(flush, 30_000);

  // Flush when tab is hidden (fires before beforeunload, allows async)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  // Best-effort flush on page close
  window.addEventListener('beforeunload', () => {
    if (state.ui.isDirty) flushKeepAlive();
  });
}

/**
 * Stop the sync timer (used during logout / re-setup).
 */
export function stop() {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

/**
 * state.js — In-memory application state + pub/sub event bus.
 *
 * state.data  mirrors tides-data.json exactly and is what gets persisted.
 * state.ui    is ephemeral runtime state (never synced to GitHub).
 */

const _listeners = {};

export const state = {
  data: {
    _meta: {
      version: '1.0',
      schema: 'tides',
      lastModifiedBy: 'app',
      updatedAt: null,
    },
    tides: [],
    horizons: [],
  },

  ui: {
    activeTab: 'tides',
    filters: {
      statuses: [],   // active status filter chips (empty = all)
      heats: [],      // active heat filter chips (empty = all)
      showArchived: false,
    },
    expandedTides: new Set(),
    expandedWaves: new Set(),
    syncStatus: 'synced',  // 'synced' | 'syncing' | 'unsaved' | 'error'
    isDirty: false,
    lastSyncedAt: null,
  },
};

/**
 * Subscribe to an event.
 * @param {string} event
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
export function subscribe(event, callback) {
  if (!_listeners[event]) _listeners[event] = [];
  _listeners[event].push(callback);
  return () => {
    _listeners[event] = _listeners[event].filter(cb => cb !== callback);
  };
}

/**
 * Emit an event to all subscribers.
 * @param {string} event
 * @param {*} payload
 */
export function emit(event, payload) {
  const cbs = _listeners[event];
  if (!cbs) return;
  for (const cb of cbs) cb(payload);
}

/**
 * Mark state as dirty (unsaved changes exist).
 * Also updates _meta.
 */
export function markDirty() {
  const ts = new Date().toISOString();
  state.data._meta.updatedAt = ts;
  state.data._meta.lastModifiedBy = 'app';
  state.ui.isDirty = true;
  state.ui.syncStatus = 'unsaved';
  emit('sync:status', 'unsaved');
}

/**
 * Replace state.data wholesale (used on initial load from GitHub).
 * @param {Object} data parsed JSON from tides-data.json
 */
export function loadData(data) {
  state.data = {
    _meta: {
      version: '1.0',
      schema: 'tides',
      lastModifiedBy: 'app',
      updatedAt: null,
      ...data._meta,
    },
    tides: data.tides || [],
    horizons: data.horizons || [],
  };
  state.ui.isDirty = false;
  state.ui.syncStatus = 'synced';
  state.ui.lastSyncedAt = Date.now();
}

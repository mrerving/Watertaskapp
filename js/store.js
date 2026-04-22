/**
 * store.js — All CRUD operations on state.data.
 *
 * Every mutating function:
 *  1. Modifies state.data directly
 *  2. Calls markDirty()
 *  3. Calls emit('state:changed')
 *
 * Find helpers are read-only and don't dirty state.
 */

import { state, markDirty, emit } from './state.js';
import { uuid }  from './utils/id.js';
import { now }   from './utils/time.js';

// =====================
// FIND HELPERS (read-only)
// =====================

export function findTide(id) {
  return state.data.tides.find(t => t.id === id) || null;
}

export function findWave(id) {
  for (const tide of state.data.tides) {
    const wave = tide.waves.find(w => w.id === id);
    if (wave) return wave;
  }
  return null;
}

export function findRipple(id) {
  for (const tide of state.data.tides) {
    for (const wave of tide.waves) {
      const ripple = wave.ripples.find(r => r.id === id);
      if (ripple) return ripple;
    }
  }
  return null;
}

export function findParentTide(waveId) {
  return state.data.tides.find(t => t.waves.some(w => w.id === waveId)) || null;
}

export function findParentWave(rippleId) {
  for (const tide of state.data.tides) {
    const wave = tide.waves.find(w => w.ripples.some(r => r.id === rippleId));
    if (wave) return wave;
  }
  return null;
}

export function findHorizon(id) {
  return state.data.horizons.find(h => h.id === id) || null;
}

// =====================
// TIDES
// =====================

export function createTide({ title, status = 'gathering', heat = 'warm', summary = '', notes = '' } = {}) {
  const tide = {
    id: uuid(),
    title,
    status,
    heat,
    summary,
    notes,
    createdAt: now(),
    updatedAt: now(),
    waves: [],
  };
  state.data.tides.push(tide);
  markDirty();
  emit('state:changed');
  return tide;
}

export function updateTide(id, fields) {
  const tide = findTide(id);
  if (!tide) return;
  Object.assign(tide, fields, { updatedAt: now() });
  markDirty();
  emit('state:changed');
}

export function deleteTide(id) {
  // Collect all wave/ripple ids under this tide before deletion
  const tide = findTide(id);
  if (!tide) return;

  const waveIds   = tide.waves.map(w => w.id);
  const rippleIds = tide.waves.flatMap(w => w.ripples.map(r => r.id));
  const allIds    = new Set([...waveIds, ...rippleIds]);

  // Remove any horizon refs pointing at deleted items
  for (const horizon of state.data.horizons) {
    horizon.items = horizon.items.filter(item => !allIds.has(item.ref));
  }

  state.data.tides = state.data.tides.filter(t => t.id !== id);
  markDirty();
  emit('state:changed');
}

// =====================
// WAVES
// =====================

export function createWave(tideId, { title, status = 'gathering', heat = 'warm', summary = '', notes = '', estimatedCost = null, actualCost = null } = {}) {
  const tide = findTide(tideId);
  if (!tide) return null;
  const wave = {
    id: uuid(),
    title,
    status,
    heat,
    summary,
    notes,
    estimatedCost,
    actualCost,
    updatedAt: now(),
    movedFrom: null,
    ripples: [],
  };
  tide.waves.push(wave);
  markDirty();
  emit('state:changed');
  return wave;
}

export function updateWave(id, fields) {
  const wave = findWave(id);
  if (!wave) return;
  Object.assign(wave, fields, { updatedAt: now() });
  markDirty();
  emit('state:changed');
}

export function deleteWave(id) {
  const rippleIds = new Set((findWave(id)?.ripples || []).map(r => r.id));
  const allIds    = new Set([id, ...rippleIds]);

  // Remove horizon refs
  for (const horizon of state.data.horizons) {
    horizon.items = horizon.items.filter(item => !allIds.has(item.ref));
  }

  for (const tide of state.data.tides) {
    tide.waves = tide.waves.filter(w => w.id !== id);
  }
  markDirty();
  emit('state:changed');
}

export function moveWave(id, newTideId) {
  const oldTide = findParentTide(id);
  const newTide = findTide(newTideId);
  if (!oldTide || !newTide || oldTide.id === newTideId) return;

  const wave = oldTide.waves.find(w => w.id === id);
  if (!wave) return;

  wave.movedFrom = oldTide.id;
  wave.updatedAt = now();
  oldTide.waves = oldTide.waves.filter(w => w.id !== id);
  newTide.waves.push(wave);

  markDirty();
  emit('state:changed');
}

// =====================
// RIPPLES
// =====================

export function createRipple(waveId, { text, status = 'open', heat = null, estimatedHours = null, actualHours = null, estimatedCost = null, actualCost = null } = {}) {
  const wave = findWave(waveId);
  if (!wave) return null;
  const ripple = {
    id: uuid(),
    text,
    status,
    heat,
    estimatedHours,
    actualHours,
    estimatedCost,
    actualCost,
    createdAt: now(),
    dueDate: null,
    reminderAt: null,
    movedFrom: null,
  };
  wave.ripples.push(ripple);
  markDirty();
  emit('state:changed');
  return ripple;
}

export function updateRipple(id, fields) {
  const ripple = findRipple(id);
  if (!ripple) return;
  Object.assign(ripple, fields);
  markDirty();
  emit('state:changed');
}

export function deleteRipple(id) {
  // Remove horizon refs
  for (const horizon of state.data.horizons) {
    horizon.items = horizon.items.filter(item => item.ref !== id);
  }

  for (const tide of state.data.tides) {
    for (const wave of tide.waves) {
      wave.ripples = wave.ripples.filter(r => r.id !== id);
    }
  }
  markDirty();
  emit('state:changed');
}

export function moveRipple(id, newWaveId) {
  const oldWave = findParentWave(id);
  const newWave = findWave(newWaveId);
  if (!oldWave || !newWave || oldWave.id === newWaveId) return;

  const ripple = oldWave.ripples.find(r => r.id === id);
  if (!ripple) return;

  ripple.movedFrom = oldWave.id;
  oldWave.ripples = oldWave.ripples.filter(r => r.id !== id);
  newWave.ripples.push(ripple);

  markDirty();
  emit('state:changed');
}

export function cycleRippleStatus(id) {
  const ripple = findRipple(id);
  if (!ripple) return;
  // tap cycles: open → done → open
  ripple.status = ripple.status === 'done' ? 'open' : 'done';
  markDirty();
  emit('state:changed');
}

// =====================
// HORIZONS
// =====================

export function createHorizon({ title, notes = '' } = {}) {
  const horizon = {
    id: uuid(),
    title,
    notes,
    createdAt: now(),
    updatedAt: now(),
    items: [],
  };
  state.data.horizons.push(horizon);
  markDirty();
  emit('state:changed');
  return horizon;
}

export function updateHorizon(id, fields) {
  const horizon = findHorizon(id);
  if (!horizon) return;
  Object.assign(horizon, fields, { updatedAt: now() });
  markDirty();
  emit('state:changed');
}

export function deleteHorizon(id) {
  state.data.horizons = state.data.horizons.filter(h => h.id !== id);
  markDirty();
  emit('state:changed');
}

export function addHorizonRef(horizonId, ref, type) {
  const horizon = findHorizon(horizonId);
  if (!horizon) return;
  // Don't add duplicates
  if (horizon.items.some(item => item.ref === ref)) return;
  horizon.items.push({ ref, type });
  horizon.updatedAt = now();
  markDirty();
  emit('state:changed');
}

export function removeHorizonRef(horizonId, ref) {
  const horizon = findHorizon(horizonId);
  if (!horizon) return;
  horizon.items = horizon.items.filter(item => item.ref !== ref);
  horizon.updatedAt = now();
  markDirty();
  emit('state:changed');
}

export function setHorizonRefs(horizonId, items) {
  const horizon = findHorizon(horizonId);
  if (!horizon) return;
  horizon.items = items;
  horizon.updatedAt = now();
  markDirty();
  emit('state:changed');
}

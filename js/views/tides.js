/**
 * tides.js — Tides tab renderer.
 *
 * Renders filter bar + tide cards.
 * Wires all interaction events via event delegation.
 */

import { state } from '../state.js';
import { tideCardHTML } from '../components/tideCard.js';
import { attachRippleHandlers } from '../components/rippleItem.js';
import { renderFilterBar, applyFilters } from './filters.js';
import { openEditSheet } from '../components/editSheet.js';
import { openMoveWaveSheet, openMoveRippleSheet } from '../components/moveSheet.js';
import { confirm } from '../components/confirmDialog.js';
import {
  createTide, updateTide, deleteTide,
  createWave, updateWave, deleteWave,
  createRipple, updateRipple, deleteRipple,
  findTide, findWave, findRipple,
} from '../store.js';
import { qs } from '../utils/dom.js';

let _filterContainer = null;
let _tidesContainer  = null;

/**
 * Initial mount — sets up containers and event delegation.
 * Call once when the tides view first becomes active.
 */
export function mountTidesView(viewEl) {
  viewEl.innerHTML = `
    <div id="filter-container"></div>
    <div id="tides-container" class="tide-list"></div>
    <button class="fab" id="add-tide-fab" aria-label="Add tide">
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
      </svg>
    </button>
  `;

  _filterContainer = qs('#filter-container', viewEl);
  _tidesContainer  = qs('#tides-container', viewEl);

  // Wire FAB
  qs('#add-tide-fab', viewEl).addEventListener('click', () => {
    openEditSheet({
      entityType: 'tide',
      mode: 'create',
      onSave: (fields) => createTide(fields),
    });
  });

  // Event delegation for all tide/wave/ripple actions
  _tidesContainer.addEventListener('click', handleTidesClick);

  renderTidesView();
}

/**
 * Re-render tides list (preserves collapsed/expanded state).
 */
export function renderTidesView() {
  if (!_tidesContainer) return;

  // Re-render filter bar
  if (_filterContainer) renderFilterBar(_filterContainer);

  const filtered = applyFilters(state.data.tides);

  if (filtered.length === 0) {
    _tidesContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/>
        </svg>
        <p>${state.data.tides.length === 0 ? 'No tides yet. Create your first one!' : 'No tides match the current filters.'}</p>
      </div>
    `;
    return;
  }

  _tidesContainer.innerHTML = filtered.map(t => tideCardHTML(t)).join('');

  // Attach ripple gesture handlers after rendering
  _tidesContainer.querySelectorAll('.ripple-item').forEach(rippleEl => {
    attachRippleHandlers(rippleEl, {
      onMove: (rippleId) => openMoveRippleSheet(rippleId),
      onEdit: (rippleId) => {
        const ripple = findRipple(rippleId);
        if (!ripple) return;
        openEditSheet({
          entityType: 'ripple',
          mode: 'edit',
          entityId: rippleId,
          initialValues: ripple,
          onSave: (fields) => updateRipple(rippleId, fields),
          onDelete: () => deleteRipple(rippleId),
        });
      },
    });
  });
}

// === Event delegation handler ===

function handleTidesClick(e) {
  // --- Expand/collapse Tide ---
  const tideToggle = e.target.closest('[data-tide-toggle]');
  if (tideToggle && !e.target.closest('[data-action]')) {
    const id = tideToggle.dataset.tideToggle;
    if (state.ui.expandedTides.has(id)) state.ui.expandedTides.delete(id);
    else state.ui.expandedTides.add(id);
    // Re-render only this card efficiently
    const card = _tidesContainer.querySelector(`[data-tide-id="${id}"]`);
    if (card) {
      card.classList.toggle('expanded', state.ui.expandedTides.has(id));
    }
    return;
  }

  // --- Expand/collapse Wave ---
  const waveToggle = e.target.closest('[data-wave-toggle]');
  if (waveToggle && !e.target.closest('[data-action]')) {
    const id = waveToggle.dataset.waveToggle;
    if (state.ui.expandedWaves.has(id)) state.ui.expandedWaves.delete(id);
    else state.ui.expandedWaves.add(id);
    const card = _tidesContainer.querySelector(`[data-wave-id="${id}"].wave-card`);
    if (card) {
      card.classList.toggle('expanded', state.ui.expandedWaves.has(id));
    }
    return;
  }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  e.stopPropagation();

  const action = btn.dataset.action;
  const id     = btn.dataset.id;

  switch (action) {
    // === TIDE ===
    case 'edit-tide': {
      const tide = findTide(id);
      if (!tide) break;
      openEditSheet({
        entityType: 'tide', mode: 'edit', entityId: id,
        initialValues: tide,
        onSave:   (fields) => updateTide(id, fields),
        onDelete: () => deleteTide(id),
      });
      break;
    }

    case 'delete-tide': {
      confirm('Delete this tide?', 'All waves and ripples inside will be deleted.').then(ok => {
        if (ok) deleteTide(id);
      });
      break;
    }

    // === WAVE ===
    case 'add-wave': {
      const tideId = btn.dataset.tideId;
      openEditSheet({
        entityType: 'wave', mode: 'create',
        onSave: (fields) => {
          createWave(tideId, fields);
          state.ui.expandedTides.add(tideId);
        },
      });
      break;
    }

    case 'edit-wave': {
      const wave = findWave(id);
      if (!wave) break;
      openEditSheet({
        entityType: 'wave', mode: 'edit', entityId: id,
        initialValues: wave,
        onSave:   (fields) => updateWave(id, fields),
        onDelete: () => deleteWave(id),
      });
      break;
    }

    case 'delete-wave': {
      confirm('Delete this wave?', 'All ripples inside will be deleted.').then(ok => {
        if (ok) deleteWave(id);
      });
      break;
    }

    case 'move-wave': {
      openMoveWaveSheet(id);
      break;
    }

    // === RIPPLE ===
    case 'add-ripple': {
      const waveId = btn.dataset.waveId;
      openEditSheet({
        entityType: 'ripple', mode: 'create',
        onSave: (fields) => {
          createRipple(waveId, fields);
          state.ui.expandedWaves.add(waveId);
        },
      });
      break;
    }

    case 'edit-ripple': {
      const ripple = findRipple(id);
      if (!ripple) break;
      openEditSheet({
        entityType: 'ripple', mode: 'edit', entityId: id,
        initialValues: ripple,
        onSave:   (fields) => updateRipple(id, fields),
        onDelete: () => deleteRipple(id),
      });
      break;
    }
  }
}

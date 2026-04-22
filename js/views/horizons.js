/**
 * horizons.js — Horizons tab renderer.
 */

import { state } from '../state.js';
import { horizonCardHTML } from '../components/horizonCard.js';
import { openEditSheet } from '../components/editSheet.js';
import { openRefPicker } from '../components/refPicker.js';
import { confirm } from '../components/confirmDialog.js';
import {
  createHorizon, updateHorizon, deleteHorizon,
  removeHorizonRef, setHorizonRefs, findHorizon,
} from '../store.js';
import { qs } from '../utils/dom.js';

let _horizonsContainer = null;

export function mountHorizonsView(viewEl) {
  viewEl.innerHTML = `
    <div id="horizons-container" class="horizon-list"></div>
    <button class="fab" id="add-horizon-fab" aria-label="Add horizon">
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
      </svg>
    </button>
  `;

  _horizonsContainer = qs('#horizons-container', viewEl);

  qs('#add-horizon-fab', viewEl).addEventListener('click', () => {
    openEditSheet({
      entityType: 'horizon',
      mode: 'create',
      onSave: (fields) => createHorizon(fields),
    });
  });

  _horizonsContainer.addEventListener('click', handleHorizonsClick);

  renderHorizonsView();
}

export function renderHorizonsView() {
  if (!_horizonsContainer) return;

  const horizons = state.data.horizons;

  if (horizons.length === 0) {
    _horizonsContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
        </svg>
        <p>No horizons yet. Create a cross-cutting plan!</p>
      </div>
    `;
    return;
  }

  _horizonsContainer.innerHTML = horizons.map(h => horizonCardHTML(h)).join('');
}

function handleHorizonsClick(e) {
  // Expand/collapse
  const toggle = e.target.closest('[data-horizon-toggle]');
  if (toggle && !e.target.closest('[data-action]')) {
    const id = toggle.dataset.horizonToggle;
    const key = 'horizon-' + id;
    if (state.ui.expandedTides.has(key)) state.ui.expandedTides.delete(key);
    else state.ui.expandedTides.add(key);
    const card = _horizonsContainer.querySelector(`[data-horizon-id="${id}"]`);
    if (card) card.classList.toggle('expanded', state.ui.expandedTides.has(key));
    return;
  }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  e.stopPropagation();

  const action = btn.dataset.action;
  const id     = btn.dataset.id;

  switch (action) {
    case 'edit-horizon': {
      const horizon = findHorizon(id);
      if (!horizon) break;
      openEditSheet({
        entityType: 'horizon', mode: 'edit', entityId: id,
        initialValues: horizon,
        onSave:   (fields) => updateHorizon(id, fields),
        onDelete: () => deleteHorizon(id),
      });
      break;
    }

    case 'delete-horizon': {
      confirm('Delete this horizon?', 'The referenced items will not be deleted.').then(ok => {
        if (ok) deleteHorizon(id);
      });
      break;
    }

    case 'add-horizon-ref': {
      // Expand if not already
      state.ui.expandedTides.add('horizon-' + id);
      openRefPicker(id, (items) => setHorizonRefs(id, items));
      break;
    }

    case 'remove-horizon-ref': {
      const ref = btn.dataset.ref;
      // Find which horizon contains this ref
      for (const h of state.data.horizons) {
        if (h.items.some(item => item.ref === ref)) {
          removeHorizonRef(h.id, ref);
          break;
        }
      }
      break;
    }
  }
}

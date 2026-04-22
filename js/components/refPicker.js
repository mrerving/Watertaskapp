/**
 * refPicker.js — Bottom sheet for adding Wave/Ripple refs to a Horizon.
 */

import { state } from '../state.js';
import { escapeHTML } from '../utils/dom.js';
import { findParentTide } from '../store.js';

/**
 * Open the ref picker sheet.
 * @param {string} horizonId
 * @param {Function} onSave  called with array of { ref, type } items
 */
export function openRefPicker(horizonId, onSave) {
  const horizon = state.data.horizons.find(h => h.id === horizonId);
  if (!horizon) return;

  const currentRefs = new Set(horizon.items.map(i => i.ref));

  // Build selectable items: all waves and ripples
  const allItems = [];
  for (const tide of state.data.tides) {
    for (const wave of tide.waves) {
      allItems.push({ ref: wave.id, type: 'wave', label: wave.title, breadcrumb: tide.title });
      for (const ripple of wave.ripples) {
        allItems.push({ ref: ripple.id, type: 'ripple', label: ripple.text, breadcrumb: `${tide.title} › ${wave.title}` });
      }
    }
  }

  let selected = new Set(currentRefs);
  let filterText = '';

  const overlay = document.getElementById('modal-overlay');
  const el = document.createElement('div');
  el.className = 'modal-backdrop';

  function renderList() {
    const filtered = allItems.filter(item => {
      if (!filterText) return true;
      return item.label.toLowerCase().includes(filterText.toLowerCase()) ||
             item.breadcrumb.toLowerCase().includes(filterText.toLowerCase());
    });

    const listHTML = filtered.length === 0
      ? '<div style="padding:16px;color:var(--color-text-dim);font-size:0.875rem;text-align:center">No items found</div>'
      : filtered.map(item => `
          <div class="ref-item ${selected.has(item.ref) ? 'selected' : ''}" data-ref="${item.ref}" data-type="${item.type}">
            <div class="ref-item-check"></div>
            <div class="ref-item-info">
              <div class="ref-item-text">${escapeHTML(item.label)}</div>
              <div class="ref-item-breadcrumb">${escapeHTML(item.breadcrumb)} · ${item.type}</div>
            </div>
          </div>
        `).join('');

    el.querySelector('.ref-list').innerHTML = listHTML;
  }

  el.innerHTML = `
    <div class="bottom-sheet" role="dialog" aria-modal="true">
      <div class="sheet-handle"><div class="sheet-handle-bar"></div></div>
      <div class="sheet-header">
        <span class="sheet-title">Add References</span>
        <button class="sheet-close-btn" aria-label="Close">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
      <div class="sheet-body">
        <div class="form-group ref-search">
          <input class="form-input" id="ref-filter" type="search" placeholder="Filter waves & ripples…" autocomplete="off" />
        </div>
        <div class="ref-list"></div>
      </div>
      <div class="sheet-footer">
        <button class="btn btn-secondary" id="ref-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="ref-save-btn">Save References</button>
      </div>
    </div>
  `;

  overlay.appendChild(el);
  renderList();

  // Filter input
  el.querySelector('#ref-filter').addEventListener('input', (e) => {
    filterText = e.target.value;
    renderList();
  });

  // Toggle selection
  el.querySelector('.ref-list').addEventListener('click', (e) => {
    const item = e.target.closest('[data-ref]');
    if (!item) return;
    const ref = item.dataset.ref;
    if (selected.has(ref)) selected.delete(ref);
    else selected.add(ref);
    renderList();
  });

  function close() {
    el.querySelector('.bottom-sheet').classList.add('sheet-closing');
    el.classList.add('backdrop-closing');
    setTimeout(() => el.remove(), 300);
  }

  el.querySelector('.sheet-close-btn').addEventListener('click', close);
  el.querySelector('#ref-cancel-btn').addEventListener('click', close);
  el.addEventListener('click', (e) => { if (e.target === el) close(); });

  el.querySelector('#ref-save-btn').addEventListener('click', () => {
    // Build items array preserving type
    const items = allItems
      .filter(item => selected.has(item.ref))
      .map(item => ({ ref: item.ref, type: item.type }));
    close();
    onSave(items);
  });
}

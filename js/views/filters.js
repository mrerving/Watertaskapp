/**
 * filters.js — Filter bar renderer.
 *
 * Renders status chips, heat chips, and archived toggle.
 * Mutates state.ui.filters and emits 'filter:change'.
 */

import { state, emit } from '../state.js';
import { escapeHTML } from '../utils/dom.js';

const STATUSES = ['gathering', 'swelling', 'cresting', 'beached', 'still', 'evaporated'];
const HEATS    = ['chilled', 'warm', 'simmering', 'boiling'];

export function renderFilterBar(container) {
  const f = state.ui.filters;

  const statusChips = STATUSES.map(s => `
    <button class="filter-chip ${f.statuses.includes(s) ? 'active' : ''}"
            data-filter-type="status" data-value="${s}">
      ${escapeHTML(s)}
    </button>
  `).join('');

  const heatChips = HEATS.map(h => `
    <button class="filter-chip ${f.heats.includes(h) ? 'active' : ''}"
            data-filter-type="heat" data-value="${h}">
      ${escapeHTML(h)}
    </button>
  `).join('');

  container.innerHTML = `
    <div class="filter-bar">
      <div class="filter-row">
        <span class="section-title" style="flex-shrink:0;align-self:center">Status</span>
        ${statusChips}
      </div>
      <div class="filter-row">
        <span class="section-title" style="flex-shrink:0;align-self:center">Heat</span>
        ${heatChips}
        <button class="filter-chip ${f.showArchived ? 'active' : ''}"
                data-filter-type="archived">
          ${f.showArchived ? 'hide archived' : 'show archived'}
        </button>
      </div>
    </div>
  `;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter-type]');
    if (!btn) return;

    const type  = btn.dataset.filterType;
    const value = btn.dataset.value;

    if (type === 'status') {
      toggleFilter(f.statuses, value);
    } else if (type === 'heat') {
      toggleFilter(f.heats, value);
    } else if (type === 'archived') {
      f.showArchived = !f.showArchived;
    }

    emit('filter:change');
    // Re-render filter bar itself so chips update
    renderFilterBar(container);
  });
}

function toggleFilter(arr, value) {
  const idx = arr.indexOf(value);
  if (idx === -1) arr.push(value);
  else arr.splice(idx, 1);
}

/**
 * Apply current filters to a list of tides.
 * Returns filtered copy (does not mutate).
 */
export function applyFilters(tides) {
  const { statuses, heats, showArchived } = state.ui.filters;

  return tides.filter(tide => {
    // Archive filter
    const isArchived = tide.status === 'still' || tide.status === 'evaporated';
    if (isArchived && !showArchived) return false;

    // Status filter (empty = all)
    if (statuses.length > 0 && !statuses.includes(tide.status)) return false;

    // Heat filter (empty = all)
    if (heats.length > 0 && !heats.includes(tide.heat)) return false;

    return true;
  });
}

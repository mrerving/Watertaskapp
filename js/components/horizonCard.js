/**
 * horizonCard.js — Renders a single Horizon card with live-resolved refs.
 */

import { escapeHTML } from '../utils/dom.js';
import { state } from '../state.js';
import { findWave, findRipple, findParentTide, findParentWave } from '../store.js';

export function horizonCardHTML(horizon) {
  const isExpanded = state.ui.expandedTides.has('horizon-' + horizon.id);

  const refCount = horizon.items.length;
  const countLabel = `<span class="badge badge-count">${refCount} item${refCount !== 1 ? 's' : ''}</span>`;

  const refsHTML = resolveRefs(horizon.items);

  return `
    <div class="horizon-card ${isExpanded ? 'expanded' : ''}" data-horizon-id="${horizon.id}">
      <div class="horizon-card-header" data-horizon-toggle="${horizon.id}">
        <svg class="horizon-expand-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
        </svg>
        <span class="horizon-card-title">${escapeHTML(horizon.title)}</span>
        <div class="tide-card-actions">
          ${countLabel}
          <button class="icon-btn" data-action="add-horizon-ref" data-id="${horizon.id}" title="Add reference">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          </button>
          <button class="icon-btn" data-action="edit-horizon" data-id="${horizon.id}" title="Edit horizon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
          </button>
          <button class="icon-btn" data-action="delete-horizon" data-id="${horizon.id}" title="Delete horizon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      </div>
      <div class="horizon-card-body">
        ${horizon.notes ? `<div class="horizon-notes">${escapeHTML(horizon.notes)}</div>` : ''}
        <div class="horizon-refs">
          ${refsHTML || '<div class="horizon-ref-missing">No items referenced yet.</div>'}
        </div>
      </div>
    </div>
  `;
}

function resolveRefs(items) {
  return items.map(item => {
    if (item.type === 'wave') {
      const wave = findWave(item.ref);
      if (!wave) return missingRef(item.ref);
      const parentTide = findParentTide(item.ref);
      return `
        <div class="horizon-ref-item" data-ref-id="${item.ref}">
          <div class="horizon-ref-breadcrumb">${escapeHTML(parentTide?.title || '?')} › wave</div>
          <div class="horizon-ref-text">${escapeHTML(wave.title)}</div>
          <div class="horizon-ref-badges">
            <span class="badge badge-status-${wave.status}">${wave.status}</span>
            <span class="badge badge-heat-${wave.heat}">${wave.heat}</span>
            <button class="icon-btn" data-action="remove-horizon-ref" data-ref="${item.ref}" style="margin-left:auto;width:24px;height:24px" title="Remove">
              <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </div>
      `;
    } else {
      const ripple = findRipple(item.ref);
      if (!ripple) return missingRef(item.ref);
      const parentWave = findParentWave(item.ref);
      const parentTide = parentWave ? findParentTide(parentWave.id) : null;
      return `
        <div class="horizon-ref-item" data-ref-id="${item.ref}">
          <div class="horizon-ref-breadcrumb">${escapeHTML(parentTide?.title || '?')} › ${escapeHTML(parentWave?.title || '?')} › ripple</div>
          <div class="horizon-ref-text">${escapeHTML(ripple.text)}</div>
          <div class="horizon-ref-badges">
            <span class="badge badge-ripple-${ripple.status}">${ripple.status}</span>
            ${ripple.heat ? `<span class="badge badge-heat-${ripple.heat}">${ripple.heat}</span>` : ''}
            <button class="icon-btn" data-action="remove-horizon-ref" data-ref="${item.ref}" style="margin-left:auto;width:24px;height:24px" title="Remove">
              <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </div>
      `;
    }
  }).join('');
}

function missingRef(ref) {
  return `<div class="horizon-ref-item"><span class="horizon-ref-missing">Item no longer exists (${ref.slice(0,8)}…)</span></div>`;
}

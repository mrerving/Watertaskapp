/**
 * waveCard.js — Renders a single Wave card (with nested Ripples).
 */

import { escapeHTML, formatUSD } from '../utils/dom.js';
import { state } from '../state.js';
import { rippleItemHTML, attachRippleHandlers } from './rippleItem.js';
import { applyFilters } from '../views/filters.js';

export function waveCardHTML(wave) {
  const isExpanded = state.ui.expandedWaves.has(wave.id);

  const rippleCount  = wave.ripples.length;
  const doneCount    = wave.ripples.filter(r => r.status === 'done').length;
  const countLabel   = rippleCount > 0
    ? `<span class="badge badge-count">${doneCount}/${rippleCount}</span>`
    : '';

  const ripplesHTML = wave.ripples.map(r => rippleItemHTML(r)).join('');

  const hasCost = wave.estimatedCost != null || wave.actualCost != null;
  const waveCost = hasCost ? `
    <div class="wave-cost">
      ${wave.estimatedCost != null ? `<div class="wave-cost-item"><span class="cost-label">Est</span><span class="cost-value">${formatUSD(wave.estimatedCost)}</span></div>` : ''}
      ${wave.actualCost != null ? `<div class="wave-cost-item"><span class="cost-label">Act</span><span class="cost-value">${formatUSD(wave.actualCost)}</span></div>` : ''}
    </div>` : '';

  return `
    <div class="wave-card ${isExpanded ? 'expanded' : ''}" data-wave-id="${wave.id}">
      <div class="wave-card-header" data-wave-toggle="${wave.id}">
        <svg class="wave-expand-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
        </svg>
        <div class="wave-card-title-row">
          <div class="wave-card-title">${escapeHTML(wave.title)}</div>
          <div class="wave-card-meta">
            <span class="badge badge-status-${wave.status}">${wave.status}</span>
            <span class="badge badge-heat-${wave.heat}">${wave.heat}</span>
            ${countLabel}
          </div>
        </div>
        <div class="tide-card-actions">
          <button class="icon-btn" data-action="move-wave" data-id="${wave.id}" title="Move wave">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg>
          </button>
          <button class="icon-btn" data-action="edit-wave" data-id="${wave.id}" title="Edit wave">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
          </button>
          <button class="icon-btn" data-action="delete-wave" data-id="${wave.id}" title="Delete wave">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      </div>
      <div class="wave-card-body">
        ${wave.summary ? `<div class="tide-summary">${escapeHTML(wave.summary)}</div>` : ''}
        ${waveCost}
        <ul class="ripple-list" data-wave-id="${wave.id}">
          ${ripplesHTML}
        </ul>
        <button class="wave-add-btn" data-action="add-ripple" data-wave-id="${wave.id}">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          Add ripple
        </button>
      </div>
    </div>
  `;
}

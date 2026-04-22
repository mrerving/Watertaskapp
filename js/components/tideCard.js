/**
 * tideCard.js — Renders a single Tide card (with nested Waves).
 */

import { escapeHTML, formatUSD, tideCosts } from '../utils/dom.js';
import { state } from '../state.js';
import { shouldFlag } from '../utils/flags.js';
import { waveCardHTML } from './waveCard.js';

export function tideCardHTML(tide) {
  const isExpanded = state.ui.expandedTides.has(tide.id);
  const flagged    = shouldFlag(tide);

  const activeWaves    = tide.waves.filter(w => w.status !== 'still' && w.status !== 'evaporated');
  const waveCount      = tide.waves.length;
  const activeCount    = activeWaves.length;
  const countLabel     = waveCount > 0
    ? `<span class="badge badge-count">${activeCount}/${waveCount} waves</span>`
    : `<span class="badge badge-count">no waves</span>`;

  const flagBadge = flagged
    ? `<span class="badge badge-flag" title="Status may need review">⚑ flag</span>`
    : '';

  const { est, act } = tideCosts(tide);
  const costRollup = (est != null || act != null) ? `
    <div class="cost-rollup">
      ${est != null ? `<div class="cost-item"><span class="cost-label">Est</span><span class="cost-value">${formatUSD(est)}</span></div>` : ''}
      ${act != null ? `<div class="cost-item actual"><span class="cost-label">Act</span><span class="cost-value">${formatUSD(act)}</span></div>` : ''}
    </div>` : '';

  const wavesHTML = tide.waves.map(w => waveCardHTML(w)).join('');

  return `
    <div class="tide-card ${isExpanded ? 'expanded' : ''} ${flagged ? 'has-flag' : ''}" data-tide-id="${tide.id}">
      <div class="tide-card-header" data-tide-toggle="${tide.id}">
        <svg class="tide-expand-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
        </svg>
        <div class="tide-card-title-row">
          <div class="tide-card-title">${escapeHTML(tide.title)}</div>
          <div class="tide-card-meta">
            <span class="badge badge-status-${tide.status}">${tide.status}</span>
            <span class="badge badge-heat-${tide.heat}">${tide.heat}</span>
            ${countLabel}
            ${flagBadge}
          </div>
        </div>
        <div class="tide-card-actions">
          <button class="icon-btn" data-action="edit-tide" data-id="${tide.id}" title="Edit tide">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
          </button>
          <button class="icon-btn" data-action="delete-tide" data-id="${tide.id}" title="Delete tide">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      </div>
      <div class="tide-card-body">
        ${tide.summary ? `<div class="tide-summary">${escapeHTML(tide.summary)}</div>` : ''}
        ${costRollup}
        <div class="wave-list" data-tide-id="${tide.id}">
          ${wavesHTML}
        </div>
        <button class="tide-add-wave-btn" data-action="add-wave" data-tide-id="${tide.id}">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          Add wave
        </button>
      </div>
    </div>
  `;
}

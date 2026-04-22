/**
 * moveSheet.js — Bottom sheet for moving a Wave to another Tide,
 * or a Ripple to another Wave.
 */

import { state } from '../state.js';
import { escapeHTML } from '../utils/dom.js';
import { moveWave, moveRipple, findParentTide, findParentWave } from '../store.js';

/**
 * Open a move sheet for a Wave.
 * @param {string} waveId
 */
export function openMoveWaveSheet(waveId) {
  const currentTide = findParentTide(waveId);
  if (!currentTide) return;

  const otherTides = state.data.tides.filter(t => t.id !== currentTide.id);

  if (otherTides.length === 0) {
    showNoTargets('No other tides to move to.');
    return;
  }

  const options = otherTides.map(t => `
    <button class="move-option" data-target-id="${t.id}">
      <span class="move-option-dot"></span>
      <span>${escapeHTML(t.title)}</span>
      <span class="badge badge-status-${t.status}" style="margin-left:auto">${t.status}</span>
    </button>
  `).join('');

  openSheet('Move Wave to Tide', options, (targetId) => {
    moveWave(waveId, targetId);
  });
}

/**
 * Open a move sheet for a Ripple.
 * @param {string} rippleId
 */
export function openMoveRippleSheet(rippleId) {
  const currentWave = findParentWave(rippleId);
  if (!currentWave) return;

  const currentTide = findParentTide(currentWave.id);

  // Build a flat list of all waves grouped by tide, excluding the current wave
  let sectionsHTML = '';

  for (const tide of state.data.tides) {
    const waves = tide.waves.filter(w => w.id !== currentWave.id);
    if (waves.length === 0) continue;

    sectionsHTML += `<div class="move-section-label">${escapeHTML(tide.title)}</div>`;
    sectionsHTML += waves.map(w => `
      <button class="move-option" data-target-id="${w.id}">
        <span class="move-option-dot"></span>
        <span>${escapeHTML(w.title)}</span>
        <span class="badge badge-status-${w.status}" style="margin-left:auto">${w.status}</span>
      </button>
    `).join('');
  }

  if (!sectionsHTML) {
    showNoTargets('No other waves to move to.');
    return;
  }

  openSheet('Move Ripple to Wave', sectionsHTML, (targetId) => {
    moveRipple(rippleId, targetId);
  });
}

// ---- internals ----

function openSheet(title, optionsHTML, onSelect) {
  const overlay = document.getElementById('modal-overlay');

  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.innerHTML = `
    <div class="bottom-sheet" role="dialog" aria-modal="true">
      <div class="sheet-handle"><div class="sheet-handle-bar"></div></div>
      <div class="sheet-header">
        <span class="sheet-title">${escapeHTML(title)}</span>
        <button class="sheet-close-btn" aria-label="Close">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
      <div class="sheet-body">
        <div class="move-picker">
          ${optionsHTML}
        </div>
      </div>
    </div>
  `;

  overlay.appendChild(el);

  function close() {
    el.querySelector('.bottom-sheet').classList.add('sheet-closing');
    el.classList.add('backdrop-closing');
    setTimeout(() => el.remove(), 300);
  }

  el.querySelector('.sheet-close-btn').addEventListener('click', close);
  el.addEventListener('click', (e) => { if (e.target === el) close(); });

  const onKey = (e) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-target-id]');
    if (!btn) return;
    close();
    onSelect(btn.dataset.targetId);
  });
}

function showNoTargets(message) {
  const overlay = document.getElementById('modal-overlay');
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.innerHTML = `
    <div class="bottom-sheet">
      <div class="sheet-handle"><div class="sheet-handle-bar"></div></div>
      <div class="sheet-body">
        <div class="empty-state">
          <p>${escapeHTML(message)}</p>
        </div>
      </div>
      <div class="sheet-footer">
        <button class="btn btn-secondary" style="flex:1" id="no-targets-close">Close</button>
      </div>
    </div>
  `;
  overlay.appendChild(el);
  el.querySelector('#no-targets-close').addEventListener('click', () => el.remove());
  el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
}

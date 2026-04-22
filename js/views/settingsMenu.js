/**
 * settingsMenu.js — Bottom sheet for app-level actions:
 *   Export JSON, Import JSON, Sign out
 */

import { state, loadData, markDirty, emit } from '../state.js';
import { flush } from '../sync.js';
import * as github from '../github.js';

export function openSettingsMenu(onSignOut) {
  const overlay = document.getElementById('modal-overlay');

  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.innerHTML = `
    <div class="bottom-sheet" role="dialog" aria-modal="true" aria-label="Settings">
      <div class="sheet-handle"><div class="sheet-handle-bar"></div></div>
      <div class="sheet-header">
        <span class="sheet-title">Settings</span>
        <button class="sheet-close-btn" aria-label="Close">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
      <div class="sheet-body">
        <div class="settings-section-label">Data</div>
        <div class="settings-actions">
          <button class="settings-action-btn" id="settings-export-btn">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
            Export JSON
            <span class="settings-action-hint">Download your data as a file</span>
          </button>
          <button class="settings-action-btn" id="settings-import-btn">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-4.293a1 1 0 011.414 1.414L9 10.414V17a1 1 0 11-2 0v-6.586l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3z" clip-rule="evenodd"/>
            </svg>
            Import JSON
            <span class="settings-action-hint">Load data from a file (replaces current data)</span>
          </button>
          <input type="file" id="settings-import-file" accept=".json,application/json" style="display:none" />
          <div id="settings-import-error" class="settings-import-error" hidden></div>
        </div>

        <div class="settings-section-label" style="margin-top: var(--space-4)">Account</div>
        <div class="settings-actions">
          <button class="settings-action-btn settings-action-danger" id="settings-signout-btn">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 100-2H4V5h6a1 1 0 100-2H3zm11.707 4.293a1 1 0 010 1.414L12.414 11H17a1 1 0 110 2h-4.586l2.293 2.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Sign out
            <span class="settings-action-hint">Clear credentials and return to setup</span>
          </button>
        </div>
      </div>
    </div>
  `;

  overlay.appendChild(el);

  function close() {
    const sheet = el.querySelector('.bottom-sheet');
    sheet.classList.add('sheet-closing');
    el.classList.add('backdrop-closing');
    setTimeout(() => el.remove(), 300);
  }

  el.querySelector('.sheet-close-btn').addEventListener('click', close);
  el.addEventListener('click', (e) => { if (e.target === el) close(); });

  const onKey = (e) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);

  // === Export ===
  el.querySelector('#settings-export-btn').addEventListener('click', () => {
    exportJSON();
    close();
  });

  // === Import ===
  const fileInput = el.querySelector('#settings-import-file');
  const errorEl   = el.querySelector('#settings-import-error');

  el.querySelector('#settings-import-btn').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    errorEl.hidden = true;

    let parsed;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      showError('Invalid JSON file — could not parse.');
      return;
    }

    if (!parsed || typeof parsed !== 'object') {
      showError('File does not contain a JSON object.');
      return;
    }
    if (!Array.isArray(parsed.tides)) {
      showError('Missing "tides" array — this doesn\'t look like a Tides export.');
      return;
    }

    loadData(parsed);
    markDirty();
    emit('state:changed');
    flush();
    close();
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  // === Sign out ===
  el.querySelector('#settings-signout-btn').addEventListener('click', () => {
    close();
    onSignOut && onSignOut();
  });
}

function exportJSON() {
  const json     = JSON.stringify(state.data, null, 2);
  const blob     = new Blob([json], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const dateStr  = new Date().toISOString().slice(0, 10);
  const filename = `tides-data-${dateStr}.json`;

  const a = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

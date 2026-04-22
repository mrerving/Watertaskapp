/**
 * app.js — Entry point. Boot sequence.
 *
 * 1. Check for GitHub credentials in localStorage
 * 2. If missing → show setup screen
 * 3. If present → fetch data from GitHub, init sync, render app
 */

import * as github from './github.js';
import { loadData } from './state.js';
import { initRender } from './render.js';
import * as sync from './sync.js';
import { renderSetup } from './views/setup.js';
import { qs } from './utils/dom.js';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((err) => {
      console.warn('[tides] SW registration failed:', err);
    });
  });
}

// === PWA Install prompt ===
// Chrome fires this when the app meets installability criteria.
// We capture it and wire it to our own button in the header.
let _installPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // suppress the automatic mini-infobar
  _installPrompt = e;
  _showInstallButton();
});

window.addEventListener('appinstalled', () => {
  _installPrompt = null;
  _hideInstallButton();
});

function _showInstallButton() {
  const header = document.getElementById('app-header');
  if (!header || header.querySelector('#install-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'install-btn';
  btn.className = 'icon-btn';
  btn.title = 'Install app';
  btn.style.color = 'var(--color-seafoam)';
  btn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
  </svg>`;
  btn.addEventListener('click', async () => {
    if (!_installPrompt) return;
    _installPrompt.prompt();
    const { outcome } = await _installPrompt.userChoice;
    if (outcome === 'accepted') _installPrompt = null;
  });
  // Insert before the sync status indicator
  const syncEl = header.querySelector('#sync-status');
  header.insertBefore(btn, syncEl);
}

function _hideInstallButton() {
  document.getElementById('install-btn')?.remove();
}

// Boot — ES modules are deferred so DOM is already parsed, but guard either way
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

async function boot() {
  const appShell = qs('#app-shell');

  if (!github.isConfigured()) {
    // Show setup screen (replaces app shell content)
    appShell.innerHTML = '';
    renderSetup(appShell, onSetupComplete);
    return;
  }

  showLoading();

  try {
    const result = await github.initRepo();
    onSetupComplete(result.data);
  } catch (err) {
    showLoadError(err.message);
  }
}

function onSetupComplete(data) {
  loadData(data);
  restoreAppShell();
  initRender();
  sync.init();
}

function showLoading() {
  const appShell = qs('#app-shell');
  appShell.innerHTML = `
    <div id="loading-screen">
      <div class="loading-wave">
        <span></span><span></span><span></span>
      </div>
      <span style="font-size:0.875rem;color:var(--color-text-dim)">Loading Tides…</span>
    </div>
  `;
}

function showLoadError(message) {
  const appShell = qs('#app-shell');
  appShell.innerHTML = `
    <div id="loading-screen">
      <p style="color:var(--color-boiling);font-size:0.9rem;max-width:300px;text-align:center">
        Failed to load: ${escapeHTML(message)}
      </p>
      <button class="btn btn-secondary" id="retry-btn" style="margin-top:16px">Retry</button>
      <button class="btn btn-secondary" id="reset-btn" style="margin-top:8px;font-size:0.8rem">
        Reset credentials
      </button>
    </div>
  `;

  qs('#retry-btn')?.addEventListener('click', () => {
    restoreAppShell();
    boot();
  });

  qs('#reset-btn')?.addEventListener('click', () => {
    github.clearConfig();
    restoreAppShell();
    boot();
  });
}

function restoreAppShell() {
  qs('#app-shell').innerHTML = `
    <header id="app-header">
      <span id="app-title">~ <span>Tides</span> ~</span>
      <span id="sync-status" class="synced">● synced</span>
    </header>
    <nav id="tab-bar">
      <button class="tab-btn active" data-tab="tides">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.5 16.5a3 3 0 01-3-3V7a3 3 0 013-3h9a3 3 0 013 3v6.5a3 3 0 01-3 3h-9zM4 10H3V7a2 2 0 012-2h9a2 2 0 012 2v3h-1v-.5A1.5 1.5 0 0013.5 8h-7A1.5 1.5 0 005 9.5V10z" clip-rule="evenodd"/>
        </svg>
        Tides
      </button>
      <button class="tab-btn" data-tab="horizons">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
          <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
        </svg>
        Horizons
      </button>
    </nav>
    <main id="main-content">
      <div id="tides-view" class="tab-view"></div>
      <div id="horizons-view" class="tab-view" hidden></div>
    </main>
    <div id="modal-overlay"></div>
  `;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

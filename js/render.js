/**
 * render.js — Top-level render dispatcher.
 *
 * Listens for state:changed and filter:change events.
 * Only rerenders the currently active tab.
 */

import { state, subscribe } from './state.js';
import { mountTidesView, renderTidesView } from './views/tides.js';
import { mountHorizonsView, renderHorizonsView } from './views/horizons.js';
import { qs } from './utils/dom.js';

let _tidesView    = null;
let _horizonsView = null;
let _tabBtns      = null;

let _tidesMounted    = false;
let _horizonsMounted = false;

/**
 * Initialize the render system.
 * Call once after the DOM is ready and data is loaded.
 */
export function initRender() {
  _tidesView    = qs('#tides-view');
  _horizonsView = qs('#horizons-view');
  _tabBtns      = document.querySelectorAll('.tab-btn');

  // Wire tab switching
  document.getElementById('tab-bar').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });

  // Subscribe to state changes
  subscribe('state:changed', () => {
    rerenderActive();
  });

  subscribe('filter:change', () => {
    renderTidesView();
  });

  // Mount and render initial tab
  switchTab('tides');
}

function switchTab(tab) {
  state.ui.activeTab = tab;

  // Update tab button active state
  _tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  if (tab === 'tides') {
    _tidesView.removeAttribute('hidden');
    _horizonsView.setAttribute('hidden', '');

    if (!_tidesMounted) {
      mountTidesView(_tidesView);
      _tidesMounted = true;
    } else {
      renderTidesView();
    }
  } else {
    _horizonsView.removeAttribute('hidden');
    _tidesView.setAttribute('hidden', '');

    if (!_horizonsMounted) {
      mountHorizonsView(_horizonsView);
      _horizonsMounted = true;
    } else {
      renderHorizonsView();
    }
  }
}

function rerenderActive() {
  if (state.ui.activeTab === 'tides') {
    renderTidesView();
  } else {
    renderHorizonsView();
  }
}

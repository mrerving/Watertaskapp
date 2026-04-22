/**
 * rippleItem.js — Renders a single Ripple list item.
 *
 * Interactions:
 *   tap       → toggle open ↔ done
 *   long-press → context menu to set blocked
 *   swipe-left → reveal delete / move actions
 */

import { escapeHTML, formatUSD } from '../utils/dom.js';
import { cycleRippleStatus, updateRipple, deleteRipple } from '../store.js';
import { state } from '../state.js';

const LONG_PRESS_MS = 300;

/**
 * Render HTML string for a ripple item.
 * @param {Object} ripple
 * @returns {string}
 */
export function rippleItemHTML(ripple) {
  const heatBadge = ripple.heat
    ? `<span class="badge badge-heat-${ripple.heat}">${escapeHTML(ripple.heat)}</span>`
    : '';

  const hasMeta = ripple.estimatedHours != null || ripple.actualHours != null
    || ripple.estimatedCost != null || ripple.actualCost != null;
  const metaHTML = hasMeta ? `
    <div class="ripple-meta">
      ${ripple.estimatedHours != null ? `<span class="ripple-meta-item">⏱ ${ripple.estimatedHours}h est</span>` : ''}
      ${ripple.actualHours    != null ? `<span class="ripple-meta-item">⏱ ${ripple.actualHours}h act</span>` : ''}
      ${ripple.estimatedCost  != null ? `<span class="ripple-meta-item">${formatUSD(ripple.estimatedCost)} est</span>` : ''}
      ${ripple.actualCost     != null ? `<span class="ripple-meta-item">${formatUSD(ripple.actualCost)} act</span>` : ''}
    </div>` : '';

  return `
    <li class="ripple-item status-${ripple.status}" data-ripple-id="${ripple.id}">
      <div class="ripple-actions">
        <button class="ripple-action-btn move" data-action="move-ripple" data-id="${ripple.id}" title="Move">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg>
        </button>
        <button class="ripple-action-btn delete" data-action="delete-ripple" data-id="${ripple.id}" title="Delete">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        </button>
      </div>
      <div class="ripple-item-content" data-ripple-tap="${ripple.id}">
        <button class="ripple-checkbox" aria-label="Toggle ${escapeHTML(ripple.text)}" data-ripple-tap="${ripple.id}"></button>
        <div class="ripple-text-wrap">
          <span class="ripple-text">${escapeHTML(ripple.text)}</span>
          ${metaHTML}
        </div>
        ${heatBadge}
        <button class="icon-btn" data-action="edit-ripple" data-id="${ripple.id}" title="Edit ripple">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
        </button>
      </div>
    </li>
  `;
}

/**
 * Attach gesture handlers to a rendered ripple list item element.
 * @param {HTMLElement} el  The .ripple-item element
 * @param {Function} onMove  Called with rippleId to open move sheet
 * @param {Function} onEdit  Called with rippleId to open edit sheet
 */
export function attachRippleHandlers(el, { onMove, onEdit }) {
  const rippleId = el.dataset.rippleId;

  // === Tap to toggle ===
  el.addEventListener('click', (e) => {
    // Only handle clicks on the content area, not action buttons
    if (e.target.closest('[data-action]')) return;
    if (!e.target.closest('[data-ripple-tap]')) return;
    cycleRippleStatus(rippleId);
  });

  // === Edit button ===
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="edit-ripple"]');
    if (!btn) return;
    e.stopPropagation();
    onEdit && onEdit(rippleId);
  });

  // === Swipe-left to reveal actions ===
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping   = false;

  const content = el.querySelector('.ripple-item-content');

  el.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping   = false;
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;

    if (!isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      isSwiping = true;
    }

    if (isSwiping && dx < -10) {
      e.preventDefault();
    }
  }, { passive: false });

  el.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx < -50) {
      el.classList.add('swiped');
    } else {
      el.classList.remove('swiped');
    }
  }, { passive: true });

  // Tap anywhere to un-swipe
  el.addEventListener('click', (e) => {
    if (el.classList.contains('swiped') && !e.target.closest('[data-action]')) {
      el.classList.remove('swiped');
    }
  });

  // === Long-press for blocked ===
  let longPressTimer = null;

  el.addEventListener('touchstart', (e) => {
    if (e.target.closest('[data-action]')) return;
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      showBlockedMenu(el, rippleId);
    }, LONG_PRESS_MS);
  }, { passive: true });

  el.addEventListener('touchend', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }, { passive: true });

  el.addEventListener('touchmove', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }, { passive: true });

  // === Swipe action buttons ===
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    if (btn.dataset.action === 'delete-ripple') {
      e.stopPropagation();
      deleteRipple(rippleId);
    } else if (btn.dataset.action === 'move-ripple') {
      e.stopPropagation();
      el.classList.remove('swiped');
      onMove && onMove(rippleId);
    }
  });
}

function showBlockedMenu(itemEl, rippleId) {
  // Remove any existing menus
  document.querySelectorAll('.ripple-context-menu').forEach(m => m.remove());

  const rect = itemEl.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'ripple-context-menu';

  const currentStatus = itemEl.classList.contains('status-blocked') ? 'blocked' : null;

  menu.innerHTML = `
    <button class="ripple-context-menu-item" data-blocked-action="blocked">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
        <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"/>
      </svg>
      ${currentStatus === 'blocked' ? 'Unblock (set open)' : 'Mark as blocked'}
    </button>
    <button class="ripple-context-menu-item" data-blocked-action="dismiss">
      Cancel
    </button>
  `;

  // Position near the item
  menu.style.top  = `${Math.min(rect.bottom, window.innerHeight - 120)}px`;
  menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 180))}px`;

  document.body.appendChild(menu);

  // Auto-remove on outside click
  const dismiss = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', dismiss);
    }
  };
  setTimeout(() => document.addEventListener('click', dismiss), 10);

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-blocked-action]');
    if (!btn) return;
    if (btn.dataset.blockedAction === 'blocked') {
      const newStatus = currentStatus === 'blocked' ? 'open' : 'blocked';
      updateRipple(rippleId, { status: newStatus });
    }
    menu.remove();
    document.removeEventListener('click', dismiss);
  });
}

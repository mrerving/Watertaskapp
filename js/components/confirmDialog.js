/**
 * confirmDialog.js — Simple confirmation dialog.
 *
 * Usage:
 *   import { confirm } from './confirmDialog.js';
 *   const ok = await confirm('Delete this tide?', 'This cannot be undone.');
 */

/**
 * Show a confirmation dialog.
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function confirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-backdrop';

    overlay.innerHTML = `
      <div class="confirm-dialog" role="dialog" aria-modal="true">
        <div class="confirm-title">${escapeHTML(title)}</div>
        ${message ? `<div class="confirm-message">${escapeHTML(message)}</div>` : ''}
        <div class="confirm-actions">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-danger" data-action="confirm">Delete</button>
        </div>
      </div>
    `;

    document.getElementById('modal-overlay').appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn && e.target !== overlay) return;

      overlay.remove();
      if (btn?.dataset.action === 'confirm') {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    // ESC to cancel
    const onKey = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        resolve(false);
      }
    };
    document.addEventListener('keydown', onKey);
  });
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

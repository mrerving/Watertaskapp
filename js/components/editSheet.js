/**
 * editSheet.js — Universal bottom sheet for creating/editing all entity types.
 *
 * Config:
 *   entityType: 'tide' | 'wave' | 'ripple' | 'horizon'
 *   mode:       'create' | 'edit'
 *   entityId:   string | null    (required for edit)
 *   parentId:   string | null    (tideId for waves, waveId for ripples)
 *   onSave:     function(fields) → called with validated field values
 *   onDelete:   function()       → optional, called when delete is requested
 */

import { qs } from '../utils/dom.js';
import { confirm } from './confirmDialog.js';

const STATUSES_TIDE_WAVE = [
  'gathering', 'swelling', 'cresting', 'beached', 'still', 'evaporated'
];
const HEATS = ['chilled', 'warm', 'simmering', 'boiling'];
const RIPPLE_STATUSES = ['open', 'blocked', 'done'];

function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusOptions(statuses, selected) {
  return statuses.map(s =>
    `<option value="${s}" ${s === selected ? 'selected' : ''}>${s}</option>`
  ).join('');
}

function heatOptions(selected) {
  return HEATS.map(h =>
    `<option value="${h}" ${h === selected ? 'selected' : ''}>${h}</option>`
  ).join('');
}

/**
 * Open the edit sheet.
 * @returns {Function} close — call to dismiss programmatically
 */
export function openEditSheet({
  entityType,
  mode = 'create',
  entityId = null,
  initialValues = {},
  onSave,
  onDelete,
}) {
  const overlay = document.getElementById('modal-overlay');
  const title   = mode === 'create'
    ? `Add ${capitalize(entityType)}`
    : `Edit ${capitalize(entityType)}`;

  const bodyHTML = buildFormHTML(entityType, initialValues);
  const showDelete = mode === 'edit' && typeof onDelete === 'function';

  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.innerHTML = `
    <div class="bottom-sheet" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}">
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
        ${bodyHTML}
      </div>
      <div class="sheet-footer">
        ${showDelete ? `<button class="btn btn-danger" id="sheet-delete-btn">Delete</button>` : ''}
        <button class="btn btn-secondary" id="sheet-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="sheet-save-btn">
          ${mode === 'create' ? 'Create' : 'Save'}
        </button>
      </div>
    </div>
  `;

  overlay.appendChild(el);

  // Focus first input
  setTimeout(() => {
    const firstInput = el.querySelector('input, textarea');
    if (firstInput) firstInput.focus();
  }, 100);

  function close() {
    const sheet = el.querySelector('.bottom-sheet');
    const backdrop = el;
    sheet.classList.add('sheet-closing');
    backdrop.classList.add('backdrop-closing');
    setTimeout(() => el.remove(), 300);
  }

  // Close button
  el.querySelector('.sheet-close-btn').addEventListener('click', close);
  qs('#sheet-cancel-btn', el).addEventListener('click', close);

  // Backdrop tap to close
  el.addEventListener('click', (e) => {
    if (e.target === el) close();
  });

  // ESC to close
  const onKey = (e) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);

  // Save
  qs('#sheet-save-btn', el).addEventListener('click', () => {
    const fields = collectFields(el, entityType);
    if (!fields) return; // validation failed
    close();
    onSave && onSave(fields);
  });

  // Delete
  if (showDelete) {
    qs('#sheet-delete-btn', el).addEventListener('click', async () => {
      const ok = await confirm(
        `Delete this ${entityType}?`,
        entityType === 'tide'
          ? 'All waves and ripples inside will also be deleted.'
          : entityType === 'wave'
          ? 'All ripples inside will also be deleted.'
          : ''
      );
      if (ok) {
        close();
        onDelete();
      }
    });
  }

  return close;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildFormHTML(entityType, vals) {
  switch (entityType) {
    case 'tide':
    case 'wave':
      return `
        <div class="form-group">
          <label class="form-label" for="field-title">Title *</label>
          <input id="field-title" name="title" class="form-input" type="text"
            value="${escapeHTML(vals.title || '')}" placeholder="${entityType === 'tide' ? 'Name this tide…' : 'Name this wave…'}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="field-summary">Summary</label>
          <input id="field-summary" name="summary" class="form-input" type="text"
            value="${escapeHTML(vals.summary || '')}" placeholder="One-line summary…" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-status">Status</label>
            <select id="field-status" name="status" class="form-select">
              ${statusOptions(STATUSES_TIDE_WAVE, vals.status || 'gathering')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="field-heat">Heat</label>
            <select id="field-heat" name="heat" class="form-select">
              ${heatOptions(vals.heat || 'warm')}
            </select>
          </div>
        </div>
        ${entityType === 'wave' ? `
        <div class="form-section-label">Cost (USD) — optional</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-est-cost">Estimated</label>
            <input id="field-est-cost" name="estimatedCost" class="form-input" type="number"
              min="0" step="1" placeholder="—" value="${vals.estimatedCost ?? ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="field-act-cost">Actual</label>
            <input id="field-act-cost" name="actualCost" class="form-input" type="number"
              min="0" step="1" placeholder="—" value="${vals.actualCost ?? ''}" />
          </div>
        </div>` : ''}
        <div class="form-group">
          <label class="form-label" for="field-notes">Notes</label>
          <textarea id="field-notes" name="notes" class="form-textarea"
            placeholder="Longer notes, context…">${escapeHTML(vals.notes || '')}</textarea>
        </div>
      `;

    case 'ripple':
      return `
        <div class="form-group">
          <label class="form-label" for="field-text">Task *</label>
          <textarea id="field-text" name="text" class="form-textarea" rows="2"
            placeholder="Describe this task…" required>${escapeHTML(vals.text || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-status">Status</label>
            <select id="field-status" name="status" class="form-select">
              ${statusOptions(RIPPLE_STATUSES, vals.status || 'open')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="field-heat">Heat</label>
            <select id="field-heat" name="heat" class="form-select">
              <option value="" ${!vals.heat ? 'selected' : ''}>— none —</option>
              ${heatOptions(vals.heat || '')}
            </select>
          </div>
        </div>
        <div class="form-section-label">Hours — optional</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-est-hours">Estimated</label>
            <input id="field-est-hours" name="estimatedHours" class="form-input" type="number"
              min="0" step="0.5" placeholder="—" value="${vals.estimatedHours ?? ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="field-act-hours">Actual</label>
            <input id="field-act-hours" name="actualHours" class="form-input" type="number"
              min="0" step="0.5" placeholder="—" value="${vals.actualHours ?? ''}" />
          </div>
        </div>
        <div class="form-section-label">Cost (USD) — optional</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-est-cost">Estimated</label>
            <input id="field-est-cost" name="estimatedCost" class="form-input" type="number"
              min="0" step="1" placeholder="—" value="${vals.estimatedCost ?? ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="field-act-cost">Actual</label>
            <input id="field-act-cost" name="actualCost" class="form-input" type="number"
              min="0" step="1" placeholder="—" value="${vals.actualCost ?? ''}" />
          </div>
        </div>
      `;

    case 'horizon':
      return `
        <div class="form-group">
          <label class="form-label" for="field-title">Title *</label>
          <input id="field-title" name="title" class="form-input" type="text"
            value="${escapeHTML(vals.title || '')}" placeholder="Name this horizon…" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="field-notes">Notes</label>
          <textarea id="field-notes" name="notes" class="form-textarea"
            placeholder="What is this horizon about?">${escapeHTML(vals.notes || '')}</textarea>
        </div>
      `;

    default:
      return '';
  }
}

function collectFields(sheetEl, entityType) {
  const get = (name) => {
    const el = sheetEl.querySelector(`[name="${name}"]`);
    return el ? el.value.trim() : '';
  };
  const getNum = (root, name) => {
    const el = root.querySelector(`[name="${name}"]`);
    if (!el || el.value.trim() === '') return null;
    const n = parseFloat(el.value);
    return isNaN(n) ? null : n;
  };

  switch (entityType) {
    case 'tide':
    case 'wave': {
      const title = get('title');
      if (!title) {
        highlightRequired(sheetEl, 'title');
        return null;
      }
      const fields = {
        title,
        summary: get('summary'),
        status:  get('status') || 'gathering',
        heat:    get('heat')   || 'warm',
        notes:   get('notes'),
      };
      if (entityType === 'wave') {
        fields.estimatedCost = getNum(sheetEl, 'estimatedCost');
        fields.actualCost    = getNum(sheetEl, 'actualCost');
      }
      return fields;
    }

    case 'ripple': {
      const text = get('text');
      if (!text) {
        highlightRequired(sheetEl, 'text');
        return null;
      }
      const heat = get('heat') || null;
      return {
        text,
        status:         get('status') || 'open',
        heat:           heat === '' ? null : heat,
        estimatedHours: getNum(sheetEl, 'estimatedHours'),
        actualHours:    getNum(sheetEl, 'actualHours'),
        estimatedCost:  getNum(sheetEl, 'estimatedCost'),
        actualCost:     getNum(sheetEl, 'actualCost'),
      };
    }

    case 'horizon': {
      const title = get('title');
      if (!title) {
        highlightRequired(sheetEl, 'title');
        return null;
      }
      return {
        title,
        notes: get('notes'),
      };
    }

    default:
      return {};
  }
}

function highlightRequired(sheetEl, fieldName) {
  const el = sheetEl.querySelector(`[name="${fieldName}"]`);
  if (!el) return;
  el.style.borderColor = 'var(--color-boiling)';
  el.focus();
  setTimeout(() => { el.style.borderColor = ''; }, 1500);
}

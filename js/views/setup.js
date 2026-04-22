/**
 * setup.js — First-run setup screen.
 *
 * Shown when no GitHub credentials are stored in localStorage.
 * On success calls the provided onSuccess(data) callback.
 */

import { qs, escapeHTML } from '../utils/dom.js';
import * as github from '../github.js';

export function renderSetup(container, onSuccess) {
  container.innerHTML = `
    <div id="setup-screen">
      <div class="setup-card">
        <div>
          <div class="setup-title">~ Tides ~</div>
          <p class="setup-subtitle" style="margin-top:8px">
            Connect your GitHub repo to get started.<br>
            Your data lives in <code>tides-data.json</code>.
          </p>
        </div>

        <div id="setup-error" class="setup-error"></div>

        <div class="form-group">
          <label class="form-label" for="setup-username">GitHub Username</label>
          <input id="setup-username" class="form-input" type="text"
            placeholder="octocat" autocomplete="off" autocapitalize="off" spellcheck="false" />
        </div>

        <div class="form-group">
          <label class="form-label" for="setup-repo">Repository Name</label>
          <input id="setup-repo" class="form-input" type="text"
            placeholder="my-tides-data" autocomplete="off" autocapitalize="off" spellcheck="false" />
        </div>

        <div class="form-group">
          <label class="form-label" for="setup-pat">Personal Access Token</label>
          <input id="setup-pat" class="form-input" type="password"
            placeholder="ghp_…" autocomplete="off" />
          <p style="font-size:0.75rem;color:var(--color-text-dim);margin-top:4px">
            Needs <strong>repo</strong> scope. Stored only in this browser.
          </p>
        </div>

        <button id="setup-submit" class="btn btn-primary">
          Connect &amp; Start
        </button>
      </div>
    </div>
  `;

  const submitBtn = qs('#setup-submit', container);
  const errorEl   = qs('#setup-error', container);

  submitBtn.addEventListener('click', async () => {
    const username = qs('#setup-username', container).value.trim();
    const repo     = qs('#setup-repo', container).value.trim();
    const pat      = qs('#setup-pat', container).value.trim();

    errorEl.textContent = '';
    errorEl.classList.remove('visible');

    if (!username || !repo || !pat) {
      showError('All fields are required.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Connecting…';

    github.setConfig({ username, repo, pat });

    try {
      const result = await github.initRepo();
      onSuccess(result.data);
    } catch (err) {
      github.clearConfig();
      showError(`Could not connect: ${err.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Connect & Start';
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
  }

  // Allow Enter key to submit
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn.click();
  });
}

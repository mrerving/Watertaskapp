# Tides

A personal life and task tracker built as a Progressive Web App (PWA) with a water/ocean theme. Data lives in your own GitHub repository — no backend, no account, no subscription.

---

## What It Is

Tides organizes life in a three-tier hierarchy:

- **Tide** — a major life arc (e.g. "Career Transition", "Home Renovation")
- **Wave** — a specific thread of work within a Tide (e.g. "Portfolio Site", "Kitchen Planning")
- **Ripple** — a concrete checklist task within a Wave
- **Horizon** — a cross-cutting plan that references Waves and Ripples from across any Tide. Horizons are lenses, not containers — they point to existing items without copying them.

Everything is stored in a single `tides-data.json` file in your GitHub repo, read and written via the GitHub API. Claude (via GitHub MCP) can read and edit that file directly.

---

## Architecture

```
index.html          ← PWA shell; loads app.js as ES module
manifest.json       ← PWA metadata (installable, standalone display)
service-worker.js   ← Offline support via runtime caching
tides-data.json     ← Your data (lives in YOUR GitHub repo)

js/
  app.js            ← Bootstrap: SW registration, credential check, boot
  github.js         ← GitHub Contents API: fetch / save tides-data.json
  state.js          ← In-memory state + pub/sub event bus
  store.js          ← All CRUD operations (Tide/Wave/Ripple/Horizon)
  sync.js           ← Background sync: 30s interval + page-close flush
  render.js         ← Tab dispatcher + mount/render logic

  components/
    tideCard.js     ← Tide card with nested Waves
    waveCard.js     ← Wave card with nested Ripples
    rippleItem.js   ← Ripple task item
    horizonCard.js  ← Horizon card with live-resolved references
    editSheet.js    ← Modal editor for Tide / Wave / Ripple
    moveSheet.js    ← Modal for moving items between parents
    refPicker.js    ← Picker for Horizon item references
    confirmDialog.js← Confirmation dialogs

  views/
    tides.js        ← Tides tab (filter bar + card list)
    horizons.js     ← Horizons tab
    filters.js      ← Filter bar logic (status, heat, archived toggle)
    settingsMenu.js ← Settings / logout
    setup.js        ← First-run GitHub credential entry

  utils/
    dom.js          ← DOM helpers, escapeHTML, cost rollup
    flags.js        ← Status mismatch flagging logic
    id.js           ← UUID generation
    time.js         ← ISO8601 timestamps

css/
  tokens.css        ← Design tokens (colors, spacing, typography)
  reset.css         ← CSS reset
  layout.css        ← Grid and flexbox layouts
  cards.css         ← Card styling
  forms.css         ← Form inputs and bottom sheets
  badges.css        ← Status and heat badge styles
  animations.css    ← Keyframe animations
```

**Zero external dependencies.** No npm, no bundler, no build step. Plain ES modules run directly in the browser.

---

## Data Model

```json
{
  "_meta": {
    "version": "1.0",
    "schema": "tides",
    "lastModifiedBy": "app | claude",
    "updatedAt": "ISO8601"
  },
  "tides": [
    {
      "id": "uuid",
      "title": "string",
      "status": "gathering | swelling | cresting | beached | still | evaporated",
      "heat": "chilled | warm | simmering | boiling",
      "summary": "string",
      "notes": "string",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601",
      "waves": [
        {
          "id": "uuid",
          "title": "string",
          "status": "...",
          "heat": "...",
          "summary": "string",
          "notes": "string",
          "updatedAt": "ISO8601",
          "movedFrom": "parent-tide-id | null",
          "ripples": [
            {
              "id": "uuid",
              "text": "string",
              "status": "open | blocked | done",
              "heat": "chilled | warm | simmering | boiling | null",
              "createdAt": "ISO8601",
              "movedFrom": "parent-wave-id | null"
            }
          ]
        }
      ]
    }
  ],
  "horizons": [
    {
      "id": "uuid",
      "title": "string",
      "notes": "string",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601",
      "items": [
        { "ref": "wave-or-ripple-id", "type": "wave | ripple" }
      ]
    }
  ]
}
```

**Status vocabulary:**
- `still` = completed/archived intentionally
- `evaporated` = dissolved, no longer relevant
- Both are hidden by default; a toggle reveals them

Horizon `items` are references (IDs), not copies. If a Wave or Ripple is deleted, its ref is silently removed from all Horizons.

---

## Getting Started

### Prerequisites

- A GitHub account
- A GitHub repo (can be the same repo that hosts this app, or a separate private repo)
- A GitHub Personal Access Token with **repo** scope

### Generating a PAT

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → select **repo** scope
3. Copy the token — you'll only see it once

### First Run

1. Open the app (e.g. `https://yourusername.github.io/Watertaskapp/`)
2. On first load, you'll see the setup screen. Enter:
   - Your GitHub username
   - The repo name where `tides-data.json` should live
   - Your PAT
3. Tap **Connect** — the app creates `tides-data.json` if it doesn't exist yet, then loads

Credentials are stored in `localStorage` in your browser. To switch repos or log out, use the settings menu (⚙ in the header).

### Installing as a PWA

On Android Chrome: tap the three-dot menu → **Add to Home Screen**. The app runs in standalone mode (no browser chrome) and works offline for reading.

---

## Sync Strategy

| Event | Behavior |
|-------|-----------|
| Any edit | Written to in-memory state immediately (no lag) |
| Every 30 seconds | If dirty, flushes to GitHub in the background |
| Tab hidden / backgrounded | Immediate flush if dirty |
| Page close | Best-effort flush via `fetch` with `keepalive: true` |
| App open | Fetches latest JSON from GitHub as source of truth |

**Conflict resolution:** Last write wins. No merge logic. Opening the app on two devices simultaneously risks the slower-saving tab overwriting the faster one. For a single-user personal app this is an accepted tradeoff.

The sync status indicator in the header shows: `● synced` / `● syncing…` / `● unsaved` / `● sync error`.

---

## Caching Architecture & Known Tradeoffs

The app uses four caching layers. None are required for correctness — they exist for performance and offline support.

### 1. Service Worker — Runtime Cache (`tides-v2`)

**Strategy:** Network-first. Every GET request for a static asset (HTML, CSS, JS, icons) tries the network first. On success the response is written to the cache. On network failure the cache is served.

GitHub API calls (`api.github.com`) bypass the service worker entirely — data is always live.

**Current gap:** The service worker does not pre-cache anything on `install`. Assets only enter the cache after the first successful network fetch. A user who installs the PWA and immediately goes offline before any assets are fetched will see a blank screen.

**Alternative (app shell pre-caching):**
```js
// In the install event, pre-cache the app shell:
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/reset.css',
  './css/layout.css',
  './css/cards.css',
  './css/forms.css',
  './css/badges.css',
  './css/animations.css',
  './js/app.js',
  './js/github.js',
  './js/state.js',
  './js/store.js',
  './js/sync.js',
  './js/render.js',
  // ... all component and view files
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
});
```
This guarantees offline readiness the moment the PWA is installed. The tradeoff is that any pre-cache failure (network error on a single file) blocks the SW install entirely. Bump `CACHE` name on every deploy to force cache refresh.

**Also worth noting:** Because asset filenames are not content-hashed, users with a cached service worker may receive stale JS/CSS after a deploy until their SW auto-updates (which happens on next page load when `service-worker.js` itself changes). `skipWaiting()` + `clients.claim()` minimize this window.

### 2. `localStorage` — GitHub Credentials

The GitHub username, repo name, and Personal Access Token (PAT) are stored in plaintext `localStorage`.

**Security tradeoff:** `localStorage` is accessible to any JavaScript running on the page. An XSS vulnerability could expose the PAT. The PAT has full `repo` scope. For a personal app with no third-party scripts this is a common and calculated tradeoff, but it is a tradeoff.

**Alternatives (in increasing security, decreasing convenience):**

| Option | Security | Convenience |
|--------|----------|-------------|
| `localStorage` (current) | Persists indefinitely; XSS-accessible | Enter once, never again |
| `sessionStorage` | Cleared on tab close; same XSS risk | Re-enter per browser session |
| Encrypted localStorage | PAT encrypted at rest; PIN stored in sessionStorage | Enter PIN each session |
| GitHub OAuth flow | No PAT stored client-side; requires a backend/proxy | Seamless login flow |

For the current scope (personal, single-user, no CDN/third-party scripts), `localStorage` is reasonable. A step-up would be `sessionStorage` — same XSS surface, but limits the blast radius to the active session.

### 3. In-Memory State (`state.data`)

The entire `tides-data.json` is loaded into memory on boot and kept there for the session. All reads and writes operate against this in-memory copy. Writes are batched and flushed to GitHub asynchronously.

This is appropriate. The data file is a single user's personal tasks — well under 1 MB in any realistic scenario. No alternative needed.

### 4. Render Mount Cache

`render.js` mounts the Tides and Horizons views once on first tab switch and reuses the DOM nodes on subsequent switches (rather than destroying and recreating them). This is a standard performance optimization, not a caching concern.

---

## Business Logic Notes

- **Status is editorial:** Tide status is always set manually. The app never auto-promotes a Tide's status based on its Waves.
- **Flag indicator:** A ⚑ appears on a Tide card when more than half its Waves are `beached` but the Tide is not, or more than half are `still`/`evaporated` but the Tide is not. This surfaces misalignment for review.
- **Move tracking:** When a Wave or Ripple is moved to a new parent, the previous parent ID is recorded in `movedFrom`. This is informational only.
- **Cascade deletes in Horizons:** Deleting a Wave or Ripple silently removes its reference from any Horizon that includes it.
- **Heat is independent of status:** `heat` (chilled → boiling) represents urgency/energy, not progress.

---

## Claude / AI Integration

`tides-data.json` is designed to be readable and editable by Claude via the GitHub MCP connector in Claude.ai. The `_meta.lastModifiedBy` field distinguishes app-written vs. Claude-written saves.

Claude can:
- Read the full task state without any schema file
- Add, edit, or complete Tides, Waves, and Ripples by directly editing the JSON
- Reorganize items, bulk-update statuses, or generate summaries

---

## Deployment

The app is static — deploy anywhere that serves files over HTTPS (required for service workers).

**GitHub Pages (recommended):**
1. Push this repo to GitHub
2. Settings → Pages → Source: Deploy from a branch → select `main` → `/ (root)`
3. Access at `https://yourusername.github.io/reponame/`

**Local dev:**
```bash
# Any static server works. Example with Python:
python3 -m http.server 8080
# Then open http://localhost:8080
```

Service workers require HTTPS in production. `localhost` is exempt and works for local development.

---

## Out of Scope (v1)

- Due dates and reminders — fields exist in the schema, UI ignores them
- Offline writes — the app is read-only offline
- Conflict resolution beyond last-write-wins
- Multi-user access or shared repos
- Sub-tasks below Ripple level
- Horizon ordering or grouping beyond a flat list

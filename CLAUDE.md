# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

There is no build step and no package manager. Serve the files over HTTP — service workers require a server even locally:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

There are no tests and no linter configured.

## How the App Boots

`app.js` is the entry point (loaded as an ES module from `index.html`). Boot sequence:

1. Check localStorage for GitHub credentials (`tides_github_username`, `tides_github_repo`, `tides_github_pat`)
2. If missing → render the setup screen (`views/setup.js`)
3. If present → call `github.initRepo()` which fetches (or creates) `tides-data.json`, then calls `loadData()`, `initRender()`, `sync.init()`

## Core Data Flow

All state lives in `state.js` as a single in-memory object (`state.data`) that mirrors `tides-data.json` exactly. The flow for any mutation is:

```
User action
  → store.js function
    → mutate state.data directly
    → markDirty()          ← sets isDirty, emits 'sync:status'
    → emit('state:changed') ← triggers render.js to re-render the active tab
  → sync.js flushes to GitHub every 30s (or on page hide/close)
```

Never mutate `state.data` outside of `store.js`. Never call `emit('state:changed')` without also calling `markDirty()` (and vice versa) in a mutating function.

## Rendering Pattern

`render.js` is the only subscriber to `state:changed`. It re-renders only the currently active tab. Views are mounted once on first tab switch (guarded by `_tidesMounted` / `_horizonsMounted` flags) and then re-rendered in place on subsequent updates — they are never unmounted. The mount function sets up the static DOM structure; the render function updates its contents.

When adding a new view: export both `mountXxxView(container)` and `renderXxxView()` from `views/xxx.js`, and wire them in `render.js` following the existing tab pattern.

## Hierarchy Constraints

The data model enforces a strict tree: **Tide → Wave → Ripple**. No orphan items are allowed. When writing any store operation:

- A Ripple must always have a parent Wave; a Wave must always have a parent Tide
- Deleting a Wave must delete all its Ripples
- Deleting a Tide must delete all its Waves (and their Ripples)
- Deleting a Wave or Ripple must also remove any references to it from all Horizons (`state.data.horizons[].items`)

Horizon `items` are reference arrays `[{ ref: id, type: 'wave'|'ripple' }]` — they point to existing items, not copies. Horizons themselves have no parent constraint.

## GitHub Sync — SHA Tracking

`github.js` tracks `_currentSha` (the file's SHA from the last GET or PUT response). Every PUT to the GitHub Contents API requires the current SHA to avoid 409 conflicts. After a successful save, update `_currentSha` from `json.content.sha` in the response. The `flushKeepAlive()` path in `sync.js` calls `github.getCurrentSha()` directly for the page-close best-effort write.

## Enums

**Status (Tide and Wave):** `gathering` · `swelling` · `cresting` · `beached` · `still` · `evaporated`  
`still` and `evaporated` are soft-archived and hidden from the default UI (toggle in filter bar).

**Heat:** `chilled` · `warm` · `simmering` · `boiling`

**Ripple status:** `open` · `blocked` · `done`

## Flag Logic

`utils/flags.js` computes whether a ⚑ indicator appears on a Tide card. A flag is shown when:
- More than half the Tide's Waves are `beached` but the Tide itself is not `beached`, **or**
- More than half the Tide's Waves are `still`/`evaporated` but the Tide is not `still`/`evaporated`

Tide status is always set manually — never auto-calculated.

## Editing tides-data.json Directly

This app is designed for Claude to edit `tides-data.json` directly via GitHub MCP. The JSON is self-describing. Set `_meta.lastModifiedBy` to `"claude"` when doing so. Horizon refs must remain valid — do not delete a Wave or Ripple ID that is referenced in `horizons[].items` without also cleaning up those refs.

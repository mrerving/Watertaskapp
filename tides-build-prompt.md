# Tides — Build Prompt for Claude Code

**Project: Tides — Personal Life & Task Tracker**

Build a Progressive Web App (PWA) called **Tides** — a personal life and task tracker with a water/ocean theme. Host on GitHub Pages. Data persists as a single JSON file (`tides-data.json`) in the same GitHub repository, read and written via the GitHub API using a Personal Access Token stored in localStorage on first setup.

---

## Vocabulary & Hierarchy

Three-tier enforced hierarchy:
- **Tide** — a major life arc (top level)
- **Wave** — a specific thread of work within a Tide (mid level)
- **Ripple** — a checklist task within a Wave (bottom level)
- **Horizon** — a flat cross-cutting plan that holds references (by id) to any Wave or Ripple across any Tide. Horizons are lenses, not containers — they point to existing items, not copies.

Ripples must always have a parent Wave. Waves must always have a parent Tide. No orphan items.

---

## Data Model

```json
Tide {
  id: string (uuid),
  title: string,
  status: enum,
  heat: enum,
  summary: string,
  notes: string,
  createdAt: ISO8601,
  updatedAt: ISO8601,
  waves: Wave[]
}

Wave {
  id: string (uuid),
  title: string,
  status: enum,
  heat: enum,
  summary: string,
  notes: string,
  updatedAt: ISO8601,
  movedFrom: string | null (previous parent Tide id, set on move),
  ripples: Ripple[]
}

Ripple {
  id: string (uuid),
  text: string,
  status: enum (open | blocked | done),
  heat: enum | null (optional),
  createdAt: ISO8601,
  dueDate: ISO8601 | null (reserved for future use, not shown in UI v1),
  reminderAt: ISO8601 | null (reserved for future use, not shown in UI v1),
  movedFrom: string | null (previous parent Wave id, set on move)
}

Horizon {
  id: string (uuid),
  title: string,
  notes: string,
  createdAt: ISO8601,
  updatedAt: ISO8601,
  items: [
    { ref: string (Wave or Ripple id), type: "wave" | "ripple" }
  ]
}
```

**Status enum (Tide and Wave):** gathering · swelling · cresting · beached · still · evaporated
- `still` = completed/archived intentionally
- `evaporated` = dissolved, turned out not to matter
- Both are soft-archived and hidden by default, shown via a toggle

**Heat enum:** chilled · warm · simmering · boiling

---

## Business Logic

- Tide status is always a **manual editorial call** by the user — never auto-calculated
- UI shows a **flag indicator** on a Tide if: more than half its Waves are `beached` while the Tide is not `beached`, or more than half its Waves are `still`/`evaporated` while the Tide is not `still`/`evaporated`
- Waves and Ripples are **movable** between parent containers. On move, record previous parent id in `movedFrom`
- If a Wave or Ripple is deleted that is referenced in a Horizon, **auto-remove** that ref from the Horizon silently
- Tides/Waves with status `still` or `evaporated` are **hidden by default** with a toggle to show them

---

## Sync Strategy

- All edits write to **local state immediately** (no lag)
- Changes are **batched and synced to GitHub** in the background every 30 seconds, or immediately on page close/hide
- Show a small unobtrusive **sync status indicator** (synced / syncing / unsaved) in the UI
- On app load, fetch latest JSON from GitHub as source of truth
- Conflict strategy: **last write wins** — no merge logic needed for v1

---

## GitHub Integration

- On first load, if no token is stored, show a **setup screen** asking for: GitHub username, repo name, and Personal Access Token (PAT with repo scope)
- Store these in localStorage
- Data file path: `tides-data.json` at repo root
- Use GitHub Contents API to read and write the file (requires storing the file's `sha` from each GET to use in the PUT)

---

## PWA Requirements

- Fully mobile-optimized, designed primarily for Android
- Include a `manifest.json` with app name, icons, theme color, `display: standalone`
- Include a `service-worker.js` that caches the app shell for offline viewing (read-only offline — no offline writes in v1)
- App must be installable via "Add to Home Screen" on Android Chrome

---

## UI Requirements

- Water/ocean aesthetic — dark theme, fluid feel
- Tides are the top-level cards, collapsible
- Waves are nested within Tides, also collapsible
- Ripples are checklist items within Waves — tappable to toggle done/open, long-press or swipe to access blocked status
- Heat and status badges visible at Tide and Wave level
- Flag indicator visible on Tide card when inconsistency detected
- Filter bar: filter by status, filter by heat, toggle archived (still/evaporated)
- Horizons accessible via a separate tab or section — shows title, notes, and the referenced Waves/Ripples pulled live from data
- Full CRUD for all entities: create, edit, delete Tides, Waves, Ripples, Horizons
- Move UI for Waves (change parent Tide) and Ripples (change parent Wave)
- Notes fields visible in expanded edit view, not in the collapsed card view
- Sync status indicator in header (small, unobtrusive)

---

## Claude/AI Integration Note

This app is designed so that Claude (via a GitHub MCP connector in Claude.ai) can read and edit `tides-data.json` directly. The JSON schema must be clean and self-describing enough that Claude can understand and modify it without a separate schema file. Add a `_meta` field at the root of the JSON:

```json
"_meta": {
  "version": "1.0",
  "schema": "tides",
  "lastModifiedBy": "app | claude",
  "updatedAt": "ISO8601"
}
```

---

## Out of Scope for v1

- Due dates and reminders (fields exist in schema, UI ignores them)
- Horizon grouping/sequencing (flat list only)
- Offline writes
- Multi-user / auth beyond a single PAT
- Sub-tasks below Ripple level

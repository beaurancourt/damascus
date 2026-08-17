# Scripts

Visual regression smokes used during development. Each script launches a
headless Chromium via Playwright, drives the app into a known state, and
saves screenshots to `tmp/audit/` so the change can be eyeballed.

Run with `node scripts/<name>.mjs` while the dev server is running.

The app builds as two sites, and the dev server serves one at a time, so
which server a smoke needs depends on what it drives:

- **Player site** — `npm start`, port 5173. The hero smokes.
- **GM site** — `npm run start:gm`, port 5174. Everything encounter-related:
  the builders, the importers and the runners. Encounters, montages,
  negotiations, monsters and terrain are director content, so only that
  site's library lists them, and only that site has Session.

Each script defaults to the right one. Override with `SMOKE_BASE` to point
a smoke somewhere else — the other dev server, or a built site being served
locally:

```
SMOKE_BASE=http://localhost:4173/damascus-gm/ node scripts/smoke-wide-encounter-runner.mjs
```

## Pixel 10 (mobile) smokes

- `smoke-pixel-hero.mjs` — Create a pregen hero, screenshot the hero
  sheet at multiple scroll positions.
- `smoke-pixel-encounter-builder.mjs` — Make a fresh encounter, screenshot
  the builder with picker open at multiple scroll positions.
- `smoke-pixel-encounter-runner.mjs` — Build → start → screenshot the
  encounter runner. It seeds a hero first when the site has hero tools,
  and skips that when it doesn't.
- `smoke-pixel-yaml-import.mjs` — Drive the "Paste YAML" import flow.

## Wide-viewport (1440×900) smokes

- `smoke-wide-encounter-builder.mjs` — Workspace + picker two-column
  layout, with a group seeded.
- `smoke-wide-encounter-runner.mjs` — Two-column tracker + stat blocks,
  with monsters added.

## Other

- `smoke-console.mjs` — Loads both sites in a clean Chromium (no profile, no
  extensions), walks the main flows, and fails on any console warning, console
  error, page error or 4xx/5xx response that comes from the app. Vite chatter,
  React's DevTools notice and browser-extension logging are ignored by name.
  Point it at production with `SMOKE_BASE` and `SMOKE_BASE_GM`. Asserts — exits
  non-zero. Needs both dev servers when run locally.
- `smoke-encounter-builder-workflow.mjs` — Drives the builder the way a
  director uses it: focus lands in the search box, a sloppy query finds the
  monster, clicking adds it to the active group, Shift+A starts the next group,
  and clearing the query returns to browsing by echelon. Asserts — exits
  non-zero if any step is wrong. Needs the GM site (port 5174).
- `smoke-encounter-import.mjs` — Drives the YAML import modal end to end:
  paste bad YAML and expect the error, paste a shipped example and expect an
  EV preview, then save and expect to land on the encounter edit page. Unlike
  the others, this one asserts — it exits non-zero if a check fails.
- `verify-skill-examples.mjs` — Validates that the example YAML encounters
  shipped in `skills/encounter-builder/` parse cleanly.

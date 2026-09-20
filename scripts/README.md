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
- `smoke-encounter-rename.mjs` — Renames a monster in the builder and follows
  the name into play: the builder row, the builder's "Show stat block" popup,
  and the runner's tracker rows and reference stat block all have to read the
  new name. Asserts — exits non-zero. Needs the GM site (port 5174).
- `smoke-encounter-run-groups.mjs` — Builds a two-group encounter, starts it,
  then removes one group: the survivor has to keep the name it had. Group names
  are pinned when a group is created (and when an older encounter loads), so
  they no longer shift with a group's position. Asserts — exits non-zero. Needs
  the GM site (port 5174).
- `verify-skill-examples.mjs` — Validates that the example YAML encounters
  shipped in `skills/encounter-builder/` parse cleanly.

## Skill tools

- `monster-tools.mjs` — Runs the monster importer skill's TypeScript tools,
  which import the app's own logic and panels and therefore have to be bundled
  with esbuild before node can run them.

  ```
  node scripts/monster-tools.mjs verify
  node scripts/monster-tools.mjs run tmp/my-monster.ts --out .
  ```

  `verify` checks every example in
  `skills/monster-importer/reference/examples/` — model checks plus real
  `MonsterPanel`, `MonsterGroupPanel` and `EncounterRunPanel` renders. `run`
  builds the files an authoring script describes (copy
  `skills/monster-importer/tools/author-monster.ts`) and then checks the bytes
  it wrote. Both exit non-zero on failure, so they are safe to wire into CI.
  See `skills/monster-importer/SKILL.md`.

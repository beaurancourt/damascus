# Scripts

Visual regression smokes used during development. Each script launches a
headless Chromium via Playwright, drives the app into a known state, and
saves screenshots to `tmp/audit/` so the change can be eyeballed.

Run with `node scripts/<name>.mjs` while the dev server (`npm start`) is
running on port 5173.

## Pixel 10 (mobile) smokes

- `smoke-pixel-hero.mjs` — Create a pregen hero, screenshot the hero
  sheet at multiple scroll positions.
- `smoke-pixel-encounter-builder.mjs` — Make a fresh encounter, screenshot
  the builder with picker open at multiple scroll positions.
- `smoke-pixel-encounter-runner.mjs` — Build → start → screenshot the
  encounter runner.
- `smoke-pixel-yaml-import.mjs` — Drive the "Paste YAML" import flow.

## Wide-viewport (1440×900) smokes

- `smoke-wide-encounter-builder.mjs` — Workspace + picker two-column
  layout, with a group seeded.
- `smoke-wide-encounter-runner.mjs` — Two-column tracker + stat blocks,
  with monsters added.

## Other

- `smoke-encounter-import.mjs` — Drives the YAML import modal end to end:
  paste bad YAML and expect the error, paste a shipped example and expect an
  EV preview, then save and expect to land on the encounter edit page. Unlike
  the others, this one asserts — it exits non-zero if a check fails.
- `verify-skill-examples.mjs` — Validates that the example YAML encounters
  shipped in `skills/encounter-builder/` parse cleanly.

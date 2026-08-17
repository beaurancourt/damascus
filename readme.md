# Damascus

**Damascus** is a mobile-first fork of [Forge Steel](https://forgesteel.net), the hero builder and GM toolkit for **DRAW STEEL** by [Andy Aiken](https://github.com/andyaiken/forgesteel).

This fork's focus:

- **Mobile-first information architecture for players.** Less nesting, more scrolling, fewer modals-inside-modals. Hero sheet built around how phones actually work at the table.
- **A focused GM combat tracker.** The encounter runner is a wide-screen tool: grouped combatants with per-monster HP in the left column, deduped stat blocks filling the remaining one or two, click-to-focus between them. No drag/drop, no player-view modes, no tactical map — just the info a GM actually reaches for during play.
- **A "Tactical Field Dossier" visual language** — Merriweather serif, warm bronze accents, color-coded action tiers — applied consistently across hero, builder, and runner.
- **GM-side encounter YAML import.** Paste a YAML blob (e.g. one produced by an LLM) and run it live.
- **A Claude skill** (`skills/encounter-builder/`) that produces those YAML encounters from natural-language prompts.

## Running locally

Damascus builds two sites from one codebase: the **player** site, which is the
hero builder and sheet, and the **GM** site, which is the Library and Session.
The mode is fixed at build time, so the dev server serves one site at a time —
run whichever you're working on, or both at once in separate terminals.

```
npm install
npm run start      # player site, http://localhost:5173/
npm run start:gm   # GM site,     http://localhost:5174/
```

The two dev servers are separate origins, so they don't share IndexedDB the way
the deployed sites do — anything saved on :5173 is invisible on :5174.

```
npm run check     # lint + typecheck + tests + audit
npm run build     # player production build into ./dist
npm run build:gm  # GM production build into ./dist-gm
```

Visual regression smokes live in `scripts/` — see [scripts/README.md](scripts/README.md).

## Deployment

The repo is configured for **GitHub Pages**. Pushes to `main` or `damascus/main`
build the player bundle (with `base: /damascus/`) and publish it via the
`Deploy to GitHub Pages` workflow, serving it at
`https://<user>.github.io/damascus/`.

To enable: in repo Settings → Pages, set Source to "GitHub Actions".

The GM site is published from its own repo, whose workflow checks *this* one
out, runs `npm run build:gm` and publishes `dist-gm` to
`https://<user>.github.io/damascus-gm/`. A change here therefore doesn't reach
the GM site until that workflow runs.

## Legal

This is a fork of [andyaiken/forgesteel](https://github.com/andyaiken/forgesteel), licensed under **GPL-3.0**. The original copyright notices and license are preserved in `license.md` and `NOTICE.md`.

**Damascus** is an independent product published under the DRAW STEEL Creator License and is not affiliated with MCDM Productions, LLC.

**DRAW STEEL** © 2024 MCDM Productions, LLC.

This project is licensed under the **GNU General Public License v3.0** — see `license.md`. Any redistribution must remain under GPL-3.0 and preserve attribution to the upstream Forge Steel project.

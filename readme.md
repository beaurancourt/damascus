# Damascus

**Damascus** is a mobile-first fork of [Forge Steel](https://forgesteel.net), the hero builder and GM toolkit for **DRAW STEEL** by [Andy Aiken](https://github.com/andyaiken/forgesteel).

This fork's focus:

- **Mobile-first information architecture for players.** Less nesting, more scrolling, fewer modals-inside-modals. Hero sheet built around how phones actually work at the table.
- **A focused GM combat tracker.** The encounter runner is a wide-screen, two-column tool: grouped combatants with per-monster HP on the left, deduped stat blocks on the right, click-to-focus between them. No drag/drop, no player-view modes, no tactical map — just the info a GM actually reaches for during play.
- **A "Tactical Field Dossier" visual language** — Merriweather serif, warm bronze accents, color-coded action tiers — applied consistently across hero, builder, and runner.
- **GM-side encounter YAML import.** Paste a YAML blob (e.g. one produced by an LLM) and run it live.
- **A Claude skill** (`skills/encounter-builder/`) that produces those YAML encounters from natural-language prompts.

## Running locally

```
npm install
npm run start
```

App will be at `http://localhost:5173/`.

```
npm run check    # lint + typecheck + tests + audit
npm run build    # production build into ./dist
```

Visual regression smokes live in `scripts/` — see [scripts/README.md](scripts/README.md).

## Deployment

The repo is configured for **GitHub Pages**. Pushes to `main` build the
production bundle (with `base: /damascus/`) and publish it via the
`Deploy to GitHub Pages` workflow.

To enable: in repo Settings → Pages, set Source to "GitHub Actions". The
app will be served at `https://<user>.github.io/damascus/`.

## Legal

This is a fork of [andyaiken/forgesteel](https://github.com/andyaiken/forgesteel), licensed under **GPL-3.0**. The original copyright notices and license are preserved in `license.md` and `NOTICE.md`.

**Damascus** is an independent product published under the DRAW STEEL Creator License and is not affiliated with MCDM Productions, LLC.

**DRAW STEEL** © 2024 MCDM Productions, LLC.

This project is licensed under the **GNU General Public License v3.0** — see `license.md`. Any redistribution must remain under GPL-3.0 and preserve attribution to the upstream Forge Steel project.

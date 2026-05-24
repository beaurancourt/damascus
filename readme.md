# Damascus

**Damascus** is a mobile-first fork of [Forge Steel](https://forgesteel.net), the hero builder and GM toolkit for **DRAW STEEL** by [Andy Aiken](https://github.com/andyaiken/forgesteel).

This fork's goals:

- **Mobile-first information architecture.** Less nesting, more scrolling, fewer modals-inside-modals. Built around how phones actually work at the table.
- **Fuzzy search everywhere.** Heroes, monsters, abilities, items — one box, find anything.
- **GM-side encounter YAML import.** Paste a YAML blob (e.g. one produced by an LLM) and run it live in the director view.
- **A Claude skill** (`skills/encounter-builder/`) that produces those YAML encounters from natural-language prompts.

## Running locally

```
npm install
npm run start
```

App will be at `http://localhost:5173/`.

```
npm run check    # lint + typecheck + tests
```

## Legal

This is a fork of [andyaiken/forgesteel](https://github.com/andyaiken/forgesteel), licensed under **GPL-3.0**. The original copyright notices and license are preserved in `license.md` and `NOTICE.md`.

**Damascus** is an independent product published under the DRAW STEEL Creator License and is not affiliated with MCDM Productions, LLC.

**DRAW STEEL** © 2024 MCDM Productions, LLC.

This project is licensed under the **GNU General Public License v3.0** — see `license.md`. Any redistribution must remain under GPL-3.0 and preserve attribution to the upstream Forge Steel project.

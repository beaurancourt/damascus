# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Damascus is a mobile-first fork of [Forge Steel](https://github.com/andyaiken/forgesteel) — a hero builder and GM toolkit for the DRAW STEEL TTRPG. React 19 + TypeScript + Vite + Ant Design v6. There is no backend: everything persists to IndexedDB in the browser.

Work lands on `damascus/main`, not `main`. The `upstream` remote points at the original forgesteel repo.

## Commands

```
npm run start    # vite dev server on :5173 (runs npm install first)
npm run check    # lint + typecheck + tests + npm audit — the full gate
npm run lint     # eslint (npm run lint:fix autofixes)
npm run build    # production build into ./dist

npx tsc -p tsconfig.json --noEmit                 # typecheck alone
npx vitest run                                    # tests once (npm test watches)
npx vitest run src/logic/encounter-logic.test.ts  # one file
npx vitest run -t 'substring'                     # one test
```

Playwright smokes in `scripts/` require the dev server already running on :5173; they write screenshots to `tmp/audit/`. See `scripts/README.md`. `tmp/` is gitignored — put throwaway scripts and captures there.

## Claude Code setup

`.claude/settings.json` is checked in. It enables the `typescript-lsp` plugin (hover, go-to-definition, find-references across `.ts`/`.tsx`) — the plugin only wires up the connection, so the server itself has to be installed once per machine:

```
npm install -g typescript-language-server typescript
```

It also registers two hooks in `.claude/hooks/`: `eslint --fix` runs on every edited `src/**/*.ts(x)` file, and edits to `package-lock.json` or `dist/` are blocked as generated output. Newly installed plugins need a session restart before their language server starts.

## Architecture

**Persistence flows one way through a manager.** Components never touch storage. `DataService` (`src/services/`) wraps localforage/IndexedDB; `DataManager` (`src/contexts/data-context.tsx`) wraps DataService and dispatches into reducers behind four contexts. Read state through the hooks — `useHeroes`, `useOptions`, `useSession`, `useHomebrewSourcebooks`, `useAllSourcebooks` — and write it through `useDataManager()`.

**`src/components/main/main.tsx` (~1800 lines) is the hub.** It declares every route (hash router) and owns every mutation — `newHero`, `saveHero`, `importHero`, `deleteHero`, the encounter and session handlers — passing them down as props. Adding cross-cutting behavior usually means a handler here plus a prop on the page that triggers it.

**`src/logic/*-logic.ts` is the rules engine**: static classes of pure functions (`HeroLogic`, `EncounterLogic`, `MonsterLogic`, `SourcebookLogic`, and `FactoryLogic` for constructing model objects). Derived values are never stored on the model — `HeroLogic.getStamina(hero)`, `getSpeed`, `getAbilities` compute from the hero plus its sourcebooks on every call. Essentially all tests live against this layer; there are no component tests.

**Game content is code.** `src/data/` holds official DRAW STEEL content as TypeScript modules, and `SourcebookLogic.getSourcebooks(homebrew)` concatenates the five official sourcebooks with the user's homebrew. Anything that reads content takes a `Sourcebook[]` — pass it down rather than importing data modules directly.

**Saved heroes are migrated on load.** `HeroUpdateLogic.updateHero(hero, sourcebooks)` reshapes older saved data to the current model. Any hero entering the app from outside must go through it (the import path already does).

**Components are grouped by role, not feature**: `pages/` (routed screens), `panels/` (composable blocks), `modals/`, `controls/`. Each has a co-located `.scss`, and most render inside an `<ErrorBoundary>`.

## Conventions

- **Lint is strict and error-level**: tabs, single quotes (including JSX), semicolons, no trailing commas, `curly` always, spaces inside array brackets (`[ 1, 2 ]`).
- **`npm run lint` is clean — 0 errors and 0 warnings. Keep it that way.** `sort-imports` is warning-level, so a violation won't fail the build; it's on you not to reintroduce one. Within each blank-line-separated group, multi-member imports come before single-member ones, each alphabetical by first member and case-sensitive (so `Utils` sorts before `useIsSmall`).
- Comments containing `todo`/`fix`/`fixme`/`hack`/`xxx` trip `no-warning-comments`; `console.log` warns, `console.warn`/`console.error` are allowed.
- **SCSS**: `@import '@/colors.scss'` for the palette. `$bronze` (#c9a45a) is the accent that replaces AntD's blue throughout. Dark is the default theme; light overrides go in `html:not([data-theme="dark"])` blocks at the bottom of the file.
- **Mobile**: `useIsSmall()` (max-width 1000px) drives layout branches; several pages pass a `compact` class to their content div on small screens.

## Pitfalls

- **`flex: 1 1 0` without `min-width: 0` is the recurring layout bug in this repo.** A flex item's automatic minimum size is its min-content width, so a column that can't shrink grows past a phone viewport and a parent's `overflow: hidden` clips it silently — no scrollbar, just content missing off the right edge. It has caused this on three screens (hero sheet, hero builder, landing page). When something looks cut off, measure `getBoundingClientRect()` up the ancestor chain before changing any styles.
- **Check layout at 320px, not just 412px.** These bugs hide at the widths you didn't test, and a screenshot can look fine while an element is 0px wide.
- **`gh` resolves to the wrong repo.** With `upstream` pointing at andyaiken/forgesteel, `gh run list` and friends report on the upstream project — pass `--repo beaurancourt/damascus` explicitly.
- **`npm run check` includes `npm audit`**, which can fail on advisories in upstream dependencies that have nothing to do with your change.

## Deploy

Pushing to `damascus/main` triggers the `Deploy to GitHub Pages` workflow, publishing to https://beaurancourt.github.io/damascus/. `check.yml` runs lint, typecheck, tests and build on PRs. Production builds set Vite `base: '/damascus/'` while dev serves at `/`, so verify deployed asset paths against the built bundle, not the dev server.

## Encounter builder skill

`skills/encounter-builder/` is a Claude skill that emits encounter YAML for the app's import flow. `reference/schema.md` is the authoritative format spec and has to stay in sync with the parser in `src/logic/encounter-yaml.ts` — note that a slot's `count` is *squads* (4 for minions), not individual creatures. `node scripts/verify-skill-examples.mjs` checks the shipped example encounters still parse.

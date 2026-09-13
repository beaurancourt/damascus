---
name: monster-importer
description: Turns a Draw Steel monster stat block (usually a screenshot pasted by the user) into a Damascus monster file the app can import - `<Name>.ds-monster`, and optionally a `<Name>.ds-monster-group` carrying the group's malice. Trigger when the user shares a monster card or stat block and asks for "a monster I can import", "a .ds-monster file", or "add this monster to Damascus". Produces files on disk (not chat output) and reports them.
---

# Damascus Monster Importer

Use this skill when someone hands you a monster stat block — a screenshot, a
PDF page, an image of a card — and wants it in Damascus.

## What you produce

Files on disk, in the repo the user is working in:

| File | Imported from | Carries |
| --- | --- | --- |
| `<Monster Name>.ds-monster` | Library → homebrew sourcebook → monster group → **+** → **Import a monster** | the stat block |
| `<Monster Name>.ds-monster-group` | Library → Monster Groups tab → **Add** → **Import** | a group: its malice, plus the monster |

Write both when the card has malice, since malice only renders from the group.
The files are tab-indented JSON of the full `Monster` / `MonsterGroup` model —
`Utils.saveFile`'s own format.

## Workflow

1. **Read `reference/monster-schema.md` first.** It is the authoritative field
   spec, including which fields the app backfills and where each one renders.
   Then `reference/stat-block-mapping.md` for reading the card itself.
2. **Transcribe the card completely before writing code**: stats, all five
   characteristics, keywords, role/organization/level/EV, every ability with its
   tiers and distance, every trait, immunities and weaknesses, movement modes,
   and any malice. Note anything you cannot read rather than guessing.
3. **Copy `tools/author-monster.ts` to `tmp/<monster-name>.ts`** and replace its
   content section with this monster. Build every object with `FactoryLogic` —
   it fills the `Modifier`, `AbilityType` and `MonsterState` fields that are
   easy to get subtly wrong by hand.
4. **Run it:**
   ```
   node scripts/monster-tools.mjs run tmp/<monster-name>.ts --out .
   ```
   That writes the files and then runs 100+ checks against the bytes it wrote —
   model checks, plus real `MonsterPanel`, `MonsterGroupPanel` and
   `EncounterRunPanel` renders. It exits non-zero if anything is wrong, so a
   passing run is the evidence that the file will work in the app.
5. **Report** the file paths, what you had to guess, and anything odd in the
   source (see *Judgment calls* below). Keep it short: the user wants files, not
   a retelling of the stat block.

## Judgment calls to surface

- **Malice ownership.** The group's `malice` is the copy the GM is offered and
  can spend; a copy in `monster.features` only ever shows in the builder. Write
  both when the card makes the monster the source of the ability, and say which
  file does what.
- **`2d10 + N`** on a card is a bonus-only power roll, and the app prints it as
  `Power Roll + N`. Mention it if the user is comparing against the book.
- **Proper nouns are transcribed verbatim.** If a trait name looks like a typo
  in the source, keep it and flag it.
- **Anything unreadable or absent** (`Weakness: —`, a cost you cannot make out)
  goes in the report. Never invent numbers.

## Don't

- Don't hand-write the JSON unless the user is asking for a one-field tweak to
  an existing file; the author tool exists so the shape and the defaults are
  right.
- Don't put malice only in `monster.features`. Nothing in play renders it there.
- Don't invent fields. The model is `src/models/monster.ts` — if a stat block
  line has no home, it is usually prose in a `Text` feature.
- Don't merge traits or abilities into one feature to save space; each trait is
  its own `Text` feature, each printed ability its own `Ability` feature.
- Don't model a trait as a mechanic. Conditional traits stay prose.
- Don't silently correct, expand, or "improve" the source content, including
  balance changes to damage or stamina.

## Files here

```
SKILL.md                     this file
reference/monster-schema.md  the file format, field by field (authoritative)
reference/stat-block-mapping.md  reading a card into the model
reference/examples/          generated, verified example files
tools/author-monster.ts      copy-me authoring script (also generates the example)
tools/monster-checks.ts      model-level checks
tools/render-checks.ts       stat block / group entry / runner render checks
tools/verify-examples.ts     checks every shipped example
```

`node scripts/monster-tools.mjs verify` checks the shipped examples; the author
tool imports the same checks, so an example and a fresh monster are held to the
same bar.

## Iterating on this skill

The real spec is the app, not this directory. When the model changes, these are
the files that moved it, and what to re-check here:

| Source of truth | What it affects |
| --- | --- |
| `src/models/monster.ts`, `src/models/monster-group.ts` | `reference/monster-schema.md` field tables |
| `src/models/feature.ts`, `src/logic/factory-feature-logic.ts` | the feature encoding table and the author template |
| `src/logic/factory-logic.ts` | the factory calls quoted throughout |
| `src/logic/update/monster-update-logic.ts` | the "backfilled on load" list |
| `src/logic/monster-logic.ts` (`getMaliceOptions`, `getFeatures`) | the malice ownership table |
| `src/components/panels/elements/monster-panel/monster-panel.tsx` | the "what the GM sees" table |
| `src/components/panels/edit/monster-edit/monster-edit-panel.tsx` | which feature types a monster can hold |
| `src/components/panels/edit/monster-group-edit/monster-group-edit-panel.tsx` | the import entry point and its `accept` list |

After any edit to the tools:

```
node scripts/monster-tools.mjs run skills/monster-importer/tools/author-monster.ts \
  --out skills/monster-importer/reference/examples
node scripts/monster-tools.mjs verify
```

The first command regenerates the shipped example from the template (the example
is the template's output, so they can never drift), the second checks it. If a
change to the app breaks an example, that is the checker doing its job — fix the
example or the checker, and record what you learned in a reference doc.

**Known gap to revisit:** a monster-owned malice feature — `Malice Ability` or
prose `Malice` — renders nowhere in play (`MonsterPanel` filters to
`Ability`/`Text`/`Add-On`; `getMaliceOptions` reads global + group malice). If
the app ever renders monster-owned malice in the stat block or offers it in the
Malice tab, update *Malice ownership* in `monster-schema.md` and the ownership
warning in `tools/monster-checks.ts`. `tools/render-checks.ts` guards the same
claim behaviourally: it re-renders the stat block with the owned malice stripped
and asserts the text is unchanged, so it fails — with a message pointing here —
the moment the app starts rendering it. (It compares renders rather than names
because a malice entry may legitimately share a name with an ability, as the
gummy ball's "Bowl" augment does.)

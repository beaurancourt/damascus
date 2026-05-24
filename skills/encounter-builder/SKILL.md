---
name: encounter-builder
description: Produces a Draw Steel encounter as a YAML document that the Damascus GM tools can import (paste into the Import modal to run live in the director). Trigger when the user asks for a "Draw Steel encounter", "Damascus encounter YAML", or a balanced fight at a given party level/size. Output a single fenced ```yaml block, nothing else.
---

# Damascus Encounter Builder

Use this skill when a user asks you to generate an encounter for Damascus / Forge Steel / Draw Steel.

## What you produce

A single YAML document conforming to `reference/schema.md`. The user pastes it into the Damascus "Import Encounter" modal, where it is parsed, validated, then saved to the library and / or run live in the GM session director.

Therefore the YAML must:

1. Reference only real monster IDs from `reference/monsters.json` (kebab-case strings like `goblin-3`, `orc-elite-2`).
2. Be valid YAML 1.2 — no tabs, indentation in spaces, multiline strings with `|`.
3. Be self-contained and ready to import — no commentary outside the fenced block.

## Workflow

1. **Read `reference/schema.md` first** — it is the authoritative format spec. Do not improvise fields.
2. **Pick monsters from `reference/monsters.json`.** Match the level, role, and theme the user asked for. The catalog has 438 monsters with `id`, `name`, `level`, `ev`, `organization`, `role`. Search by `level` (party level ±2 is safe) and `role` (mix one Brute/Defender, one Artillery/Hexer, plus Minions for filler).
3. **Hit the EV budget.** Read `reference/difficulty.md` for the formulas. Default to **Standard** difficulty unless the user asks for Easy/Hard/Extreme. Show your math in a comment in the description, not in fields the parser won't understand.
4. **Write at least one Tactics note and an Ending note** so the GM has prompts at the table.
5. **Output exactly one fenced ```yaml block.** No prose before or after.

## Don't

- Don't invent monster IDs. If you can't find a good fit, pick the closest match and note the substitution in the encounter description.
- Don't add fields not in the schema. The parser will reject them.
- Don't mix multiple encounters in one YAML. One encounter per output.
- Don't include `id`, `round`, `malice`, or other runtime fields — the importer generates those.

## Quick example

For "a tough fight for four level 3 heroes in a goblin warren":

```yaml
name: The Warren Ambush
description: |
  Standard difficulty for 4 level-3 heroes. EV budget ~50.
  Goblin Boss (EV 18) + 2 Skitterers (EV 16) + 6 Wretches (EV 12) = 46.
groups:
  - name: Wave 1
    slots:
      - monster: goblin-1
        count: 1
      - monster: goblin-3
        count: 2
      - monster: goblin-5
        count: 6
notes:
  tactics: |
    Skitterers harass the back line; wretches body-block in the choke point.
  ending: |
    When the Boss falls, surviving goblins flee back down the tunnel.
```

(Monster IDs above are illustrative — look up the real IDs in `reference/monsters.json` before producing your output.)

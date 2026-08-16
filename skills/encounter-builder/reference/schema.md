# Damascus Encounter YAML Schema

This is the authoritative format for encounter YAML imports. The Damascus importer parses YAML matching this shape and constructs a full `Encounter` object.

## Top-level shape

```yaml
name: string                # required, displayed as encounter title
description: string         # optional, free text
groups:                     # required, 1+ groups
  - <EncounterGroup>
notes:                      # optional
  tactics: string           # appended as a "Tactics" note
  ending: string            # appended as an "Ending the Encounter" note
sections:                   # optional, additional named notes (terrain, hooks, etc.)
  - title: string
    body: string
```

## EncounterGroup

```yaml
name: string                # required, displayed in the GM director
minHeroCount: integer       # optional. If set, the group is skipped when the party
                            # has fewer heroes than this. Used for scaling encounters.
slots:                      # required, 1+ slots
  - <EncounterSlot>
```

## EncounterSlot

```yaml
monster: string             # required, must be a valid id from reference/monsters.json
                            # (e.g. "goblin-3", "orc-elite-2"). Aliases:
                            #   id: <same>
                            #   monsterID: <same>
count: integer              # optional, default 1. Number of this monster.
                            # For Minions this is squads of 4, not individual minions —
                            # count: 1 places one squad (4 individual minions), and EV
                            # is the stat block's per-squad EV times this count. To place
                            # N individual minions, use count: N/4 (round up for a partial
                            # squad).

# Customization (all optional)
level: integer              # signed level adjustment, e.g. +1, -1, +2
                            # alias: levelAdjustment
solo: boolean               # convert this stat block to a Solo version
                            # alias: convertToSolo
minions: integer            # extra minion count adjustment (for Minion organization only)
                            # alias: minionCountAdjustment
addOns:                     # array of add-on feature IDs (strings)
  - string
items:                      # array of item IDs (strings)
  - string
```

## Reserved / runtime fields — do NOT include

These are populated by the importer or at session start:

- `id`, `round`, `malice`, `initiative`, `heroes`, `additionalTurnsTaken`, `hiddenMaliceFeatures`
- per-slot `monsters`, `state`
- per-group `encounterState`

The importer will reject YAML with these fields present.

## Minimal valid example

```yaml
name: "Bridge Ambush"
groups:
  - name: "Initial wave"
    slots:
      - monster: goblin-1
```

## Full example

```yaml
name: "The Steelbridge Ambush"
description: |
  Standard difficulty for 4 level-3 heroes (EV ~50).
  At dusk, the broken bridge cracks under their feet.

groups:
  - name: "Initial wave"
    slots:
      - monster: goblin-1
        count: 1
      - monster: goblin-3
        count: 2
      - monster: goblin-5
        count: 6
  - name: "Reinforcements"
    minHeroCount: 4
    slots:
      - monster: orc-2
        count: 1
        level: +1
        solo: true

notes:
  tactics: |
    Goblin Skitterers (goblin-3) start hidden in the rocks above the bridge.
    On round 2, if the heroes are still grouped, the boss calls reinforcements.
  ending: |
    When the Boss falls, surviving goblins flee. If the heroes interrogate one,
    they learn the warren is two miles north.

sections:
  - title: Terrain
    body: |
      Bridge: 10 squares long, 4 wide. Center 2 squares are difficult terrain
      (rubble). Two braziers at the far end (cover, can be tipped for fire damage).
  - title: Twist
    body: |
      If the heroes are winning hard, the Boss kicks a brazier into the river,
      blanketing the bridge in steam (concealment) for 2 rounds.
```

## Parser rules

- YAML 1.2 only. Use 2-space indentation, no tabs.
- Unknown top-level keys → warning, not failure.
- Unknown slot keys → warning.
- Missing `name` → failure.
- Missing `groups` or empty groups → failure.
- Unknown `monster` ID → failure with the ID listed; user can fix and re-paste.

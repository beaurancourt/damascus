# Draw Steel Encounter Value (EV) Reference

Damascus computes encounter difficulty using the same formulas as Forge Steel. Use these to budget your YAML output.

## Per-hero value

```
heroValue = 4 + (2 * heroLevel)
```

Examples:

| Hero level | heroValue |
|-----------:|----------:|
| 1          |  6        |
| 2          |  8        |
| 3          | 10        |
| 4          | 12        |
| 5          | 14        |
| 6          | 16        |
| 7          | 18        |
| 8          | 20        |
| 9          | 22        |
| 10         | 24        |

## Difficulty budgets

```
effectiveHeroes = heroCount + floor(heroVictories / 2)

maxTrivial  = (effectiveHeroes - 1) * heroValue - 1
maxEasy     =  effectiveHeroes      * heroValue - 1
maxStandard = (effectiveHeroes + 1) * heroValue
maxHard     = (effectiveHeroes + 3) * heroValue
```

Anything above `maxHard` is **Extreme** (and rapidly fatal — death-march territory beyond `maxHard * 2`).

## Worked tables

### Level-1 party, 0 victories

| heroes | Trivial ≤ | Easy ≤ | Standard ≤ | Hard ≤ |
|-------:|----------:|-------:|-----------:|-------:|
| 3      | 11        | 17     | 24         | 36     |
| 4      | 17        | 23     | 30         | 42     |
| 5      | 23        | 29     | 36         | 48     |

### Level-3 party, 0 victories

| heroes | Trivial ≤ | Easy ≤ | Standard ≤ | Hard ≤ |
|-------:|----------:|-------:|-----------:|-------:|
| 3      | 19        | 29     | 40         | 60     |
| 4      | 29        | 39     | 50         | 70     |
| 5      | 39        | 49     | 60         | 80     |

### Level-6 party, 0 victories

| heroes | Trivial ≤ | Easy ≤ | Standard ≤ | Hard ≤ |
|-------:|----------:|-------:|-----------:|-------:|
| 3      | 31        | 47     | 64         | 96     |
| 4      | 47        | 63     | 80         | 112    |
| 5      | 63        | 79     | 96         | 128    |

## Encounter strength

```
encounterStrength = sum over groups (where heroCount >= group.minHeroCount):
  sum over slots:
    (monster.encounterValue + addOnCost) * count

# For Minion slots: count += minionCountAdjustment / roleMultiplier
```

`addOnCost` for a slot: if total add-on points > 4, `addOnCost = (points - 4) * 2`. Stays 0 otherwise.

## Recommendations

- **Default to Standard.** Hard encounters are dramatic but exhausting; reserve them for boss fights.
- **Mix roles.** A pure swarm of one stat block is boring. Pair a Brute/Defender (sticky front line) with Artillery/Hexer (back line threat) and Minions (filler / pressure).
- **Use minHeroCount sparingly.** It is the cleanest way to scale a single encounter across party sizes — gate a second wave behind `minHeroCount: 5`.
- **Solos beat the budget rule.** A single Solo monster of EV ≈ Standard budget is a tight, focused fight. Don't pair Solos with much else.
- **Show your math** in the `description:` field so the GM (or you, on re-import) can audit the budget.

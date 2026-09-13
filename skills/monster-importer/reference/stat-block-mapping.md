# Reading a stat block into the model

How to turn a printed Draw Steel monster card — usually a screenshot — into a
`.ds-monster` (and optionally `.ds-monster-group`) file. Pairs with
`monster-schema.md`, which is the field-by-field authority; this file is the
transcription guide.

## Work top to bottom, then regroup

A printed card is laid out for a reader, not for the model. Read it in order,
then sort what you read into the four buckets the model actually has.

| On the card | Goes to |
| --- | --- |
| Name | `monster.name` |
| `Elemental, Water Wolf` under the name | `monster.keywords` (one entry per comma-separated term) |
| `Level 1 Horde Ambusher` | `monster.level`, `monster.role.organization`, `monster.role.type` |
| `EV 3` | `monster.encounterValue` |
| Size / Speed / Stamina / Stability / Free Strike | `size`, `speed.value`, `stamina`, `stability`, `freeStrikeDamage` |
| `Immunity: Fire 2` / `Weakness: X 3` | a `Damage Modifier` feature, one modifier per entry |
| `Movement: Swim` | `speed.modes: [ 'swim' ]` |
| Might/Agility/Reason/Intuition/Presence | `monster.characteristics`, all five, in that order |
| Signature / main-action abilities with a power roll | `Ability` features |
| Malice abilities (`1 Malice`, `3 Malice`) | the group's `malice` — see below |
| Starred traits, one sentence of prose each | `Text` features |
| `With Captain: …` (minions) | `monster.withCaptain` |

## What the GM will actually see

Worth knowing before you transcribe, because it tells you which reading of an
ambiguous card is the one that shows up:

| Model | Rendered as |
| --- | --- |
| `level` + `role` | The header/footer line, built by `MonsterLogic.getMonsterDescription`: `Level 1 Horde Ambusher` |
| `keywords` | Appended after that line, comma-joined (§ footer): `Level 1 Horde Ambusher · Elemental, Water Wolf · EV 3` |
| `encounterValue` | `EV 3`, or `EV 3 for 4 minions` when the organization is `Minion` |
| `size` | `1M` (`FormatLogic.getSize`) |
| `speed.value` | `8` on the Speed stat — **modes are not shown here** |
| `speed.modes` | A separate `Movement: Swim` line (`Format.capitalize` of `FormatLogic.getSpeedModes`) |
| `stamina` / `stability` / `freeStrikeDamage` | `15` / `2` / `2` |
| `freeStrikeType` | A `Free Strike Type` line, **only when it is not `Damage`** |
| `Damage Modifier` (Immunity) | `Immunities: Fire 2` |
| `Damage Modifier` (Weakness) | `Weaknesses: Cold 3`; a card showing `Weakness: —` needs **no feature at all** |
| `Condition Immunity` | `Cannot Be: …` |
| `Text` feature | Its `name` as a label with its `description` as markdown |
| `Ability` feature | The full ability panel: signature pill or usage, keywords, distance/target, power roll with tiers, section text |
| `withCaptain` | A `With Captain` line |
| any ability with `usage: Villain Action` | Adds the standard Villain Actions reminder line |
| `Minion` organization | Adds the standard minion action-economy reminder line |

## Encoding rules that are easy to get wrong

**`2d10 + 2` is a bonus-only roll.** `bonus: 2, characteristic: []`. The app
prints `Power Roll + 2`; the printed book's `2d10 + 2` is the same thing. Never
put the bonus in `characteristic`.

**A signature ability is a `cost`, not a usage.** `cost: 'signature'` alongside
`type: createMain()` is what prints the Signature pill. The usage is still
`Main Action` underneath.

**`Movement: Swim` is a speed mode, not a feature.** `speed.modes: [ 'swim' ]`.
There is a `Movement Mode` feature type in the model, but monsters use speed
modes; official data always does.

**Malice belongs to the group.** The only malice that renders or can be spent is
`monsterGroup.malice`. Put a card's malice abilities there as
`Malice Ability` features with `echelon` ≤ the echelon of the monster's level.
A monster *can* own a `Malice Ability` feature in `monster.features` — the
builder shows and edits it — but nothing in play renders it. Full detail and the
evidence in `monster-schema.md` under *Malice ownership*.

**Every trait is a `Text` feature, one per trait.** Don't merge several traits
into one description, and don't try to model a trait as a mechanic — a
conditional trait ("while adjacent to any ally, …") stays prose.

**Stamina is the base number.** Bonuses belong in `Bonus` features; don't add
them into `stamina` by hand.

**Minion EV is per squad of four.** Transcribe the card's EV as-is; the app adds
the "for 4 minions" wording.

**Transcribe proper nouns verbatim, then flag suspicious ones.** If a trait name
looks like a typo in the source (`Aquavuken`), keep it exactly as printed and
say so in your report — never silently correct the user's content.

## Worked example

`Sudden Downpour`, Level 1 Horde Ambusher, EV 3, from a card reading:
keywords `Elemental, Water Wolf`; Size 1M, Speed 8, Stamina 15, Stability 2,
Free Strike 2; Immunity Fire 2; Movement Swim; Might +2, Agility −2, Reason −3,
Intuition 0, Presence −2; signature `Leap Upon` (2d10+2, Melee/Strike/Weapon,
Melee 1, one creature or object, bleeding tiers, a jump Effect line);
`See Through` (1 Malice, Maneuver, Self); traits `Aquavuken`, `Pack Strong`,
`Water Weird`.

```ts
const leapUpon = FactoryLogic.feature.createAbility({
	ability: FactoryLogic.createAbility({
		id: 'water-wolf-sudden-downpour-ability-1',
		name: 'Leap Upon',
		type: FactoryLogic.type.createMain(),
		cost: 'signature',
		keywords: [ AbilityKeyword.Melee, AbilityKeyword.Strike, AbilityKeyword.Weapon ],
		distance: [ FactoryLogic.distance.createMelee(1) ],
		target: 'One creature or object',
		sections: [
			FactoryLogic.createAbilitySectionRoll(FactoryLogic.createPowerRoll({
				bonus: 2,
				tier1: '4 damage; A < 0 bleeding (save ends)',
				tier2: '6 damage; A < 1 bleeding (save ends)',
				tier3: '7 damage; A < 2 bleeding (save ends)'
			})),
			FactoryLogic.createAbilitySectionText('Effect: The downpour can jump up to 3 squares before making the strike.')
		]
	})
});

const monster = FactoryLogic.createMonster({
	id: 'water-wolf-sudden-downpour',
	name: 'Sudden Downpour',
	level: 1,
	role: FactoryLogic.createMonsterRole(MonsterOrganizationType.Horde, MonsterRoleType.Ambusher),
	keywords: [ 'Elemental', 'Water Wolf' ],
	encounterValue: 3,
	size: FactoryLogic.createSize(1, 'M'),
	speed: FactoryLogic.createSpeed(8, 'swim'),
	stamina: 15,
	stability: 2,
	freeStrikeDamage: 2,
	characteristics: FactoryLogic.createCharacteristics(2, -2, -3, 0, -2),
	features: [ leapUpon, /* traits, malice, damage modifier */ ]
});
```

The runnable version, with the malice and the group, is
`tools/author-monster.ts`. Copy it, swap the content, run it — it writes the
files and checks them in one pass.

Traits are written the same way in that file:

```ts
FactoryLogic.feature.create({
	id: 'water-wolf-sudden-downpour-feature-2',
	name: 'Aquavuken',
	description: 'The downpour ignores difficult terrain and can move on top of water as if it were solid ground.'
})
```

…and the Fire immunity:

```ts
FactoryLogic.feature.createDamageModifier({
	id: 'water-wolf-sudden-downpour-feature-5',
	modifiers: [ FactoryLogic.damageModifier.create({ damageType: DamageType.Fire, modifierType: DamageModifierType.Immunity, value: 2 }) ]
});
```

## When the card is ambiguous

Ask, or make the call and say so. Do not invent numbers. The cases that come up:

- A card whose ability omits distance or target — leave `distance: []` and
  `target: ''` rather than guessing `Melee 1`.
- Organization/role words that don't match the enums (`Troop`, `Band` are
  older spellings; `MonsterUpdateLogic` maps them to `Elite` and `Horde`).
- A malice cost on an ability printed *inside* a stat block. It is still group
  malice; put it in the group and mention that a monster-owned copy was written
  too if the card makes ownership explicit.
- Art, flavour text and lore paragraphs: monster `description` is effectively
  unused, so long lore belongs in the group's `information`, not on the monster.

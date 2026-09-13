// Model-level checks for monster files, shared by the authoring template and
// the example verifier. Everything here runs the app's own logic, so a change
// to the model that would break a shipped example breaks this too.
import fs from 'node:fs';
import { AbilityUsage } from '@/enums/ability-usage';
import { Characteristic } from '@/enums/characteristic';
import { CreatureLogic } from '@/logic/creature-logic';
import { DamageModifierType } from '@/enums/damage-modifier-type';
import { FeatureType } from '@/enums/feature-type';
import { FormatLogic } from '@/logic/format-logic';
import { MonsterLogic } from '@/logic/monster-logic';
import { MonsterUpdateLogic } from '@/logic/update/monster-update-logic';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { SourcebookUpdateLogic } from '@/logic/update/sourcebook-update-logic';
import { FactoryLogic } from '@/logic/factory-logic';
import { Monster } from '@/models/monster';
import { MonsterGroup } from '@/models/monster-group';

export class Report {
	passes: string[] = [];
	failures: string[] = [];
	warnings: string[] = [];

	ok(label: string) {
		this.passes.push(label);
	}

	fail(label: string) {
		this.failures.push(label);
	}

	warn(label: string) {
		this.warnings.push(label);
	}

	check(label: string, condition: boolean, detail = '') {
		if (condition) {
			this.ok(label);
		} else {
			this.fail(detail ? `${label}: ${detail}` : label);
		}
	}

	equal(label: string, actual: unknown, expected: unknown) {
		const a = JSON.stringify(actual);
		const e = JSON.stringify(expected);
		this.check(label, a === e, `expected ${e}, got ${a}`);
	}
}

// The five characteristics, each exactly once.
const CHARACTERISTICS = [ Characteristic.Might, Characteristic.Agility, Characteristic.Reason, Characteristic.Intuition, Characteristic.Presence ];

// Feature types a monster can hold. Malice is not among them: it belongs to the
// group, and a monster-owned malice ability only ever renders in the builder.
const MONSTER_FEATURE_TYPES: FeatureType[] = [
	FeatureType.Ability,
	FeatureType.AddOn,
	FeatureType.Bonus,
	FeatureType.CharacteristicBonus,
	FeatureType.ConditionImmunity,
	FeatureType.DamageModifier,
	FeatureType.MovementMode,
	FeatureType.Speed,
	FeatureType.Text
];

const BUILDER_ONLY_FEATURE_TYPES: FeatureType[] = [ FeatureType.Malice, FeatureType.MaliceAbility ];

const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

// Potency in monster text is always "<Characteristic> < number" (or the app's
// own <code>-wrapped form). The weak/average/strong spellings are hero-sheet
// substitutions and mean nothing on a monster. Neither pattern is global: a /g
// regex carries lastIndex between .test() calls.
const POTENCY = /[MARIP]\s*<\s*-?\d+/;
const POTENCY_ALL = /[MARIP]\s*<\s*-?\d+/g;
const HERO_POTENCY = /<\s*[[({]?(weak|average|avg|strong)[\])}]?/i;

const abilityText = (ability: { sections: { type: string, text?: string, roll?: { tier1: string, tier2: string, tier3: string } }[] }) => {
	const parts: string[] = [];
	ability.sections.forEach(section => {
		if (section.type === 'text' && section.text) {
			parts.push(section.text);
		}
		if (section.type === 'field' && (section as { effect?: string }).effect) {
			parts.push((section as { effect?: string }).effect!);
		}
		if (section.type === 'roll' && section.roll) {
			parts.push(section.roll.tier1, section.roll.tier2, section.roll.tier3);
		}
	});
	return parts.join('\n');
};

const checkAbility = (report: Report, label: string, ability: Record<string, unknown>) => {
	const name = ability.name as string;
	const usage = (ability.type as { usage?: string } | undefined)?.usage;
	report.check(`${label}: "${name}" has a usage`, (Object.values(AbilityUsage) as string[]).includes(usage || ''));
	report.check(`${label}: "${name}" has a target`, typeof ability.target === 'string' && ability.target.length > 0);

	const sections = (ability.sections || []) as { type: string, roll?: { characteristic: string[], bonus: number, tier1: string, tier2: string, tier3: string } }[];
	report.check(`${label}: "${name}" has at least one section`, sections.length > 0);

	sections.filter(s => s.type === 'roll').forEach((section, i) => {
		const roll = section.roll!;
		const hasCharacteristics = roll.characteristic.length > 0;
		const hasBonus = roll.bonus !== 0;
		const tierText = [ roll.tier1, roll.tier2, roll.tier3 ].join('\n');
		// A maneuver whose tiers are nothing but potency ("A < 1 grabbed") is
		// deliberately built with no bonus and no characteristic - official data
		// does this too (Valok's Sputter, the wardog's Portal to the Void).
		const potencyOnly = POTENCY.test(tierText);
		report.check(`${label}: "${name}" roll ${i + 1} is bonus-only, characteristic-only, or potency-only`, !(hasCharacteristics && hasBonus), 'has both a characteristic list and a bonus');
		if (!hasCharacteristics && !hasBonus) {
			if (potencyOnly) {
				report.ok(`${label}: "${name}" roll ${i + 1} is potency-only, with no attack bonus`);
			} else {
				report.warn(`${label}: "${name}" roll ${i + 1} has no characteristic, no bonus and no potency (the app will print "Power Roll + 0")`);
			}
		}
		report.check(`${label}: "${name}" roll ${i + 1} has three tiers`, [ roll.tier1, roll.tier2, roll.tier3 ].every(t => typeof t === 'string' && t.trim().length > 0));
	});

	const text = abilityText(ability as unknown as { sections: { type: string, text?: string, roll?: { tier1: string, tier2: string, tier3: string } }[] });
	if (HERO_POTENCY.test(text)) {
		report.fail(`${label}: "${name}" uses a hero potency word (weak/average/strong); monster potency is written "A < 1"`);
	}
	const potencyMatches = text.match(POTENCY_ALL) || [];
	if (potencyMatches.length > 0) {
		report.ok(`${label}: "${name}" potency markup (${potencyMatches.join(', ')})`);
	}
};

export const checkMonster = (report: Report, monster: Monster, label: string) => {
	// Element + required stats.
	report.check(`${label}: id`, typeof monster.id === 'string' && monster.id.length > 0);
	report.check(`${label}: name`, typeof monster.name === 'string' && monster.name.length > 0);
	report.check(`${label}: level 1-10`, isNumber(monster.level) && monster.level >= 1 && monster.level <= 10, `got ${monster.level}`);
	report.check(`${label}: role.organization`, typeof monster.role?.organization === 'string' && monster.role.organization.length > 0);
	report.check(`${label}: role.type`, typeof monster.role?.type === 'string' && monster.role.type.length > 0);
	report.check(`${label}: keywords is a string array`, Array.isArray(monster.keywords) && monster.keywords.every(k => typeof k === 'string'));
	report.check(`${label}: encounterValue >= 0`, isNumber(monster.encounterValue) && monster.encounterValue >= 0);
	report.check(`${label}: size`, isNumber(monster.size?.value) && monster.size.value >= 1 && [ 'T', 'S', 'M', 'L', '' ].includes(monster.size.mod));
	report.check(`${label}: speed`, isNumber(monster.speed?.value) && monster.speed.value >= 0);
	report.check(`${label}: speed.modes is an array`, Array.isArray(monster.speed?.modes) && monster.speed.modes.every(m => typeof m === 'string' && m === m.toLowerCase()), 'modes must be lowercase, e.g. [ "swim" ]');
	report.check(`${label}: stamina >= 0`, isNumber(monster.stamina) && monster.stamina >= 0);
	report.check(`${label}: stability >= 0`, isNumber(monster.stability) && monster.stability >= 0);
	report.check(`${label}: freeStrikeDamage >= 0`, isNumber(monster.freeStrikeDamage) && monster.freeStrikeDamage >= 0);
	report.check(`${label}: features is an array`, Array.isArray(monster.features));

	const named = monster.characteristics?.map(c => c.characteristic) || [];
	report.equal(`${label}: characteristics are the five, in order`, named, CHARACTERISTICS);
	report.check(`${label}: characteristics are numbers`, (monster.characteristics || []).every(c => isNumber(c.value)));

	// Fields the migration backfills. Present is better: the file then reads
	// correctly in the builder before any load-time fixup.
	[ 'picture', 'freeStrikeType' ].forEach(field => {
		if ((monster as unknown as Record<string, unknown>)[field] === undefined) {
			report.warn(`${label}: ${field} is missing (MonsterUpdateLogic backfills it)`);
		}
	});
	if (monster.state === undefined) {
		report.warn(`${label}: state is missing (MonsterUpdateLogic backfills it)`);
	}

	// Ids: unique across features, and unique across elements in a group file.
	const featureIds = monster.features.map(f => f.id);
	report.check(`${label}: feature ids are unique`, featureIds.length === new Set(featureIds).size);
	monster.features.forEach(f => report.check(`${label}: feature "${f.name || f.id}" has an id`, typeof f.id === 'string' && f.id.length > 0));

	// Feature types, and the ones that render nowhere in play.
	monster.features.forEach(f => {
		if (![ ...MONSTER_FEATURE_TYPES, ...BUILDER_ONLY_FEATURE_TYPES ].includes(f.type)) {
			report.warn(`${label}: feature "${f.name}" is a ${f.type}, which a monster does not normally hold`);
		}
		if (BUILDER_ONLY_FEATURE_TYPES.includes(f.type)) {
			report.warn(`${label}: malice "${f.name}" is owned by the monster, so it renders in the builder only - the group's malice list is what the GM sees and can spend`);
		}
	});

	// Echelon gates malice by the monster's own level - owned or grouped - so a
	// feature above this monster's echelon is wrong even while it renders
	// nowhere.
	const monsterEchelon = CreatureLogic.getEchelon(monster.level);
	monster.features.filter(f => BUILDER_ONLY_FEATURE_TYPES.includes(f.type)).forEach(f => {
		const echelon = f.data?.echelon;
		report.check(`${label}: malice "${f.name}" has echelon >= 1`, isNumber(echelon) && echelon >= 1, `got ${echelon}`);
		report.check(`${label}: malice "${f.name}" echelon is within this monster's echelon`, isNumber(echelon) && echelon <= monsterEchelon, `echelon ${echelon} > monster echelon ${monsterEchelon}`);
	});

	const abilityFeatures = monster.features.filter(f => f.type === FeatureType.Ability);
	abilityFeatures.forEach(f => checkAbility(report, label, f.data.ability as unknown as Record<string, unknown>));

	monster.features.filter(f => f.type === FeatureType.DamageModifier).forEach(f => {
		const modifiers = f.data.modifiers;
		report.check(`${label}: damage modifier "${f.name}" has modifiers`, Array.isArray(modifiers) && modifiers.length > 0);
		modifiers.forEach(m => {
			report.check(`${label}: damage modifier is Immunity/Weakness`, [ DamageModifierType.Immunity, DamageModifierType.Weakness ].includes(m.type));
			report.check(`${label}: damage modifier value is a number`, isNumber(m.value));
		});
	});

	monster.features.filter(f => f.type === FeatureType.Text).forEach(f => {
		if (!f.description || f.description.trim().length === 0) {
			report.warn(`${label}: trait "${f.name}" has an empty description`);
		}
	});

	// The migration pass the app runs on every load.
	MonsterUpdateLogic.updateMonster(monster);
	report.ok(`${label}: survives MonsterUpdateLogic.updateMonster`);

	// Accessors the stat block depends on - if one of these throws, the panel is
	// broken for this monster.
	report.check(`${label}: getStamina`, isNumber(MonsterLogic.getStamina(monster)));
	report.check(`${label}: getStability`, isNumber(MonsterLogic.getStability(monster)));
	report.check(`${label}: getFreeStrikeDamage`, isNumber(MonsterLogic.getFreeStrikeDamage(monster)));
	report.check(`${label}: getSpeed`, isNumber(MonsterLogic.getSpeed(monster).value));
	report.check(`${label}: getCombatState`, [ 'healthy', 'injured', 'winded', 'dead' ].includes(MonsterLogic.getCombatState(monster)));
	CHARACTERISTICS.forEach(ch => report.check(`${label}: getCharacteristic(${ch})`, isNumber(MonsterLogic.getCharacteristic(monster, ch))));
	report.check(`${label}: getDamageModifiers`, Array.isArray(MonsterLogic.getDamageModifiers(monster)));
	report.check(`${label}: getConditionImmunities`, Array.isArray(MonsterLogic.getConditionImmunities(monster)));
	report.check(`${label}: getMonsterDescription`, typeof MonsterLogic.getMonsterDescription(monster) === 'string' && MonsterLogic.getMonsterDescription(monster).includes(`Level ${monster.level}`));
	report.check(`${label}: FormatLogic.getSize`, /^(\d+|1[TSML])$/.test(FormatLogic.getSize(monster.size)));
	report.check(`${label}: FormatLogic.getSpeedModes`, typeof FormatLogic.getSpeedModes(monster.speed.modes) === 'string');
};

export const checkGroup = (report: Report, group: MonsterGroup, label: string) => {
	report.check(`${label}: id`, typeof group.id === 'string' && group.id.length > 0);
	report.check(`${label}: name`, typeof group.name === 'string' && group.name.length > 0);
	report.check(`${label}: monsters is a non-empty array`, Array.isArray(group.monsters) && group.monsters.length > 0);
	report.check(`${label}: malice is an array`, Array.isArray(group.malice));
	report.check(`${label}: information is an array`, Array.isArray(group.information));
	report.check(`${label}: addOns is an array`, Array.isArray(group.addOns));

	const elementIds = [ group.id, ...group.monsters.map(m => m.id) ];
	report.check(`${label}: group and monster ids are unique`, elementIds.length === new Set(elementIds).size);

	// Malice: only Malice and Malice Ability render, and echelon gates listing.
	const maxEchelon = Math.max(1, ...group.monsters.map(m => CreatureLogic.getEchelon(m.level)));
	group.malice.forEach(m => {
		report.check(`${label}: malice "${m.name}" is Malice or Malice Ability`, BUILDER_ONLY_FEATURE_TYPES.includes(m.type), `got ${m.type}`);
		const echelon = m.type === FeatureType.MaliceAbility ? m.data.echelon : m.type === FeatureType.Malice ? m.data.echelon : undefined;
		const cost = m.type === FeatureType.MaliceAbility ? m.data.ability.cost : m.type === FeatureType.Malice ? m.data.cost : undefined;
		report.check(`${label}: malice "${m.name}" has echelon >= 1`, isNumber(echelon) && echelon! >= 1);
		report.check(`${label}: malice "${m.name}" is listed at this group's echelon`, isNumber(echelon) && echelon! <= maxEchelon, `echelon ${echelon} > monster echelon ${maxEchelon}`);
		report.check(`${label}: malice "${m.name}" costs at least 1 malice`, isNumber(cost) && (cost as number) >= 1);
		if (m.type === FeatureType.MaliceAbility) {
			checkAbility(report, label, m.data.ability as unknown as Record<string, unknown>);
			report.check(`${label}: malice "${m.name}" has a Maneuver/Main Action usage`, [ AbilityUsage.Maneuver, AbilityUsage.MainAction, AbilityUsage.Trigger, AbilityUsage.FreeStrike ].includes(m.data.ability.type.usage));
		}
	});

	group.monsters.forEach(m => checkMonster(report, m, `${label} / ${m.name}`));

	MonsterUpdateLogic.updateMonsterGroup(group);
	group.monsters.forEach(MonsterUpdateLogic.updateMonster);
	report.ok(`${label}: survives MonsterUpdateLogic.updateMonsterGroup`);

	// What the GM's Malice tab will offer for a monster in this group.
	const sample = group.monsters[0];
	const offered = MonsterLogic.getMaliceOptions(sample, group).map(m => m.name);
	group.malice.forEach(m => {
		report.check(`${label}: "${m.name}" is offered to the GM for ${sample.name}`, offered.includes(m.name));
	});

	// The full load path, into a homebrew sourcebook.
	const sourcebook = FactoryLogic.createSourcebook();
	sourcebook.name = 'Skill Check';
	sourcebook.monsterGroups.push(group);
	SourcebookUpdateLogic.updateSourcebook(sourcebook);
	const served = SourcebookLogic.getSourcebooks([ sourcebook ]);
	report.check(`${label}: sourcebook serves the group`, SourcebookLogic.getMonsterGroups(served).some(g => g.name === group.name));
};

export const checkFile = (report: Report, path: string) => {
	const label = path.split('/').pop()!;
	let parsed: unknown;
	try {
		parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
	} catch (error) {
		report.fail(`${label}: does not parse as JSON (${(error as Error).message})`);
		return;
	}

	if (path.endsWith('.ds-monster') || path.endsWith('.drawsteel-monster')) {
		checkMonster(report, parsed as Monster, label);
	} else if (path.endsWith('.ds-monster-group') || path.endsWith('.drawsteel-monster-group')) {
		checkGroup(report, parsed as MonsterGroup, label);
	} else {
		report.fail(`${label}: unknown extension (expected .ds-monster or .ds-monster-group)`);
	}
};

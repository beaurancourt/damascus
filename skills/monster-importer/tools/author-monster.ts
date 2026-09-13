// Authoring template for a monster file.
//
// Copy this file somewhere outside skills/ (tmp/ is the convention for
// throwaway work), swap the content in the `Build` section for whatever the
// stat block says, then run:
//
//   node scripts/monster-tools.mjs run tmp/your-monster.ts --out .
//
// It writes `<name>.ds-monster` and `<name>.ds-monster-group` with the app's own
// serializer, reads them back off disk, and runs every check on those bytes -
// so what passes is the file, not the objects in memory.
//
// This file is also the shipped example: regenerating it is how the files in
// skills/monster-importer/reference/examples/ stay honest.
import fs from 'node:fs';
import path from 'node:path';
import { AbilityKeyword } from '@/enums/ability-keyword';
import { DamageModifierType } from '@/enums/damage-modifier-type';
import { DamageType } from '@/enums/damage-type';
import { FactoryLogic } from '@/logic/factory-logic';
import { MonsterGroup } from '@/models/monster-group';
import { MonsterLogic } from '@/logic/monster-logic';
import { MonsterOrganizationType } from '@/enums/monster-organization-type';
import { MonsterRoleType } from '@/enums/monster-role-type';
import { Report, checkFile } from '@skill/monster-checks';
import { checkGroupEntryRenders, checkRendersInRunner, checkStatBlockRenders, installDomShims } from '@skill/render-checks';

// #region Build

// Leap Upon - signature main action. A monster attack is a bonus-only power
// roll: `bonus: 2` with no characteristic. The app prints "Power Roll + 2".
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

// See Through is malice. It is written twice on purpose: the group's copy is
// the one the GM is offered and can spend, and the monster's own copy records
// that this monster is where the ability comes from (the builder shows it, the
// stat block and the runner do not). The two need distinct ids.
const createSeeThrough = (id: string) => FactoryLogic.feature.createMaliceAbility({
	ability: FactoryLogic.createAbility({
		id: id,
		name: 'See Through',
		type: FactoryLogic.type.createManeuver(),
		cost: 1,
		distance: [ FactoryLogic.distance.createSelf() ],
		target: 'Self',
		sections: [
			FactoryLogic.createAbilitySectionText('The downpour turns invisible until the end of their turn. This effect ends early if the downpour takes damage or uses an ability.')
		]
	})
});

const traits = [
	FactoryLogic.feature.create({
		id: 'water-wolf-sudden-downpour-feature-2',
		name: 'Aquavuken',
		description: 'The downpour ignores difficult terrain and can move on top of water as if it were solid ground.'
	}),
	FactoryLogic.feature.create({
		id: 'water-wolf-sudden-downpour-feature-3',
		name: 'Pack Strong',
		description: 'While adjacent to any ally, the downpour can’t be flanked or made frightened.'
	}),
	FactoryLogic.feature.create({
		id: 'water-wolf-sudden-downpour-feature-4',
		name: 'Water Weird',
		description: 'Once on their turn as a free maneuver, the downpour can enter an adjacent body of water and reappear in an unoccupied space adjacent to another body of water within 5 squares. Any other water elemental can be treated as a body of water for the purpose of using this ability.'
	})
];

const fireImmunity = FactoryLogic.feature.createDamageModifier({
	id: 'water-wolf-sudden-downpour-feature-5',
	modifiers: [ FactoryLogic.damageModifier.create({ damageType: DamageType.Fire, modifierType: DamageModifierType.Immunity, value: 2 }) ]
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
	// Card order: the signature ability, its own malice ability, then the traits.
	features: [ leapUpon, createSeeThrough('water-wolf-sudden-downpour-malice-1'), ...traits, fireImmunity ]
});

const group: MonsterGroup = {
	id: 'water-wolf',
	name: 'Water Wolf',
	description: '',
	picture: null,
	information: [],
	malice: [ createSeeThrough('water-wolf-malice-1') ],
	monsters: [ monster ],
	addOns: []
};

// #endregion

// #region Write - the serializer Utils.saveFile uses

const arg = (name: string, fallback: string) => {
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const outDir = path.resolve(arg('out', 'tmp/monster-files'));

const save = (name: string, object: unknown, extension: string) => {
	const json = JSON.stringify(object, null, '\t');
	const file = path.join(outDir, `${name}.ds-${extension}`);
	fs.mkdirSync(outDir, { recursive: true });
	fs.writeFileSync(file, json);
	console.log(`wrote ${file} (${json.length} bytes)`);
	return file;
};

save(monster.name, monster, 'monster');
save(group.name, group, 'monster-group');

// #endregion

// #region Check the bytes that were written

installDomShims();
const report = new Report();
checkFile(report, path.join(outDir, `${monster.name}.ds-monster`));
checkFile(report, path.join(outDir, `${group.name}.ds-monster-group`));

const writtenMonster = JSON.parse(fs.readFileSync(path.join(outDir, `${monster.name}.ds-monster`), 'utf8'));
const writtenGroup = JSON.parse(fs.readFileSync(path.join(outDir, `${group.name}.ds-monster-group`), 'utf8'));
checkStatBlockRenders(report, writtenMonster, writtenGroup, monster.name);
checkGroupEntryRenders(report, writtenGroup, group.name);
checkRendersInRunner(report, writtenGroup, group.name);

// #endregion

console.log(`\n${report.passes.length} checks passed`);
report.warnings.forEach(w => console.log(`  warn ${w}`));
if (report.failures.length > 0) {
	console.error(`\n${report.failures.length} check(s) failed:`);
	report.failures.forEach(f => console.error(`  FAIL ${f}`));
	process.exit(1);
}

if (writtenMonster.name !== writtenGroup.monsters[0].name) {
	console.error(`\nFAIL the group does not contain ${monster.name}`);
	process.exit(1);
}

console.log(`\n${MonsterLogic.getMonsterDescription(writtenMonster)} · ${writtenMonster.keywords.join(', ')} · EV ${writtenMonster.encounterValue}`);
console.log('ok');

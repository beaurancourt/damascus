import { describe, expect, test } from 'vitest';
import { Encounter } from '@/models/encounter';
import { EncounterLogic } from '@/logic/encounter-logic';
import { FactoryLogic } from '@/logic/factory-logic';
import { Hero } from '@/models/hero';
import { Monster } from '@/models/monster';
import { Options } from '@/models/options';
import { SessionLogic } from '@/logic/session-logic';
import { SourcebookLogic } from '@/logic/sourcebook-logic';

const sourcebooks = SourcebookLogic.getSourcebooks();
const options = { party: '' } as Options;

const buildEncounter = (groups: { monsterID: string, count: number }[][]) => {
	const encounter: Encounter = FactoryLogic.createEncounter();
	encounter.groups = groups.map(slots => {
		const group = FactoryLogic.createEncounterGroup();
		group.slots = slots.map(s => {
			const slot = FactoryLogic.createEncounterSlot(s.monsterID);
			slot.count = s.count;
			return slot;
		});
		return group;
	});
	return encounter;
};

const namesIn = (encounter: Encounter, groupIndex: number) =>
	encounter.groups[groupIndex].slots.flatMap(s => s.monsters).map(m => m.name);

describe('startEncounter monster numbering', () => {
	test('numbers run across the group rather than restarting per monster type', () => {
		// Goblin Warrior x1 and Goblin Assassin x2, in one group.
		const encounter = buildEncounter([ [ { monsterID: 'goblin-9', count: 1 }, { monsterID: 'goblin-5', count: 2 } ] ]);

		const result = SessionLogic.startEncounter(encounter, sourcebooks, [] as Hero[], options);

		expect(namesIn(result, 0)).toEqual([ '[1] Goblin Warrior', '[2] Goblin Assassin', '[3] Goblin Assassin' ]);
	});

	test('a group holding a single monster gets no number', () => {
		const encounter = buildEncounter([ [ { monsterID: 'goblin-9', count: 1 } ] ]);

		const result = SessionLogic.startEncounter(encounter, sourcebooks, [] as Hero[], options);

		expect(namesIn(result, 0)).toEqual([ 'Goblin Warrior' ]);
	});

	test('renumbering a group closes the gap when a monster is removed', () => {
		const group = FactoryLogic.createEncounterGroup();
		const slot = FactoryLogic.createEncounterSlot('goblin-9');
		slot.monsters = [
			{ id: 'a', name: 'Goblin Warrior' } as Monster,
			{ id: 'b', name: 'Goblin Warrior' } as Monster,
			{ id: 'c', name: 'Goblin Warrior' } as Monster
		];
		group.slots = [ slot ];

		EncounterLogic.renumberGroup(group);
		expect(slot.monsters.map(m => m.name)).toEqual([ '[1] Goblin Warrior', '[2] Goblin Warrior', '[3] Goblin Warrior' ]);

		// Drop the middle one; the survivors renumber 1, 2 rather than 1, 3.
		slot.monsters = slot.monsters.filter(m => m.id !== 'b');
		EncounterLogic.renumberGroup(group);
		expect(slot.monsters.map(m => m.name)).toEqual([ '[1] Goblin Warrior', '[2] Goblin Warrior' ]);
	});

	test('renumbering strips the older "Goblin 1" suffix instead of stacking', () => {
		const group = FactoryLogic.createEncounterGroup();
		const slot = FactoryLogic.createEncounterSlot('goblin-9');
		slot.monsters = [
			{ id: 'a', name: 'Goblin Warrior 1' } as Monster,
			{ id: 'b', name: 'Goblin Warrior 2' } as Monster
		];
		group.slots = [ slot ];

		EncounterLogic.renumberGroup(group);

		expect(slot.monsters.map(m => m.name)).toEqual([ '[1] Goblin Warrior', '[2] Goblin Warrior' ]);
	});

	test('each group starts its own count at 1', () => {
		const encounter = buildEncounter([
			[ { monsterID: 'goblin-9', count: 2 } ],
			[ { monsterID: 'goblin-5', count: 2 } ]
		]);

		const result = SessionLogic.startEncounter(encounter, sourcebooks, [] as Hero[], options);

		expect(namesIn(result, 0)).toEqual([ '[1] Goblin Warrior', '[2] Goblin Warrior' ]);
		expect(namesIn(result, 1)).toEqual([ '[1] Goblin Assassin', '[2] Goblin Assassin' ]);
	});
});

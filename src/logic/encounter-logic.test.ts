import { FeatureMalice, FeatureMaliceAbility } from '@/models/feature';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Encounter } from '@/models/encounter';
import { EncounterLogic } from '@/logic/encounter-logic';
import { EncounterSlot } from '@/models/encounter-slot';
import { FactoryLogic } from '@/logic/factory-logic';
import { MonsterData } from '@/data/monster-data';
import { MonsterGroup } from '@/models/monster-group';

describe('getAllMaliceFeatures', () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	test('returns the basic malice features', () => {
		const encounter = {} as Encounter;
		vi.spyOn(EncounterLogic, 'getMonsterGroups').mockReturnValue([]);

		const result = EncounterLogic.getAllMaliceFeatures(encounter, []);

		expect(result.length).toBe(1);
		MonsterData.malice.forEach(malice => {
			expect(result[0].features).toContain(malice);
		});
	});

	test('returns relevant monster group malice features', () => {
		const encounter = {} as Encounter;
		const malice1 = { id: 'fake-1' } as FeatureMalice;
		const malice2 = { id: 'fake-2' } as FeatureMaliceAbility;
		const group1 = { name: 'testGroup', malice: [ malice1, malice2 ] } as MonsterGroup;
		vi.spyOn(EncounterLogic, 'getMonsterGroups').mockReturnValue([
			group1
		]);

		const result = EncounterLogic.getAllMaliceFeatures(encounter, []);
		expect(result.length).toBe(2);
		const resultGroup = result.find(g => g.group === 'testGroup');
		expect(resultGroup?.features).toContain(malice1);
		expect(resultGroup?.features).toContain(malice2);
	});
});

describe('group names', () => {
	const buildEncounter = () => {
		const encounter = FactoryLogic.createEncounter();
		[ 'first', 'second', 'third' ].forEach(name => {
			const group = FactoryLogic.createEncounterGroup();
			const slot = FactoryLogic.createEncounterSlot('fake-monster');
			slot.monsters = [ { id: `monster-${name}`, name } ] as EncounterSlot['monsters'];
			group.slots = [ slot ];
			encounter.groups.push(group);
		});
		return encounter;
	};

	test('pinning names the groups in order and leaves named ones alone', () => {
		const encounter = buildEncounter();
		encounter.groups[1].name = 'Boss Room';

		EncounterLogic.pinGroupNames(encounter);

		expect(encounter.groups.map(g => g.name)).toEqual([ 'Red', 'Boss Room', 'Orange' ]);
	});

	test('pinning twice does not rename anything', () => {
		const encounter = buildEncounter();
		EncounterLogic.pinGroupNames(encounter);
		const before = encounter.groups.map(g => g.name);

		EncounterLogic.pinGroupNames(encounter);

		expect(encounter.groups.map(g => g.name)).toEqual(before);
	});

	test('a freed colour goes to the next new group, not to an existing one', () => {
		const encounter = buildEncounter();
		EncounterLogic.pinGroupNames(encounter);
		encounter.groups = encounter.groups.filter(g => g.name !== 'Red');

		expect(EncounterLogic.getUnusedGroupName(encounter.groups.map(g => g.name))).toBe('Red');
		expect(encounter.groups.map(g => g.name)).toEqual([ 'Orange', 'Yellow' ]);
	});

	test('removing a group leaves the survivors named as they were', () => {
		const encounter = buildEncounter();
		EncounterLogic.pinGroupNames(encounter);
		const survivors = encounter.groups.slice(1).map(g => g.id);

		encounter.groups = encounter.groups.filter(g => g.id !== encounter.groups[0].id);

		expect(encounter.groups.map(g => g.id)).toEqual(survivors);
		expect(encounter.groups.map(g => g.name)).toEqual([ 'Orange', 'Yellow' ]);
	});

	test('a group name does not change when its monsters are removed', () => {
		const encounter = buildEncounter();
		EncounterLogic.pinGroupNames(encounter);
		const group = encounter.groups[0];

		const before = EncounterLogic.getGroupName(group, encounter);
		group.slots[0].monsters = [];
		group.slots = [];

		expect(before).toBe('Red');
		expect(EncounterLogic.getGroupName(group, encounter)).toBe('Red');
	});
});

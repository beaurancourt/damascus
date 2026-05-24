import { afterEach, describe, expect, test, vi } from 'vitest';
import { EncounterYamlLogic } from './encounter-yaml';
import { Monster } from '@/models/monster';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from './sourcebook-logic';

const fakeMonsters = [
	{ id: 'goblin-9' } as Monster,
	{ id: 'goblin-10' } as Monster,
	{ id: 'goblin-6' } as Monster,
	{ id: 'dragon-thorn-1' } as Monster
];

const fakeSourcebooks: Sourcebook[] = [];

describe('EncounterYamlLogic.parse', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const mockMonsters = () => {
		vi.spyOn(SourcebookLogic, 'getMonsters').mockReturnValue(fakeMonsters);
	};

	test('parses a minimal valid encounter', () => {
		mockMonsters();
		const yaml = `name: Test\ngroups:\n  - name: One\n    slots:\n      - monster: goblin-9\n`;
		const result = EncounterYamlLogic.parse(yaml, fakeSourcebooks);
		expect(result.issues.filter(i => i.severity === 'error')).toEqual([]);
		expect(result.encounter).not.toBeNull();
		expect(result.encounter!.name).toBe('Test');
		expect(result.encounter!.groups).toHaveLength(1);
		expect(result.encounter!.groups[0].slots).toHaveLength(1);
		expect(result.encounter!.groups[0].slots[0].monsterID).toBe('goblin-9');
		expect(result.encounter!.groups[0].slots[0].count).toBe(1);
	});

	test('errors on missing name', () => {
		mockMonsters();
		const result = EncounterYamlLogic.parse(`groups:\n  - name: g\n    slots:\n      - monster: goblin-9\n`, fakeSourcebooks);
		expect(result.encounter).toBeNull();
		expect(result.issues.some(i => i.severity === 'error' && i.path === '$.name')).toBe(true);
	});

	test('errors on unknown monster id', () => {
		mockMonsters();
		const yaml = `name: T\ngroups:\n  - name: g\n    slots:\n      - monster: not-a-real-id\n`;
		const result = EncounterYamlLogic.parse(yaml, fakeSourcebooks);
		expect(result.encounter).toBeNull();
		expect(result.issues.some(i => i.message.includes('not-a-real-id'))).toBe(true);
	});

	test('errors on reserved keys', () => {
		mockMonsters();
		const yaml = `name: T\nid: bad\ngroups:\n  - name: g\n    slots:\n      - monster: goblin-9\n`;
		const result = EncounterYamlLogic.parse(yaml, fakeSourcebooks);
		expect(result.issues.some(i => i.severity === 'error' && i.path === '$.id')).toBe(true);
	});

	test('warns on unknown keys but still parses', () => {
		mockMonsters();
		const yaml = `name: T\nweirdkey: 1\ngroups:\n  - name: g\n    slots:\n      - monster: goblin-9\n        nonsense: 1\n`;
		const result = EncounterYamlLogic.parse(yaml, fakeSourcebooks);
		expect(result.encounter).not.toBeNull();
		const warnings = result.issues.filter(i => i.severity === 'warning');
		expect(warnings.length).toBeGreaterThanOrEqual(2);
	});

	test('honours customization aliases (level, solo, minions)', () => {
		mockMonsters();
		const yaml = `name: T\ngroups:\n  - name: g\n    slots:\n      - monster: goblin-9\n        count: 3\n        level: 2\n        solo: true\n        minions: 4\n`;
		const result = EncounterYamlLogic.parse(yaml, fakeSourcebooks);
		expect(result.encounter).not.toBeNull();
		const slot = result.encounter!.groups[0].slots[0];
		expect(slot.count).toBe(3);
		expect(slot.customization.levelAdjustment).toBe(2);
		expect(slot.customization.convertToSolo).toBe(true);
		expect(slot.customization.minionCountAdjustment).toBe(4);
	});

	test('applies tactics, ending, and extra sections to notes', () => {
		mockMonsters();
		const yaml = [
			'name: T',
			'groups:',
			'  - name: g',
			'    slots:',
			'      - monster: goblin-9',
			'notes:',
			'  tactics: Hit and run',
			'  ending: They flee',
			'sections:',
			'  - title: Terrain',
			'    body: Mist'
		].join('\n');
		const result = EncounterYamlLogic.parse(yaml, fakeSourcebooks);
		expect(result.encounter).not.toBeNull();
		const notes = result.encounter!.notes;
		expect(notes[0].name).toBe('Tactics');
		expect(notes[0].description).toBe('Hit and run');
		expect(notes[1].name).toBe('Ending the Encounter');
		expect(notes[1].description).toBe('They flee');
		expect(notes.find(n => n.name === 'Terrain')?.description).toBe('Mist');
	});

	test('rejects malformed YAML with a parse error', () => {
		mockMonsters();
		const result = EncounterYamlLogic.parse('name: T\n  bad indent: [', fakeSourcebooks);
		expect(result.encounter).toBeNull();
		expect(result.issues[0].severity).toBe('error');
		expect(result.issues[0].message).toMatch(/YAML/);
	});
});

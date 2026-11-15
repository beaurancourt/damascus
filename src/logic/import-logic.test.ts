import { createBackupBundle, parseImportEntries, parseImportText, selectNewItems } from './import-logic';
import { describe, expect, it } from 'vitest';
import { FactoryLogic } from '@/logic/factory-logic';
import { Hero } from '@/models/hero';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookData } from '@/data/sourcebook-data';

function makeHero(name: string): Hero {
	const hero = FactoryLogic.createHero([ SourcebookData.core.id ]);
	hero.name = name;
	return hero;
}

function makeSourcebook(name: string): Sourcebook {
	const sourcebook = FactoryLogic.createSourcebook();
	sourcebook.name = name;
	return sourcebook;
}

describe('parseImportText', () => {
	it('accepts an exported hero and keeps its id', () => {
		const hero = makeHero('Aria');
		const parsed = parseImportText(JSON.stringify(hero), 'aria.ds-hero');

		expect(parsed.heroes).toHaveLength(1);
		expect(parsed.heroes[0].id).toBe(hero.id);
		expect(parsed.heroes[0].name).toBe('Aria');
		expect(parsed.sourcebooks).toHaveLength(0);
	});

	it('accepts an exported sourcebook', () => {
		const sourcebook = makeSourcebook('The Ashen Coast');
		const parsed = parseImportText(JSON.stringify(sourcebook), 'ashen-coast.ds-sourcebook');

		expect(parsed.sourcebooks).toHaveLength(1);
		expect(parsed.sourcebooks[0].id).toBe(sourcebook.id);
		expect(parsed.sourcebooks[0].name).toBe('The Ashen Coast');
		expect(parsed.heroes).toHaveLength(0);
	});

	it('accepts a whole-roster backup bundle', () => {
		const hero = makeHero('Aria');
		const sourcebook = makeSourcebook('The Ashen Coast');
		const parsed = parseImportText(JSON.stringify(createBackupBundle([ hero ], [ sourcebook ])), 'damascus-backup.json');

		expect(parsed.heroes).toHaveLength(1);
		expect(parsed.sourcebooks).toHaveLength(1);
		expect(parsed.heroes[0].id).toBe(hero.id);
		expect(parsed.sourcebooks[0].id).toBe(sourcebook.id);
	});

	it('rejects invalid JSON with the file name', () => {
		expect(() => parseImportText('{', 'broken.json')).toThrow(/broken\.json: not valid JSON/);
	});

	it('rejects unrelated JSON', () => {
		expect(() => parseImportText(JSON.stringify({ hello: 'world' }), 'notes.json')).toThrow(/notes\.json is not a Damascus hero, sourcebook, or backup file/);
	});

	it('rejects a hero-shaped object without its required fields', () => {
		const hero = makeHero('Aria');
		expect(() => parseImportText(JSON.stringify({ ...hero, state: null }), 'aria.json')).toThrow(/not a Damascus hero/);
		expect(() => parseImportText(JSON.stringify({ ...hero, features: undefined }), 'aria.json')).toThrow(/not a Damascus hero/);
	});

	it('rejects a sourcebook-shaped object without element lists', () => {
		expect(() => parseImportText(JSON.stringify({ id: 'sb-1', name: 'Empty', type: 'homebrew' }), 'empty.json')).toThrow(/not a Damascus sourcebook/);
	});

	it('rejects a backup with a non-array roster', () => {
		expect(() => parseImportText(JSON.stringify({ format: 'damascus-backup', version: 1, heroes: {}, sourcebooks: [] }), 'bundle.json')).toThrow(/expected heroes and sourcebooks arrays/);
	});

	it('rejects an unsupported backup version', () => {
		expect(() => parseImportText(JSON.stringify({ format: 'damascus-backup', version: 99, heroes: [], sourcebooks: [] }), 'bundle.json')).toThrow(/unsupported backup version 99/);
	});
});

describe('parseImportEntries', () => {
	it('aggregates files and collapses duplicate ids, first file wins', () => {
		const hero = makeHero('Aria');
		const sourcebook = makeSourcebook('The Ashen Coast');
		const parsed = parseImportEntries([
			{ name: 'bundle.json', text: JSON.stringify(createBackupBundle([ hero ], [ sourcebook ])) },
			{ name: 'aria.ds-hero', text: JSON.stringify({ ...hero, name: 'Aria the Second' }) },
			{ name: 'ashen.ds-sourcebook', text: JSON.stringify(sourcebook) }
		]);

		expect(parsed.heroes).toHaveLength(1);
		expect(parsed.heroes[0].name).toBe('Aria');
		expect(parsed.sourcebooks).toHaveLength(1);
		expect(parsed.duplicateHeroes).toBe(1);
		expect(parsed.duplicateSourcebooks).toBe(1);
	});

	it('rejects the whole selection when one file is invalid', () => {
		const hero = makeHero('Aria');
		expect(() => parseImportEntries([
			{ name: 'aria.ds-hero', text: JSON.stringify(hero) },
			{ name: 'broken.json', text: 'not json' }
		])).toThrow(/broken\.json: not valid JSON/);
	});
});

describe('selectNewItems', () => {
	it('skips ids already on the device and reports the counts', () => {
		const existingHero = makeHero('Existing');
		const newHero = makeHero('New');
		const existingSourcebook = makeSourcebook('Existing Sourcebook');
		const newSourcebook = makeSourcebook('New Sourcebook');

		const selection = selectNewItems(
			{ heroes: [ existingHero, newHero ], sourcebooks: [ existingSourcebook, newSourcebook ] },
			new Set([ existingHero.id ]),
			new Set([ existingSourcebook.id ])
		);

		expect(selection.heroes.map(h => h.id)).toEqual([ newHero.id ]);
		expect(selection.sourcebooks.map(sb => sb.id)).toEqual([ newSourcebook.id ]);
		expect(selection.skippedHeroes).toBe(1);
		expect(selection.skippedSourcebooks).toBe(1);
	});

	it('is a no-op when the same files are imported again', () => {
		const hero = makeHero('Aria');
		const sourcebook = makeSourcebook('The Ashen Coast');
		const selection = selectNewItems(
			{ heroes: [ hero ], sourcebooks: [ sourcebook ] },
			new Set([ hero.id ]),
			new Set([ sourcebook.id ])
		);

		expect(selection.heroes).toHaveLength(0);
		expect(selection.sourcebooks).toHaveLength(0);
		expect(selection.skippedHeroes).toBe(1);
		expect(selection.skippedSourcebooks).toBe(1);
	});
});

describe('backup round trip', () => {
	it('reads back exactly the heroes and sourcebooks that were exported', () => {
		const hero = makeHero('Aria');
		const sourcebook = makeSourcebook('The Ashen Coast');
		const bundle = createBackupBundle([ hero ], [ sourcebook ]);
		const parsed = parseImportText(JSON.stringify(bundle), 'damascus-backup.json');

		expect(parsed.heroes).toEqual([ hero ]);
		expect(parsed.sourcebooks).toEqual([ sourcebook ]);
	});
});

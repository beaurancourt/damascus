import { Hero } from '@/models/hero';
import { Sourcebook } from '@/models/sourcebook';

export const BACKUP_FORMAT = 'damascus-backup';
export const BACKUP_VERSION = 1;

export interface BackupBundle {
	format: typeof BACKUP_FORMAT;
	version: number;
	exportedAt: string;
	heroes: Hero[];
	sourcebooks: Sourcebook[];
}

export interface ImportData {
	heroes: Hero[];
	sourcebooks: Sourcebook[];
}

export interface ParsedImport extends ImportData {
	// Entries with the same id across the selected files were collapsed; the
	// first file wins. Re-importing a file remains a no-op.
	duplicateHeroes: number;
	duplicateSourcebooks: number;
}

export interface ImportSelection extends ImportData {
	skippedHeroes: number;
	skippedSourcebooks: number;
}

export interface ImportOutcome {
	importedHeroes: number;
	importedSourcebooks: number;
	skippedHeroes: number;
	skippedSourcebooks: number;
	missingSourcebookIDs: string[];
}

// The current Sourcebook model's element lists. A sourcebook file carries all
// of them (most empty); requiring at least one separates it from an arbitrary
// object that happens to have an id, a name and a type.
const SOURCEBOOK_COLLECTIONS = [
	'adventures',
	'ancestries',
	'careers',
	'classes',
	'complications',
	'cultures',
	'domains',
	'encounters',
	'imbuements',
	'items',
	'kits',
	'monsterGroups',
	'montages',
	'negotiations',
	'perks',
	'projects',
	'subclasses',
	'terrain',
	'titles',
	'skills',
	'languages'
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return (typeof value === 'object') && (value !== null) && !Array.isArray(value);
}

function isHeroShape(value: Record<string, unknown>): boolean {
	return (typeof value.id === 'string')
		&& (typeof value.name === 'string')
		&& Array.isArray(value.features)
		&& isRecord(value.state)
		&& Array.isArray(value.abilityCustomizations);
}

function looksLikeSourcebook(value: Record<string, unknown>): boolean {
	return (typeof value.id === 'string')
		&& (typeof value.name === 'string')
		&& (typeof value.type === 'string');
}

function isSourcebookShape(value: Record<string, unknown>): boolean {
	return looksLikeSourcebook(value)
		&& SOURCEBOOK_COLLECTIONS.some(key => Array.isArray(value[key]));
}

function assertHero(value: unknown, label: string): Hero {
	if (!isRecord(value) || !isHeroShape(value)) {
		throw new Error(`${label} is not a Damascus hero: expected an id, a name, a features array, a state object and an abilityCustomizations array.`);
	}
	return value as unknown as Hero;
}

function assertSourcebook(value: unknown, label: string): Sourcebook {
	if (!isRecord(value) || !isSourcebookShape(value)) {
		throw new Error(`${label} is not a Damascus sourcebook: expected an id, a name, a type and the sourcebook's element lists.`);
	}
	return value as unknown as Sourcebook;
}

export function createBackupBundle(heroes: Hero[], sourcebooks: Sourcebook[]): BackupBundle {
	return {
		format: BACKUP_FORMAT,
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		heroes,
		sourcebooks
	};
}

/**
 * Read one exported file. Accepts a single hero, a single sourcebook, or a
 * whole-roster backup bundle. Throws before anything is applied, so a bad file
 * can never leave a half-written roster.
 */
export function parseImportText(text: string, fileName: string): ImportData {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new Error(`${fileName}: not valid JSON.`);
	}

	if (!isRecord(value)) {
		throw new Error(`${fileName} is not a Damascus hero, sourcebook, or backup file.`);
	}

	if (value.format === BACKUP_FORMAT) {
		if (value.version !== BACKUP_VERSION) {
			throw new Error(`${fileName}: unsupported backup version ${String(value.version)}; this app reads version ${BACKUP_VERSION}.`);
		}
		if (!Array.isArray(value.heroes) || !Array.isArray(value.sourcebooks)) {
			throw new Error(`${fileName} is not a valid Damascus backup: expected heroes and sourcebooks arrays.`);
		}
		return {
			heroes: value.heroes.map((hero, index) => assertHero(hero, `${fileName} (hero ${index + 1})`)),
			sourcebooks: value.sourcebooks.map((sourcebook, index) => assertSourcebook(sourcebook, `${fileName} (sourcebook ${index + 1})`))
		};
	}

	if (isHeroShape(value)) {
		return { heroes: [ assertHero(value, fileName) ], sourcebooks: [] };
	}

	if (looksLikeSourcebook(value)) {
		return { heroes: [], sourcebooks: [ assertSourcebook(value, fileName) ] };
	}

	throw new Error(`${fileName} is not a Damascus hero, sourcebook, or backup file.`);
}

/**
 * Parse every selected file before returning, and collapse entries that share
 * an id (first file wins). One invalid file rejects the whole selection.
 */
export function parseImportEntries(entries: { name: string, text: string }[]): ParsedImport {
	const heroes: Hero[] = [];
	const sourcebooks: Sourcebook[] = [];

	entries.forEach(entry => {
		const parsed = parseImportText(entry.text, entry.name);
		heroes.push(...parsed.heroes);
		sourcebooks.push(...parsed.sourcebooks);
	});

	const uniqueHeroes = new Map<string, Hero>();
	let duplicateHeroes = 0;
	heroes.forEach(hero => {
		if (uniqueHeroes.has(hero.id)) {
			duplicateHeroes += 1;
		} else {
			uniqueHeroes.set(hero.id, hero);
		}
	});

	const uniqueSourcebooks = new Map<string, Sourcebook>();
	let duplicateSourcebooks = 0;
	sourcebooks.forEach(sourcebook => {
		if (uniqueSourcebooks.has(sourcebook.id)) {
			duplicateSourcebooks += 1;
		} else {
			uniqueSourcebooks.set(sourcebook.id, sourcebook);
		}
	});

	return {
		heroes: [ ...uniqueHeroes.values() ],
		sourcebooks: [ ...uniqueSourcebooks.values() ],
		duplicateHeroes,
		duplicateSourcebooks
	};
}

/**
 * Idempotent merge: an id already on this device is skipped, not replaced and
 * not given a new id. Provisioning a fresh device therefore imports everything;
 * re-importing the same files is a no-op.
 */
export function selectNewItems(
	data: ImportData,
	existingHeroIDs: Set<string>,
	existingSourcebookIDs: Set<string>
): ImportSelection {
	const heroes = data.heroes.filter(hero => !existingHeroIDs.has(hero.id));
	const sourcebooks = data.sourcebooks.filter(sourcebook => !existingSourcebookIDs.has(sourcebook.id));

	return {
		heroes,
		sourcebooks,
		skippedHeroes: data.heroes.length - heroes.length,
		skippedSourcebooks: data.sourcebooks.length - sourcebooks.length
	};
}

import { Encounter, EncounterGroup } from '@/models/encounter';
import { EncounterSlot } from '@/models/encounter-slot';
import { FactoryLogic } from '@/logic/factory-logic';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import yaml from 'js-yaml';

export interface EncounterYamlIssue {
	severity: 'error' | 'warning';
	path: string;
	message: string;
}

export interface EncounterYamlParseResult {
	encounter: Encounter | null;
	issues: EncounterYamlIssue[];
}

interface SlotInput {
	monster?: string;
	id?: string;
	monsterID?: string;
	count?: number;
	level?: number;
	levelAdjustment?: number;
	solo?: boolean;
	convertToSolo?: boolean;
	minions?: number;
	minionCountAdjustment?: number;
	addOns?: unknown;
	items?: unknown;
}

interface GroupInput {
	name?: string;
	minHeroCount?: number;
	slots?: unknown;
}

interface SectionInput {
	title?: string;
	body?: string;
}

interface NotesInput {
	tactics?: string;
	ending?: string;
}

interface EncounterInput {
	name?: string;
	description?: string;
	groups?: unknown;
	notes?: NotesInput;
	sections?: unknown;
}

const KNOWN_TOP_LEVEL = new Set([ 'name', 'description', 'groups', 'notes', 'sections' ]);
const KNOWN_GROUP_KEYS = new Set([ 'name', 'minHeroCount', 'slots' ]);
const KNOWN_SLOT_KEYS = new Set([
	'monster',
	'id',
	'monsterID',
	'count',
	'level',
	'levelAdjustment',
	'solo',
	'convertToSolo',
	'minions',
	'minionCountAdjustment',
	'addOns',
	'items'
]);
const RESERVED_KEYS = new Set([
	'id',
	'round',
	'malice',
	'initiative',
	'heroes',
	'additionalTurnsTaken',
	'hiddenMaliceFeatures',
	'objective'
]);

const toStringArray = (value: unknown): string[] => {
	if (!Array.isArray(value)) { return []; }
	return value.filter((v): v is string => typeof v === 'string');
};

export class EncounterYamlLogic {
	static parse(text: string, sourcebooks: Sourcebook[]): EncounterYamlParseResult {
		const issues: EncounterYamlIssue[] = [];

		let raw: unknown;
		try {
			raw = yaml.load(text);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			issues.push({ severity: 'error', path: '$', message: `YAML parse error: ${message}` });
			return { encounter: null, issues };
		}

		if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
			issues.push({ severity: 'error', path: '$', message: 'Expected a YAML mapping at the top level.' });
			return { encounter: null, issues };
		}

		const input = raw as EncounterInput & Record<string, unknown>;

		for (const key of Object.keys(input)) {
			if (RESERVED_KEYS.has(key)) {
				issues.push({
					severity: 'error',
					path: `$.${key}`,
					message: `Reserved field "${key}" is set by the importer and must not appear in YAML.`
				});
			} else if (!KNOWN_TOP_LEVEL.has(key)) {
				issues.push({ severity: 'warning', path: `$.${key}`, message: `Unknown top-level key "${key}" — ignored.` });
			}
		}

		if (!input.name || typeof input.name !== 'string') {
			issues.push({ severity: 'error', path: '$.name', message: 'Missing required "name" string.' });
		}

		if (!Array.isArray(input.groups) || input.groups.length === 0) {
			issues.push({ severity: 'error', path: '$.groups', message: 'Missing required "groups" array (at least one group).' });
		}

		// Stop early on structural failures
		if (issues.some(i => i.severity === 'error')) {
			return { encounter: null, issues };
		}

		const monsters = SourcebookLogic.getMonsters(sourcebooks);
		const monsterIds = new Set(monsters.map(m => m.id));

		const encounter = FactoryLogic.createEncounter();
		encounter.name = input.name as string;
		encounter.description = typeof input.description === 'string' ? input.description : '';

		const groupInputs = input.groups as GroupInput[];
		encounter.groups = [];

		groupInputs.forEach((group, gi) => {
			const gpath = `$.groups[${gi}]`;
			const gRecord = group as Record<string, unknown>;

			for (const key of Object.keys(gRecord)) {
				if (!KNOWN_GROUP_KEYS.has(key)) {
					issues.push({ severity: 'warning', path: `${gpath}.${key}`, message: `Unknown group key "${key}" — ignored.` });
				}
			}

			const built: EncounterGroup = FactoryLogic.createEncounterGroup();
			built.name = typeof group.name === 'string' ? group.name : '';
			built.minHeroCount = typeof group.minHeroCount === 'number' ? group.minHeroCount : undefined;

			if (!Array.isArray(group.slots) || group.slots.length === 0) {
				issues.push({ severity: 'error', path: `${gpath}.slots`, message: 'Group must have at least one slot.' });
				return;
			}

			(group.slots as SlotInput[]).forEach((slot, si) => {
				const spath = `${gpath}.slots[${si}]`;
				const sRecord = slot as Record<string, unknown>;

				for (const key of Object.keys(sRecord)) {
					if (!KNOWN_SLOT_KEYS.has(key)) {
						issues.push({ severity: 'warning', path: `${spath}.${key}`, message: `Unknown slot key "${key}" — ignored.` });
					}
				}

				const monsterID = slot.monster || slot.id || slot.monsterID;
				if (!monsterID || typeof monsterID !== 'string') {
					issues.push({ severity: 'error', path: spath, message: 'Slot is missing required "monster" id.' });
					return;
				}
				if (!monsterIds.has(monsterID)) {
					issues.push({
						severity: 'error',
						path: `${spath}.monster`,
						message: `Unknown monster id "${monsterID}".`
					});
					return;
				}

				const newSlot: EncounterSlot = FactoryLogic.createEncounterSlot(monsterID);
				newSlot.count = typeof slot.count === 'number' && slot.count > 0 ? Math.floor(slot.count) : 1;

				const levelAdj = slot.level ?? slot.levelAdjustment;
				if (typeof levelAdj === 'number') {
					newSlot.customization.levelAdjustment = Math.floor(levelAdj);
				}

				const solo = slot.solo ?? slot.convertToSolo;
				if (typeof solo === 'boolean') {
					newSlot.customization.convertToSolo = solo;
				}

				const minionAdj = slot.minions ?? slot.minionCountAdjustment;
				if (typeof minionAdj === 'number') {
					newSlot.customization.minionCountAdjustment = Math.floor(minionAdj);
				}

				newSlot.customization.addOnIDs = toStringArray(slot.addOns);
				newSlot.customization.itemIDs = toStringArray(slot.items);

				built.slots.push(newSlot);
			});

			encounter.groups.push(built);
		});

		// Notes: tactics + ending replace the defaults; otherwise leave the factory defaults
		const notes = input.notes || {};
		if (typeof notes.tactics === 'string') {
			encounter.notes[0] = FactoryLogic.createElement('Tactics', notes.tactics);
		}
		if (typeof notes.ending === 'string') {
			encounter.notes[1] = FactoryLogic.createElement('Ending the Encounter', notes.ending);
		}

		if (Array.isArray(input.sections)) {
			(input.sections as SectionInput[]).forEach((section, si) => {
				if (!section || typeof section !== 'object') { return; }
				const title = typeof section.title === 'string' ? section.title : `Section ${si + 1}`;
				const body = typeof section.body === 'string' ? section.body : '';
				encounter.notes.push(FactoryLogic.createElement(title, body));
			});
		}

		// Final pass: bubble up any errors that happened mid-build
		if (issues.some(i => i.severity === 'error')) {
			return { encounter: null, issues };
		}

		return { encounter, issues };
	}
}

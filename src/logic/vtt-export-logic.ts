import { Encounter } from '@/models/encounter';
import { EncounterLogic } from '@/logic/encounter-logic';

// A running encounter, reshaped for import into the "vtt" app's Draw Steel
// initiative tracker (github.com/beaurancourt/vtt). Each damascus group
// becomes one Draw Steel group, monster instance names carried over as-is
// (they're already disambiguated, eg "Ghoul 1", "Ghoul 2").
export interface VttEncounterGroup {
	name: string;
	isPc: boolean;
	members: string[];
}

export interface VttEncounterExport {
	format: 'damascus-encounter';
	version: number;
	name?: string;
	groups: VttEncounterGroup[];
}

export class VttExportLogic {
	static buildExport = (encounter: Encounter): VttEncounterExport => {
		const groups = encounter.groups
			.map((g, gIdx) => ({
				name: g.name || EncounterLogic.getDefaultGroupName(gIdx),
				isPc: false,
				members: g.slots.flatMap(s => s.monsters).map(m => m.name)
			}))
			.filter(g => g.members.length > 0);

		return {
			format: 'damascus-encounter',
			version: 1,
			name: encounter.name || undefined,
			groups: groups
		};
	};

	static toJson = (encounter: Encounter) => {
		return JSON.stringify(VttExportLogic.buildExport(encounter), null, '\t');
	};
}

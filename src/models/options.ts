export interface Options {
	// App
	cookieConsent: boolean;
	// Hero
	shownStandardAbilities: string[];
	xpPerLevel: number;
	// Hero: Modern Sheet
	singlePage: boolean;
	showSkillsInGroups: boolean;
	showSources: boolean;
	compactView: boolean;
	// Encounter
	party: string;
	// Encounter: Running
	showDefeatedCombatants: boolean;
	// Encounter / Montage Difficulty
	heroParty: string;
	heroCount: number;
	heroLevel: number;
	heroVictories: number;
	// Tactical Map
	gridSize: number;
	playerGridSize: number;
}

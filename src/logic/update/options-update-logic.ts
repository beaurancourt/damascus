import { Options } from '@/models/options';

export class OptionsUpdateLogic {
	static updateOptions = (options: Options) => {
		if (options.cookieConsent === undefined) {
			options.cookieConsent = false;
		}

		if (options.xpPerLevel === undefined) {
			options.xpPerLevel = 16;
		}

		if (options.singlePage === undefined) {
			options.singlePage = false;
		}

		if (options.showSources === undefined) {
			options.showSources = false;
		}

		if (options.compactView === undefined) {
			options.compactView = false;
		}

		if (options.party === undefined) {
			options.party = '';
		}

		if (options.heroParty === undefined) {
			options.heroParty = '';
		}

		if (options.heroCount === undefined) {
			options.heroCount = 4;
		}

		if (options.heroLevel === undefined) {
			options.heroLevel = 1;
		}

		if (options.heroVictories === undefined) {
			options.heroVictories = 0;
		}

		if (options.showDefeatedCombatants === undefined) {
			options.showDefeatedCombatants = false;
		}

		if (options.gridSize === undefined) {
			options.gridSize = 50;
		}

		if (options.playerGridSize === undefined) {
			options.playerGridSize = 50;
		}

		if (options.shownStandardAbilities === undefined) {
			options.shownStandardAbilities = [];
		}
	};
}

import { beastheartSourcebook } from './sourcebooks/official/beastheart';
import { core } from '@/data/sourcebooks/official/core';
import { orden } from '@/data/sourcebooks/official/orden';
import { patreon } from '@/data/sourcebooks/official/patreon';
import { summonerSourcebook } from '@/data/sourcebooks/official/summoner';

export class SourcebookData {
	static core = core;
	static orden = orden;
	static patreon = patreon;
	static beastheart = beastheartSourcebook;
	static summoner = summonerSourcebook;
}

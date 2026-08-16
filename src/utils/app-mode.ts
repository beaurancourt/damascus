// Damascus ships as two sites built from this one codebase: the player site,
// which is about building and playing a hero, and the GM site, which is about
// running a session and the library of content behind it.
//
// The mode is fixed at build time by VITE_APP_MODE (set by `npm run build:gm`
// via .env.gm), so each deployed bundle knows which site it is; there is no
// runtime switch to get wrong.
//
// The dev server is one site or the other too, so what you see locally is what
// the deployed site does: `npm run start` is the player site on :5173 and
// `npm run start:gm` is the GM site on :5174. Run both when you need both.

export type AppModeName = 'player' | 'gm';

const current: AppModeName = import.meta.env.VITE_APP_MODE === 'gm' ? 'gm' : 'player';

export class AppMode {
	static current = current;
	static isPlayer = current === 'player';
	static isGM = current === 'gm';

	// Which of the three top-level areas this site offers. The library turned
	// out to be a director's tool once the hero builder covered what a player
	// needs to look up, so it sits with Session rather than on both sites.
	static hasHeroes = current === 'player';
	static hasLibrary = current === 'gm';
	static hasSession = current === 'gm';

	static appName = current === 'gm' ? 'Damascus GM' : 'Damascus';

	// Each site links to its counterpart, so someone who lands on the wrong one
	// has somewhere to go. Relative to the origin, since both are served from
	// the same GitHub Pages user site.
	static counterpartName = current === 'gm' ? 'Damascus' : 'Damascus GM';
	static counterpartDescription = current === 'gm' ? 'for players' : 'for directors';
	static counterpartUrl = current === 'gm' ? '/damascus/' : '/damascus-gm/';
}

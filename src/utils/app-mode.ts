// Damascus ships as two sites built from this one codebase: the player site,
// which is about building and playing a hero, and the GM site, which is about
// running a session. The library sits on both - a player browsing ancestries
// and a director writing homebrew want the same content - so only Heroes and
// Session are actually split.
//
// The mode is fixed at build time by VITE_APP_MODE (set by `npm run build:gm`
// via .env.gm), so each deployed bundle knows which site it is; there is no
// runtime switch to get wrong.
//
// The dev server is deliberately neither: it serves the whole app, so that
// working on a session screen doesn't mean running a second dev server, and so
// the smoke scripts can drive every page against one instance. Run
// `npm run start:gm` to see the GM site's own shape locally.

export type AppModeName = 'player' | 'gm';

const current: AppModeName = import.meta.env.VITE_APP_MODE === 'gm' ? 'gm' : 'player';
const isDev = import.meta.env.DEV && import.meta.env.VITE_APP_MODE === undefined;

export class AppMode {
	static current = current;
	static isPlayer = current === 'player';
	static isGM = current === 'gm';

	// True on the dev server, where neither site's restrictions apply.
	static isUnsplit = isDev;

	// Which of the three top-level areas this site offers.
	static hasHeroes = isDev || current === 'player';
	static hasLibrary = true;
	static hasSession = isDev || current === 'gm';

	static appName = current === 'gm' ? 'Damascus GM' : 'Damascus';

	// Each site links to its counterpart, so someone who lands on the wrong one
	// has somewhere to go. Relative to the origin, since both are served from
	// the same GitHub Pages user site.
	static counterpartName = current === 'gm' ? 'Damascus' : 'Damascus GM';
	static counterpartDescription = current === 'gm' ? 'for players' : 'for directors';
	static counterpartUrl = current === 'gm' ? '/damascus/' : '/damascus-gm/';
}

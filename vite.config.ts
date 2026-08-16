import { Plugin, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Damascus builds as two sites from one codebase: the player site and the GM
// site, chosen with VITE_APP_MODE. Each gets its own GitHub Pages repo, so
// each needs its own base path.
type AppMode = 'player' | 'gm';

const getAppMode = (mode: string): AppMode => mode === 'gm' ? 'gm' : 'player';

// GitHub Pages serves the app under https://<user>.github.io/<repo>/ —
// Pages serves all assets under that prefix, so Vite's `base` (and the PWA
// manifest's start_url/scope) need to match in production builds. In dev,
// we serve at `/` so the smoke scripts and local browser keep working.
const getBasePath = (command: 'serve' | 'build', appMode: AppMode) => {
	if (command !== 'build') {
		return '/';
	}

	return appMode === 'gm' ? '/damascus-gm/' : '/damascus/';
};

const getAppName = (appMode: AppMode) => appMode === 'gm' ? 'Damascus GM' : 'Damascus';

const getAppDescription = (appMode: AppMode) => appMode === 'gm' ?
	'Monsters, encounters, sessions ... everything you need to run Draw Steel.'
	: 'Heroes, abilities, rules ... everything you need to play Draw Steel.';

const buildManifest = (basePath: string, appName: string, appDescription: string, shieldIconPath?: string) => {
	const iconPath = shieldIconPath || `${basePath}src/assets/shield.png`;
	return {
		name: appName,
		short_name: appName,
		description: appDescription,
		start_url: basePath,
		display: 'standalone',
		background_color: '#ffffff',
		theme_color: '#c9a45a',
		orientation: 'any',
		scope: basePath,
		categories: [ 'games', 'entertainment', 'utilities' ],
		lang: 'en',
		dir: 'ltr',
		icons: [
			{ src: iconPath, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
			{ src: iconPath, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
		]
	};
};

const manifestPlugin = (basePath: string, appName: string, appDescription: string): Plugin => ({
	name: 'manifest-plugin',
	generateBundle(_, bundle) {
		const shieldIcon = Object.keys(bundle).find(
			key => key.includes('shield') && key.endsWith('.png')
		);

		if (shieldIcon) {
			this.emitFile({
				type: 'asset',
				fileName: 'manifest.json',
				source: JSON.stringify(buildManifest(basePath, appName, appDescription, `${basePath}${shieldIcon}`), null, 2)
			});
		}
	}
});

// The two sites should not both call themselves Damascus in a browser tab or
// a link preview, and index.html is shared, so the strings are swapped in at
// build time rather than duplicated into a second html file.
const brandingPlugin = (appName: string, appDescription: string): Plugin => ({
	name: 'branding-plugin',
	transformIndexHtml: {
		order: 'pre',
		handler: (html: string) => html
			.replace(/<title>[^<]*<\/title>/, `<title>${appName}</title>`)
			.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${appName}$2`)
			.replace(/(<meta property="description" content=")[^"]*(")/g, `$1${appDescription}$2`)
			.replace(/(<meta property="og:description" content=")[^"]*(")/g, `$1${appDescription}$2`)
	}
});

const devPwaPlugin = (basePath: string, appName: string, appDescription: string): Plugin => ({
	name: 'dev-pwa-files',
	configureServer(server) {
		server.middlewares.use('/manifest.json', (_, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(buildManifest(basePath, appName, appDescription), null, 2));
		});

		server.middlewares.use('/sw.js', async (_, res) => {
			try {
				const { build } = await import('esbuild');
				const result = await build({
					entryPoints: [ 'src/sw.ts' ],
					bundle: true,
					write: false,
					format: 'iife',
					target: 'es2020',
					minify: false
				});
				res.setHeader('Content-Type', 'application/javascript');
				res.end(result.outputFiles[0].text);
			} catch (error) {
				console.error('Error compiling service worker:', error);
				res.statusCode = 500;
				res.end('Error compiling service worker');
			}
		});
	}
});

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
	const appMode = getAppMode(mode);
	const basePath = getBasePath(command, appMode);
	const appName = getAppName(appMode);
	const appDescription = getAppDescription(appMode);
	return {
		base: basePath,
		build: {
			chunkSizeWarningLimit: 10000,
			rollupOptions: {
				input: {
					main: './index.html',
					sw: './src/sw.ts'
				},
				output: {
					entryFileNames: chunkInfo => {
						return chunkInfo.name === 'sw' ? 'sw.js' : '[name]-[hash].js';
					},
					assetFileNames: chunkInfo => {
						if (chunkInfo.names && chunkInfo.names[0].match(/\.(ttf|otf)$/)) {
							return 'assets/[name][extname]';
						}
						if (chunkInfo.names && chunkInfo.names[0].includes('clocktower')) {
							return 'assets/[name][extname]';
						}
						return 'assets/[name]-[hash][extname]';
					}
				}
			}
		},
		plugins: [
			react(),
			brandingPlugin(appName, appDescription),
			manifestPlugin(basePath, appName, appDescription),
			devPwaPlugin(basePath, appName, appDescription)
		],
		publicDir: 'public',
		resolve: {
			tsconfigPaths: true
		},
		server: {
			headers: {
				'Service-Worker-Allowed': '/'
			}
		}
	};
});

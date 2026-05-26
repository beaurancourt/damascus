import { Plugin, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the app under https://<user>.github.io/damascus/ —
// Pages serves all assets under that prefix, so Vite's `base` (and the PWA
// manifest's start_url/scope) need to match in production builds. In dev,
// we serve at `/` so the smoke scripts and local browser keep working.
const getBasePath = (command: 'serve' | 'build') => command === 'build' ? '/damascus/' : '/';

const buildManifest = (basePath: string, shieldIconPath?: string) => {
	const iconPath = shieldIconPath || `${basePath}src/assets/shield.png`;
	return {
		name: 'Damascus',
		short_name: 'Damascus',
		description: 'Heroes, monsters, encounters ... everything you need for Draw Steel.',
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

const manifestPlugin = (basePath: string): Plugin => ({
	name: 'manifest-plugin',
	generateBundle(_, bundle) {
		const shieldIcon = Object.keys(bundle).find(
			key => key.includes('shield') && key.endsWith('.png')
		);

		if (shieldIcon) {
			this.emitFile({
				type: 'asset',
				fileName: 'manifest.json',
				source: JSON.stringify(buildManifest(basePath, `${basePath}${shieldIcon}`), null, 2)
			});
		}
	}
});

const devPwaPlugin = (basePath: string): Plugin => ({
	name: 'dev-pwa-files',
	configureServer(server) {
		server.middlewares.use('/manifest.json', (_, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(buildManifest(basePath), null, 2));
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
export default defineConfig(({ command }) => {
	const basePath = getBasePath(command);
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
			manifestPlugin(basePath),
			devPwaPlugin(basePath)
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

#!/usr/bin/env node
// Runs the monster importer skill's TypeScript tools, which import the app's
// own logic and panels. They cannot be run by node directly - the app is
// TypeScript with a `@/` alias and SCSS/image imports - so this bundles them
// with esbuild into tmp/ and runs the bundle.
//
//   node scripts/monster-tools.mjs verify
//       Check every example in skills/monster-importer/reference/examples/.
//
//   node scripts/monster-tools.mjs run <authoring-script.ts> [--out <dir>]
//       Build the files an authoring script describes, then check the bytes it
//       wrote. Anything after the script path is passed through to the script.
//
// Authoring scripts may import the shared checks as `@skill/monster-checks` and
// `@skill/render-checks`, which works from anywhere in the repo.

import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TMP = resolve(ROOT, 'tmp/monster-tools');

const [ , , command, ...rest ] = process.argv;

const entryPoints = {
	verify: resolve(ROOT, 'skills/monster-importer/tools/verify-examples.ts'),
	run: rest[0] ? resolve(process.cwd(), rest[0]) : null
};

const entry = entryPoints[command];
if (!entry) {
	console.error('usage: node scripts/monster-tools.mjs verify');
	console.error('       node scripts/monster-tools.mjs run <authoring-script.ts> [--out <dir>]');
	process.exit(2);
}

mkdirSync(TMP, { recursive: true });
const outfile = resolve(TMP, `${command}.mjs`);

await build({
	entryPoints: [ entry ],
	outfile,
	bundle: true,
	platform: 'node',
	format: 'esm',
	target: 'node20',
	jsx: 'automatic',
	define: { 'process.env.NODE_ENV': '"production"' },
	// The app resolves @/ through tsconfig paths; the skill's tools get their
	// own alias so an authoring script can live anywhere in the repo.
	alias: {
		'@skill': resolve(ROOT, 'skills/monster-importer/tools'),
		'@': resolve(ROOT, 'src')
	},
	loader: {
		'.scss': 'empty',
		'.css': 'empty',
		'.png': 'dataurl',
		'.svg': 'dataurl',
		'.ttf': 'empty'
	},
	// react-dom/server is CommonJS and reaches for node builtins at require
	// time, which an ESM bundle has to be handed explicitly.
	banner: { js: 'import { createRequire } from \'module\'; const require = createRequire(import.meta.url);' },
	logLevel: 'warning'
});

// The authoring script reads its own argv, so hand it everything after the path.
process.argv = [ process.argv[0], outfile, ...rest.slice(1) ];
await import(pathToFileURL(outfile).href);

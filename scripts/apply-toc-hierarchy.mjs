#!/usr/bin/env node
// Patches src/data/rules-data.ts to add `parent` and `section` fields to each
// RulesItem, derived from the PDF TOC mapping in rules-toc-mapping.json.
//
// Idempotent: removes any existing `parent`/`section` lines first, then injects
// fresh ones based on the mapping.

import { readFileSync, writeFileSync } from 'node:fs';

const MAPPING = JSON.parse(readFileSync('skills/encounter-builder/reference/rules-toc-mapping.json', 'utf8')).mapping;
const SRC_PATH = 'src/data/rules-data.ts';
let src = readFileSync(SRC_PATH, 'utf8');

// Strip any prior parent:/section:/page:/ancestors: lines so reruns stay clean.
src = src.replace(/^\t+parent: '[^']+',?\n/gm, '');
src = src.replace(/^\t+section: '[^']+',?\n/gm, '');
src = src.replace(/^\t+page: \d+,?\n/gm, '');
src = src.replace(/^\t+ancestors: \[[^\]]*\],?\n/gm, '');

let patched = 0;
let skipped = [];

for (const r of MAPPING) {
	if (!r.matched) { skipped.push(`${r.key} (unmatched)`); continue; }

	const section = r.parents[0] || null;
	const parent = r.parentInRules || null;

	// Find the `static <key>: RulesItem = { ... };` block. We insert the new
	// fields after the `label:` line so they sit adjacent to it.
	const pattern = new RegExp(`(static ${r.key}:\\s*RulesItem\\s*=\\s*\\{\\s*\\n)(\\t+label:\\s*'[^']+',?\\n)`);
	const match = src.match(pattern);
	if (!match) { skipped.push(`${r.key} (no match in source)`); continue; }

	const indentMatch = match[2].match(/^(\t+)/);
	const indent = indentMatch ? indentMatch[1] : '\t\t';

	// Ancestors = the PDF parent chain minus the section (first element).
	// Captures intermediate non-rule headings the renderer needs to surface
	// (e.g. "Abilities" between Classes and Ability Distance).
	const ancestors = (r.parents || []).slice(1);

	let insert = '';
	if (section) insert += `${indent}section: '${section.replace(/'/g, "\\'")}',\n`;
	if (parent) insert += `${indent}parent: '${parent.replace(/'/g, "\\'")}',\n`;
	if (ancestors.length > 0) {
		const escaped = ancestors.map(a => `'${a.replace(/'/g, "\\'")}'`).join(', ');
		insert += `${indent}ancestors: [ ${escaped} ],\n`;
	}
	if (r.page) insert += `${indent}page: ${r.page},\n`;

	src = src.replace(pattern, `$1$2${insert}`);
	patched++;
}

writeFileSync(SRC_PATH, src);
console.log(`Patched ${patched} rules in ${SRC_PATH}`);
if (skipped.length) {
	console.log(`Skipped:\n  ${skipped.join('\n  ')}`);
}

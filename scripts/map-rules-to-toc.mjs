#!/usr/bin/env node
// For each rule label in src/data/rules-data.ts, find its location in the PDF
// outline (rulebook-toc.json) and report:
//   - depth in the PDF
//   - its parent in the PDF (the rule it's a subheader of)
//   - whether the parent is also one of our rules
//
// Output goes to skills/encounter-builder/reference/rules-toc-mapping.json
// plus a human-readable summary on stdout.

import { readFileSync, writeFileSync } from 'node:fs';

const TOC = JSON.parse(readFileSync('skills/encounter-builder/reference/rulebook-toc.json', 'utf8'));
const RULES_SRC = readFileSync('src/data/rules-data.ts', 'utf8');

// Extract `static <key>: RulesItem = { label: 'X', ... };`
const ruleRegex = /static (\w+):\s*RulesItem\s*=\s*\{\s*label:\s*'([^']+)'/g;
const rules = [];
let m;
while ((m = ruleRegex.exec(RULES_SRC)) !== null) {
	rules.push({ key: m[1], label: m[2] });
}

const norm = s => s.trim().replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").toLowerCase();

// A small lookup of known label aliases between our data and the PDF TOC.
const ALIASES = {
	'Burrowing': 'Burrow',
	'Climbing / Swimming': 'Climb or Swim',
	'Crawling': 'Crawl',
	'Flying': 'Fly',
	'Jumping': 'Jump',
	'Teleporting': 'Teleport',
	'Main Action': 'Main Actions',
	'Opportunity Attack': 'Opportunity Attacks',
	'Assisting a Test': 'Assist a Test',
	'Surprise': 'Determine Surprise',
	'Ability Distance': 'Distance',
	'Ability Target': 'Target',
	'During the Move': 'Movement',
	'Damage and Effect': 'Damage',
	'Roll vs Multiple Creatures': 'Roll Against Multiple Creatures'
};

// Flatten the outline into an array with depth + parent chain
const flat = [];
function walk(items, depth, parents) {
	for (const item of items) {
		const entry = {
			title: item.title.trim().replace(/\s+/g, ' '),
			page: item.page,
			depth,
			parents: parents.slice()
		};
		flat.push(entry);
		if (item.children && item.children.length) {
			walk(item.children, depth + 1, parents.concat(entry.title));
		}
	}
}
walk(TOC.outline, 0, []);

// Match each rule to a TOC entry by normalized title
const ruleLabels = new Set(rules.map(r => norm(r.label)));

const mapping = rules.map(r => {
	const candidates = [ r.label, ALIASES[r.label] ].filter(Boolean).map(norm);
	let best = null;
	for (const target of candidates) {
		const hits = flat.filter(e => norm(e.title) === target);
		if (hits.length > 0) { best = hits[0]; break; }
	}
	const parentInRules = best && best.parents.length > 0
		? best.parents.slice().reverse().find(p => ruleLabels.has(norm(p))) || null
		: null;
	return {
		key: r.key,
		label: r.label,
		matched: !!best,
		matchedTitle: best?.title,
		page: best?.page,
		depth: best?.depth,
		parents: best?.parents ?? [],
		parentInRules
	};
});

writeFileSync(
	'skills/encounter-builder/reference/rules-toc-mapping.json',
	JSON.stringify({ rulesCount: rules.length, mapping }, null, 2) + '\n'
);

// Print summary
console.log(`Rules total: ${rules.length}`);
console.log(`Unmatched:`, mapping.filter(r => !r.matched).map(r => r.label).join(', ') || '(none)');
console.log();
console.log('Rules that are SUBHEADERS of other rules in the PDF:');
console.log('  (these should be merged into their parent rule\'s content, OR rendered as nested in the UI)');
console.log();
for (const r of mapping.filter(r => r.parentInRules)) {
	console.log(`  ${r.label} (key: ${r.key})  →  child of "${r.parentInRules}"`);
}

console.log();
console.log('Rules that sit at the TOP of a section (no rule-parent in PDF), grouped by their top-level PDF parent:');
const byTop = {};
for (const r of mapping.filter(r => r.matched && !r.parentInRules)) {
	const top = r.parents[0] || '(root)';
	(byTop[top] = byTop[top] || []).push(r);
}
for (const [ top, list ] of Object.entries(byTop).sort(([a], [b]) => a.localeCompare(b))) {
	console.log(`  ${top}:`);
	for (const r of list) {
		const trail = r.parents.slice(1).concat(r.label).join(' > ');
		console.log(`    ${r.key.padEnd(28)} ${trail}`);
	}
}

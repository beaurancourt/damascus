#!/usr/bin/env node
// Sanity-checks each YAML example in skills/encounter-builder/reference/examples/
// against the extracted monster catalog. Each monster ID referenced must exist.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const CATALOG = JSON.parse(readFileSync('skills/encounter-builder/reference/monsters.json', 'utf8'));
const ids = new Set(CATALOG.monsters.map(m => m.id));

const dir = 'skills/encounter-builder/reference/examples';
const files = readdirSync(dir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

let failed = 0;
for (const file of files) {
	const path = join(dir, file);
	const doc = yaml.load(readFileSync(path, 'utf8'));
	const missing = [];
	for (const g of doc.groups || []) {
		for (const s of g.slots || []) {
			const id = s.monster || s.id || s.monsterID;
			if (!id || !ids.has(id)) missing.push(id || '<missing>');
		}
	}
	if (missing.length) {
		console.error(`FAIL ${file}: unknown ids: ${missing.join(', ')}`);
		failed++;
	} else {
		console.log(`OK   ${file}`);
	}
}

process.exit(failed > 0 ? 1 : 0);

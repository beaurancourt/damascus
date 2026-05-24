#!/usr/bin/env node
// Walks src/data/monsters/*.ts and emits a compact JSON catalog of monster IDs,
// names, levels, roles, and EV. Used to keep skills/encounter-builder/monsters.json
// in sync with the data.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MONSTER_DIR = 'src/data/monsters';
const OUT = 'skills/encounter-builder/reference/monsters.json';

function extractGroupName(src) {
	const m = src.match(/export const \w+: MonsterGroup = \{[\s\S]*?name:\s*'([^']+)'/);
	return m ? m[1] : null;
}

function extractMonsters(src, file) {
	const monsters = [];
	const blockRegex = /FactoryLogic\.createMonster\(\{([\s\S]*?)\n\t{1,2}\}\)/g;
	let m;
	while ((m = blockRegex.exec(src)) !== null) {
		const block = m[1];
		const id = (block.match(/\bid:\s*'([^']+)'/) || [])[1];
		const name = (block.match(/\bname:\s*'([^']+)'/) || [])[1];
		const level = parseInt((block.match(/\blevel:\s*(\d+)/) || [])[1] || '0', 10);
		const ev = parseInt((block.match(/\bencounterValue:\s*(\d+)/) || [])[1] || '0', 10);
		const orgMatch = block.match(/FactoryLogic\.createMonsterRole\(\s*MonsterOrganizationType\.(\w+)/);
		const roleMatch = block.match(/MonsterRoleType\.(\w+)/);
		const organization = orgMatch ? orgMatch[1] : null;
		const role = roleMatch ? roleMatch[1] : null;
		if (id && name) {
			monsters.push({ id, name, level, ev, organization, role, source: file });
		}
	}
	return monsters;
}

const files = readdirSync(MONSTER_DIR).filter(f => f.endsWith('.ts')).sort();
const catalog = [];
const groups = {};

for (const file of files) {
	const src = readFileSync(join(MONSTER_DIR, file), 'utf8');
	const groupName = extractGroupName(src);
	const monsters = extractMonsters(src, file);
	if (groupName) {
		groups[file] = { groupName, count: monsters.length };
	}
	catalog.push(...monsters);
}

const out = {
	generated: new Date().toISOString(),
	source: 'src/data/monsters',
	count: catalog.length,
	groups,
	monsters: catalog
};

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${catalog.length} monsters from ${files.length} files to ${OUT}`);

// Verifies every shipped example in the skill's reference/examples/ directory:
// model-level checks plus the render checks, against the bytes on disk.
//
// Run it with:  node scripts/monster-tools.mjs verify
import fs from 'node:fs';
import path from 'node:path';
import { Monster } from '@/models/monster';
import { MonsterGroup } from '@/models/monster-group';
import { Report, checkFile } from './monster-checks';
import { checkGroupEntryRenders, checkRendersInRunner, checkStatBlockRenders, installDomShims } from './render-checks';

const EXAMPLES = path.resolve('skills/monster-importer/reference/examples');

installDomShims();

const files = fs.readdirSync(EXAMPLES)
	.filter(f => f.endsWith('.ds-monster') || f.endsWith('.ds-monster-group') || f.endsWith('.drawsteel-monster') || f.endsWith('.drawsteel-monster-group'))
	.sort();

if (files.length === 0) {
	console.error(`No example files in ${EXAMPLES}`);
	process.exit(1);
}

const report = new Report();
const read = <T>(name: string): T => JSON.parse(fs.readFileSync(path.join(EXAMPLES, name), 'utf8')) as T;

// Model checks on every file.
files.forEach(file => checkFile(report, path.join(EXAMPLES, file)));

// Render checks: a standalone monster gets its stat block; a group gets its
// entry, its monsters' stat blocks, and the encounter runner.
files.filter(f => f.endsWith('.ds-monster')).forEach(file => {
	const monster = read<Monster>(file);
	const groupFile = files.find(f => f.endsWith('.ds-monster-group'));
	const group = groupFile ? read<MonsterGroup>(groupFile) : undefined;
	checkStatBlockRenders(report, monster, group, monster.name);
});

files.filter(f => f.endsWith('.ds-monster-group')).forEach(file => {
	const group = read<MonsterGroup>(file);
	checkGroupEntryRenders(report, group, group.name);
	checkRendersInRunner(report, group, group.name);
});

files.forEach(file => console.log(`checked ${file}`));
console.log(`\n${report.passes.length} checks passed`);
report.warnings.forEach(w => console.log(`  warn ${w}`));

if (report.failures.length > 0) {
	console.error(`\n${report.failures.length} check(s) failed:`);
	report.failures.forEach(f => console.error(`  FAIL ${f}`));
	process.exit(1);
}

console.log('\nok');

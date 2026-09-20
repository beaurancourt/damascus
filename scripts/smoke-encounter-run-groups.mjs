// Group names are labels the GM reads out during play, so they are pinned when a
// group is created (and when an older encounter loads) and never derived from a
// group's position. Removing a squad mid-run must not rename the survivors.
// Asserts - exits non-zero. Needs the GM site (port 5174).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_BASE || 'http://localhost:5174/';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const fail = [];
const errors = [];
page.on('pageerror', e => errors.push(e.message));

const builderGroups = async () => (await page.locator('.encounter-group-panel .header-text-panel').allInnerTexts()).map(t => t.trim().toUpperCase());
const runnerGroups = async () => (await page.locator('.tracker-group .group-name').allInnerTexts()).map(t => t.trim().toUpperCase());

// 1. A new encounter starts with one named group; Shift+A adds a second.
await page.goto(BASE + '#/library/encounter', { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
await page.waitForTimeout(600);
await page.locator('button:has-text("Create")').first().click();
await page.waitForTimeout(1800);
const seeded = await builderGroups();
console.log(`groups on a fresh encounter: ${JSON.stringify(seeded)}`);
if (seeded.length !== 1) fail.push(`a fresh encounter has ${seeded.length} groups, expected 1`);

await page.locator('.monster-picker-search input').first().fill('goblin');
await page.waitForTimeout(1300);
await page.locator('.monster-search-results .monster-list-item').first().click();
await page.waitForTimeout(1000);

await page.locator('.monster-picker-search input').first().click();
await page.keyboard.press('Shift+A');
await page.waitForTimeout(1000);
await page.locator('.monster-search-results .monster-list-item').first().click();
await page.waitForTimeout(1000);

const built = await builderGroups();
console.log(`groups after Shift+A:        ${JSON.stringify(built)}`);
if (built.length !== 2) fail.push(`expected 2 groups in the builder, saw ${built.length}`);
if (new Set(built).size !== built.length) fail.push(`the builder's groups share a name: ${JSON.stringify(built)}`);

// 2. Save, then start the encounter.
await page.locator('.encounter-section input').first().fill('Group Name Smoke');
await page.waitForTimeout(900);
await page.locator('button:has-text("Save Changes")').first().click();
await page.waitForTimeout(1600);
await page.evaluate(() => { location.hash = '#/library/encounter'; });
await page.waitForTimeout(1200);
await page.locator('text=Group Name Smoke').first().click();
await page.waitForTimeout(900);
const play = page.locator('button:has(.anticon-play-circle)');
if (await play.count() === 0) {
	fail.push('no play button on the encounter, so the runner was never reached');
} else {
	await play.first().click({ force: true });
	await page.waitForTimeout(2200);
}

const rowNames = async (groupIndex = 0) =>
	(await page.locator('.tracker-group').nth(groupIndex).locator('.tracker-row .row-name').allInnerTexts()).map(t => t.trim());

const before = await runnerGroups();
console.log(`runner groups before removal: ${JSON.stringify(before)}`);
if (before.length !== 2) fail.push(`the runner shows ${before.length} groups, expected 2`);
if (JSON.stringify(before) !== JSON.stringify(built)) fail.push(`the runner renamed the builder's groups: ${JSON.stringify(built)} -> ${JSON.stringify(before)}`);

// 3. Monsters keep their numbers too: removing one must not renumber the rest,
// since the table has been calling them "[2]" and "[3]" all fight.
const numberedBefore = await rowNames(0);
console.log(`group 1 monsters:             ${JSON.stringify(numberedBefore)}`);
if (numberedBefore.length < 3) fail.push(`expected a squad of 3+ monsters to number, saw ${JSON.stringify(numberedBefore)}`);
if (!numberedBefore.every(n => /^\[\d+\] /.test(n))) fail.push(`monsters are not numbered: ${JSON.stringify(numberedBefore)}`);
const removedMonster = numberedBefore[1];
await page.locator('.tracker-group').first().locator('.tracker-row .row-delete').nth(1).click({ force: true });
await page.waitForTimeout(900);
const numberedAfter = await rowNames(0);
const expectedRows = numberedBefore.filter((_, n) => n !== 1);
console.log(`removed ${JSON.stringify(removedMonster)}; the rest should stay ${JSON.stringify(expectedRows)}, saw ${JSON.stringify(numberedAfter)}`);
if (JSON.stringify(numberedAfter) !== JSON.stringify(expectedRows)) fail.push(`monsters were renumbered: expected ${JSON.stringify(expectedRows)}, saw ${JSON.stringify(numberedAfter)}`);

// 4. Clear the first squad and check the survivors kept their names. The check
// is set-minus-the-removed-name, not "the old names still appear somewhere": a
// survivor renumbered onto the deleted group's name would satisfy the weaker
// version, which is exactly the bug.
const removedName = before[0];
await page.locator('.tracker-group .group-delete').first().click();
await page.waitForTimeout(900);
const after = await runnerGroups();
const expected = before.slice(1);
console.log(`removed "${removedName}"; the rest should stay ${JSON.stringify(expected)}, saw ${JSON.stringify(after)}`);
if (after.length !== before.length - 1) fail.push(`expected ${before.length - 1} groups after removal, saw ${after.length}`);
if (JSON.stringify(after) !== JSON.stringify(expected)) fail.push(`the survivors were renamed: expected ${JSON.stringify(expected)}, saw ${JSON.stringify(after)}`);

await page.screenshot({ path: 'tmp/audit/run-group-names.png' });
if (errors.length) fail.push(`page errors ${JSON.stringify(errors)}`);
await ctx.close();

console.log(fail.length === 0 ? '\nPASS' : '\nFAIL — ' + fail.join('; '));
await browser.close();
process.exit(fail.length === 0 ? 0 : 1);

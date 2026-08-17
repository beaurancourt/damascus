// Encounter builder workflow, asserted end to end: land in the search box,
// fuzzy-search, click monsters into the active group, Shift+A to start the
// next group, and keep browsing when the query is empty. Unlike the screenshot
// smokes this one exits non-zero if anything is wrong.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('tmp/audit', { recursive: true });

const BASE = process.env.SMOKE_BASE || 'http://localhost:5174/';
const browser = await chromium.launch();
const fail = [];

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.goto(BASE + '#/library/encounter', { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
await page.waitForTimeout(700);
await page.locator('button:has-text("Create")').first().click().catch(() => {});
await page.waitForTimeout(2200);

const state = () => page.evaluate(() => ({
	groups: Array.from(document.querySelectorAll('.encounter-group-panel')).map(g => ({
		name: (g.querySelector('.header-text-panel')?.textContent || '').trim().slice(0, 10),
		active: g.className.includes('active-group'),
		monsters: g.querySelectorAll('.slot-row').length,
		text: g.textContent.replace(/\s+/g, ' ').slice(0, 60)
	})),
	workspaceW: Math.round(document.querySelector('.encounter-workspace')?.getBoundingClientRect().width || 0),
	pickerW: Math.round(document.querySelector('.encounter-pickers')?.getBoundingClientRect().width || 0),
	focused: document.activeElement?.getAttribute('placeholder') || document.activeElement?.tagName,
	results: document.querySelectorAll('.monster-search-results .monster-list-item').length
}));

// 1. one group, named Red, and it's active
const start = await state();
console.log(`start: groups=${JSON.stringify(start.groups.map(g => `${g.name}${g.active ? '*' : ''}`))}`);
console.log(`       workspace=${start.workspaceW} picker=${start.pickerW} (picker share ${(start.pickerW / (start.workspaceW + start.pickerW) * 100).toFixed(0)}%)`);
console.log(`       focus is on: ${start.focused}`);
if (start.groups.length !== 1) fail.push(`expected 1 group at start, got ${start.groups.length}`);
if (!/red/i.test(start.groups[0]?.name || '')) fail.push(`first group is "${start.groups[0]?.name}", expected Red`);
if (!start.groups[0]?.active) fail.push('the first group is not marked active');
if (start.focused !== 'Search monsters by name') fail.push(`focus starts on ${start.focused}`);
const pickerShare = start.pickerW / (start.workspaceW + start.pickerW);
if (pickerShare < 0.6) fail.push(`picker is only ${(pickerShare * 100).toFixed(0)}% of the width, wanted about two thirds`);

// 2. fuzzy search finds a monster by a sloppy query
// letters in order, gaps allowed - no substring of "Goblin Runner" is "gblnrnr"
await page.locator('.monster-picker-search input').first().fill('gblnrnr');
await page.waitForTimeout(1400);
const fuzzy = await page.evaluate(() => Array.from(document.querySelectorAll('.monster-search-results .monster-list-item')).slice(0, 3).map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 24)));
console.log(`fuzzy "gblnrnr" -> ${JSON.stringify(fuzzy)}`);
if (fuzzy.length === 0) fail.push('fuzzy query matched nothing');
if (!/goblin runner/i.test(fuzzy[0] || '')) fail.push(`fuzzy top hit was "${fuzzy[0]}", expected Goblin Runner`);

// 3. clicking a monster puts it in the active group
await page.locator('.monster-picker-search input').first().fill('goblin');
await page.waitForTimeout(1400);
await page.locator('.monster-search-results .monster-list-item').first().click();
await page.waitForTimeout(1200);
await page.locator('.monster-search-results .monster-list-item').nth(1).click();
await page.waitForTimeout(1200);
const afterAdds = await state();
console.log(`after 2 clicks: ${JSON.stringify(afterAdds.groups.map(g => `${g.name}${g.active ? '*' : ''}:${g.monsters}`))}`);
if (afterAdds.groups.length !== 1) fail.push(`clicking monsters changed the group count to ${afterAdds.groups.length}`);
if (afterAdds.groups[0].monsters !== 2) fail.push(`expected 2 monsters in Red, saw ${afterAdds.groups[0].monsters}`);

// 4. Shift+A starts the next group and it becomes the target
await page.keyboard.press('Shift+A');
await page.waitForTimeout(1200);
const afterShiftA = await state();
console.log(`after Shift+A: ${JSON.stringify(afterShiftA.groups.map(g => `${g.name}${g.active ? '*' : ''}:${g.monsters}`))}`);
if (afterShiftA.groups.length !== 2) fail.push(`Shift+A gave ${afterShiftA.groups.length} groups, expected 2`);
if (!afterShiftA.groups[1]?.active) fail.push('the new group is not the active one');
if (!/orange/i.test(afterShiftA.groups[1]?.name || '')) fail.push(`second group is "${afterShiftA.groups[1]?.name}", expected Orange`);

// and the search box still has what I typed, minus any stray "A"
const searchValue = await page.locator('.monster-picker-search input').first().inputValue();
console.log(`search box after Shift+A: "${searchValue}"`);
if (/A/.test(searchValue)) fail.push(`Shift+A typed a letter into the search box ("${searchValue}")`);

// 5. the next click lands in the new group
await page.locator('.monster-search-results .monster-list-item').first().click();
await page.waitForTimeout(1300);
const afterSecondAdd = await state();
console.log(`after 1 more click: ${JSON.stringify(afterSecondAdd.groups.map(g => `${g.name}${g.active ? '*' : ''}:${g.monsters}`))}`);
if (afterSecondAdd.groups[1]?.monsters !== 1) fail.push(`the click did not land in the new group (${afterSecondAdd.groups[1]?.monsters} monsters)`);
if (afterSecondAdd.groups[0]?.monsters !== 2) fail.push('the first group changed when it should not have');

// 6. clearing the query goes back to browsing by echelon
await page.locator('.monster-picker-search input').first().fill('');
await page.waitForTimeout(1400);
const browse = await page.evaluate(() => ({
	echelons: document.querySelectorAll('.echelon-section').length,
	expanders: document.querySelectorAll('.echelon-section .ant-collapse-item').length
}));
console.log(`cleared query: echelons=${browse.echelons} monsterGroups=${browse.expanders}`);
if (browse.echelons === 0) fail.push('clearing the search left the picker empty');
if (browse.expanders === 0) fail.push('browse mode has no monster groups to open');

await page.screenshot({ path: 'tmp/audit/builder-workflow.png' });
if (errors.length) fail.push(`page errors ${JSON.stringify(errors)}`);
await ctx.close();

console.log(fail.length === 0 ? '\nPASS' : '\nFAIL — ' + fail.join('; '));
await browser.close();
process.exit(fail.length === 0 ? 0 : 1);

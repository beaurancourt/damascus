// Renaming an enemy in the builder has to survive into play: the tracker rows
// and the reference stat block in the runner both take the new name, and the
// builder's own "Show stat block" popup does too. Asserts - exits non-zero.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_BASE || 'http://localhost:5174/';
const NAME = 'Vurkor';
// The stat block titles render through `text-transform: uppercase`, and
// innerText reports what is painted, so every comparison is case-insensitive.
const has = (haystack, needle) => haystack.toLowerCase().includes(needle.toLowerCase());
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const fail = [];
const errors = [];
page.on('pageerror', e => errors.push(e.message));

// 1. A new encounter with one monster in it.
await page.goto(BASE + '#/library/encounter', { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
await page.waitForTimeout(600);
await page.locator('button:has-text("Create")').first().click();
await page.waitForTimeout(1800);

await page.locator('.monster-picker-search input').first().fill('goblin');
await page.waitForTimeout(1400);
await page.locator('.monster-search-results .monster-list-item').first().click();
await page.waitForTimeout(1200);

const row = page.locator('.slot-row').first();
const stock = (await row.innerText()).split('\n')[0].trim();
console.log(`stock name: "${stock}"`);

// 2. Rename it.
await row.locator('button[title="Rename"]').first().click();
await page.waitForTimeout(400);
await row.locator('input').first().click();
await page.keyboard.type(NAME, { delay: 40 });
await row.locator('button[title="Rename"]').first().click();
await page.waitForTimeout(700);
const renamedRow = (await row.innerText()).split('\n')[0].trim();
console.log(`row after rename: "${renamedRow}"`);
if (renamedRow !== NAME) fail.push(`the builder row reads "${renamedRow}"`);

// 3. The builder's stat block popup takes the name too.
await row.locator('button[title="Show stat block"]').first().click();
await page.waitForTimeout(1000);
const popup = await page.locator('.modal-content').first().innerText().catch(() => '');
console.log(`builder stat block title line: "${popup.split('\n').map(l => l.trim()).filter(Boolean)[0] || '(none)'}"`);
if (!has(popup, NAME)) fail.push('the builder\'s stat block does not show the new name');
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

// 4. Name the encounter, save it, then start it.
await page.locator('.encounter-section input').first().fill('Rename Smoke');
await page.waitForTimeout(900);
await page.locator('button:has-text("Save Changes")').first().click();
await page.waitForTimeout(1600);

await page.evaluate(() => { location.hash = '#/library/encounter'; });
await page.waitForTimeout(1200);
await page.locator('text=Rename Smoke').first().click();
await page.waitForTimeout(900);
const play = page.locator('button:has(.anticon-play-circle)');
if (await play.count() === 0) {
	fail.push('no play button on the encounter, so the runner was never reached');
} else {
	await play.first().click({ force: true });
	await page.waitForTimeout(2200);
}
console.log(`url after start: ${page.url()}`);

// 5. In the runner, both the row and the reference stat block read "Vurkor".
const rows = await page.locator('.group-row, .monster-row, [class*="row"]').allInnerTexts().catch(() => []);
const rowText = rows.join(' ');
const blocks = await page.locator('.stat-block').allInnerTexts().catch(() => []);
const blockText = blocks.join(' \n ');
console.log(`runner stat blocks on screen: ${blocks.length}`);
console.log(`runner row mentions the name: ${has(rowText, NAME)}`);
console.log(`runner stat block first line: "${(blockText.split('\n').map(l => l.trim()).filter(Boolean)[0] || '(none)')}"`);
console.log(`runner stat block mentions the name: ${has(blockText, NAME)}`);
if (!has(rowText, NAME)) fail.push('the runner rows do not show the new name');
if (!has(blockText, NAME)) fail.push('the runner stat blocks do not show the new name');

await page.screenshot({ path: 'tmp/audit/rename-runner.png' });
if (errors.length) fail.push(`page errors ${JSON.stringify(errors)}`);
await ctx.close();

console.log(fail.length === 0 ? '\nPASS' : '\nFAIL — ' + fail.join('; '));
await browser.close();
process.exit(fail.length === 0 ? 0 : 1);

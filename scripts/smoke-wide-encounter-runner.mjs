// Capture the encounter runner on a wide (GM) viewport.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

// Base URL override, so this can be pointed at either dev server or a built
// site. Defaults to the GM dev server (npm run start:gm).
const BASE = process.env.SMOKE_BASE || 'http://localhost:5174/';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 1440, height: 900 },
	deviceScaleFactor: 1
});
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

// 1. Build a hero, if this site has hero tools. The GM site doesn't - heroes
// live on the player site - so the runner is exercised without one there.
const pregenButton = page.locator('button:has-text("Use a Premade Hero")');
if (await pregenButton.count()) {
	await pregenButton.first().click();
	await page.waitForTimeout(500);
	await page.locator('.ant-popover button').first().click();
	await page.waitForTimeout(1200);
	log('hero created');
} else {
	log('no hero tools on this site; running the encounter without a hero');
	await page.evaluate(() => location.hash = '#/');
	await page.waitForTimeout(500);
}

// 2. Build an encounter with a group
await page.evaluate(() => location.hash = '#/library/encounter');
await page.waitForTimeout(700);
await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
await page.waitForTimeout(400);
await page.locator('button:has-text("Create")').first().click().catch(() => {});
await page.waitForTimeout(900);

// Add a monster
const firstGroup = page.locator('.echelon-section[data-echelon="1"] .ant-collapse-header').first();
if (await firstGroup.count()) {
	await firstGroup.click().catch(() => {});
	await page.waitForTimeout(400);
	const addPlus = page.locator('.monster-list-item .add-btn').first();
	if (await addPlus.count()) {
		await addPlus.click().catch(() => {});
		await page.waitForTimeout(300);
		await addPlus.click().catch(() => {});
		await page.waitForTimeout(300);
	}
}

await page.locator('button').filter({ hasText: /^Save Changes$/i }).first().click().catch(() => {});
await page.waitForTimeout(800);

// 3. Back to encounter list and start it
await page.evaluate(() => location.hash = '#/library/encounter');
await page.waitForTimeout(700);
await page.locator('text=Unnamed Encounter').first().click().catch(() => {});
await page.waitForTimeout(700);
const playLocators = page.locator('button:has(.anticon-play-circle)');
if (await playLocators.count()) {
	await playLocators.first().click({ force: true }).catch(() => {});
	await page.waitForTimeout(1500);
}
log(`url after start: ${page.url()}`);

await page.screenshot({ path: 'tmp/audit/run-wide-01-runner.png', fullPage: false });
log('saved tmp/audit/run-wide-01-runner.png');

// Add a monster via the runner's "Add monster" button
const addMonsterBtn = page.locator('button').filter({ hasText: /(Add monster|New group with monster)/i }).first();
if (await addMonsterBtn.count()) {
	await addMonsterBtn.click().catch(() => {});
	await page.waitForTimeout(500);
	const firstSelectable = page.locator('.ant-drawer .selectable-panel').first();
	if (await firstSelectable.count()) {
		await firstSelectable.click().catch(() => {});
		await page.waitForTimeout(500);
	}
}

// Add a second monster (different one) so the alphabetized stat block stack is meaningful.
const addMonsterBtn2 = page.locator('button').filter({ hasText: /(Add monster|New group with monster)/i }).first();
if (await addMonsterBtn2.count()) {
	await addMonsterBtn2.click().catch(() => {});
	await page.waitForTimeout(500);
	const secondSelectable = page.locator('.ant-drawer .selectable-panel').nth(2);
	if (await secondSelectable.count()) {
		await secondSelectable.click().catch(() => {});
		await page.waitForTimeout(500);
	}
}

await page.screenshot({ path: 'tmp/audit/run-wide-02-with-monster.png', fullPage: false });
log('saved tmp/audit/run-wide-02-with-monster.png');

await page.evaluate(() => {
	const scrollers = Array.from(document.querySelectorAll('*')).filter(el => {
		const cs = getComputedStyle(el);
		return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
	});
	scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
	if (scrollers[0]) scrollers[0].scrollTo({ top: 400, behavior: 'instant' });
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp/audit/run-wide-03-scroll.png', fullPage: false });
log('saved tmp/audit/run-wide-03-scroll.png');

await browser.close();
console.log('done');

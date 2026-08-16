// Capture the encounter builder on a wide (GM) viewport so we can verify
// the two-column workspace+picker layout.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

// Base URL override, so this can be pointed at either dev server or a built
// site. Defaults to the player dev server (npm run start).
const BASE = process.env.SMOKE_BASE || 'http://localhost:5173/';
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

await page.evaluate(() => location.hash = '#/library/encounter');
await page.waitForTimeout(700);
await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
await page.waitForTimeout(400);
await page.locator('button:has-text("Create")').first().click().catch(() => {});
await page.waitForTimeout(900);
log(`url: ${page.url()}`);
await page.screenshot({ path: 'tmp/audit/enc-wide-01-top.png', fullPage: false });
log('saved tmp/audit/enc-wide-01-top.png');

// Add a group + monster
const addGroupBtn = page.locator('button').filter({ hasText: /^Add group$/i }).first();
if (await addGroupBtn.count()) {
	await addGroupBtn.click().catch(() => {});
	await page.waitForTimeout(400);
}

// Expand first echelon and add monster
const firstGroup = page.locator('.echelon-section[data-echelon="1"] .ant-collapse-header').first();
if (await firstGroup.count()) {
	await firstGroup.click().catch(() => {});
	await page.waitForTimeout(400);
	const addPlus = page.locator('.monster-list-item .add-btn').first();
	if (await addPlus.count()) {
		await addPlus.click().catch(() => {});
		await page.waitForTimeout(300);
	}
}

await page.screenshot({ path: 'tmp/audit/enc-wide-02-with-group.png', fullPage: false });
log('saved tmp/audit/enc-wide-02-with-group.png');

// Scroll inside the right column to verify sticky behavior
await page.evaluate(() => {
	const scrollers = Array.from(document.querySelectorAll('*')).filter(el => {
		const cs = getComputedStyle(el);
		return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
	});
	scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
	if (scrollers[0]) scrollers[0].scrollTo({ top: 600, behavior: 'instant' });
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp/audit/enc-wide-03-scroll.png', fullPage: false });
log('saved tmp/audit/enc-wide-03-scroll.png');

await browser.close();
console.log('done');

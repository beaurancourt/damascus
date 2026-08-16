// Drive the hero builder into a partially-complete state on Pixel 10 to
// verify the universal "Done" badge appears on resolved choice features.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

// Base URL override, so this can be pointed at either dev server or a built
// site. Defaults to the player dev server (npm run start).
const BASE = process.env.SMOKE_BASE || 'http://localhost:5173/';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 412, height: 915 },
	deviceScaleFactor: 1,
	isMobile: true,
	hasTouch: true
});
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

// The site lands on the hero list; "Create a New Hero" lives in its Add menu.
await page.locator('.app-header button:has([aria-label="plus"])').first().click();
await page.waitForTimeout(600);
await page.locator('.ant-popover button', { hasText: 'Create a New Hero' }).first().click();
await page.waitForTimeout(1200);
log(`url after create: ${page.url()}`);
if (!/\/hero\/edit\//.test(page.url())) {
	throw new Error(`expected to land in the hero builder, got ${page.url()}`);
}

// Navigate to Ancestry tab
await page.evaluate(() => {
	const url = new URL(location.href);
	url.hash = url.hash.replace(/\/start$/, '/ancestry');
	location.href = url.toString();
});
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp/audit/hero-builder-01-ancestry-pick.png', fullPage: false });
log('saved tmp/audit/hero-builder-01-ancestry-pick.png');

// Pick the first ancestry
await page.locator('.selectable-panel').first().click().catch(() => {});
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp/audit/hero-builder-02-after-pick.png', fullPage: false });
log('saved tmp/audit/hero-builder-02-after-pick.png');

// Scroll to find a choice and make it
await page.evaluate(() => {
	const scrollers = Array.from(document.querySelectorAll('*')).filter(el => {
		const cs = getComputedStyle(el);
		return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
	});
	scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
	if (scrollers[0]) scrollers[0].scrollTo({ top: 600 });
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp/audit/hero-builder-03-choices.png', fullPage: false });
log('saved tmp/audit/hero-builder-03-choices.png');

// Try to fully resolve a single-pick choice (radio)
const firstChoice = page.locator('.choice-option').first();
if (await firstChoice.count()) {
	await firstChoice.click().catch(() => {});
	await page.waitForTimeout(300);
}
await page.screenshot({ path: 'tmp/audit/hero-builder-04-choice-made.png', fullPage: false });
log('saved tmp/audit/hero-builder-04-choice-made.png');

await browser.close();
console.log('done');

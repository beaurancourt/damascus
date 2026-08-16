// Capture the YAML import modal on Pixel 10.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

// Base URL override, so this can be pointed at either dev server or a built
// site. Defaults to the GM dev server (npm run start:gm), since encounters
// are director content and only that site's library lists them.
const BASE = process.env.SMOKE_BASE || 'http://localhost:5174/';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 412, height: 915 },
	deviceScaleFactor: 1,
	isMobile: true,
	hasTouch: true,
	userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
});
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

await page.evaluate(() => location.hash = '#/library/encounter');
await page.waitForTimeout(500);

await page.locator('button:has-text("Add")').first().click();
await page.waitForTimeout(400);
const popButtons = await page.locator('button').allTextContents();
log(`popover buttons: ${JSON.stringify(popButtons.filter(b => b.trim()).slice(0, 20))}`);
await page.locator('button').filter({ hasText: /YAML/i }).first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp/audit/yaml-01-empty.png', fullPage: false });
log('saved tmp/audit/yaml-01-empty.png');

// Click "Insert example"
await page.locator('button:has-text("Insert example")').first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp/audit/yaml-02-example-top.png', fullPage: false });
log('saved tmp/audit/yaml-02-example-top.png');

// Scroll down to see the preview
const outer = page.locator('.encounter-import-modal').first();
await outer.evaluate(el => {
	// find the scrollable ancestor
	let cur = el;
	while (cur && cur !== document.body) {
		const cs = getComputedStyle(cur);
		if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
			cur.scrollTo({ top: 600 });
			return;
		}
		cur = cur.parentElement;
	}
	window.scrollTo({ top: 600 });
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp/audit/yaml-03-preview.png', fullPage: false });
log('saved tmp/audit/yaml-03-preview.png');

await browser.close();
console.log('done');

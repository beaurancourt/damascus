import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 412, height: 915 },
	deviceScaleFactor: 1,
	isMobile: true,
	hasTouch: true
});
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
await page.evaluate(() => location.hash = '#/library/encounter');
await page.waitForTimeout(500);

await page.locator('button:has-text("Add")').first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp/audit/enc-add-popover.png', fullPage: false });
console.log('saved');
await browser.close();

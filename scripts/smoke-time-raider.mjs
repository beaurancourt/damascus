// Time Raider has a Psionic Gift nested Choice — verify it renders inline.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

await page.evaluate(() => location.hash = '#/hero');
await page.waitForTimeout(400);
await page.locator('button:has-text("Add")').first().click();
await page.waitForTimeout(300);
await page.locator('button:has-text("Create a New Hero")').first().click();
await page.waitForTimeout(700);

const heroIdMatch = page.url().match(/\/hero\/edit\/([^/]+)/);
await page.evaluate(id => location.hash = `#/hero/edit/${id}/ancestry`, heroIdMatch[1]);
await page.waitForTimeout(700);

const tr = page.locator('.selectable-panel.selectable').filter({ hasText: 'Time Raider' }).first();
if (await tr.isVisible().catch(() => false)) {
	await tr.click();
} else {
	log('Time Raider not found');
	await browser.close();
	process.exit(1);
}
await page.waitForTimeout(700);

// Scroll to find Psionic Gift
const outer = page.locator('.hero-edit-content').first();
await outer.evaluate(el => el.scrollTo({ top: 900 }));
await page.waitForTimeout(300);

await page.screenshot({ path: 'tmp/audit/time-raider-psionic.png', fullPage: false });
log('saved tmp/audit/time-raider-psionic.png');

await browser.close();
console.log('done');

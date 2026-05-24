// Devil has a Multiple feature (Silver Tongue) containing a nested Choice (Interpersonal Skill).
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
await page.waitForTimeout(500);

await page.locator('button:has-text("Add")').first().click();
await page.waitForTimeout(400);
await page.locator('button:has-text("Create a New Hero")').first().click();
await page.waitForTimeout(700);

const url = page.url();
const heroIdMatch = url.match(/\/hero\/edit\/([^/]+)/);
await page.evaluate(id => location.hash = `#/hero/edit/${id}/ancestry`, heroIdMatch[1]);
await page.waitForTimeout(700);

// Pick Devil
const devil = page.locator('.selectable-panel.selectable').filter({ hasText: 'Devil' }).first();
if (await devil.isVisible().catch(() => false)) {
	await devil.click();
} else {
	log('Devil ancestry not found, falling back to first');
	await page.locator('.selectable-panel.selectable').first().click();
}
await page.waitForTimeout(700);

await page.screenshot({ path: 'tmp/audit/02-devil-selected.png', fullPage: false });
log('saved tmp/audit/02-devil-selected.png');

// Scroll the outer content container to view bottom (language section)
const outer = page.locator('.hero-edit-content').first();
await outer.evaluate(el => el.scrollTo({ top: el.scrollHeight }));
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp/audit/03-devil-scrolled.png', fullPage: false });

await browser.close();
console.log('done');

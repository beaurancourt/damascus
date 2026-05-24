// Visually checks ancestry edit page after denesting.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// Set dark theme
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
await page.waitForTimeout(200);

// Go to heroes page
await page.evaluate(() => location.hash = '#/hero');
await page.waitForTimeout(500);

// Click Add button → popover
await page.locator('button:has-text("Add")').first().click({ timeout: 5000 }).catch(err => log(`add click err: ${err.message}`));
await page.waitForTimeout(400);
// Click "Create a New Hero"
await page.locator('button:has-text("Create a New Hero")').first().click({ timeout: 5000 }).catch(err => log(`create click err: ${err.message}`));
await page.waitForTimeout(700);

await page.screenshot({ path: 'tmp/audit/00-after-add.png', fullPage: false });
log(`url after add: ${page.url()}`);

// Try direct URL nav to ancestry section
const heroIdMatch = page.url().match(/\/hero\/edit\/([^/]+)/);
if (heroIdMatch) {
	await page.evaluate(id => location.hash = `#/hero/edit/${id}/ancestry`, heroIdMatch[1]);
	await page.waitForTimeout(700);
}

await page.screenshot({ path: 'tmp/audit/01-ancestry-list.png', fullPage: false });

const dk = page.locator('.selectable-panel.selectable').filter({ hasText: 'Dragon Knight' }).first();
if (await dk.isVisible().catch(() => false)) {
	await dk.click();
} else {
	await page.locator('.selectable-panel.selectable').first().click({ timeout: 5000 }).catch(() => {});
}
await page.waitForTimeout(700);

await page.screenshot({ path: 'tmp/audit/02-ancestry-selected.png', fullPage: false });
log('saved tmp/audit/02-ancestry-selected.png');

// Scroll the outer content container (where scrollbar now lives)
const outer = page.locator('.hero-edit-content').first();
const info = await outer.evaluate(el => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
log(`outer scroll: scrollHeight=${info.scrollHeight}, clientHeight=${info.clientHeight}`);
await outer.evaluate(el => el.scrollTo({ top: 1000 }));
await page.waitForTimeout(300);
const after = await outer.evaluate(el => el.scrollTop);
log(`scrollTop after scrollTo(1000): ${after}`);
await page.screenshot({ path: 'tmp/audit/02b-traits-scrolled.png', fullPage: false });
log('saved tmp/audit/02b-traits-scrolled.png');

await browser.close();
console.log('done');

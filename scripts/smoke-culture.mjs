// Verify Culture page is single-column with interwoven choices.
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
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

await page.evaluate(() => location.hash = '#/hero');
await page.waitForTimeout(400);
await page.locator('button:has-text("Add")').first().click();
await page.waitForTimeout(300);
await page.locator('button:has-text("Create a New Hero")').first().click();
await page.waitForTimeout(700);

const id = page.url().match(/\/hero\/edit\/([^/]+)/)[1];

// Pick Dragon Knight ancestry first
await page.evaluate(id => location.hash = `#/hero/edit/${id}/ancestry`, id);
await page.waitForTimeout(500);
const dk = page.locator('.selectable-panel.selectable').filter({ hasText: 'Dragon Knight' }).first();
await dk.click();
await page.waitForTimeout(500);

// Navigate to culture
await page.evaluate(id => location.hash = `#/hero/edit/${id}/culture`, id);
await page.waitForTimeout(500);

// Pick the Dragon Knight culture (Ancestral) from "Your Ancestry"
const dragonKnightCulture = page.locator('.selectable-panel.selectable').filter({ hasText: 'Dragon Knight' }).first();
if (await dragonKnightCulture.isVisible().catch(() => false)) {
	await dragonKnightCulture.click();
} else {
	log('Dragon Knight culture not found; trying first option');
	await page.locator('.selectable-panel.selectable').first().click();
}
await page.waitForTimeout(700);

await page.screenshot({ path: 'tmp/audit/culture-top.png', fullPage: false });
log('saved tmp/audit/culture-top.png');

// Scroll to see Bureaucratic / Martial sections
const outer = page.locator('.hero-edit-content').first();
await outer.evaluate(el => el.scrollTo({ top: 800 }));
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp/audit/culture-scrolled.png', fullPage: false });
log('saved tmp/audit/culture-scrolled.png');

await browser.close();
console.log('done');

// Verify Career page is single-column with interwoven choices + inciting incidents radio.
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

// Navigate to career
await page.evaluate(id => location.hash = `#/hero/edit/${id}/career`, id);
await page.waitForTimeout(700);

await page.screenshot({ path: 'tmp/audit/career-list.png', fullPage: false });
log('saved tmp/audit/career-list.png');

// Pick the first career
await page.locator('.selectable-panel.selectable').first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp/audit/career-selected.png', fullPage: false });
log('saved tmp/audit/career-selected.png');

// Scroll down to see inciting incidents
const outer = page.locator('.hero-edit-content').first();
await outer.evaluate(el => el.scrollTo({ top: el.scrollHeight }));
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp/audit/career-bottom.png', fullPage: false });
log('saved tmp/audit/career-bottom.png');

await browser.close();
console.log('done');

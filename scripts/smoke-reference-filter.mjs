// Check what happens when typing in the reference modal's filter
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.locator('button[title="Reference"]').first().click();
await page.waitForTimeout(700);

await page.locator('.reference-modal input').first().fill('forced');
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp/audit/filter-forced.png', fullPage: false });

const virtualHeadings = await page.locator('.rules-entry.virtual').count();
const ruleEntries = await page.locator('.rules-entry:not(.virtual)').count();
const sectionHeadings = await page.locator('.rules-section-heading').count();
console.log(`virtual headings visible: ${virtualHeadings}`);
console.log(`rule entries visible: ${ruleEntries}`);
console.log(`section headings visible: ${sectionHeadings}`);

await browser.close();
console.log('done');

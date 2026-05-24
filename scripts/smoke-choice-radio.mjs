// Verify the radio-style Choice configurator works: click to select, indicator updates.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

await page.evaluate(() => location.hash = '#/hero');
await page.waitForTimeout(400);
await page.locator('button:has-text("Add")').first().click();
await page.waitForTimeout(300);
await page.locator('button:has-text("Create a New Hero")').first().click();
await page.waitForTimeout(700);

const url = page.url();
const id = url.match(/\/hero\/edit\/([^/]+)/)[1];
await page.evaluate(id => location.hash = `#/hero/edit/${id}/ancestry`, id);
await page.waitForTimeout(700);

// Pick Dragon Knight
await page.locator('.selectable-panel.selectable').filter({ hasText: 'Dragon Knight' }).first().click();
await page.waitForTimeout(700);

// Confirm 6 unselected options
const optionRows = page.locator('.choice-option');
const count = await optionRows.count();
log(`Wyrmplate options visible: ${count}`);

// Click "Acid Immunity"
const acidRow = optionRows.filter({ hasText: 'Acid Immunity' }).first();
await acidRow.click();
await page.waitForTimeout(400);

// Verify acid row is now selected
const acidSelected = await acidRow.evaluate(el => el.classList.contains('selected'));
log(`Acid row selected? ${acidSelected}`);

// Click "Fire Immunity" - should swap (single-select)
const fireRow = optionRows.filter({ hasText: 'Fire Immunity' }).first();
await fireRow.click();
await page.waitForTimeout(400);

const fireSelected = await fireRow.evaluate(el => el.classList.contains('selected'));
const acidStillSelected = await acidRow.evaluate(el => el.classList.contains('selected'));
log(`After clicking Fire — fire selected? ${fireSelected}, acid still selected? ${acidStillSelected}`);

await page.screenshot({ path: 'tmp/audit/choice-radio.png', fullPage: false });

await browser.close();
console.log('done');

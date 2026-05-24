// Verifies search → condition opens the reference modal scrolled to the condition.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp/audit';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

log('open app, search for "frightened"');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.keyboard.press('/');
await page.waitForTimeout(400);
await page.locator('.global-search-modal input').first().fill('frightened');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/condition-jump-01-search.png`, fullPage: false });

log('click the Frightened result');
const frightened = page.locator('.search-result').filter({ hasText: /^Frightened/ }).first();
await frightened.click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/condition-jump-02-scrolled.png`, fullPage: false });

log('check Frightened heading is in viewport');
const heading = page.locator('#condition-frightened').first();
log(`Frightened anchor exists? ${await heading.isVisible().catch(() => false)}`);

await browser.close();
console.log('done');

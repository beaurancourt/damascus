// Captures key surfaces after the Forge Steel → Damascus rename.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('tmp/audit/rename', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
log(`document title: "${await page.title()}"`);
await page.screenshot({ path: 'tmp/audit/rename/01-welcome.png', fullPage: false });

await page.locator('button[title="About"]').first().click().catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp/audit/rename/02-about.png', fullPage: false });

await browser.close();
console.log('done');

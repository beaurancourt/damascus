// Verifies the reference modal is a single scrollable doc ordered by PDF page,
// with no tabs, and that startRule jumps to the right anchor.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp/audit';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

log('open the app');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

log('open reference modal');
await page.locator('button[title="Reference"]').first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/single-doc-01-top.png`, fullPage: false });

log('confirm no tab segmented control is visible');
const tabSeg = page.locator('.ant-segmented').filter({ hasText: /Rules.*Conditions.*Skills/ });
const tabVisible = await tabSeg.first().isVisible().catch(() => false);
log(`tab segmented visible? ${tabVisible}`);

log('check first rule rendered (should be lowest page number)');
const firstHeading = page.locator('.rules-entry-heading').first();
log(`first heading: "${(await firstHeading.textContent())?.trim()}"`);

log('search for "push"');
await page.locator('.reference-modal input').first().fill('push');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/single-doc-02-search-push.png`, fullPage: false });

log('clear search');
await page.locator('.reference-modal input').first().fill('');
await page.waitForTimeout(400);

log('use global search to jump into Forced Movement');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.keyboard.press('/');
await page.waitForTimeout(400);
await page.locator('.global-search-modal input').first().fill('push');
await page.waitForTimeout(500);
await page.locator('.search-result').first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/single-doc-03-jump-to-forced-movement.png`, fullPage: false });

log('check the Forced Movement rule heading is visible and scrolled to');
const forcedMovement = page.getByRole('heading', { name: /^Forced Movement/ }).first();
log(`Forced Movement heading visible? ${await forcedMovement.isVisible().catch(() => false)}`);

await browser.close();
console.log('done');

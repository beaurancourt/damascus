// Verifies the rules reference modal renders the PDF-derived hierarchy.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp/audit';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

log('open app, then reference modal');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/reference-tree-00-welcome.png`, fullPage: false });
const refBtn = page.locator('button[title="Reference"]').first();
await refBtn.click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/reference-tree-01.png`, fullPage: false });

log('check the Combat section header is present');
const combatHeader = page.locator('.rules-section').filter({ hasText: /^Combat$/ }).first();
const combatVisible = await combatHeader.isVisible().catch(() => false);
log(`Combat section visible? ${combatVisible}`);

log('click Forced Movement');
const fm = page.getByRole('button', { name: /Forced Movement/ }).first();
await fm.click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/reference-tree-02-forced-movement.png`, fullPage: false });

log('verify Subsections panel shows Slamming into Creatures');
const subsections = page.locator('.rules-children').first();
const subsVisible = await subsections.isVisible().catch(() => false);
log(`Subsections visible? ${subsVisible}`);
const slamming = page.locator('.rules-children').getByRole('button', { name: /Slamming into Creatures/ }).first();
log(`Slamming child button visible? ${await slamming.isVisible().catch(() => false)}`);

log('click Slamming into Creatures');
await slamming.click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/reference-tree-03-slamming.png`, fullPage: false });

log('verify breadcrumb: Combat › Forced Movement › Slamming into Creatures');
const breadcrumb = page.locator('.rules-breadcrumb').first();
const bcText = await breadcrumb.textContent().catch(() => '');
log(`breadcrumb: ${bcText?.trim()}`);

await browser.close();
console.log('done');

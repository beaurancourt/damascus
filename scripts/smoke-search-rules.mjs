// Verifies that searching for "push" surfaces a Rules result that opens the reference modal.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp/audit';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true
});
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

log('open the app');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

log('press "/" to open search');
await page.keyboard.press('/');
await page.waitForTimeout(400);

log('type "push"');
const input = page.locator('.global-search-modal input').first();
await input.fill('push');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/search-push.png`, fullPage: false });

const rulesSection = await page.locator('.search-group-header', { hasText: /Rules/ }).first().isVisible().catch(() => false);
log(`Rules section visible? ${rulesSection}`);

// First result on the page should be a rule
const firstResult = page.locator('.search-result').first();
const firstText = await firstResult.textContent().catch(() => '');
log(`First result text: ${firstText?.trim().slice(0, 120)}`);

log('click first result (expect reference modal opens to Forced Movement / Push)');
await firstResult.click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/search-push-reference.png`, fullPage: false });

await browser.close();
console.log('done');

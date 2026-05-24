// Smoke test for the global fuzzy search.
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
await page.waitForTimeout(500);

log('press "/" to open search');
await page.keyboard.press('/');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/search-01-opened.png`, fullPage: false });

log('type "gobln" (typo) — should fuzzy-match goblins');
await page.keyboard.type('gobln');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/search-02-typo-gobln.png`, fullPage: false });
const goblinHit = await page.getByText(/Goblin/).first().isVisible().catch(() => false);
log(`goblin result visible? ${goblinHit}`);

log('clear and search "dragon"');
const input = page.locator('.global-search-modal input').first();
await input.fill('dragon');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/search-04-dragon.png`, fullPage: false });

log('click first result to navigate');
const firstResult = page.locator('.search-result').first();
await firstResult.click();
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/search-05-after-click.png`, fullPage: false });
log(`url after click: ${page.url()}`);

log('reopen via Ctrl-K and verify');
await page.keyboard.press('Control+k');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/search-06-ctrlk.png`, fullPage: false });

await browser.close();
console.log('done');

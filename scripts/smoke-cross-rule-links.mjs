// Verifies that rule content auto-links references to other rules.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp/audit';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

log('open reference modal');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.locator('button[title="Reference"]').first().click();
await page.waitForTimeout(700);

log('scroll to Forced Movement (which mentions other rules in its content)');
const fmHeading = page.locator('#rule-forced-movement');
await fmHeading.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/cross-rule-01-forced-movement.png`, fullPage: false });

log('count anchor links within Forced Movement entry');
const fmAnchors = await page.locator('#rule-forced-movement a[href^="#rule-"]').count();
log(`anchors found in Forced Movement: ${fmAnchors}`);

if (fmAnchors > 0) {
	const firstAnchor = page.locator('#rule-forced-movement a[href^="#rule-"]').first();
	const text = (await firstAnchor.textContent()) || '';
	const href = await firstAnchor.getAttribute('href');
	log(`first anchor: text="${text.trim()}" href="${href}"`);

	log('click the first anchor and verify scroll');
	await firstAnchor.click();
	await page.waitForTimeout(900);
	await page.screenshot({ path: `${OUT}/cross-rule-02-after-click.png`, fullPage: false });

	// Verify the URL hash did NOT change (we intercepted the click)
	log(`url after click: ${page.url()}`);
}

await browser.close();
console.log('done');

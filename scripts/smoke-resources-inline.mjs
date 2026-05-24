// Verifies the resources controls are editable inline without opening a modal.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp/audit/hero';
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

log('add a premade hero');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.getByRole('button', { name: /Use a Premade Hero/i }).first().click();
await page.waitForTimeout(900);
await page.getByText(/^Keth$/).first().click();
await page.waitForTimeout(1200);
const btns = await page.getByRole('button').all();
for (const btn of btns) {
	const text = (await btn.textContent().catch(() => '')) || '';
	if (/Use|Make|Save|Add to|Confirm/i.test(text) && await btn.isEnabled().catch(() => false)) {
		await btn.click();
		await page.waitForTimeout(1500);
		break;
	}
}

log('current url after add: ' + page.url());
// The premade flow usually auto-redirects to /hero/view/<id>
if (!page.url().includes('/hero/view/')) {
	await page.goto('http://localhost:5173/#/hero', { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	// Try clicking Keth wherever it is
	await page.getByText(/^Keth$/).first().click();
	await page.waitForTimeout(1200);
}

log('verify Surges NumberSpin is visible');
const surgesLabel = page.locator('.quick-resources-panel').getByText('Surges').first();
const visible = await surgesLabel.isVisible().catch(() => false);
log(`Surges label visible? ${visible}`);

log('click + on the Surges NumberSpin twice');
// Find the NumberSpin containing "Surges" label and click its plus button
const surgesPanel = page.locator('.number-spin').filter({ hasText: /Surges/ }).first();
const plus = surgesPanel.locator('.spin-button').last();
await plus.click();
await page.waitForTimeout(300);
await plus.click();
await page.waitForTimeout(500);

log('check Surges value updated to 2');
const surgesText = await surgesPanel.textContent();
log(`Surges panel text: ${surgesText?.trim().slice(0, 80)}`);

await page.screenshot({ path: `${OUT}/quick-resources-after-edits.png`, fullPage: true });

await browser.close();
console.log('done');

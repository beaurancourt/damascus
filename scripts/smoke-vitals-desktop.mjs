// Verifies the inline vitals panel renders at desktop width.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp/audit/hero';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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

log('open Keth\'s view');
const heroCard = page.locator('button, [role="button"]').filter({ hasText: /Keth/i }).first();
if (await heroCard.isVisible().catch(() => false)) {
	await heroCard.click();
	await page.waitForTimeout(1500);
}
await page.screenshot({ path: `${OUT}/desktop-inline-view.png`, fullPage: true });

const takeDamage = page.getByRole('button', { name: /Take Damage/i }).first();
log(`Take Damage visible? ${await takeDamage.isVisible().catch(() => false)}`);
await browser.close();
console.log('done');

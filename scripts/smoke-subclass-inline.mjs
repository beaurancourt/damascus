// Verifies the subclass picker is inline (no drawer).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('tmp/audit/hero', { recursive: true });

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

log('add a premade Keth (already has a class with subclass)');
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

log('go to hero edit, switch to Class section');
await page.goto('http://localhost:5173/#/hero', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const editBtn = page.getByRole('button', { name: /Edit/i }).first();
if (await editBtn.isVisible().catch(() => false)) {
	await editBtn.click();
	await page.waitForTimeout(900);
}
// Switch to Class chip
const classChip = page.locator('.hero-edit-chip', { hasText: /CLASS/i }).first();
if (await classChip.isVisible().catch(() => false)) {
	await classChip.click();
	await page.waitForTimeout(700);
}
await page.screenshot({ path: 'tmp/audit/hero/subclass-01-class-section.png', fullPage: true });

// Find the "Choose ... subclass" button (with the inline picker indicator)
const chooseBtn = page.getByRole('button', { name: /Choose .*(subclass|aspect|path|nature)/i }).first();
const chooseVisible = await chooseBtn.isVisible().catch(() => false);
log(`"Choose ..." button visible? ${chooseVisible}`);

if (chooseVisible) {
	await chooseBtn.scrollIntoViewIfNeeded();
	await chooseBtn.click();
	await page.waitForTimeout(700);
	await page.screenshot({ path: 'tmp/audit/hero/subclass-02-inline-open.png', fullPage: true });

	// The inline picker should be present, drawer NOT present
	const picker = page.locator('.inline-subclass-picker').first();
	log(`inline subclass picker visible? ${await picker.isVisible().catch(() => false)}`);
	const drawerMask = page.locator('.ant-drawer-mask').first();
	log(`drawer mask present? ${await drawerMask.isVisible().catch(() => false)}`);
}

await browser.close();
console.log('done');

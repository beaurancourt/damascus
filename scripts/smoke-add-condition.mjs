// Verifies the condition popover opens and conditions can be added inline.
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

log('add a premade hero (Keth)');
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

log('on hero view, scroll to conditions');
const addConditionBtn = page.getByRole('button', { name: /Add a condition/i }).first();
await addConditionBtn.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/add-condition-01-before.png`, fullPage: false });

log('click Add a condition');
await addConditionBtn.click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/add-condition-02-popover.png`, fullPage: false });

log('check popover content visible');
const popoverGrid = page.locator('.add-condition-grid').first();
log(`popover visible? ${await popoverGrid.isVisible().catch(() => false)}`);

log('click "Slowed"');
await page.locator('.add-condition-chip').filter({ hasText: /^Slowed$/ }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/add-condition-03-after-add.png`, fullPage: false });

log('verify Slowed condition appears in list');
const slowedItem = page.locator('.condition-panel, [class*="condition"]').filter({ hasText: /Slowed/i }).first();
log(`Slowed shown in list? ${await slowedItem.isVisible().catch(() => false)}`);

await browser.close();
console.log('done');

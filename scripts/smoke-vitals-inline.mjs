// Verifies the vitals controls are inline on the hero view (no modal needed).
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

log('use a premade hero (Keth)');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const premadeBtn = page.getByRole('button', { name: /Use a Premade Hero/i }).first();
await premadeBtn.click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/inline-00-premade-list.png`, fullPage: false });

const keth = page.getByText(/^Keth$/).first();
await keth.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/inline-00a-keth-detail.png`, fullPage: true });

// The premade detail modal usually has a "Make My Hero" or similar button.
const useBtns = await page.getByRole('button').all();
for (const btn of useBtns) {
	const text = (await btn.textContent().catch(() => '')) || '';
	if (/Use|Make|Save|Add to|Confirm/i.test(text)) {
		const enabled = await btn.isEnabled().catch(() => false);
		log(`candidate confirm button: "${text.trim()}" enabled=${enabled}`);
		if (enabled) {
			await btn.click();
			await page.waitForTimeout(1500);
			break;
		}
	}
}
await page.screenshot({ path: `${OUT}/inline-00b-after-add.png`, fullPage: false });

log('open Keth\'s view (auto-redirect should land on /hero/view/...)');
const heroCard = page.locator('button, [role="button"]').filter({ hasText: /Keth/i }).first();
if (await heroCard.isVisible().catch(() => false)) {
	await heroCard.click();
	await page.waitForTimeout(1500);
}
await page.screenshot({ path: `${OUT}/inline-01-view.png`, fullPage: true });
log(`url: ${page.url()}`);

log('check inline vitals controls are visible');
const takeDamage = page.getByRole('button', { name: /Take Damage/i }).first();
const tdVisible = await takeDamage.isVisible().catch(() => false);
log(`"Take Damage" button visible (no click)? ${tdVisible}`);

const recoveriesTab = page.getByText(/^Recoveries$/).first();
const recVisible = await recoveriesTab.isVisible().catch(() => false);
log(`"Recoveries" tab visible? ${recVisible}`);

const conditionsHeader = page.getByText(/^Conditions$/).first();
const condVisible = await conditionsHeader.isVisible().catch(() => false);
log(`"Conditions" header visible? ${condVisible}`);

log('take 5 damage to verify inline edit works');
const stepperPlus = page.locator('.number-spin button').filter({ hasText: '+' }).first();
// Use the number input directly instead
const numInput = page.locator('.global-search-modal input, .health-panel input[type="number"]').first();
if (await numInput.isVisible().catch(() => false)) {
	await numInput.fill('5');
	await page.waitForTimeout(200);
	await takeDamage.click();
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${OUT}/inline-02-after-damage.png`, fullPage: true });
}

await browser.close();
console.log('done');

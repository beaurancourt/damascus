// Verifies that clicking a monster/hero in the director expands inline (not drawer).
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = 'tmp/audit/director';
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

log('add premade hero + import encounter + run');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.getByRole('button', { name: /Use a Premade Hero/i }).first().click();
await page.waitForTimeout(800);
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

await page.goto('http://localhost:5173/#/library/encounter', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.getByRole('button', { name: /^Add/ }).first().click();
await page.waitForTimeout(500);
await page.getByText(/Import from YAML/i).first().click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: /Open YAML importer/i }).click({ force: true });
await page.waitForTimeout(800);
await page.locator('textarea').first().fill(readFileSync('skills/encounter-builder/reference/examples/standard-lvl1.yaml', 'utf8'));
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Run live/i }).click();
await page.waitForTimeout(2500);

log('director loaded — click "Goblin Monarch"');
const monarchRow = page.getByText(/^Goblin Monarch$/).first();
await monarchRow.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await monarchRow.click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/04-monster-expanded.png`, fullPage: true });

log('check Take Damage button visible inline (not in a drawer)');
const takeDamage = page.getByRole('button', { name: /Take Damage/i }).first();
const visible = await takeDamage.isVisible().catch(() => false);
log(`Take Damage visible inline? ${visible}`);

// Drawer should NOT be open
const drawerMask = page.locator('.ant-drawer-mask').first();
const drawerOpen = await drawerMask.isVisible().catch(() => false);
log(`drawer open? ${drawerOpen}`);

await browser.close();
console.log('done');

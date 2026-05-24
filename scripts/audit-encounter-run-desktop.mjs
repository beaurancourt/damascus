import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = 'tmp/audit/director';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

log('add Keth');
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

log('import + run live');
await page.goto('http://localhost:5173/#/library/encounter', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.getByRole('button', { name: /^Add/ }).first().click();
await page.waitForTimeout(500);
await page.getByText(/Import from YAML/i).first().click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: /Open YAML importer/i }).click({ force: true });
await page.waitForTimeout(800);
const goodYaml = readFileSync('skills/encounter-builder/reference/examples/standard-lvl1.yaml', 'utf8');
await page.locator('textarea').first().fill(goodYaml);
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Run live/i }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/desktop-director.png`, fullPage: false });
log(`url: ${page.url()}`);
await browser.close();
console.log('done');

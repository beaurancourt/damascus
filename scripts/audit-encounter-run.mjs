// Sets up an encounter via YAML import + premade hero, then opens the director
// and captures the run panel + the hero vitals modal that fires on hero click.
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

log('add premade Keth so we have a hero to add to the encounter');
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

log('navigate to /library/encounter and import YAML');
await page.goto('http://localhost:5173/#/library/encounter', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.getByRole('button', { name: /^Add/ }).first().click();
await page.waitForTimeout(500);
await page.getByText(/Import from YAML/i).first().click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: /Open YAML importer/i }).click({ force: true });
await page.waitForTimeout(800);
const goodYaml = readFileSync('skills/encounter-builder/reference/examples/standard-lvl1.yaml', 'utf8');
const textarea = page.locator('textarea').first();
await textarea.fill(goodYaml);
await page.waitForTimeout(500);

log('Run live to open the encounter in director');
await page.getByRole('button', { name: /Run live/i }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/01-director-fresh.png`, fullPage: true });

log(`url: ${page.url()}`);

log('toggle Reminders to show sidebar');
const remindersBtn = page.getByRole('button', { name: /^Reminders$/ }).first();
if (await remindersBtn.isVisible().catch(() => false)) {
	await remindersBtn.click();
	await page.waitForTimeout(700);
	await page.screenshot({ path: `${OUT}/02-reminders.png`, fullPage: true });
}

log('toggle back to Combatants');
const combatBtn = page.getByRole('button', { name: /^Combatants$/ }).first();
if (await combatBtn.isVisible().catch(() => false)) {
	await combatBtn.click();
	await page.waitForTimeout(700);
	await page.screenshot({ path: `${OUT}/03-back-to-combatants.png`, fullPage: true });
}

await browser.close();
console.log('done');

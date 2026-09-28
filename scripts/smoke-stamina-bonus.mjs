// A hero's max stamina is where the sheet's other vitals come from - recovery
// value is a third of it, and the winded and dead thresholds are halves of it -
// but the only way to raise it by hand is a Stamina bonus in the customize
// screen. That screen lives behind the tools menu, so this walks a player's
// route to it: tools -> Customize -> + -> Stat Bonus, then reads the gauge.
// Asserts - exits non-zero. Needs the player site (npm start, port 5173).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { stubRemoteApi } from './stub-remote-api.mjs';

const BASE = process.env.SMOKE_BASE || 'http://localhost:5173/';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
await stubRemoteApi(ctx);
const page = await ctx.newPage();
const fail = [];
page.on('pageerror', e => fail.push(`page error: ${e.message}`));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.locator('.app-header button:has([aria-label="plus"])').first().click();
await page.waitForTimeout(700);
await page.locator('.ant-popover').getByText('Use a premade example').first().click();
await page.waitForTimeout(700);
await page.locator('.ant-popover .container-button').first().click();
await page.waitForTimeout(2500);

// The readout prints max stamina (a fresh hero has taken no damage), and the
// "Spend a Recovery" button prints the recovery value derived from it.
const sheet = async () => {
	const bars = (await page.locator('.health-bars').first().innerText()).replace(/\s+/g, ' ');
	const panel = (await page.locator('.health-panel:has(.health-bars)').first().innerText()).replace(/\s+/g, ' ');
	const stamina = bars.match(/STAMINA (\d+)(?: \/ (\d+))?/);
	const recoveryValue = panel.match(/Regain up to (\d+) Stamina/);
	return {
		stamina: stamina ? Number.parseInt(stamina[2] || stamina[1], 10) : null,
		recoveryValue: recoveryValue ? Number.parseInt(recoveryValue[1], 10) : null
	};
};
const before = await sheet();
console.log(`sheet before: stamina=${before.stamina} recoveryValue=${before.recoveryValue}`);
if (before.stamina === null || before.recoveryValue === null) {
	fail.push('could not read the starting stamina and recovery value off the sheet');
}

await page.locator('.app-header button[title="Tools"]').first().click();
await page.waitForTimeout(600);
const toolEntries = (await page.locator('.ant-popover button').allInnerTexts()).map(t => t.trim()).filter(Boolean);
console.log(`tools menu: ${JSON.stringify(toolEntries)}`);
if (!toolEntries.includes('Customize')) {
	fail.push('the tools menu does not offer Customize, so a player cannot reach the stat bonuses');
} else {
	await page.locator('.ant-popover button', { hasText: /^Customize$/ }).first().click();
	await page.waitForTimeout(900);

	if (await page.locator('.hero-customize-modal').count() === 0) {
		fail.push('clicking Customize did not open the customize modal');
	}

	await page.locator('.hero-customize-modal .header-text-panel button').last().click();
	await page.waitForTimeout(600);
	const statBonus = page.locator('.ant-popover button', { hasText: /^Stat Bonus$/ }).first();
	if (await statBonus.count() === 0) {
		fail.push('the customize menu has no Stat Bonus');
	} else {
		await statBonus.click();
		await page.waitForTimeout(1000);
	}

	await page.keyboard.press('Escape');
	await page.waitForTimeout(900);
}
const after = await sheet();
console.log(`sheet after:  stamina=${after.stamina} recoveryValue=${after.recoveryValue}`);

// The default Stat Bonus is Stamina + 6, which is a twentieth of that hero's
// stamina - enough to move the recovery value, since that is a third of the max.
if (before.stamina !== null && after.stamina !== before.stamina + 6) {
	fail.push(`stamina went ${before.stamina} -> ${after.stamina}, expected +6`);
}
if (after.stamina !== null && after.recoveryValue !== Math.floor(after.stamina / 3)) {
	fail.push(`recovery value is ${after.recoveryValue}, but a third of ${after.stamina} stamina is ${Math.floor(after.stamina / 3)}`);
}
if (before.recoveryValue !== null && after.recoveryValue !== null && after.recoveryValue <= before.recoveryValue) {
	fail.push(`recovery value did not follow the stamina bonus: ${before.recoveryValue} -> ${after.recoveryValue}`);
}

await page.screenshot({ path: 'tmp/audit/stamina-bonus.png' });
await ctx.close();
console.log(fail.length === 0 ? '\nPASS' : `\nFAIL — ${fail.join('; ')}`);
await browser.close();
process.exit(fail.length === 0 ? 0 : 1);

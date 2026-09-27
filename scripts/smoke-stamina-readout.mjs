// The stamina readout: bars rather than nested rings. The bar has to be drawn
// from the same numbers the panel prints, recoveries have to be one pip each,
// temporary stamina has to ride along on the end of the bar, and a winded hero
// has to read as one - red fill and a chip - without having to compare numbers.
// Asserts - exits non-zero. Needs the player site (npm start, port 5173).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SMOKE_BASE || 'http://localhost:5173/';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
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

const panel = page.locator('.health-panel:has(.health-bars)').first();
const input = panel.locator('.stamina-amount input');

// The readout is a bar, not a ring any more.
console.log(`bars=${await page.locator('.health-bars').count()} rings=${await page.locator('.health-gauge').count()}`);
if (await page.locator('.health-bars').count() === 0) {
	fail.push('no bar readout on the panel');
}
if (await page.locator('.health-gauge').count() > 0) {
	fail.push('the old ring readout is still on the page');
}

const readout = async () => {
	const text = (await page.locator('.health-bars').first().innerText()).replace(/\s+/g, ' ');
	const stamina = text.match(/STAMINA (\d+)(?: \/ (\d+))?/);
	const temp = text.match(/\+(\d+) TEMP/);
	const recoveries = text.match(/RECOVERIES (\d+)(?: \/ (\d+))?/);
	const fill = await page.locator('.health-bar-fill').first().evaluate(el => el.style.width);
	const danger = await page.locator('.health-bar-fill.danger').count() > 0;
	return {
		current: stamina ? Number.parseInt(stamina[1], 10) : null,
		max: stamina ? Number.parseInt(stamina[2] || stamina[1], 10) : null,
		temp: temp ? Number.parseInt(temp[1], 10) : 0,
		recoveries: recoveries ? Number.parseInt(recoveries[1], 10) : null,
		fill: Number.parseFloat(fill),
		danger,
		windedChip: /WINDED/.test(text)
	};
};
// What has been typed is only staged, so every change goes through the buttons.
const take = async (damage) => {
	await input.fill(String(damage));
	await page.waitForTimeout(250);
	await panel.locator('button', { hasText: 'Take Damage' }).first().click();
	await page.waitForTimeout(700);
};

const start = await readout();
console.log(`fresh:        ${JSON.stringify(start)}`);
if (start.max === null) {
	fail.push('could not read stamina off the bar readout');
}
if (start.fill !== 100) {
	fail.push(`an undamaged hero draws its bar at ${start.fill}% instead of 100%`);
}
if (start.danger || start.windedChip) {
	fail.push('an undamaged hero reads as winded');
}
const pips = await page.locator('.health-pip').count();
const spentPips = await page.locator('.health-pip.spent').count();
if ((pips !== start.recoveries) || (spentPips !== 0)) {
	fail.push(`${start.recoveries} recoveries are drawn as ${pips} pips (${spentPips} spent)`);
}

// The fill is the current stamina as a fraction of the max.
await take(3);
const hurt = await readout();
const expectedFill = Math.round(100 * hurt.current / hurt.max);
console.log(`took 3:       ${JSON.stringify(hurt)} (expected fill ${expectedFill}%)`);
if (hurt.current !== start.max - 3) {
	fail.push(`the readout says ${hurt.current} after taking 3 from ${start.max}`);
}
if (Math.abs(hurt.fill - expectedFill) > 1) {
	fail.push(`the bar is drawn at ${hurt.fill}% for ${hurt.current} of ${hurt.max}`);
}

// Winded is half the max or less, and it has to be visible without reading.
await take(11);
const winded = await readout();
console.log(`winded:       ${JSON.stringify(winded)}`);
if (winded.current > Math.floor(winded.max / 2)) {
	fail.push(`the hero is at ${winded.current} of ${winded.max}, which is not winded`);
}
if (!winded.danger || !winded.windedChip) {
	fail.push(`a winded hero draws danger=${winded.danger} and chip=${winded.windedChip}`);
}

// Temporary stamina hangs off the end of the stamina bar.
await input.fill('4');
await page.waitForTimeout(250);
await panel.locator('button', { hasText: 'Add Temporary Stamina' }).first().click();
await page.waitForTimeout(700);
const tempered = await readout();
const tempSegments = await page.locator('.health-bar-temp').count();
console.log(`+4 temp:      ${JSON.stringify(tempered)} segments=${tempSegments}`);
if (tempered.temp !== 4) {
	fail.push(`the readout shows ${tempered.temp} temporary stamina after adding 4`);
}
if (tempSegments !== 1) {
	fail.push(`temporary stamina is drawn as ${tempSegments} segments`);
}

// Spending a recovery empties a pip and heals by the recovery value.
const recoveryValue = (await panel.locator('button', { hasText: 'Regain up to' }).first().innerText()).match(/Regain up to (\d+)/);
await panel.locator('button', { hasText: 'Regain up to' }).first().click();
await page.waitForTimeout(700);
const spent = await readout();
const spentNow = await page.locator('.health-pip.spent').count();
console.log(`recovery:     ${JSON.stringify(spent)} spentPips=${spentNow} value=${recoveryValue ? recoveryValue[1] : '?'}`);
if ((spent.recoveries !== start.recoveries - 1) || (spentNow !== 1)) {
	fail.push(`after spending one recovery the readout says ${spent.recoveries} left and ${spentNow} spent pips`);
}
if (spent.current !== Math.min(winded.max, winded.current + Number.parseInt(recoveryValue[1], 10))) {
	fail.push(`spending a recovery of ${recoveryValue[1]} took ${winded.current} to ${spent.current}`);
}

await page.screenshot({ path: 'tmp/audit/stamina-readout.png' });
await ctx.close();
console.log(fail.length === 0 ? '\nPASS' : `\nFAIL — ${fail.join('; ')}`);
await browser.close();
process.exit(fail.length === 0 ? 0 : 1);

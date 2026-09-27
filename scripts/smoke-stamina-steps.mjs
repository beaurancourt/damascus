// The quick steps on the health panel apply immediately - the minus takes damage, the plus
// regains stamina - and each one leaves a receipt that doubles as an undo, so a
// mis-tap is one click back. Damage eats temporary stamina first, so the undo has
// to restore both numbers, not just run the step in reverse.
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
const step = (label) => panel.locator('.quick-step', { hasText: label }).first();
const receipt = panel.locator('.undo-button');

// The readout is a bar, not a ring any more.
console.log(`bars=${await page.locator('.health-bars').count()} rings=${await page.locator('.health-gauge').count()}`);
if (await page.locator('.health-bars').count() === 0) {
	fail.push('no bar readout on the panel');
}
if (await page.locator('.health-gauge').count() > 0) {
	fail.push('the old ring readout is still on the page');
}

// Everything the readout claims has to come off the same numbers the bar draws.
const readout = async () => {
	const text = (await page.locator('.health-bars').first().innerText()).replace(/\s+/g, ' ');
	const stamina = text.match(/STAMINA (\d+)(?: \/ (\d+))?/);
	const temp = text.match(/\+(\d+) TEMP/);
	const recoveries = text.match(/RECOVERIES (\d+)(?: \/ (\d+))?/);
	const fill = await page.locator('.health-bar-fill').first().evaluate(el => el.style.width);
	return {
		current: stamina ? Number.parseInt(stamina[1], 10) : null,
		max: stamina ? Number.parseInt(stamina[2] || stamina[1], 10) : null,
		temp: temp ? Number.parseInt(temp[1], 10) : 0,
		recoveries: recoveries ? Number.parseInt(recoveries[1], 10) : null,
		fill
	};
};

const start = await readout();
console.log(`sheet: ${JSON.stringify(start)}`);
if (start.max === null) {
	fail.push('could not read stamina off the bar readout');
}
if (start.fill !== '100%') {
	fail.push(`an undamaged hero draws its bar at ${start.fill} instead of 100%`);
}
if (start.recoveries === null) {
	fail.push('the readout does not show recoveries');
}
const pips = await page.locator('.health-pip').count();
if (pips !== start.recoveries) {
	fail.push(`${start.recoveries} recoveries are drawn as ${pips} pips`);
}

// Regaining is disabled with nothing to regain.
if (await step('+5').isEnabled()) {
	fail.push('the regain step is enabled at full stamina');
}

// A step lands on its own.
await step('−5').click();
await page.waitForTimeout(600);
const afterFive = await readout();
console.log(`-5: ${start.current} -> ${afterFive.current} (receipt: ${(await receipt.innerText()).replace(/\n/g, ' ')})`);
if (afterFive.current !== start.current - 5) {
	fail.push(`-5 moved stamina ${start.current} -> ${afterFive.current}`);
}
if (await receipt.count() === 0) {
	fail.push('a quick step left no undo receipt');
}
if (Number.parseInt(afterFive.fill, 10) !== Math.round(100 * afterFive.current / afterFive.max)) {
	fail.push(`the bar is drawn at ${afterFive.fill} for ${afterFive.current} of ${afterFive.max}`);
}

// The receipt puts it back.
await receipt.click();
await page.waitForTimeout(600);
const undone = await readout();
console.log(`undo: ${afterFive.current} -> ${undone.current}`);
if (undone.current !== start.current) {
	fail.push(`undo left stamina at ${undone.current} instead of ${start.current}`);
}
if (await receipt.count() > 0) {
	fail.push('the undo receipt is still showing after being used');
}
if (await step('+5').isEnabled()) {
	fail.push('the regain step is enabled again at full stamina');
}

// The keyboard does the same thing as the receipt.
await step('−1').click();
await page.waitForTimeout(500);
await page.keyboard.press('Meta+z');
await page.waitForTimeout(600);
const keyboardUndone = await readout();
console.log(`-1 then cmd+z: ${keyboardUndone.current}`);
if (keyboardUndone.current !== start.current) {
	fail.push(`cmd+z left stamina at ${keyboardUndone.current} instead of ${start.current}`);
}

// Regaining gives back what is missing, and says how much that was.
await step('−5').click();
await page.waitForTimeout(400);
await step('−5').click();
await page.waitForTimeout(400);
const hurt = await readout();
await step('+5').click();
await page.waitForTimeout(600);
const healed = await readout();
const healedLabel = (await receipt.innerText()).replace(/\n/g, ' ');
console.log(`-5 -5 (+5): ${start.current} -> ${hurt.current} -> ${healed.current} (receipt: ${healedLabel})`);
if (healed.current !== hurt.current + 5) {
	fail.push(`+5 moved stamina ${hurt.current} -> ${healed.current}`);
}
await receipt.click();
await page.waitForTimeout(600);
if ((await readout()).current !== hurt.current) {
	fail.push('undoing a regain did not put the damage back');
}

// Healing is capped, and the receipt names what actually landed rather than what
// was asked for.
await receipt.click().catch(() => {});
await page.locator('.stamina-amount input').fill('999');
await page.waitForTimeout(300);
await panel.locator('button', { hasText: 'REGAIN STAMINA' }).first().click();
await page.waitForTimeout(700);
await step('−1').click();
await page.waitForTimeout(500);
await step('+5').click();
await page.waitForTimeout(600);
const capped = await readout();
const cappedLabel = (await receipt.innerText()).replace(/\n/g, ' ');
console.log(`+5 with 1 missing: ${capped.current} (receipt: ${cappedLabel})`);
if (capped.current !== start.max) {
	fail.push(`regaining 5 with 1 missing left stamina at ${capped.current} of ${start.max}`);
}
if (!/Regained 1 Stamina/.test(cappedLabel)) {
	fail.push(`the receipt says "${cappedLabel}" when only 1 stamina was missing`);
}

// Temporary stamina: damage eats it first, and the undo restores both numbers.
await receipt.click();
await page.waitForTimeout(500);
await page.locator('.stamina-amount input').fill('4');
await page.waitForTimeout(300);
await panel.locator('button', { hasText: 'ADD TEMPORARY' }).first().click();
await page.waitForTimeout(700);
const withTemp = await readout();
console.log(`after +4 temp: ${JSON.stringify(withTemp)}`);
if (withTemp.temp !== 4) {
	fail.push(`temporary stamina is ${withTemp.temp} after adding 4`);
}
await step('−5').click();
await page.waitForTimeout(600);
const afterTempDamage = await readout();
console.log(`-5 into 4 temp: current=${afterTempDamage.current} temp=${afterTempDamage.temp}`);
if ((afterTempDamage.temp !== 0) || (afterTempDamage.current !== withTemp.current - 1)) {
	fail.push(`taking 5 with 4 temporary stamina gave current=${afterTempDamage.current} temp=${afterTempDamage.temp}`);
}
await receipt.click();
await page.waitForTimeout(600);
const restored = await readout();
console.log(`undo: current=${restored.current} temp=${restored.temp}`);
if ((restored.temp !== withTemp.temp) || (restored.current !== withTemp.current)) {
	fail.push(`undoing damage that ate temporary stamina gave current=${restored.current} temp=${restored.temp}, not ${withTemp.current}/${withTemp.temp}`);
}

// Spending a recovery shows up in the pips.
await page.waitForTimeout(500);
await panel.locator('button', { hasText: 'Regain up to' }).first().click();
await page.waitForTimeout(700);
const spent = await readout();
const spentPips = await page.locator('.health-pip.spent').count();
console.log(`spent a recovery: ${spent.recoveries} left, ${spentPips} spent pips`);
if ((spent.recoveries !== start.recoveries - 1) || (spentPips !== 1)) {
	fail.push(`after spending one recovery the readout says ${spent.recoveries} left and ${spentPips} spent pips`);
}

await page.screenshot({ path: 'tmp/audit/stamina-steps.png' });
await ctx.close();
console.log(fail.length === 0 ? '\nPASS' : `\nFAIL — ${fail.join('; ')}`);
await browser.close();
process.exit(fail.length === 0 ? 0 : 1);

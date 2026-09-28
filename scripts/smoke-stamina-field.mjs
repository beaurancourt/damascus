// The amount field on the health panel: it starts empty, backspacing clears it
// instead of snapping to 0, the +/- buttons beside it edit it rather than the
// sheet, and what it holds is applied by Take Damage / Regain Stamina.
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

const panel = page.locator('.health-panel:has(.health-bars)').first();
const input = panel.locator('.stamina-amount input');
const field = () => input.inputValue();
const enabled = (label) => panel.locator('button', { hasText: label }).first().isEnabled();
const spin = (label) => panel.locator('.number-spin button', { hasText: label }).first();
// The spins mark "nothing left to step" with a class, not the disabled attribute.
const spent = (label) => spin(label).evaluate(el => el.className.includes('disabled'));

// The readout prints just the max until something has been taken off it, so the
// first number is the current stamina either way.
const readout = async () => {
	const text = (await page.locator('.health-bars').first().innerText()).replace(/\s+/g, ' ');
	const match = text.match(/STAMINA (\d+)(?: \/ (\d+))?/);
	return { current: match ? Number.parseInt(match[1], 10) : null, max: match ? Number.parseInt(match[2] || match[1], 10) : null };
};
const current = async () => (await readout()).current;
const max = async () => (await readout()).max;

if (await input.count() === 0) {
	fail.push('no stamina amount field found');
}

// It starts empty: nothing is entered by default, not even a 0.
console.log(`initial: "${await field()}"  take damage enabled=${await enabled('Take Damage')}`);
if (await field() !== '') {
	fail.push(`the field starts with "${await field()}" in it instead of empty`);
}
if (await enabled('Take Damage')) {
	fail.push('Take Damage is enabled before anything is entered');
}

// Type a number, then clear it by backspacing: it has to stay empty.
await input.click();
await page.keyboard.type('7', { delay: 40 });
await page.waitForTimeout(300);
if (await field() !== '7') {
	fail.push(`typing 7 produced "${await field()}"`);
}
if (!(await enabled('Take Damage'))) {
	fail.push('Take Damage stayed disabled with a value in the field');
}

await page.keyboard.press('Backspace');
await page.waitForTimeout(400);
const cleared = await field();
console.log(`after backspace: "${cleared}"  take damage enabled=${await enabled('Take Damage')}`);
if (cleared !== '') {
	fail.push(`backspacing left "${cleared}" in the field instead of empty`);
}
if (await enabled('Take Damage')) {
	fail.push('Take Damage is still enabled with an empty field');
}

// The +/- buttons edit the field and nothing else. There is nothing to step down
// from while it is empty, and stepping down to 0 leaves 0 to clear.
const steady = await current();
if (!(await spent('-5')) || !(await spent('-1'))) {
	fail.push('the down steps are live while the field is empty');
}
await spin('+5').click();
await page.waitForTimeout(300);
if (await field() !== '5') {
	fail.push(`+5 from empty left "${await field()}" in the field`);
}
await spin('+1').click();
await page.waitForTimeout(300);
if (await field() !== '6') {
	fail.push(`+1 on 5 left "${await field()}" in the field`);
}
if (await current() !== steady) {
	fail.push(`the +/- buttons moved the sheet: ${steady} -> ${await current()}`);
}
await spin('-1').click();
await page.waitForTimeout(300);
if (await field() !== '5') {
	fail.push(`-1 on 6 left "${await field()}" in the field`);
}
await spin('-5').click();
await page.waitForTimeout(300);
console.log(`after +5 +1 -1 -5: "${await field()}"  spent(-5)=${await spent('-5')}`);
if (await field() !== '0') {
	fail.push(`-5 on 5 left "${await field()}" in the field`);
}
if (!(await spent('-5'))) {
	fail.push('the down steps are live with 0 in the field');
}
if (await enabled('Take Damage')) {
	fail.push('a 0 in the field enables Take Damage');
}

// A staged amount is applied by the button, and the field empties again rather
// than parking on 0.
const start = await current();
await input.fill('3');
await page.waitForTimeout(300);
await panel.locator('button', { hasText: 'Take Damage' }).first().click();
await page.waitForTimeout(700);
const afterDamage = await current();
const afterAction = await field();
console.log(`took 3: ${start} -> ${afterDamage}  field="${afterAction}"`);
if (afterDamage !== start - 3) {
	fail.push(`Take Damage 3 moved stamina ${start} -> ${afterDamage}`);
}
if (afterAction !== '') {
	fail.push(`the field shows "${afterAction}" after an action instead of empty`);
}
if (await enabled('Take Damage')) {
	fail.push('Take Damage is still enabled after being used');
}

// The same amount can be handed back.
await input.fill('4');
await page.waitForTimeout(300);
await panel.locator('button', { hasText: 'Regain Stamina' }).first().click();
await page.waitForTimeout(700);
const afterHeal = await current();
const healedBack = Math.min(4, (await max()) - afterDamage);
console.log(`regained 4 with ${(await max()) - afterDamage} missing: ${afterDamage} -> ${afterHeal}`);
if (afterHeal !== afterDamage + healedBack) {
	fail.push(`Regain Stamina 4 moved stamina ${afterDamage} -> ${afterHeal}, expected ${afterDamage + healedBack}`);
}

// It cannot be driven past the ends of the bar.
await input.fill('999');
await page.waitForTimeout(200);
await panel.locator('button', { hasText: 'Regain Stamina' }).first().click();
await page.waitForTimeout(700);
const healed = await current();
console.log(`regain 999: ${afterHeal} -> ${healed} of ${await max()}`);
if (healed !== await max()) {
	fail.push(`regaining more than was missing left stamina at ${healed} of ${await max()}`);
}

await page.screenshot({ path: 'tmp/audit/stamina-field.png' });
await ctx.close();
console.log(fail.length === 0 ? '\nPASS' : `\nFAIL — ${fail.join('; ')}`);
await browser.close();
process.exit(fail.length === 0 ? 0 : 1);

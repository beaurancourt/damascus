// The amount field on the health panel: it starts empty, backspacing clears it
// instead of snapping to 0, and what you type is applied by pressing a button (or
// Enter, which takes damage - the common case). The quick +/- buttons beside it
// are a separate smoke, since they apply immediately.
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
const field = () => input.inputValue();
const enabled = (label) => panel.locator('button', { hasText: label }).first().isEnabled();
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
console.log(`initial: "${await field()}"  take damage enabled=${await enabled('TAKE DAMAGE')}`);
if (await field() !== '') {
	fail.push(`the field starts with "${await field()}" in it instead of empty`);
}
if (await enabled('TAKE DAMAGE')) {
	fail.push('Take Damage is enabled before anything is entered');
}

// Type a number, then clear it by backspacing: it has to stay empty.
await input.click();
await page.keyboard.type('7', { delay: 40 });
await page.waitForTimeout(300);
if (await field() !== '7') {
	fail.push(`typing 7 produced "${await field()}"`);
}
if (!(await enabled('TAKE DAMAGE'))) {
	fail.push('Take Damage stayed disabled with a value in the field');
}

await page.keyboard.press('Backspace');
await page.waitForTimeout(400);
const cleared = await field();
console.log(`after backspace: "${cleared}"  take damage enabled=${await enabled('TAKE DAMAGE')}`);
if (cleared !== '') {
	fail.push(`backspacing left "${cleared}" in the field instead of empty`);
}
if (await enabled('TAKE DAMAGE')) {
	fail.push('Take Damage is still enabled with an empty field');
}

// A typed amount is applied by the button, and the field empties again rather
// than parking on 0.
const start = await current();
await page.keyboard.type('3', { delay: 40 });
await page.waitForTimeout(300);
await panel.locator('button', { hasText: 'TAKE DAMAGE' }).first().click();
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
if (await enabled('TAKE DAMAGE')) {
	fail.push('Take Damage is still enabled after being used');
}

// The same amount can be handed back.
await input.click();
await page.keyboard.type('4', { delay: 40 });
await page.waitForTimeout(300);
await panel.locator('button', { hasText: 'REGAIN STAMINA' }).first().click();
await page.waitForTimeout(700);
const afterHeal = await current();
const healedBack = Math.min(4, (await max()) - afterDamage);
console.log(`regained 4 with ${(await max()) - afterDamage} missing: ${afterDamage} -> ${afterHeal}`);
if (afterHeal !== afterDamage + healedBack) {
	fail.push(`Regain Stamina 4 moved stamina ${afterDamage} -> ${afterHeal}, expected ${afterDamage + healedBack}`);
}

// Enter applies a typed amount as damage, so the common case does not need a
// second click.
await input.click();
await page.keyboard.type('2', { delay: 40 });
await page.waitForTimeout(300);
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
const afterEnter = await current();
console.log(`typed 2 + Enter: ${afterHeal} -> ${afterEnter}`);
if (afterEnter !== afterHeal - 2) {
	fail.push(`Enter with 2 in the field moved stamina ${afterHeal} -> ${afterEnter}`);
}
if (await field() !== '') {
	fail.push(`Enter left "${await field()}" in the field`);
}

// It cannot be driven past the ends of the bar.
await input.fill('999');
await page.waitForTimeout(200);
await panel.locator('button', { hasText: 'REGAIN STAMINA' }).first().click();
await page.waitForTimeout(700);
const healed = await current();
console.log(`regain 999: ${afterEnter} -> ${healed} of ${await max()}`);
if (healed !== await max()) {
	fail.push(`regaining more than was missing left stamina at ${healed} of ${await max()}`);
}

await page.screenshot({ path: 'tmp/audit/stamina-field.png' });
await ctx.close();
console.log(fail.length === 0 ? '\nPASS' : `\nFAIL — ${fail.join('; ')}`);
await browser.close();
process.exit(fail.length === 0 ? 0 : 1);

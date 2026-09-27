// The stamina field has to clear to empty when you backspace, not snap back to
// 0 - otherwise you cannot retype a number without editing around the zero.
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

const input = page.locator('.health-panel .number-spin input').first();
console.log(`stamina inputs found: ${await page.locator('.health-panel .number-spin input').count()}`);
if (await input.count() === 0) {
	fail.push('no stamina input found');
}

const value = () => input.inputValue();
const takeDamageEnabled = () => page.locator('.health-panel button', { hasText: 'Take Damage' }).first().isEnabled();

console.log(`initial: "${await value()}"  takeDamage enabled=${await takeDamageEnabled()}`);

// Select all and erase.
await input.click();
await page.keyboard.press('Meta+A');
await page.keyboard.press('Backspace');
await page.waitForTimeout(400);
const cleared = await value();
console.log(`after backspace: "${cleared}"  takeDamage enabled=${await takeDamageEnabled()}`);
if (cleared !== '') {
	fail.push(`clearing left "${cleared}" in the field instead of empty`);
}

// Type a fresh number into the empty field.
await page.keyboard.type('7', { delay: 40 });
await page.waitForTimeout(400);
const typed = await value();
console.log(`after typing 7: "${typed}"  takeDamage enabled=${await takeDamageEnabled()}`);
if (typed !== '7') {
	fail.push(`typing into the empty field produced "${typed}"`);
}
if (!(await takeDamageEnabled())) {
	fail.push('Take Damage stayed disabled with a value in the field');
}

// Clearing again leaves it empty and disables the buttons, rather than showing 0.
await page.keyboard.press('Meta+A');
await page.keyboard.press('Backspace');
await page.waitForTimeout(400);
console.log(`cleared again: "${await value()}"  takeDamage enabled=${await takeDamageEnabled()}`);
if (await value() !== '') {
	fail.push('the field would not stay empty');
}
if (await takeDamageEnabled()) {
	fail.push('Take Damage is enabled with an empty field');
}

// The +/- buttons still work from empty (they treat it as 0).
await page.locator('.health-panel .number-spin .spin-button', { hasText: '+1' }).first().click();
await page.waitForTimeout(400);
console.log(`after +1 from empty: "${await value()}"`);
if (await value() !== '1') {
	fail.push(`+1 from an empty field produced "${await value()}"`);
}

await page.screenshot({ path: 'tmp/audit/stamina-field.png' });
await ctx.close();
console.log(fail.length === 0 ? '\nPASS' : `\nFAIL — ${fail.join('; ')}`);
await browser.close();
process.exit(fail.length === 0 ? 0 : 1);

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

// It starts empty: nothing is entered by default, not even a 0.
console.log(`initial: "${await value()}"  takeDamage enabled=${await takeDamageEnabled()}`);
if (await value() !== '') {
	fail.push(`the field starts with "${await value()}" in it instead of empty`);
}
if (await takeDamageEnabled()) {
	fail.push('Take Damage is enabled before anything is entered');
}

// Type a number, then clear it by backspacing: it has to stay empty.
await input.click();
await page.keyboard.type('7', { delay: 40 });
await page.waitForTimeout(300);
if (await value() !== '7') {
	fail.push(`typing 7 produced "${await value()}"`);
}
if (!(await takeDamageEnabled())) {
	fail.push('Take Damage stayed disabled with a value in the field');
}

await page.keyboard.press('Backspace');
await page.waitForTimeout(400);
const cleared = await value();
console.log(`after backspace: "${cleared}"  takeDamage enabled=${await takeDamageEnabled()}`);
if (cleared !== '') {
	fail.push(`backspacing left "${cleared}" in the field instead of empty`);
}

// Applying damage empties the field again rather than parking it on 0.
await page.keyboard.type('3', { delay: 40 });
await page.waitForTimeout(300);
await page.locator('.health-panel button', { hasText: 'Take Damage' }).first().click();
await page.waitForTimeout(700);
const afterAction = await value();
console.log(`after Take Damage: "${afterAction}"  takeDamage enabled=${await takeDamageEnabled()}`);
if (afterAction !== '') {
	fail.push(`the field shows "${afterAction}" after an action instead of empty`);
}
if (await takeDamageEnabled()) {
	fail.push('Take Damage is still enabled after being used');
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

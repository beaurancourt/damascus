// The heroic-resource description is the bit of the sheet a player re-reads most
// while playing, so it sits directly under the stats rather than alphabetized
// among the feats, and it carries a header the jump-to-section menu offers.
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

// A pregen hero (Keth the Fury) so the sheet has a heroic resource.
await page.locator('.app-header button:has([aria-label="plus"])').first().click();
await page.waitForTimeout(700);
await page.locator('.ant-popover').getByText('Use a premade example').first().click();
await page.waitForTimeout(700);
const first = page.locator('.ant-popover .container-button').first();
console.log('pregen:', (await first.textContent())?.trim().slice(0, 40));
await first.click();
await page.waitForTimeout(2500);

// 1. The section exists.
const section = page.locator('[data-hero-section="Heroic Resource"]');
const count = await section.count();
console.log(`[data-hero-section="Heroic Resource"] elements: ${count}`);
if (count !== 1) {
	fail.push(`expected exactly 1 heroic-resource section, found ${count}`);
}

// 2. It is above the abilities.
const order = await page.evaluate(() => {
	const resource = document.querySelector('[data-hero-section="Heroic Resource"]');
	const firstAbility = document.querySelector('.abilities-section');
	if (!resource || !firstAbility) {
		return null;
	}
	return {
		resourceTop: Math.round(resource.getBoundingClientRect().top + window.scrollY),
		abilityTop: Math.round(firstAbility.getBoundingClientRect().top + window.scrollY),
		sections: Array.from(document.querySelectorAll('[data-hero-section]')).map(el => el.getAttribute('data-hero-section'))
	};
});
console.log('section order in the sheet:', JSON.stringify(order?.sections));
console.log(`resource top=${order?.resourceTop}px, first ability top=${order?.abilityTop}px`);
if (!order) {
	fail.push('could not find both the resource section and an abilities section');
} else if (order.resourceTop > order.abilityTop) {
	fail.push('the resource section sits below the abilities');
}

// 3. The resource itself is no longer buried in (or duplicated by) Features.
const resourceHeader = (await section.locator('.feature-panel .header-text-panel').first().innerText()).trim();
const resourceName = resourceHeader.split('\n')[0].trim().toUpperCase();
const featureNames = (await page.locator('[data-hero-section="Features"] .feature-panel .header-text-panel').allInnerTexts())
	.map(h => h.split('\n')[0].trim().toUpperCase());
console.log(`resource feature: "${resourceName}"`);
console.log(`features section now lists: ${JSON.stringify(featureNames)}`);
if (featureNames.includes(resourceName)) {
	fail.push(`the resource is still listed in Features as "${resourceName}"`);
}

// 4. The jump-to-section menu offers it, and scrolling lands there.
await page.locator('.app-header button[title="Jump to a section"]').first().click();
await page.waitForTimeout(600);
const entries = await page.locator('.ant-popover button').allInnerTexts();
console.log(`jump-to menu: ${JSON.stringify(entries.map(e => e.trim()).filter(Boolean))}`);
const entry = page.locator('.ant-popover button').filter({ hasText: /^Heroic Resource$/ }).first();
if (await entry.count() === 0) {
	fail.push('the jump-to-section menu does not list Heroic Resource');
} else {
	await entry.click();
	await page.waitForTimeout(1400);
	const after = await page.evaluate(() => {
		const el = document.querySelector('[data-hero-section="Heroic Resource"]');
		return el ? Math.round(el.getBoundingClientRect().top) : null;
	});
	console.log(`after jumping, section top is ${after}px from the viewport top`);
	if (after === null || Math.abs(after) > 160) {
		fail.push(`jumping did not bring the section into view (top ${after}px)`);
	}
}

await page.screenshot({ path: 'tmp/audit/hero-resource-section.png' });
await ctx.close();
console.log(fail.length === 0 ? '\nPASS' : `\nFAIL — ${fail.join('; ')}`);
await browser.close();
process.exit(fail.length === 0 ? 0 : 1);

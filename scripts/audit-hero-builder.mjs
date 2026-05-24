// Captures the hero builder flow at mobile width. Drives through:
// - create new hero (each section)
// - use premade (lands on hero sheet)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp/audit/hero';
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
const shot = name => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
const shotVp = name => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });

log('open welcome → use a premade hero');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const premadeBtn = page.getByRole('button', { name: /Use a Premade Hero/i }).first();
if (await premadeBtn.isVisible().catch(() => false)) {
	await premadeBtn.click();
	await page.waitForTimeout(1000);
	await shot('00-premade-list');

	const keth = page.locator('button, [role="button"]').filter({ hasText: /^Keth/ }).first();
	if (await keth.isVisible().catch(() => false)) {
		await keth.click();
		await page.waitForTimeout(700);
		await shot('00b-premade-keth-detail');
		const addBtn = page.getByRole('button', { name: /Add|Create|Use Hero|Save/i }).first();
		if (await addBtn.isVisible().catch(() => false)) {
			await addBtn.click();
			await page.waitForTimeout(1500);
		}
	}
}

await shot('01-hero-list-with-keth');

log('open first hero — should land on hero view');
const heroCard = page.locator('button, [role="button"]').filter({ hasText: /Keth/i }).first();
if (await heroCard.isVisible().catch(() => false)) {
	await heroCard.click();
	await page.waitForTimeout(1500);
	await shot('02-hero-view-sheet');
}

log('switch to edit mode from sheet');
const editBtn = page.getByRole('button', { name: /^Edit$|Edit Hero/i }).first();
if (await editBtn.isVisible().catch(() => false)) {
	await editBtn.click();
	await page.waitForTimeout(1500);
	await shot('03-hero-edit-start');
}

log('capture all edit pages via chip strip');
const editSections = [ 'Start', 'Ancestry', 'Culture', 'Career', 'Class', 'Complication', 'Details' ];
for (const section of editSections) {
	const chip = page.locator('.hero-edit-chip', { hasText: section.toUpperCase() }).first();
	if (!(await chip.isVisible().catch(() => false))) {
		// Try scrolling the chip strip
		const strip = page.locator('.hero-edit-chip-strip').first();
		if (await strip.isVisible().catch(() => false)) {
			await strip.evaluate(el => { el.scrollLeft += 200; });
			await page.waitForTimeout(200);
		}
	}
	if (await chip.isVisible().catch(() => false)) {
		await chip.click();
		await page.waitForTimeout(700);
		await shot(`04-edit-${section.toLowerCase()}`);
	} else {
		log(`(no "${section}" chip visible)`);
	}
}

log('go back to view and check sheet variations');
await page.goBack();
await page.waitForTimeout(700);
const sheetTabs = await page.locator('button').filter({ hasText: /Stats|Abilities|Features|Inventory|Notes/i }).all();
for (let i = 0; i < Math.min(sheetTabs.length, 5); i++) {
	try {
		await sheetTabs[i].click();
		await page.waitForTimeout(500);
		await shot(`05-sheet-tab-${i}`);
	} catch (e) {
		// keep going
	}
}

await browser.close();
console.log(`done — see ${OUT}/`);

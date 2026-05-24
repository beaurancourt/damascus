// Sweeps the app at iPhone 14 width and captures key screens for an
// information-architecture audit. Outputs to tmp/audit/.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp/audit';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true,
	userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
});
const page = await ctx.newPage();

page.on('pageerror', err => console.error('[pageerror]', err.message));

const log = msg => console.log(`>>> ${msg}`);
const shotFull = name => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
const shotVp = name => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });

const navWelcome = () => page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
const navHeroes = () => page.goto('http://localhost:5173/#/hero', { waitUntil: 'networkidle' });
const navLibrary = (kind = 'ancestry') => page.goto(`http://localhost:5173/#/library/${kind}`, { waitUntil: 'networkidle' });
const navSession = () => page.goto('http://localhost:5173/#/session', { waitUntil: 'networkidle' });

// 01. Welcome
log('01 welcome');
await navWelcome();
await page.waitForTimeout(500);
await shotFull('01-welcome');

// 02. Hero list (empty)
log('02 hero list');
await navHeroes();
await page.waitForTimeout(700);
await shotFull('02-hero-list');

// 03. Create new hero
log('03 hero create — flow start');
const createBtn = page.getByRole('button', { name: /Create.*Hero|^Create$/ }).first();
if (await createBtn.isVisible().catch(() => false)) {
	await createBtn.click();
	await page.waitForTimeout(800);
	await shotFull('03-hero-create-start');
}

// 04. Premade list
log('04 use a premade hero');
await navHeroes();
await page.waitForTimeout(400);
const premadeBtn = page.getByRole('button', { name: /Premade/i }).first();
if (await premadeBtn.isVisible().catch(() => false)) {
	await premadeBtn.click();
	await page.waitForTimeout(800);
	await shotFull('04-premade-list');

	// Click first premade
	const firstHeroBtn = page.locator('button').filter({ hasText: /Keth|Jennet|Ashley|Khettovek|Bethell/i }).first();
	if (await firstHeroBtn.isVisible().catch(() => false)) {
		await firstHeroBtn.click();
		await page.waitForTimeout(700);
		await shotFull('05-premade-hero-detail');

		// Try to actually "use" the hero so we land in the hero sheet
		const useBtn = page.getByRole('button', { name: /^Use$|Select|Confirm/i }).first();
		if (await useBtn.isVisible().catch(() => false)) {
			await useBtn.click();
			await page.waitForTimeout(1000);
			await shotFull('06-hero-sheet');
		}
	}
}

// 07. Library — ancestry default
log('07 library — ancestries');
await navLibrary('ancestry');
await page.waitForTimeout(700);
await shotFull('07-library-ancestry');

// 08. Library — monsters
log('08 library — monster groups');
await navLibrary('monster-group');
await page.waitForTimeout(700);
await shotFull('08-library-monster-group');

// Click a monster group
const aMonster = page.locator('button, .selector-row, [role="button"]').filter({ hasText: /Goblin|Orc|Dragon|Animal/i }).first();
if (await aMonster.isVisible().catch(() => false)) {
	await aMonster.click();
	await page.waitForTimeout(700);
	await shotFull('09-library-monster-detail');
}

// 10. Library — encounters
log('10 library — encounters');
await navLibrary('encounter');
await page.waitForTimeout(700);
await shotFull('10-library-encounters');

// 11. Add popover
log('11 library — add popover');
const addBtn = page.getByRole('button', { name: /^Add/ });
if (await addBtn.first().isVisible().catch(() => false)) {
	await addBtn.first().click();
	await page.waitForTimeout(500);
	await shotVp('11-library-add-popover');
}

// 12. Session
log('12 session');
await navSession();
await page.waitForTimeout(700);
await shotFull('12-session');

// 13. Library — kits (lots of long names)
log('13 library — kits');
await navLibrary('kit');
await page.waitForTimeout(600);
await shotFull('13-library-kits');

// 14. Library — items (huge list)
log('14 library — items');
await navLibrary('item');
await page.waitForTimeout(600);
await shotFull('14-library-items');

await browser.close();
console.log(`audit complete — see ${OUT}/`);

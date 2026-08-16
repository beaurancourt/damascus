// Create a new encounter and capture screenshots of the builder on Pixel 10.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

// Base URL override, so this can be pointed at either dev server or a built
// site. Defaults to the GM dev server (npm run start:gm), since encounters
// are director content and only that site's library lists them.
const BASE = process.env.SMOKE_BASE || 'http://localhost:5174/';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();

const pixel10 = {
	viewport: { width: 412, height: 915 },
	deviceScaleFactor: 1,
	isMobile: true,
	hasTouch: true,
	userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
};

const ctx = await browser.newContext(pixel10);
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

// Navigate to encounters library
await page.evaluate(() => location.hash = '#/library/encounter');
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp/audit/enc-01-library.png', fullPage: false });
log('saved tmp/audit/enc-01-library.png');

// Try to find the AddBtn to make a new encounter — check the mobile UI
const buttons = await page.locator('button').allTextContents();
log(`buttons on library page: ${JSON.stringify(buttons.filter(b => b.trim()).slice(0, 15))}`);

// Use "Generate a random encounter" to get something populated to look at
const addBtn = page.locator('button').filter({ hasText: /^Add$/ }).first();
await addBtn.click();
await page.waitForTimeout(400);
const random = page.locator('button').filter({ hasText: /Generate a random encounter/i }).first();
if (await random.isVisible().catch(() => false)) {
	await random.click();
	await page.waitForTimeout(1200);
} else {
	log('random button not visible, falling back to Create');
	await page.locator('button:has-text("Create")').first().click().catch(() => {});
	await page.waitForTimeout(800);
}

log(`url: ${page.url()}`);

await page.screenshot({ path: 'tmp/audit/enc-02-builder-top.png', fullPage: false });
log('saved tmp/audit/enc-02-builder-top.png');

// Focus the encounter name input to verify the focus state looks right.
const nameInput = page.locator('.encounter-section input').first();
if (await nameInput.count()) {
	await nameInput.focus();
	await page.waitForTimeout(200);
	await page.screenshot({ path: 'tmp/audit/enc-02b-name-focused.png', fullPage: false });
	log('saved tmp/audit/enc-02b-name-focused.png');
}

// Scroll through
const outer = page.locator('.hero-edit-content, .center-content, .encounter-edit-page-content').first();
const exists = await outer.count();
log(`scroll container candidates: ${exists}`);

const scrollAndShot = async (top, name) => {
	await page.evaluate(top => {
		const all = Array.from(document.querySelectorAll('*'));
		const scrollers = all.filter(el => {
			const cs = getComputedStyle(el);
			return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
		});
		scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
		if (scrollers[0]) scrollers[0].scrollTo({ top, behavior: 'instant' });
		window.scrollTo({ top, behavior: 'instant' });
	}, top);
	await page.waitForTimeout(300);
	await page.screenshot({ path: `tmp/audit/enc-${name}.png`, fullPage: false });
	log(`saved tmp/audit/enc-${name}.png`);
};

await scrollAndShot(400, '03-scroll-400');
await scrollAndShot(1200, '04-scroll-1200');
await scrollAndShot(2000, '05-scroll-2000');
await scrollAndShot(3000, '08-scroll-3000');
await scrollAndShot(4000, '09-scroll-4000');

// Click each tab (legacy — kept for backward compat; no-op when tabs are gone)
const tabClick = async (label, name) => {
	await page.locator('.ant-tabs-tab').filter({ hasText: new RegExp(`^${label}$`) }).first().click().catch(() => {});
	await page.waitForTimeout(500);
	await page.screenshot({ path: `tmp/audit/enc-${name}.png`, fullPage: false });
	log(`saved tmp/audit/enc-${name}.png`);
};
await tabClick('Monsters', '06-monsters-tab');
await tabClick('Terrain', '07-terrain-tab');

// --- Populate the encounter so we can see group cards ---------------
// Scroll back to top so the picker is in view, then click the first echelon
// group + first add button to seed a group.
await page.evaluate(() => {
	const scrollers = Array.from(document.querySelectorAll('*')).filter(el => {
		const cs = getComputedStyle(el);
		return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
	});
	scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
	if (scrollers[0]) scrollers[0].scrollTo({ top: 0 });
});
await page.waitForTimeout(300);

// Click the "Add group" button in the Monster Groups header
const addGroupBtn = page.locator('button').filter({ hasText: /^Add group$/i }).first();
if (await addGroupBtn.count()) {
	await addGroupBtn.click().catch(() => {});
	await page.waitForTimeout(400);
}

// Expand first echelon group then add monster
const firstGroup = page.locator('.echelon-section[data-echelon="1"] .ant-collapse-header').first();
if (await firstGroup.count()) {
	await firstGroup.click().catch(() => {});
	await page.waitForTimeout(400);
	const addPlus = page.locator('.monster-list-item .add-btn').first();
	if (await addPlus.count()) {
		await addPlus.click().catch(() => {});
		await page.waitForTimeout(300);
		await addPlus.click().catch(() => {});
		await page.waitForTimeout(300);
	}
}

// Scroll back up
await page.evaluate(() => {
	const scrollers = Array.from(document.querySelectorAll('*')).filter(el => {
		const cs = getComputedStyle(el);
		return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
	});
	scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
	if (scrollers[0]) scrollers[0].scrollTo({ top: 0 });
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp/audit/enc-10-with-group.png', fullPage: false });
log('saved tmp/audit/enc-10-with-group.png');

await page.evaluate(() => {
	const scrollers = Array.from(document.querySelectorAll('*')).filter(el => {
		const cs = getComputedStyle(el);
		return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
	});
	scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
	if (scrollers[0]) scrollers[0].scrollTo({ top: 400 });
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp/audit/enc-11-group-card.png', fullPage: false });
log('saved tmp/audit/enc-11-group-card.png');

// Toggle the Filter button and capture the open filter form.
const filterBtn = page.locator('button').filter({ hasText: /^Filter$/i }).first();
if (await filterBtn.count()) {
	await filterBtn.click().catch(() => {});
	await page.waitForTimeout(400);
	await page.screenshot({ path: 'tmp/audit/enc-12-filter-open.png', fullPage: false });
	log('saved tmp/audit/enc-12-filter-open.png');

	// Activate every chip so the full form is visible.
	for (const label of [ 'Keywords', 'Role', 'Organization', 'Size', 'Level', 'EV' ]) {
		const chip = page.locator('.monster-filter-panel .ant-tag-checkable').filter({ hasText: new RegExp(`^${label}$`, 'i') }).first();
		if (await chip.count()) {
			await chip.click().catch(() => {});
			await page.waitForTimeout(120);
		}
	}
	await page.waitForTimeout(300);
	await page.screenshot({ path: 'tmp/audit/enc-13-filter-all-on.png', fullPage: false });
	log('saved tmp/audit/enc-13-filter-all-on.png');
}

await browser.close();
console.log('done');

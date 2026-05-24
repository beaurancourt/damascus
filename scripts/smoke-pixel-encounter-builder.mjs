// Create a new encounter and capture screenshots of the builder on Pixel 10.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
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

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
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

// Click each tab
const tabClick = async (label, name) => {
	await page.locator('.ant-tabs-tab').filter({ hasText: new RegExp(`^${label}$`) }).first().click().catch(() => {});
	await page.waitForTimeout(500);
	await page.screenshot({ path: `tmp/audit/enc-${name}.png`, fullPage: false });
	log(`saved tmp/audit/enc-${name}.png`);
};
await tabClick('Monsters', '06-monsters-tab');
await tabClick('Terrain', '07-terrain-tab');

await browser.close();
console.log('done');

// Create a hero via the welcome page's "Use a Premade Hero" flow, then capture screenshots
// of the hero view on a Pixel 10–sized viewport.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

// Base URL override, so this can be pointed at either dev server or a built
// site. Defaults to the player dev server (npm run start).
const BASE = process.env.SMOKE_BASE || 'http://localhost:5173/';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();

// Pixel 10 base spec: 412×915 logical px, ~2.625× DPR. Use DPR=1 in screenshots so the files
// stay small enough for downstream image analysis.
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

// The site lands on the hero list, whose Add menu holds the pregens behind an
// expander. Open it and take the first one ("Ashley" or whatever).
await page.locator('.app-header button:has([aria-label="plus"])').first().click();
await page.waitForTimeout(600);
await page.locator('.ant-popover').getByText('Use a premade example').first().click();
await page.waitForTimeout(600);

const pregenButtons = page.locator('.ant-popover .container-button');
const count = await pregenButtons.count();
log(`pregen options visible: ${count}`);
if (count === 0) {
	throw new Error('no pregen buttons found');
}
const firstName = (await pregenButtons.first().textContent())?.trim().slice(0, 80);
log(`picking pregen: ${firstName}`);
await pregenButtons.first().click();
await page.waitForTimeout(1800);

log(`url after pregen pick: ${page.url()}`);

// The pregen flow lands on hero VIEW directly.
await page.waitForTimeout(500);
log(`final url: ${page.url()}`);

// The hero view's scrollable container is internal (.hero-view-page-content with overflow:auto).
// Find it and scroll it.
const scrollerInfo = await page.evaluate(() => {
	const all = Array.from(document.querySelectorAll('*'));
	const scrollable = all.filter(el => {
		const cs = getComputedStyle(el);
		return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
	}).map(el => ({
		selector: el.className ? `.${el.className.split(' ').join('.')}` : el.tagName,
		scrollHeight: el.scrollHeight,
		clientHeight: el.clientHeight
	}));
	return scrollable;
});
log(`scrollable containers: ${JSON.stringify(scrollerInfo, null, 2)}`);

// Pick the tallest scrollable container as the hero content
const positions = [ 0, 800, 1600, 2400, 3200, 4000, 4800, 5600, 6400, 7200 ];
for (let i = 0; i < positions.length; i++) {
	await page.evaluate(top => {
		// Find the tallest scrollable container and scroll it
		const all = Array.from(document.querySelectorAll('*'));
		const scrollers = all.filter(el => {
			const cs = getComputedStyle(el);
			return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
		});
		if (scrollers.length > 0) {
			scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
			scrollers[0].scrollTo({ top, behavior: 'instant' });
		}
		window.scrollTo({ top, behavior: 'instant' });
	}, positions[i]);
	await page.waitForTimeout(300);
	const path = `tmp/audit/pixel-${String(i + 1).padStart(2, '0')}-y${positions[i]}.png`;
	await page.screenshot({ path, fullPage: false });
	log(`saved ${path}`);
}

// Reset scroll, switch to Features tab
await page.evaluate(() => {
	const all = Array.from(document.querySelectorAll('*'));
	const scrollers = all.filter(el => {
		const cs = getComputedStyle(el);
		return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
	});
	scrollers.forEach(el => el.scrollTo({ top: 0 }));
});
await page.locator('.hero-edit-chip, button').filter({ hasText: 'Features' }).first().click({ trial: false }).catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp/audit/pixel-features-top.png', fullPage: false });
log('saved tmp/audit/pixel-features-top.png');

await page.locator('button, [role="tab"]').filter({ hasText: 'Abilities' }).first().click().catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp/audit/pixel-abilities-top.png', fullPage: false });
log('saved tmp/audit/pixel-abilities-top.png');

await browser.close();
console.log('done');

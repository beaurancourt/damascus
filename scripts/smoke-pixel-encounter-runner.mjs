// Open an existing encounter as a running session and screenshot the runner on Pixel 10.
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

// 1. Make a hero via "Use a Premade Hero" so the session has a player to run with.
await page.locator('button:has-text("Use a Premade Hero")').first().click();
await page.waitForTimeout(500);
await page.locator('.ant-popover button').first().click();
await page.waitForTimeout(1200);
log(`hero created, url: ${page.url()}`);

// 2. Build an encounter from the library and seed it.
await page.evaluate(() => location.hash = '#/library/encounter');
await page.waitForTimeout(700);
await page.locator('button').filter({ hasText: /^Add$/ }).first().click();
await page.waitForTimeout(400);
await page.locator('button:has-text("Create")').first().click().catch(() => {});
await page.waitForTimeout(900);
log(`encounter created, url: ${page.url()}`);

// Add a monster group so the runner has something to render.
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

// Save the encounter
await page.locator('button').filter({ hasText: /^Save Changes$/i }).first().click().catch(() => {});
await page.waitForTimeout(800);

// 3. Back to encounter library list and click the Start (Play) button.
await page.evaluate(() => location.hash = '#/library/encounter');
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp/audit/run-00-library.png', fullPage: false });
log('saved tmp/audit/run-00-library.png');

// Click the encounter row to open it, then look for a play button.
await page.locator('text=Unnamed Encounter').first().click().catch(() => {});
await page.waitForTimeout(700);
const allButtons = await page.locator('button').allTextContents();
log(`buttons after row click: ${JSON.stringify(allButtons.filter(b => b.trim()).slice(0, 20))}`);

// Look for play icon button in the toolbar
const playLocators = page.locator('button:has(.anticon-play-circle), button[title*="play" i], button[aria-label*="play" i]');
log(`play locator count: ${await playLocators.count()}`);
if (await playLocators.count()) {
	await playLocators.first().click({ force: true }).catch(() => {});
	await page.waitForTimeout(1200);
}

log(`url after start: ${page.url()}`);
await page.screenshot({ path: 'tmp/audit/run-01-after-start.png', fullPage: false });
log('saved tmp/audit/run-01-after-start.png');

// Should now be at /session/director with the running encounter.
const segOptions = await page.locator('.ant-segmented-item').allTextContents();
log(`segmented options: ${JSON.stringify(segOptions)}`);
if (segOptions.length > 0) {
	await page.locator('.ant-segmented-item').last().click().catch(() => {});
	await page.waitForTimeout(600);
}
await page.screenshot({ path: 'tmp/audit/run-02-runner.png', fullPage: false });
log('saved tmp/audit/run-02-runner.png');

// Scroll the runner content
const scrollAndShot = async (top, name) => {
	await page.evaluate(top => {
		const scrollers = Array.from(document.querySelectorAll('*')).filter(el => {
			const cs = getComputedStyle(el);
			return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
		});
		scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
		if (scrollers[0]) scrollers[0].scrollTo({ top, behavior: 'instant' });
		window.scrollTo({ top, behavior: 'instant' });
	}, top);
	await page.waitForTimeout(300);
	await page.screenshot({ path: `tmp/audit/run-${name}.png`, fullPage: false });
	log(`saved tmp/audit/run-${name}.png`);
};

// Add our hero to the encounter so the runner has content.
const addHeroBtn = page.locator('button').filter({ hasText: /^\+\s*Hero$/ }).first();
if (await addHeroBtn.count()) {
	await addHeroBtn.click().catch(() => {});
	await page.waitForTimeout(500);
	// Pick first hero in the modal
	await page.locator('.ant-modal button, .ant-drawer button').filter({ hasText: /Add|Select|Use/i }).first().click().catch(() => {});
	await page.waitForTimeout(400);
	// Close modal
	await page.locator('.ant-modal-close, .ant-drawer-close').first().click().catch(() => {});
	await page.waitForTimeout(400);
}
await page.screenshot({ path: 'tmp/audit/run-03-with-hero.png', fullPage: false });
log('saved tmp/audit/run-03-with-hero.png');

await scrollAndShot(400, '04-scroll-400');
await scrollAndShot(1000, '05-scroll-1000');
await scrollAndShot(2000, '06-scroll-2000');

await browser.close();
console.log('done');

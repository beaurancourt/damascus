// Guards the app's own console output. Loads both sites, walks the main
// flows, and fails if anything logs a warning or an error - the offline-cache
// bug sat in production for weeks emitting four 404s and two errors on every
// single page load, and nothing was watching.
//
// Browser extensions log into the same console, so this runs in a clean
// Chromium with no profile and no extensions: whatever it catches is ours.
//
// Usage:
//   node scripts/smoke-console.mjs
//   SMOKE_BASE=https://beaurancourt.github.io/damascus/ \
//   SMOKE_BASE_GM=https://beaurancourt.github.io/damascus-gm/ node scripts/smoke-console.mjs
import { chromium } from 'playwright';

const PLAYER = process.env.SMOKE_BASE || 'http://localhost:5173/';
const GM = process.env.SMOKE_BASE_GM || 'http://localhost:5174/';

// Things the console says that aren't the app talking.
const IGNORE = [
	/\[vite\]/i, // dev server chatter
	/Download the React DevTools/i, // React's own suggestion
	/ObjectMultiplex|orphaned data|MaxListenersExceededWarning|contentscript/i // browser extensions
];

const browser = await chromium.launch();
const problems = [];

const watch = async (label, url, drive) => {
	const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
	const page = await ctx.newPage();
	const noise = [];
	page.on('console', m => {
		if ((m.type() === 'error' || m.type() === 'warning') && !IGNORE.some(re => re.test(m.text()))) {
			noise.push(`${m.type()}: ${m.text()}`);
		}
	});
	page.on('pageerror', e => noise.push(`pageerror: ${e.message}`));
	page.on('response', r => {
		if (r.status() >= 400) { noise.push(`${r.status()}: ${r.url()}`); }
	});

	await page.goto(url, { waitUntil: 'networkidle' });
	await page.waitForTimeout(2500);
	await drive(page);
	await page.waitForTimeout(1500);

	console.log(`${label}: ${noise.length} problem(s)`);
	noise.slice(0, 8).forEach(n => console.log(`   ! ${n.slice(0, 140)}`));
	noise.forEach(n => problems.push(`${label} ${n}`));
	await ctx.close();
};

await watch('player  ', PLAYER, async page => {
	// make a hero, open its sheet, open a tool, go back to the list
	for (let i = 0; i < 3; i++) {
		if (/\/hero\/view\//.test(await page.evaluate(() => location.hash))) break;
		await page.locator('.hero-section-empty button', { hasText: 'Generate a Random Hero' }).first().click().catch(() => {});
		await page.waitForURL(/\/hero\/view\//, { timeout: 9000 }).catch(() => {});
	}
	await page.waitForTimeout(1500);
	await page.locator('.app-header button', { hasText: /^Inventory$/ }).first().click().catch(() => {});
	await page.waitForTimeout(1200);
	await page.locator('button:has-text("Close")').first().click().catch(() => {});
	await page.waitForTimeout(800);
	await page.evaluate(() => { location.hash = '#/hero'; });
	await page.waitForTimeout(1200);
});

await watch('gm      ', GM, async page => {
	// library, an entry with everything on it, and the session screen
	await page.evaluate(() => { location.hash = '#/library/monster-group'; });
	await page.waitForTimeout(2000);
	await page.locator('.selection-list.elements .selector-row').first().click().catch(() => {});
	await page.waitForTimeout(1800);
	await page.evaluate(() => { location.hash = '#/library/encounter'; });
	await page.waitForTimeout(1500);
	await page.evaluate(() => { location.hash = '#/session/director'; });
	await page.waitForTimeout(1800);
});

console.log(problems.length === 0
	? '\nOK   the app logs nothing'
	: `\nFAIL ${problems.length} console problem(s) from the app`);
await browser.close();
process.exit(problems.length === 0 ? 0 : 1);

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 412, height: 915 },
	deviceScaleFactor: 2.625,
	isMobile: true,
	hasTouch: true
});
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

await page.screenshot({ path: 'tmp/audit/inspect-mobile-welcome.png', fullPage: false });
const titles = await page.locator('button').allTextContents();
console.log('buttons on welcome:', titles.filter(t => t.trim()).slice(0, 30));

await page.evaluate(() => location.hash = '#/hero');
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp/audit/inspect-mobile-heroes.png', fullPage: false });

await page.evaluate(() => location.hash = '#/');
await page.waitForTimeout(500);
await page.locator('button:has-text("Use a Premade Hero")').first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp/audit/inspect-mobile-pregens.png', fullPage: false });
const popInner = await page.evaluate(() => {
	const sel = [ '.ant-popover-inner', '.ant-popover', '[role="tooltip"]' ].map(s => `${s}: ${document.querySelectorAll(s).length}`).join('; ');
	return sel;
});
console.log('popover counts:', popInner);
const allBtns = await page.locator('button').count();
console.log('total buttons:', allBtns);
const ashley = await page.locator('button').filter({ hasText: 'Ashley' }).count();
console.log('Ashley buttons:', ashley);
console.log('saved');
await browser.close();

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.locator('button[title="Reference"]').first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp/audit/virtual-top.png', fullPage: false });
await browser.close();

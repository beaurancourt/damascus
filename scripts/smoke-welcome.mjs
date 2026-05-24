// Confirm the welcome page renders without tips and shows the Welcome content.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const damascusVisible = await page.getByText(/DAMASCUS is an app/).first().isVisible().catch(() => false);
const tipsVisible = await page.locator('.tip-column').first().isVisible().catch(() => false);
const showTipsButton = await page.locator('[title="Show Tips"]').first().isVisible().catch(() => false);

log(`welcome content visible? ${damascusVisible}`);
log(`tip column present? ${tipsVisible}`);
log(`"Show Tips" button present? ${showTipsButton}`);

await browser.close();
console.log('done');

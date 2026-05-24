// Verifies the settings modal works after cutting Patreon/Warehouse/etc.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('tmp/audit', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.locator('button[title="Settings"]').first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp/audit/settings-after-cut.png', fullPage: false });

// Confirm Connections/Patreon/Feature Flags are NOT present
const hasConnections = await page.getByText(/^Connections$/).first().isVisible().catch(() => false);
const hasPatreon = await page.getByText(/Patreon/).first().isVisible().catch(() => false);
const hasFeatureFlags = await page.getByText(/Feature Flags|Advanced/).first().isVisible().catch(() => false);
log(`Connections section present? ${hasConnections}`);
log(`Patreon mentioned? ${hasPatreon}`);
log(`Feature Flags / Advanced tab? ${hasFeatureFlags}`);

// Confirm core sections present
log(`Appearance? ${await page.getByText(/^Appearance$/).first().isVisible().catch(() => false)}`);
log(`Heroes? ${await page.getByText(/^Heroes$/).first().isVisible().catch(() => false)}`);
log(`Encounters? ${await page.getByText(/^Encounters$/).first().isVisible().catch(() => false)}`);
log(`Tactical Maps? ${await page.getByText(/^Tactical Maps$/).first().isVisible().catch(() => false)}`);

await browser.close();
console.log('done');

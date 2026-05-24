// Drives the YAML-import modal in a real browser. Run via:
//   node scripts/smoke-encounter-import.mjs
// Assumes dev server is up at http://localhost:5173.

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';

const SCREEN_DIR = 'tmp/screenshots';
mkdirSync(SCREEN_DIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

page.on('console', msg => {
	const type = msg.type();
	if (type === 'error' || type === 'warning') {
		console.log(`[console ${type}]`, msg.text());
	}
});
page.on('pageerror', err => console.error('[pageerror]', err.message));

const log = msg => console.log(`>>> ${msg}`);

log('navigate to root');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

log('click Library footer link');
await page.getByRole('link', { name: /Library/ }).first().click().catch(async () => {
	await page.getByText(/^Library$/).first().click();
});
await page.waitForTimeout(700);

log('switch to Encounters category (sidebar, plural)');
await page.getByText(/^Encounters$/).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${SCREEN_DIR}/01-library-encounter.png`, fullPage: false });

log('click Add button (top of page, primary action)');
const addBtn = page.getByRole('button', { name: /^Add/ });
await addBtn.first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${SCREEN_DIR}/02-add-popover.png`, fullPage: false });

log('click "Import from YAML" expander');
const yamlExpander = page.getByText(/Import from YAML/i).first();
await yamlExpander.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SCREEN_DIR}/03-expander-open.png`, fullPage: false });

log('click "Open YAML importer"');
const openBtn = page.getByRole('button', { name: /Open YAML importer/i });
await openBtn.click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${SCREEN_DIR}/04-modal-open.png`, fullPage: false });

log('insert example YAML');
const insertExample = page.getByRole('button', { name: /Insert example/i });
await insertExample.click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${SCREEN_DIR}/05-example-loaded.png`, fullPage: false });

log('paste a bad YAML to verify error handling');
const textarea = page.locator('textarea').first();
await textarea.fill('name: Bad\ngroups:\n  - name: x\n    slots:\n      - monster: this-id-does-not-exist\n');
await page.waitForTimeout(500);
await page.screenshot({ path: `${SCREEN_DIR}/06-bad-yaml-error.png`, fullPage: false });

const errorVisible = await page.getByText(/Unknown monster id/i).first().isVisible().catch(() => false);
log(`error visible? ${errorVisible}`);

log('restore good YAML');
const goodYaml = readFileSync('skills/encounter-builder/reference/examples/standard-lvl1.yaml', 'utf8');
await textarea.fill(goodYaml);
await page.waitForTimeout(500);
await page.screenshot({ path: `${SCREEN_DIR}/07-good-yaml-preview.png`, fullPage: false });

log('check the preview panel mentions EV');
const evVisible = await page.getByText(/EV \d+/).first().isVisible().catch(() => false);
log(`EV preview visible? ${evVisible}`);

log('switch to mobile viewport and screenshot');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${SCREEN_DIR}/08-mobile-modal.png`, fullPage: true });

log('back to desktop viewport for save-to-library round-trip');
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(300);

log('click Save to library');
const saveBtn = page.getByRole('button', { name: /Save to library/i });
await saveBtn.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${SCREEN_DIR}/09-after-save.png`, fullPage: false });
const onEditPage = page.url().includes('/library/edit/encounter/');
log(`navigated to encounter edit page? ${onEditPage}  (url=${page.url()})`);

await browser.close();
console.log('done');

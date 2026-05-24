// Verifies that PDF intermediate headings (Abilities, Stamina, Hide and Sneak,
// Combat Round, Free Strikes, etc.) render between section headers and the
// rules underneath them.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp/audit';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', err => console.error('[pageerror]', err.message));
const log = msg => console.log(`>>> ${msg}`);

log('open reference modal');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.locator('button[title="Reference"]').first().click();
await page.waitForTimeout(700);

const expectedVirtuals = [
	'Abilities',
	'Power Rolls',
	'Making a Power Roll',
	'Stamina',
	'Hide and Sneak',
	'Combat Round',
	'Free Strikes',
	'Movement Types'
];

for (const label of expectedVirtuals) {
	const headings = await page.locator(`.rules-entry.virtual .rules-entry-heading`).filter({ hasText: new RegExp(`^${label}$`, 'i') }).count();
	log(`virtual heading "${label}": ${headings > 0 ? 'present' : 'MISSING'}`);
}

// Scroll to Stamina to make sure it actually appears in order
await page.locator('.rules-entry.virtual .rules-entry-heading').filter({ hasText: /^Stamina$/ }).first().scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/virtual-headings-stamina.png`, fullPage: false });

await browser.close();
console.log('done');

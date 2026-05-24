// extension-demo.spec.js — verify the /extension/ click-through demo.
// Purely additive: new file; existing suites untouched.
//
// What it checks:
//   1. /extension/ loads and renders E02 (Today) inside the iframe.
//   2. Clicking the real "Add entry" CTA inside the popup navigates to E03.
//   3. From E02, "Close My Day" → E04, then "Confirm & sync ⌘↵" → E05.
//   4. Control-strip jumps reach E06 (Reminder) and E07 (Offline).
//   5. Each of the 6 screens gets a full-page screenshot saved to
//      test-results/screenshots/extension-<id>.png.
//
// Run: `cd web && npx playwright test extension-demo.spec.js` (CLI only).

import { test, expect } from '@playwright/test';
import { trackErrors, screenshot } from './_helpers';

// The wrapper sets <h1 id="screen-title"> to "E0X · <Name>" on every nav.
// Asserting against that is the most reliable "we're on the right screen" check.
async function expectScreen(page, prefix) {
  await expect(page.locator('#screen-title')).toHaveText(new RegExp(`^${prefix}`));
}

// Click a button INSIDE the iframe by its visible text. Polls so we don't
// race the design-tool's runtime that renders the popup body async.
async function clickInFrame(page, label) {
  const frame = page.frameLocator('#frame');
  const btn = frame.getByRole('button', { name: label, exact: false });
  await expect(btn.first()).toBeVisible({ timeout: 10_000 });
  await btn.first().click();
}

// After a screen navigation, wait for the iframe's body to actually render.
// The wrapper updates #screen-title synchronously when navigateTo() fires,
// but the design-tool runtime inside the iframe renders progressively over
// several hundred ms. We wait for a visible <button> inside the iframe body
// AND a short settle so screenshots capture the full populated popup, not
// a skeleton. `bodyText` (optional) lets a caller assert specific copy.
async function waitForFrameReady(page, bodyText) {
  const frame = page.frameLocator('#frame');
  // 1) wait for >=1 visible button inside the popup (proves runtime rendered)
  await expect(frame.getByRole('button').first()).toBeVisible({ timeout: 10_000 });
  // 2) optionally wait for distinctive copy on the target screen
  if (bodyText) {
    await expect(frame.getByText(bodyText, { exact: false }).first()).toBeVisible({ timeout: 6_000 });
  }
  // 3) tiny settle for paint stability before screenshot
  await page.waitForTimeout(350);
}

// Wrapper control selectors — use ids (stable) rather than text/role
// matching, because aria-labels and visible text differ across browsers.
const CTRL = {
  prev:    '#ctrl-prev',
  next:    '#ctrl-next',
  restart: '#ctrl-restart',
  jump: (n) => `.dots button[data-jump="${n}"]`,
};
const JUMP_INDEX = { today: 0, addEntry: 1, closeDay: 2, syncResult: 3, reminder: 4, offline: 5 };

test.describe('AutoClock — Chrome extension demo (/extension/)', () => {
  test.beforeEach(async ({ page }) => {
    // Demo is desktop-shaped; 1440×900 matches the rest of the suite.
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('loads, click-through E02 → E03 → E02 → E04 → E05 → E06 → E07', async ({ page }) => {
    const errors = trackErrors(page);

    // 1. Initial load — E02 Today
    // Use explicit /extension/index.html — Vite's dev server SPA fallback
// rewrites /extension/ to the React SPA's root index.html. The explicit
// path bypasses that; production (Express static + directory index) serves
// /extension/ correctly without the suffix.
await page.goto('/extension/index.html');
    await page.waitForLoadState('networkidle');
    await expectScreen(page, 'E02');
    await waitForFrameReady(page, /today/i);
    await screenshot(page, 'extension-e02-today');

    // 2. Click the real "Add entry" button inside the popup → E03
    await clickInFrame(page, 'Add entry');
    await expectScreen(page, 'E03');
    await waitForFrameReady(page, /Save slot/);
    await screenshot(page, 'extension-e03-add-entry');

    // 3. Back to E02 via the wrapper (jump dot) so we can demo "Close My Day"
    await page.locator(CTRL.jump(JUMP_INDEX.today)).click();
    await expectScreen(page, 'E02');
    await waitForFrameReady(page, /Close My Day/);

    // 4. Click "Close My Day" → E04
    await clickInFrame(page, 'Close My Day');
    await expectScreen(page, 'E04');
    await waitForFrameReady(page, /Confirm/);
    await screenshot(page, 'extension-e04-close-day');

    // 5. Confirm & sync → E05
    await clickInFrame(page, /Confirm.*sync/);
    await expectScreen(page, 'E05');
    await waitForFrameReady(page, /Done/);
    await screenshot(page, 'extension-e05-sync-result');

    // 6. Jump to E06 (Reminder) via control strip
    await page.locator(CTRL.jump(JUMP_INDEX.reminder)).click();
    await expectScreen(page, 'E06');
    await waitForFrameReady(page, /Log now/);
    await screenshot(page, 'extension-e06-reminder');

    // 7. Jump to E07 (Offline)
    await page.locator(CTRL.jump(JUMP_INDEX.offline)).click();
    await expectScreen(page, 'E07');
    await waitForFrameReady(page, /offline/i);
    await screenshot(page, 'extension-e07-offline');

    // 8. Restart returns to E02
    await page.locator(CTRL.restart).click();
    await expectScreen(page, 'E02');

    // The amber EXTENSION MOCKUP banner is always visible — proves the
    // demo is clearly presenter chrome, not the product.
    await expect(page.getByText(/EXTENSION MOCKUP/i)).toBeVisible();

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('control-strip Back / Next walks every screen in order', async ({ page }) => {
    const errors = trackErrors(page);
    // Use explicit /extension/index.html — Vite's dev server SPA fallback
// rewrites /extension/ to the React SPA's root index.html. The explicit
// path bypasses that; production (Express static + directory index) serves
// /extension/ correctly without the suffix.
await page.goto('/extension/index.html');
    await page.waitForLoadState('networkidle');

    const order = ['E02', 'E03', 'E04', 'E05', 'E06', 'E07'];
    for (let i = 1; i < order.length; i++) {
      await page.locator(CTRL.next).click();
      await expectScreen(page, order[i]);
    }
    // Walk back
    for (let i = order.length - 2; i >= 0; i--) {
      await page.locator(CTRL.prev).click();
      await expectScreen(page, order[i]);
    }
    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });
});

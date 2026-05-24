// extension-demo.spec.js — verify the /extension/ click-through demo.
// Purely additive: new file; existing suites untouched.
//
// What it checks:
//   1. /extension/ loads and renders E02 (Today) inside the iframe.
//   2. Clicking the real "Add entry" CTA inside the popup navigates to E03.
//   3. From E02, "Close My Day" → E04, then "Confirm & sync ⌘↵" → E05.
//   4. The page-head inline links reach E06 (Reminder) and E07 (Offline)
//      — the only two screens not reachable from any in-popup button.
//   5. Keyboard arrows (← / →) walk every screen in order — invisible nav
//      for presenters who don't want to mouse.
//   6. Each of the 6 screens gets a full-page screenshot saved to
//      test-results/screenshots/extension-<id>.png.
//   7. The design-tool's "tweak panel" (VIEW: With logs / Empty / Reminder ✓)
//      is hidden in every frame via the runtime-injected CSS.
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
// The wrapper updates #screen-title synchronously, but the design-tool
// runtime inside the iframe renders progressively over several hundred ms.
async function waitForFrameReady(page, bodyText) {
  const frame = page.frameLocator('#frame');
  await expect(frame.getByRole('button').first()).toBeVisible({ timeout: 10_000 });
  if (bodyText) {
    await expect(frame.getByText(bodyText, { exact: false }).first()).toBeVisible({ timeout: 6_000 });
  }
  await page.waitForTimeout(350);
}

// Assert the design-tool's scenario-toggle "tweak bar" is hidden by our
// runtime-injected CSS. Each frame ships a `.tweak-bar` element; after our
// injectStyles() runs it should have computed `display: none`.
async function expectTweakBarHidden(page) {
  const hidden = await page.evaluate(() => {
    const iframe = document.getElementById('frame');
    const doc = iframe && iframe.contentDocument;
    if (!doc) return null;
    const bar = doc.querySelector('.tweak-bar');
    if (!bar) return 'absent';                             // some frames may not have one
    return getComputedStyle(bar).display === 'none' ? 'hidden' : 'visible';
  });
  // Either the frame doesn't have one, or our CSS hid it.
  expect(['absent', 'hidden']).toContain(hidden);
}

test.describe('AutoClock — Chrome extension demo (/extension/)', () => {
  test.beforeEach(async ({ page }) => {
    // Demo is desktop-shaped; 1440×900 matches the rest of the suite.
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('loads, click-through E02 → E03 → E02 → E04 → E05 → E06 → E07', async ({ page }) => {
    const errors = trackErrors(page);

    // 1. Initial load — E02 Today.
    // Use explicit /extension/index.html — Vite's dev server SPA fallback
    // rewrites /extension/ to the React SPA's root index.html. The explicit
    // path bypasses that; production (Express static + directory index) serves
    // /extension/ correctly without the suffix.
    await page.goto('/extension/index.html');
    await page.waitForLoadState('networkidle');
    await expectScreen(page, 'E02');
    await waitForFrameReady(page, /today/i);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e02-today');

    // 2. Click the real "Add entry" button inside the popup → E03
    await clickInFrame(page, 'Add entry');
    await expectScreen(page, 'E03');
    await waitForFrameReady(page, /Save slot/);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e03-add-entry');

    // 3. Save slot returns to E02 — natural popup-driven nav
    await clickInFrame(page, 'Save slot');
    await expectScreen(page, 'E02');
    await waitForFrameReady(page, /Close My Day/);

    // 4. Click "Close My Day" → E04
    await clickInFrame(page, 'Close My Day');
    await expectScreen(page, 'E04');
    await waitForFrameReady(page, /Confirm/);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e04-close-day');

    // 5. Confirm & sync → E05
    await clickInFrame(page, /Confirm.*sync/);
    await expectScreen(page, 'E05');
    await waitForFrameReady(page, /Done/);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e05-sync-result');

    // 6. Page-head inline link to E06 Reminder (no in-popup button leads here)
    await page.locator('#ctrl-reminder').click();
    await expectScreen(page, 'E06');
    await waitForFrameReady(page, /Log now/);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e06-reminder');

    // 7. Page-head inline link to E07 Offline
    await page.locator('#ctrl-offline').click();
    await expectScreen(page, 'E07');
    // Use a popup-body-only signal — the (now-hidden) tweak bar also has a
    // "Offline" button, which would match /offline/i and confuse the helper.
    await waitForFrameReady(page, /queued/i);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e07-offline');

    // 8. Restart returns to E02
    await page.locator('#ctrl-restart').click();
    await expectScreen(page, 'E02');

    // The amber EXTENSION MOCKUP banner stays the whole time.
    await expect(page.getByText(/EXTENSION MOCKUP/i)).toBeVisible();

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('keyboard ←/→ walks every screen in order', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/extension/index.html');
    await page.waitForLoadState('networkidle');
    // Focus the body so the keydown handler runs (it's gated to body target).
    await page.locator('body').click({ position: { x: 5, y: 5 } });

    const order = ['E02', 'E03', 'E04', 'E05', 'E06', 'E07'];
    for (let i = 1; i < order.length; i++) {
      await page.keyboard.press('ArrowRight');
      await expectScreen(page, order[i]);
    }
    for (let i = order.length - 2; i >= 0; i--) {
      await page.keyboard.press('ArrowLeft');
      await expectScreen(page, order[i]);
    }
    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });
});

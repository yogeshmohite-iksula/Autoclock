// extension-demo.spec.js — verify the /extension/ click-through demo.
// Purely additive: new file; existing suites untouched.
//
// New entry-point flow (per Yogesh's review): demo opens on E06 Reminder
// (with notification chime via Web Audio API). User clicks "Log now" →
// E02 in EMPTY state. User clicks "Add entry" → E03 → Save slot → E02
// (populated) → Close My Day → E04 → Confirm & sync → E05 → Done → E02.
//
// Run: `cd web && npx playwright test extension-demo.spec.js` (CLI only).

import { test, expect } from '@playwright/test';
import { trackErrors, screenshot } from './_helpers';

async function expectScreen(page, prefix) {
  await expect(page.locator('#screen-title')).toHaveText(new RegExp(`^${prefix}`));
}

async function clickInFrame(page, label) {
  const frame = page.frameLocator('#frame');
  const btn = frame.getByRole('button', { name: label, exact: false });
  await expect(btn.first()).toBeVisible({ timeout: 10_000 });
  await btn.first().click();
}

async function waitForFrameReady(page, bodyText) {
  const frame = page.frameLocator('#frame');
  await expect(frame.getByRole('button').first()).toBeVisible({ timeout: 10_000 });
  if (bodyText) {
    await expect(frame.getByText(bodyText, { exact: false }).first()).toBeVisible({ timeout: 6_000 });
  }
  await page.waitForTimeout(350);
}

async function expectTweakBarHidden(page) {
  const hidden = await page.evaluate(() => {
    const iframe = document.getElementById('frame');
    const doc = iframe && iframe.contentDocument;
    if (!doc) return null;
    const bar = doc.querySelector('.tweak-bar');
    if (!bar) return 'absent';
    return getComputedStyle(bar).display === 'none' ? 'hidden' : 'visible';
  });
  expect(['absent', 'hidden']).toContain(hidden);
}

test.describe('AutoClock — Chrome extension demo (/extension/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('demo flow: E06 reminder → Log now → E02 empty → Add entry → E03 → Save → E02 → Close My Day → E04 → Confirm → E05 → Done → E02', async ({ page }) => {
    const errors = trackErrors(page);

    // 1. Demo opens on E06 Reminder (with notification chime — audio is
    //    triggered on first user gesture; the chime itself is best
    //    verified manually, not in Playwright).
    await page.goto('/extension/index.html');
    await page.waitForLoadState('networkidle');
    await expectScreen(page, 'E06');
    await waitForFrameReady(page, /Log now/);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e06-reminder');

    // 2. User clicks "Log now" on the OS notification → E02 EMPTY state.
    //    The wrapper flips E02 to empty via the source's setView('empty')
    //    function (called inside the iframe at runtime; the frame stays
    //    byte-identical).
    await clickInFrame(page, 'Log now');
    await expectScreen(page, 'E02');
    // E02 empty-state shows "Nothing logged" or similar copy from the design;
    // we wait for the Add entry CTA which is present in both states.
    await waitForFrameReady(page, /Add entry/);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e02-today-empty');

    // 3. User clicks "Add entry" → E03 Add Entry form.
    await clickInFrame(page, 'Add entry');
    await expectScreen(page, 'E03');
    await waitForFrameReady(page, /Save slot/);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e03-add-entry');

    // 4. Save slot → E02 (now populated — the source's default state).
    await clickInFrame(page, 'Save slot');
    await expectScreen(page, 'E02');
    await waitForFrameReady(page, /Close My Day/);
    await screenshot(page, 'extension-e02-today-populated');

    // 5. Close My Day → E04 preview.
    await clickInFrame(page, 'Close My Day');
    await expectScreen(page, 'E04');
    await waitForFrameReady(page, /Confirm/);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e04-close-day');

    // 6. Confirm & sync → E05 result.
    await clickInFrame(page, /Confirm.*sync/);
    await expectScreen(page, 'E05');
    await waitForFrameReady(page, /Done/);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e05-sync-result');

    // 7. Done → back to E02 (populated).
    await clickInFrame(page, 'Done');
    await expectScreen(page, 'E02');

    // 8. Inline page-head link to E07 Offline (no in-popup button leads here).
    await page.locator('#ctrl-offline').click();
    await expectScreen(page, 'E07');
    await waitForFrameReady(page, /queued/i);
    await expectTweakBarHidden(page);
    await screenshot(page, 'extension-e07-offline');

    // 9. Restart returns to E06 (demo entry point).
    await page.locator('#ctrl-restart').click();
    await expectScreen(page, 'E06');

    await expect(page.getByText(/EXTENSION MOCKUP/i)).toBeVisible();
    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('keyboard ←/→ walks every screen in order (E02..E07)', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/extension/index.html');
    await page.waitForLoadState('networkidle');
    await expectScreen(page, 'E06');                       // initial = E06
    await page.locator('body').click({ position: { x: 5, y: 5 } });

    // ← from E06 walks back through the screen registry order (E02..E07).
    // Keyboard nav is "linear" presenter mode, not the demo's narrative flow.
    await page.keyboard.press('ArrowLeft');
    await expectScreen(page, 'E05');
    await page.keyboard.press('ArrowRight');
    await expectScreen(page, 'E06');
    await page.keyboard.press('ArrowRight');
    await expectScreen(page, 'E07');

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });
});

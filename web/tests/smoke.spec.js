// Smoke E2E — proves the three signed-in/out routes ship by PR #2 render
// cleanly at the AutoClock viewports (desktop 1440×900, mobile 390×844)
// under VITE_USE_MOCKS.
//
// For each (path × viewport) we assert:
//   1) no console errors during load
//   2) no horizontal overflow (document scrollWidth ≤ viewport width)
//   3) the main heading + primary action are visible
//   4) a full-page screenshot lands in test-results/screenshots/
//
// Run: `cd web && npx playwright test`. CLI only — NEVER Playwright MCP.

import { test, expect } from '@playwright/test';
import {
  VIEWPORTS,
  trackErrors,
  signIn,
  signInAndOnboard,
  assertNoHorizontalOverflow,
  screenshot,
} from './_helpers';

// ===========================================================================
// Root redirect — proves the boot path
// ===========================================================================

test('/ redirects to /sign-in on first boot (signed-out by default)', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/sign-in$/);
});

// ===========================================================================
// Per-page × per-viewport matrix
// ===========================================================================

for (const vp of VIEWPORTS) {
  test.describe(`viewport @ ${vp.name} (${vp.width}×${vp.height})`, () => {

    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
    });

    test('/sign-in renders cleanly', async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'AutoClock', level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await screenshot(page, `sign-in--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });

    test('/onboarding renders cleanly (signed-in, not onboarded)', async ({ page }) => {
      const errors = trackErrors(page);
      await signIn(page);
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'Connect your accounts' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Finish setup/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await screenshot(page, `onboarding--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });

    test('/today renders cleanly (signed-in + onboarded)', async ({ page }) => {
      const errors = trackErrors(page);
      await signInAndOnboard(page);
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening|night),/i })).toBeVisible();
      // Two "Close My Day" buttons (hero + close-bar) — assert at least the hero one is visible.
      await expect(page.getByRole('button', { name: /Close My Day/ }).first()).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await screenshot(page, `today--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  });
}

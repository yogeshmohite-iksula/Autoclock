// allpages.spec.js — per-page gate for the 14 new AutoClock pages.
// One describe block per page; each runs at desktop (1440×900) + mobile (390×844).
// Asserts: no console errors, no horizontal overflow, no element-overlap between
// top-level layout regions, primary heading + primary action visible, full-page
// screenshot saved to test-results/screenshots/.

import { test, expect } from '@playwright/test';
import {
  VIEWPORTS,
  trackErrors,
  signInAndOnboard,
  assertNoHorizontalOverflow,
  assertNoOverlap,
  screenshot,
} from './_helpers';

// ===========================================================================
// P03 — App Shell mobile drawer
// (smoke.spec.js already proves /today renders cleanly. This test specifically
// covers the drawer hamburger added in feat/frontend-allpages.)
// ===========================================================================

test.describe('P03 App Shell — mobile drawer', () => {
  test('hamburger opens + closes the drawer at 390×844', async ({ page }) => {
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAndOnboard(page);
    await page.waitForLoadState('networkidle');

    // Sidebar is hidden by default on mobile
    await expect(page.locator('.tdy-sidebar')).toBeHidden();

    // Hamburger opens the drawer
    const hamburger = page.getByRole('button', { name: /Open menu/i });
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    // Sidebar + backdrop are now visible
    await expect(page.locator('.tdy-sidebar')).toBeVisible();
    await expect(page.locator('.tdy-drawer-backdrop')).toBeVisible();

    // Drawer items
    await expect(page.getByRole('link', { name: 'Today' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My History' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

    // ESC closes the drawer (we also have backdrop-click; the test uses ESC
    // because the backdrop's centre point sits under the sidebar at 390px).
    await page.keyboard.press('Escape');
    await expect(page.locator('.tdy-sidebar')).toBeHidden();

    await assertNoHorizontalOverflow(page);
    await screenshot(page, 'app-shell-drawer--mobile');
    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });
});

// ===========================================================================
// Per-page matrix — generator. Each new page in feat/frontend-allpages registers
// itself below; the helper drives desktop + mobile through the same gate.
// ===========================================================================

/**
 * Register a per-page test pair.
 * @param {object} opts
 *   - id        page short id (used in screenshot filename)
 *   - title     readable name
 *   - path      route to visit
 *   - heading   regex/string for the page's primary <h1>/<h2>
 *   - primary   regex/string for the page's primary action (button or link)
 *   - regions   optional CSS selectors for overlap check
 *   - skipMobile (rare) — set true to allow desktop-only assertions
 */
export function registerPageGate({ id, title, path, heading, primary, regions }) {
  test.describe(title, () => {
    for (const vp of VIEWPORTS) {
      test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › ${path} renders cleanly`, async ({ page }) => {
        const errors = trackErrors(page);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await signInAndOnboard(page);
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        if (heading) await expect(page.getByRole('heading', { name: heading })).toBeVisible();
        if (primary) await expect(page.getByRole('button', { name: primary }).or(page.getByRole('link', { name: primary })).first()).toBeVisible();

        await assertNoHorizontalOverflow(page);
        if (regions && regions.length) await assertNoOverlap(page, regions);

        await screenshot(page, `${id}--${vp.name}`);
        expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
      });
    }
  });
}

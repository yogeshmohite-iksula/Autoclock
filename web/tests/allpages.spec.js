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
  gotoAuthed,
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
        // Use gotoAuthed (in-app history push) so the mock session survives —
        // page.goto() reloads JS which resets SESSION_USER and bounces to /sign-in.
        await gotoAuthed(page, path);
        await page.waitForLoadState('networkidle');

        if (heading) await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
        if (primary) await expect(page.getByRole('button', { name: primary }).or(page.getByRole('link', { name: primary })).first()).toBeVisible();

        await assertNoHorizontalOverflow(page);
        if (regions && regions.length) await assertNoOverlap(page, regions);

        await screenshot(page, `${id}--${vp.name}`);
        expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
      });
    }
  });
}

// ===========================================================================
// P04 — Close My Day (/close)
// EP-12 preview + EP-13 idempotent close. The H1 is "Close your day — here's
// what AutoClock will do." (matches /close my day/i). Primary action is the
// "Close My Day" button in the action bar.
// ===========================================================================
registerPageGate({
  id: 'close-my-day',
  title: 'P04 Close My Day',
  path: '/close',
  heading: /Close your day/i,
  primary: /^Close My Day/,  // matches both bare button + aria-label "Close My Day — confirm and sync"
});

// ===========================================================================
// P05 — Sync Result (/close/result)
// EP-13 response rendered as per-system rows. The default helper drives a
// direct visit to /close/result — there's no location.state.result, so the
// page MUST render the empty "no recent sync" state. Heading + primary CTA
// match that path; the success path is exercised by the bespoke test below.
// ===========================================================================
registerPageGate({
  id: 'sync-result',
  title: 'P05 Sync Result',
  path: '/close/result',
  heading: /No recent sync to show/i,
  primary: /Go to Close My Day/i,
});

// ===========================================================================
// P06 — Settings (/settings)
// User-scope preferences (no role gate beyond authed + onboarded). The H1 is
// "Settings". The Save button is intentionally disabled in the clean state,
// so we point `primary` at the always-visible "Reset to defaults" button in
// the Danger zone — it's a stable, enabled control on first load.
// ===========================================================================
registerPageGate({
  id: 'settings',
  title: 'P06 Settings',
  path: '/settings',
  heading: /^Settings$/,
  primary: /Reset to defaults/i,
});

// Bespoke test — at mobile viewport, change the reminder cadence radio, watch
// the SaveBar transition saved → dirty → saving → saved, and verify no
// overflow + no console errors. Run at both viewports so we cover desktop
// too — the save bar layout switches on the 760px breakpoint.
test.describe('P06 Settings — edit + save round-trip', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › cadence change → save → All saved`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAuthed(page, '/settings');
      await page.waitForLoadState('networkidle');

      // SaveBar starts in the "All saved" state (server data === draft).
      const status = page.locator('.ac-save-bar__status');
      await expect(status).toContainText(/All saved/i);

      // Change the cadence radio. The default in mocks.js is 'eod' — pick a
      // different value ("Every hour") and assert the radio is checked.
      const everyHour = page.getByRole('radio', { name: 'Every hour' });
      await everyHour.click();
      await expect(everyHour).toHaveAttribute('aria-checked', 'true');

      // SaveBar transitions to dirty.
      await expect(status).toContainText(/Unsaved changes/i);

      // Click Save (now enabled). The mock returns the merged response, so
      // the bar should return to "All saved".
      const saveBtn = page.getByRole('button', { name: /^Save changes$/ });
      await expect(saveBtn).toBeEnabled();
      await saveBtn.click();

      await expect(status).toContainText(/All saved/i, { timeout: 6_000 });
      // The mini-line shows the "Last saved · …" hint after a successful PUT.
      await expect(page.locator('.ac-save-bar__mini')).toContainText(/Last saved/i);

      await assertNoHorizontalOverflow(page);
      await screenshot(page, `settings-edit-flow--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// Bespoke test — full flow: sign-in → onboarding → Close My Day → confirm →
// Sync Result. Asserts the "Your day is synced." hero is visible at both
// viewports (mock EP-13 returns overall:'ok'). No overlap / no overflow /
// no console errors / screenshot saved.
test.describe('P05 Sync Result — full close-my-day flow', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › close → /close/result success`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await signInAndOnboard(page);
      await page.waitForLoadState('networkidle');

      // Navigate to /close via an in-app push (preserves the mock session).
      await page.evaluate(() => {
        window.history.pushState({}, '', '/close');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await page.waitForURL(/\/close$/);
      await expect(page.getByRole('heading', { name: /Close your day/i })).toBeVisible();

      // Click the action-bar "Close My Day" button (aria-label disambiguates).
      const confirmBtn = page.getByRole('button', { name: /^Close My Day — confirm and sync$/ });
      await expect(confirmBtn).toBeEnabled({ timeout: 6_000 });
      await confirmBtn.click();

      // Navigation → /close/result, success state visible.
      await page.waitForURL(/\/close\/result$/);
      await expect(page.getByRole('heading', { name: /Your day is\s+synced/i })).toBeVisible();
      // Counter shows 3/3.
      await expect(page.locator('.page-sync-result .count .big')).toContainText('3');
      // "Done" CTA in the action bar links back to /today.
      await expect(page.getByRole('link', { name: /^Done/i })).toBeVisible();

      await assertNoHorizontalOverflow(page);
      await assertNoOverlap(page, ['.page-sync-result .hero', '.page-sync-result .results-card', '.page-sync-result .action-bar']);

      await screenshot(page, `sync-result-flow--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

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
        if (primary) {
          // Primary actions in AutoClock pages are buttons, links, or — for
          // segmented view-toggles like My History — `role="tab"` controls.
          const primaryEl = page.getByRole('button', { name: primary })
            .or(page.getByRole('link', { name: primary }))
            .or(page.getByRole('tab', { name: primary }))
            .first();
          await expect(primaryEl).toBeVisible();
        }

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

// ===========================================================================
// P07 — My History (/history)
// EP-08 extended to a date range (OQ-AP-06). H1 is "My History", primary
// action is the always-visible "List" tab in the view-toggle.
// ===========================================================================
registerPageGate({
  id: 'my-history',
  title: 'P07 My History',
  path: '/history',
  heading: /^My History$/,
  primary: /^List$/,
});

// Bespoke test — toggle list → calendar, then click a different day in the
// rail and verify the right panel updates. Run at both viewports.
test.describe('P07 My History — list/calendar toggle + day selection', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › toggle views + pick a day`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAuthed(page, '/history');
      await page.waitForLoadState('networkidle');

      // List view is the default — the rail list is visible, calendar grid is not.
      await expect(page.locator('.page-history .rail-list')).toBeVisible();
      await expect(page.locator('.page-history .cal-grid')).toHaveCount(0);

      // Toggle to calendar via the tab button.
      const calTab = page.getByRole('tab', { name: /^Calendar$/ });
      await calTab.click();
      await expect(calTab).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.page-history .cal-grid')).toBeVisible();
      await expect(page.locator('.page-history .rail-list')).toHaveCount(0);

      // Toggle back to list to pick a different day.
      await page.getByRole('tab', { name: /^List$/ }).click();
      await expect(page.locator('.page-history .rail-list')).toBeVisible();

      // Capture the current selected day's date label, click a different rail row,
      // then assert the date label changes.
      const before = await page.locator('.page-history .panel-hero__date').getAttribute('data-day-key');
      // Pick the first rail row that is NOT the currently selected one.
      const otherRow = page.locator('.page-history .rail-row:not(.is-selected)').first();
      await otherRow.scrollIntoViewIfNeeded();
      await otherRow.click();
      // Right panel updates (data-day-key attribute changes).
      await expect(page.locator('.page-history .panel-hero__date')).not.toHaveAttribute('data-day-key', before || '');

      await assertNoHorizontalOverflow(page);
      await screenshot(page, `my-history-toggle--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// ===========================================================================
// P08 — Team Dashboard (/team)
// EP-14 extended shape (OQ-AP-07). Role-gated to pm_lead + admin. The mock
// user is now pm_lead (mocks.js MOCK_USER) so the helper's sign-in flow
// admits the test. H1 is "Team Dashboard"; primary is the always-visible
// "Today" or "Week" range tab (one of them is always a stable button).
// ===========================================================================
registerPageGate({
  id: 'team-dashboard',
  title: 'P08 Team Dashboard',
  path: '/team',
  heading: /Team Dashboard|My Team/i,
  primary: /^Today$|^Week$/,
});

// Bespoke test — at desktop viewport, click the "Week" range tab and assert
// it becomes aria-selected="true" and the URL gains ?range=week. Run at both
// viewports — the tab control is identical at mobile.
test.describe('P08 Team Dashboard — range tab toggles URL state', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › click Week → ?range=week & aria-selected`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAuthed(page, '/team');
      await page.waitForLoadState('networkidle');

      // Today is selected by default
      const todayTab = page.getByRole('tab', { name: /^Today$/ });
      await expect(todayTab).toHaveAttribute('aria-selected', 'true');

      // Click Week
      const weekTab = page.getByRole('tab', { name: /^Week$/ });
      await weekTab.click();

      // aria-selected flips + URL gains ?range=week
      await expect(weekTab).toHaveAttribute('aria-selected', 'true');
      await expect(todayTab).toHaveAttribute('aria-selected', 'false');
      await expect(page).toHaveURL(/[?&]range=week/);

      await assertNoHorizontalOverflow(page);
      await screenshot(page, `team-dashboard-range--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// ===========================================================================
// P09 — Team Member Detail (/team/:memberId)
// OQ-AP-08. Role-gated to pm_lead+admin. Heading matches the member's name —
// /team/2 = Anuja Patil (see __USERS in mocks.js). Primary action is the
// always-visible "Share email" CTA in the header.
// ===========================================================================
registerPageGate({
  id: 'team-member-detail',
  title: 'P09 Team Member Detail',
  path: '/team/2',
  heading: /Anuja Patil/i,
  primary: /Share email/i,
});

// Bespoke test — click the first DayRowExpandable and assert it expands
// (ticket-list becomes visible). Run at both viewports.
test.describe('P09 Team Member Detail — day row expands', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › expand a day reveals tickets`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAuthed(page, '/team/2');
      await page.waitForLoadState('networkidle');

      // The first day-row's button should be aria-expanded="false" initially.
      const firstDayBtn = page.locator('.page-team-member .day-row__head').first();
      await expect(firstDayBtn).toBeVisible();
      await expect(firstDayBtn).toHaveAttribute('aria-expanded', 'false');

      // Click → expanded
      await firstDayBtn.scrollIntoViewIfNeeded();
      await firstDayBtn.click();
      await expect(firstDayBtn).toHaveAttribute('aria-expanded', 'true');

      // The first ticket-list should now be visible.
      const firstTicketList = page.locator('.page-team-member .day-row.is-open .ticket-list').first();
      await expect(firstTicketList).toBeVisible();
      // It contains at least one TicketRow.
      await expect(firstTicketList.locator('.ticket-row').first()).toBeVisible();

      await assertNoHorizontalOverflow(page);
      await screenshot(page, `team-member-detail-expand--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// ===========================================================================
// P10 — Management Dashboard (/org)
// EP-15 (mocked, OQ-AP-09). Role-gated to management+admin. The mock viewer
// is now MOCK_USER.role='admin' so the route is reachable. Heading matches
// "Organization Dashboard". Primary is the "Week" range tab (default-selected).
// ===========================================================================
registerPageGate({
  id: 'management-dashboard',
  title: 'P10 Management Dashboard',
  path: '/org',
  heading: /Organization|Org/i,
  primary: /^Week$/,
});

// Bespoke test — at desktop viewport, click the "Month" range tab and assert
// URL gains ?range=month + aria-selected flips. Run at both viewports — the
// tab control is identical at mobile but the surrounding layout collapses.
test.describe('P10 Management Dashboard — range tab toggles URL state', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › click Month → ?range=month & aria-selected`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAuthed(page, '/org');
      await page.waitForLoadState('networkidle');

      // Week is selected by default
      const weekTab = page.getByRole('tab', { name: /^Week$/ });
      await expect(weekTab).toHaveAttribute('aria-selected', 'true');

      // Click Month
      const monthTab = page.getByRole('tab', { name: /^Month$/ });
      await monthTab.click();

      // aria-selected flips + URL gains ?range=month
      await expect(monthTab).toHaveAttribute('aria-selected', 'true');
      await expect(weekTab).toHaveAttribute('aria-selected', 'false');
      await expect(page).toHaveURL(/[?&]range=month/);

      await assertNoHorizontalOverflow(page);
      await screenshot(page, `management-dashboard-range--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// ===========================================================================
// P11 — Compliance Console (/ops/compliance)
// EP-16 (data) + EP-17 (run-check). Role-gated to operations + admin. The
// mock viewer is MOCK_USER.role='admin' so the route is reachable. H1
// matches "Weekly compliance"; primary is the always-visible "All" filter
// chip (every people view starts on `all`).
// ===========================================================================
registerPageGate({
  id: 'compliance-console',
  title: 'P11 Compliance Console',
  path: '/ops/compliance',
  heading: /Weekly compliance/i,
  // The "All" filter chip's accessible name is "All N" (label + count
  // pip). Match a leading "All " followed by digits — the count is always
  // present because the people list is seeded by the deterministic mock.
  primary: /^All\s+\d+/,
});

// Bespoke test — select the first PersonRow, expect the BulkActionBar with
// count 1, click "Send reminders", expect a confirmation banner, click
// "Confirm", expect the success banner ("Emailed N people"). Runs at both
// viewports (mobile breakpoints flip the bar to sticky-bottom).
test.describe('P11 Compliance Console — select + bulk send round-trip', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › select → confirm → emailed`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAuthed(page, '/ops/compliance');
      await page.waitForLoadState('networkidle');

      // No bulk-bar visible on first load (nothing selected).
      await expect(page.locator('.ac-bulk-bar')).toHaveCount(0);

      // Click the first PersonRow's checkbox.
      const firstCheckbox = page.locator('.page-compliance .ac-personrow__check input[type="checkbox"]').first();
      await firstCheckbox.scrollIntoViewIfNeeded();
      await firstCheckbox.check();

      // BulkActionBar appears with count "1".
      const bulkBar = page.locator('.page-compliance .ac-bulk-bar');
      await expect(bulkBar).toBeVisible();
      await expect(bulkBar.locator('.ac-bulk-bar__count-num')).toHaveText('1');

      // Click "Send reminders" → confirmation banner appears.
      await bulkBar.getByRole('button', { name: /^Send reminders$/ }).click();
      const confirmBanner = page.locator('.page-compliance .confirm-banner');
      await expect(confirmBanner).toBeVisible();
      await expect(confirmBanner.getByText(/Send reminders to 1 selected/i)).toBeVisible();

      // Click "Confirm" → success banner appears.
      await confirmBanner.getByRole('button', { name: /^Confirm$/ }).click();
      // Success banner: ac-alert--success with "Emailed …" title.
      await expect(page.locator('.ac-alert--success')).toBeVisible({ timeout: 6_000 });
      await expect(page.getByText(/Emailed/i).first()).toBeVisible();
      // Bulk-bar is hidden again (selection cleared after a successful send).
      await expect(page.locator('.page-compliance .ac-bulk-bar')).toHaveCount(0);

      await assertNoHorizontalOverflow(page);
      await screenshot(page, `compliance-console-flow--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// ===========================================================================
// P12 — Reminder History (/ops/reminders)
// EP-18 (mocked). Role-gated to operations + admin. The mock viewer is
// MOCK_USER.role='admin' so the route is reachable. H1 matches "Reminder
// History"; primary is the always-visible "All N" filter chip on the rail.
// ===========================================================================
registerPageGate({
  id: 'reminder-history',
  title: 'P12 Reminder History',
  path: '/ops/reminders',
  heading: /Reminder History/i,
  primary: /^All\s+\d+/,
});

// Bespoke test — click the second run in the rail, assert ?runId= updates and
// the detail pane heading/data-run-id changes. Then click "Show email preview"
// and assert the email-preview card appears. Runs at both viewports.
test.describe('P12 Reminder History — select run + show email preview', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › click run 2 → ?runId & detail updates → show email`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAuthed(page, '/ops/reminders');
      await page.waitForLoadState('networkidle');

      // Default selection is the first run — capture its id from the detail title.
      const titleEl = page.locator('.page-reminders .ac-rundetail__title');
      await expect(titleEl).toBeVisible();
      const firstRunId = await titleEl.getAttribute('data-run-id');
      expect(firstRunId).toBeTruthy();

      // Click the second rail row.
      const secondRow = page.locator('.page-reminders .ac-runlist__item').nth(1).locator('.ac-runlist__row');
      await secondRow.scrollIntoViewIfNeeded();
      await secondRow.click();

      // URL gains ?runId=…
      await expect(page).toHaveURL(/[?&]runId=/);
      // Detail title's data-run-id has changed (i.e. detail pane updated).
      await expect(titleEl).not.toHaveAttribute('data-run-id', firstRunId);

      // Click "Show email preview" CTA — the panel appears.
      const showBtn = page.getByRole('button', { name: /Show email preview/i });
      await expect(showBtn).toBeVisible();
      await showBtn.click();
      await expect(page.locator('.page-reminders .ac-emailcard__panel')).toBeVisible();
      // Hide CTA now toggles back to "Hide" label.
      await expect(page.getByRole('button', { name: /Hide email preview/i })).toBeVisible();
      // URL has showEmail=1.
      await expect(page).toHaveURL(/[?&]showEmail=1/);

      await assertNoHorizontalOverflow(page);
      await screenshot(page, `reminder-history-flow--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// ===========================================================================
// P13 — Leave Calendar (/ops/leave)
// EP-21 (mocked). Role-gated to operations + admin. The mock viewer is
// MOCK_USER.role='admin' so the route is reachable. H1 matches "Leave &
// Holidays"; primary is the always-visible "Add leave" CTA in the page-head.
// ===========================================================================
registerPageGate({
  id: 'leave-calendar',
  title: 'P13 Leave Calendar',
  path: '/ops/leave',
  heading: /Leave/i,
  primary: /^Add leave$/i,
});

// Bespoke test — at desktop & mobile viewports, click "Add leave", assert
// the modal appears with role="dialog", close with ESC, assert it disappears.
// Then click the "List" view tab, assert URL gains ?view=list, the calendar
// grid disappears, the list table appears.
test.describe('P13 Leave Calendar — modal + view toggle', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › add modal opens/closes + list view URL`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAuthed(page, '/ops/leave');
      await page.waitForLoadState('networkidle');

      // Add Leave CTA is visible at all times.
      const addBtn = page.getByRole('button', { name: /^Add leave$/i });
      await expect(addBtn).toBeVisible();

      // Click → dialog appears.
      await addBtn.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      // Title is linked via aria-labelledby.
      await expect(dialog.getByRole('heading', { name: /^Add leave$/i })).toBeVisible();

      // Press ESC → dialog disappears.
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      // Switch to the List view tab → URL gains ?view=list and the calendar
      // grid is gone, the list section is visible.
      const listTab = page.getByRole('tab', { name: /^List$/ });
      await listTab.click();
      await expect(listTab).toHaveAttribute('aria-selected', 'true');
      await expect(page).toHaveURL(/[?&]view=list/);
      await expect(page.locator('.page-leave .leave-month')).toHaveCount(0);
      await expect(page.locator('.page-leave .leave-list')).toBeVisible();

      await assertNoHorizontalOverflow(page);
      await screenshot(page, `leave-calendar-flow--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// ===========================================================================
// P14 — Users and Roles (/admin/users)
// EP-19 (mocked). Role-gated to admin. The mock viewer is MOCK_USER.role='admin'
// so the route is reachable. H1 matches "Users & Roles" (matches /Users.*Roles/i).
// Primary action is the always-visible "Invite a new user" CTA in the page-head.
// ===========================================================================
registerPageGate({
  id: 'users-roles',
  title: 'P14 Users and Roles',
  path: '/admin/users',
  heading: /Users.*Roles/i,
  primary: /Invite/i,
});

// Bespoke test — at desktop & mobile viewports, click "Invite a new user",
// fill the form (name + email + role + team), click "Send invite", assert the
// modal closes and the new user appears at the top of the list (count goes up
// by 1).
test.describe('P14 Users and Roles — invite a new user flow', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › invite → modal closes → user added`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAuthed(page, '/admin/users');
      await page.waitForLoadState('networkidle');

      // Capture the current row count.
      const rows = page.locator('.page-users .ac-user-row');
      const startCount = await rows.count();
      expect(startCount).toBeGreaterThan(0);

      // Click "Invite a new user" — modal appears.
      const inviteBtn = page.getByRole('button', { name: /Invite a new user/i });
      await expect(inviteBtn).toBeVisible();
      await inviteBtn.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expect(dialog.getByRole('heading', { name: /Invite a new user/i })).toBeVisible();

      // Fill in the form.
      await dialog.getByLabel('Full name').fill('Test Newuser');
      await dialog.getByLabel(/Iksula email/i).fill('test.newuser@iksula.com');
      // Select the "PM Lead" role radio.
      await dialog.getByRole('radio', { name: 'PM Lead' }).check();
      // Pick a team via the select.
      const teamSelect = dialog.getByLabel('Team');
      await teamSelect.selectOption({ label: 'Modern Electronics' });

      // Submit.
      await dialog.getByRole('button', { name: /Send invite/i }).click();

      // Modal closes.
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 6_000 });

      // Row count goes up by 1 and the new user is in the list.
      await expect(rows).toHaveCount(startCount + 1);
      await expect(page.locator('.page-users .ac-user-row__name', { hasText: 'Test Newuser' }).first()).toBeVisible();

      await assertNoHorizontalOverflow(page);
      await screenshot(page, `users-roles-invite--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// ===========================================================================
// P15 — Project Mapping (/admin/projects)
// EP-20 (mocked). Role-gated to admin. The mock viewer is MOCK_USER.role='admin'
// so the route is reachable. H1 matches "Project ↔ Jira Mapping" (relaxed to
// /Project.*Mapping/i). Primary action is the always-visible "Add mapping" CTA.
// ===========================================================================
registerPageGate({
  id: 'project-mapping',
  title: 'P15 Project Mapping',
  path: '/admin/projects',
  heading: /Project.*Mapping/i,
  primary: /Add mapping/i,
});

// Bespoke test — at desktop & mobile viewports, click "Add mapping", fill in
// name + Jira key + description, click "Test connection" → assert the live
// state transitions to testing → ok (the mock returns ok:true for any truthy
// jiraKey). Then click Save → assert the modal closes and the new project
// appears in the list (count goes up by 1).
test.describe('P15 Project Mapping — add mapping flow w/ Test connection', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › add → test → save → mapping added`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAuthed(page, '/admin/projects');
      await page.waitForLoadState('networkidle');

      // Capture the current row count.
      const rows = page.locator('.page-mapping .ac-mapping-row');
      const startCount = await rows.count();
      expect(startCount).toBeGreaterThan(0);

      // Click "Add mapping" — modal appears.
      const addBtn = page.getByRole('button', { name: /^Add mapping$/i });
      await expect(addBtn).toBeVisible();
      await addBtn.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expect(dialog.getByRole('heading', { name: /^Add mapping$/i })).toBeVisible();

      // Fill in the form.
      await dialog.getByLabel('Project name').fill('Acme Storefront');
      await dialog.getByLabel(/Jira project key/i).fill('ACME');
      await dialog.getByLabel('Description').fill('Storefront + checkout');

      // Click "Test connection" inside the modal — the live state transitions
      // to "testing" then to "ok". The button's accessible name is built from
      // its label + " Jira connection for <KEY>" (see TestConnectionButton.jsx).
      const testBtn = dialog.getByRole('button', { name: /Jira connection for ACME/i });
      await expect(testBtn).toBeVisible();
      await testBtn.click();

      // The button enters the testing state (the wrapper gets `is-testing`).
      // We assert the OK state after the mock resolves — the mock returns
      // ok:true for any truthy jiraKey.
      const wrapper = dialog.locator('.ac-testconn');
      await expect(wrapper).toHaveClass(/is-ok/, { timeout: 6_000 });

      // Submit.
      await dialog.getByRole('button', { name: /^Add mapping$/i }).last().click();

      // Modal closes.
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 6_000 });

      // Row count goes up by 1 and the new project is in the list.
      await expect(rows).toHaveCount(startCount + 1);
      await expect(
        page.locator('.page-mapping .ac-mapping-row__name', { hasText: 'Acme Storefront' }).first()
      ).toBeVisible();

      await assertNoHorizontalOverflow(page);
      await screenshot(page, `project-mapping-add--${vp.name}`);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

// ===========================================================================
// P16 — Integrations (/admin/integrations) — LAST PAGE
// EP-22 (section-scoped, OQ-AP-13). Role-gated to admin. The mock viewer is
// MOCK_USER.role='admin' so the route is reachable. H1 matches "Integrations"
// (anchored under `<h1>Integrations & Settings`). Primary action target: the
// first card's <h2>Jira</h2> heading — always present.
// ===========================================================================
registerPageGate({
  id: 'integrations',
  title: 'P16 Integrations',
  path: '/admin/integrations',
  heading: /Integrations/i,
  // Each card ships a section-scoped "Save section" button (disabled until
  // edits land). The button is always rendered, so it's a stable target —
  // unlike the H2 card titles which aren't buttons/links/tabs.
  primary: /^Save section$/,
});

// Bespoke test — at desktop & mobile viewports, edit the Jira workspaceUrl
// input → the Jira card's SaveBar transitions to "Unsaved changes" while the
// Google card's SaveBar stays "All saved" (section-scoped dirty per OQ-AP-13).
// Click the Jira Save button → its SaveBar returns to "All saved" and the
// Google card remains untouched.
test.describe('P16 Integrations — per-card save independence', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport @ ${vp.name} (${vp.width}×${vp.height}) › edit Jira → Jira dirty, Google stays clean → save Jira → All saved`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAuthed(page, '/admin/integrations');
      await page.waitForLoadState('networkidle');

      // Cards arrive in order: Jira, Google, Email, Reader. Grab the first
      // two save bars (Jira + Google) — both start in the "All saved" state.
      const cards = page.locator('.page-integrations .ac-int-card');
      await expect(cards).toHaveCount(4);

      const jiraCard   = cards.nth(0);
      const googleCard = cards.nth(1);

      const jiraStatus   = jiraCard.locator('.ac-save-bar__status');
      const googleStatus = googleCard.locator('.ac-save-bar__status');

      await expect(jiraStatus).toContainText(/All saved/i);
      await expect(googleStatus).toContainText(/All saved/i);

      // Edit the Jira workspace URL input — appending a character is enough
      // to flip the dirty derivation.
      const jiraInput = page.locator('#jira-workspace-url');
      await jiraInput.scrollIntoViewIfNeeded();
      await jiraInput.focus();
      await jiraInput.fill('https://iksula.atlassian.net/edited');

      // Jira card flips to "Unsaved changes"; Google card stays "All saved".
      await expect(jiraStatus).toContainText(/Unsaved changes/i);
      await expect(googleStatus).toContainText(/All saved/i);

      // Click the Jira card's Save button. There are multiple "Save section"
      // buttons (one per card) — scope to the Jira card.
      const jiraSaveBtn = jiraCard.getByRole('button', { name: /^Save section$/ });
      await expect(jiraSaveBtn).toBeEnabled();
      await jiraSaveBtn.click();

      // Jira card returns to "All saved"; Google card still untouched.
      await expect(jiraStatus).toContainText(/All saved/i, { timeout: 6_000 });
      await expect(googleStatus).toContainText(/All saved/i);

      await assertNoHorizontalOverflow(page);
      await screenshot(page, `integrations-edit-flow--${vp.name}`);
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

// Smoke E2E — proves each of the three new screens loads under VITE_USE_MOCKS.
// Run: `cd web && npx playwright test`. CLI only (NEVER Playwright MCP).
//
// The mock backend (web/src/api/mocks.js) ships MOCK_USER.onboarding_status='active',
// so the boot redirect lands on /onboarding. Sign-in route can be reached directly.

import { test, expect } from '@playwright/test';

test('/ redirects to /onboarding when user is authed but not onboarded', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
});

test('/sign-in renders P01 SignInPage', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'AutoClock' })).toBeVisible();
  await expect(page.getByText('Log your whole workday in one click.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
  await expect(page.getByText('Use your')).toBeVisible();
  await expect(page.getByText('@iksula.com')).toBeVisible();
});

test('/onboarding renders the Stepper + two ConnectionRows', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { name: 'Connect your accounts' })).toBeVisible();
  await expect(page.getByLabel('Setup progress')).toBeVisible();
  // Both connection rows are visible.
  await expect(page.getByRole('heading', { name: 'Jira' })).toHaveCount(0); // it's a div, not heading — check by text instead
  await expect(page.getByText('Jira', { exact: true })).toBeVisible();
  await expect(page.getByText('Google Workspace')).toBeVisible();
  // Finish button is present but disabled when nothing is connected yet.
  await expect(page.getByRole('button', { name: /Finish setup/i })).toBeDisabled();
});

test('/today is gated behind onboarding (redirects until both providers connected)', async ({ page }) => {
  await page.goto('/today');
  // Mock user starts with onboarding_status='active' → route guard redirects to /onboarding.
  await expect(page).toHaveURL(/\/onboarding$/);
});

test('legacy /log /preview /dashboard routes still resolve', async ({ page }) => {
  await page.goto('/log');
  await expect(page).toHaveURL(/\/log$/);

  await page.goto('/preview');
  await expect(page).toHaveURL(/\/preview$/);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
});

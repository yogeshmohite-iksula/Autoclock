// Smoke E2E — proves the dev shell loads + nav works. Real flow tests come with each feature PR.
// Run: `cd web && npx playwright test`.

import { test, expect } from '@playwright/test';

test('app shell renders and nav links work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AutoClock' })).toBeVisible();

  // Default route should be /log.
  await expect(page).toHaveURL(/\/log$/);

  // Nav to Preview.
  await page.getByRole('link', { name: 'Preview' }).click();
  await expect(page).toHaveURL(/\/preview$/);

  // Nav to Dashboard.
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

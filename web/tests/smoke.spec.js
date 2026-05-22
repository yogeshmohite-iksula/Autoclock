// Smoke E2E — proves the three signed-in/out routes render cleanly at both
// desktop (1280×800) and mobile (375×812) under VITE_USE_MOCKS.
//
// For each (path × viewport) we assert:
//   1) no console errors during load
//   2) no horizontal overflow (document scrollWidth ≤ viewport width)
//   3) the main heading + primary action are visible
//   4) a full-page screenshot lands in playwright-report/ or test-results/
//
// Run: `cd web && npx playwright test`. CLI only — NEVER Playwright MCP.
//
// Mock backend lives in web/src/api/mocks.js. SESSION_USER is null on boot so
// the app starts at /sign-in; helpers click through the real UI to sign in /
// complete onboarding instead of poking module state directly.

import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile',  width: 375,  height: 812 },
];

// Some browser-internal console noise we explicitly tolerate.
const IGNORABLE_CONSOLE_RE = /favicon|\/icon\.svg|Download the React DevTools|Vite is unable to resolve/i;

/** Watch console + uncaught exceptions for the lifetime of the test. */
function trackErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !IGNORABLE_CONSOLE_RE.test(msg.text())) {
      errors.push(`[console.error] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

/** Sign in via the UI. Leaves the page at /onboarding (mock user
 *  starts with onboarding_status = 'active'). */
async function signIn(page) {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: /Sign in with Google/i }).click();
  await page.waitForURL(/\/onboarding$/);
}

/** Sign in AND complete the mock onboarding flow. Leaves the page at /today. */
async function signInAndOnboard(page) {
  await signIn(page);
  await page.getByRole('button', { name: /^Connect Jira/i }).click();
  await page.getByRole('button', { name: /^Connect Google/i }).click();
  // Finish enables when both providers are 'connected' (≈ 1.6 s mock delay).
  await expect(page.getByRole('button', { name: /Finish setup/i })).toBeEnabled({ timeout: 6_000 });
  await page.getByRole('button', { name: /Finish setup/i }).click();
  await page.waitForURL(/\/today$/);
}

/** Assert no horizontal overflow at the current viewport. Reports the
 *  widest offending element if it fails — saves time hunting in DevTools. */
async function assertNoHorizontalOverflow(page) {
  const m = await page.evaluate(() => {
    const inner = window.innerWidth;
    const scroll = document.documentElement.scrollWidth;
    const offenders = [];
    if (scroll > inner) {
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > inner + 0.5) {
          offenders.push({
            tag: el.tagName, cls: (el.className || '').toString().slice(0, 60),
            right: Math.round(r.right), w: Math.round(r.width),
            text: (el.textContent || '').slice(0, 30).trim(),
          });
        }
      });
      offenders.sort((a, b) => b.right - a.right);
    }
    return { scroll, inner, offenders: offenders.slice(0, 5) };
  });
  expect(m.scroll, `horizontal overflow ${m.scroll}px > ${m.inner}px viewport\n  offenders:\n${m.offenders.map(o => `   ${o.right}px ${o.tag}.${o.cls} "${o.text}"`).join('\n')}`)
    .toBeLessThanOrEqual(m.inner);
}

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

      await page.screenshot({ path: `test-results/screenshots/sign-in--${vp.name}.png`, fullPage: true });
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });

    test('/onboarding renders cleanly (signed-in, not onboarded)', async ({ page }) => {
      const errors = trackErrors(page);
      await signIn(page);
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'Connect your accounts' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Finish setup/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await page.screenshot({ path: `test-results/screenshots/onboarding--${vp.name}.png`, fullPage: true });
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

      await page.screenshot({ path: `test-results/screenshots/today--${vp.name}.png`, fullPage: true });
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    });
  });
}

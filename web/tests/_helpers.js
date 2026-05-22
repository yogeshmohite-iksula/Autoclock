// Playwright helpers shared by smoke.spec.js and allpages.spec.js.
// Mock backend lives in web/src/api/mocks.js. Helpers click through the real
// UI (no module-state pokes) — SESSION_USER is null on boot so the app starts
// at /sign-in, and signInAndOnboard walks the full Sign-in → Onboarding → Today flow.

import { expect } from '@playwright/test';

/** Viewports used everywhere. Bumped from PR #2's 1280×800 / 375×812 to match
 *  the AutoClock_Frontend_AllPages_Prompt.md per-page gate (desktop 1440×900,
 *  mobile 390×844 — iPhone-class). */
export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile',  width: 390,  height: 844 },
];

/** Browser-internal console noise we explicitly tolerate. */
export const IGNORABLE_CONSOLE_RE =
  /favicon|\/icon\.svg|Download the React DevTools|Vite is unable to resolve/i;

/** Track console errors + uncaught exceptions for the lifetime of the test. */
export function trackErrors(page) {
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
export async function signIn(page) {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: /Sign in with Google/i }).click();
  await page.waitForURL(/\/onboarding$/);
}

/** Sign in AND complete the mock onboarding flow. Leaves the page at /today. */
export async function signInAndOnboard(page) {
  await signIn(page);
  await page.getByRole('button', { name: /^Connect Jira/i }).click();
  await page.getByRole('button', { name: /^Connect Google/i }).click();
  await expect(page.getByRole('button', { name: /Finish setup/i })).toBeEnabled({ timeout: 6_000 });
  await page.getByRole('button', { name: /Finish setup/i }).click();
  await page.waitForURL(/\/today$/);
}

/** Sign in + onboard + navigate to an arbitrary authed path. */
export async function gotoAuthed(page, path) {
  await signInAndOnboard(page);
  if (path !== '/today') {
    await page.goto(path);
    await page.waitForURL(new RegExp(path.replace(/\//g, '\\/') + '$'));
  }
}

/** Assert no horizontal overflow at the current viewport. Reports the
 *  widest offending element if it fails — saves time hunting in DevTools. */
export async function assertNoHorizontalOverflow(page) {
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

/** Assert no two top-level layout regions visually overlap. Pass a list of
 *  CSS selectors (each must match at most one visible element). Useful for
 *  catching cases where the sidebar covers the main content on mobile, etc. */
export async function assertNoOverlap(page, selectors) {
  const boxes = await page.evaluate((sels) => {
    const out = [];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0 &&
        getComputedStyle(el).visibility !== 'hidden' &&
        getComputedStyle(el).display !== 'none';
      if (visible) out.push({ sel, x: rect.left, y: rect.top, r: rect.right, b: rect.bottom });
    }
    return out;
  }, selectors);
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const xOver = Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x));
      const yOver = Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y));
      if (xOver > 2 && yOver > 2) {
        overlaps.push(`${a.sel} ∩ ${b.sel} (${Math.round(xOver)}×${Math.round(yOver)}px)`);
      }
    }
  }
  expect(overlaps, `unrelated regions overlap:\n  ${overlaps.join('\n  ')}`).toEqual([]);
}

/** Save a full-page screenshot under test-results/screenshots/. */
export async function screenshot(page, name) {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

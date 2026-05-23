# PR #2 Code Review — `feat/frontend` → `main`

> Strict review against `docs/Project Docs/AutoClock_ERD.md` (EP-01..EP-23) and the four design prototypes in `docs/FrontEnd Design/`. No code modified — review only.

---

## Verdict: **Changes required before merge** (one a11y blocker), then **merge with ERD follow-ups for Keval**

One small, surgical fix is needed in the frontend itself. Everything else is either ERD-amendments for Keval (the backend hasn't formalised these contracts yet) or non-blocking follow-ups.

---

## 1. Build ✅

```
cd web && npm install && npm run build
```
- **62 modules transformed in 803 ms.** 47 KB CSS, 218 KB JS. Clean.
- **1 warning, expected:** `/assets/bg-soft.png referenced in /assets/bg-soft.png didn't resolve at build time` — this is per **OQ-F4** (the soft-aurora photo asset is missing). The auth screens fall back to `.bg-mesh` correctly. Drop the PNG into `web/public/assets/bg-soft.png` to silence.

## 2. Prototype-scaffolding strip ✅

`grep` across `web/src`, `web/index.html`, `web/tests`:
- `tweaks-panel`, `useTweaks`, `TweaksPanel` — **zero hits.**
- `TWEAK_DEFAULTS`, `EDITMODE-BEGIN`/`EDITMODE-END` — **zero hits.**
- `data-comment-anchor` — only mentions are in **leading file comments documenting that the attribute was stripped.** No actual attribute remains.
- `unpkg.com`, `@babel/standalone` — **zero hits.** Vite/npm only.

## 3. Theme fidelity ✅

- `autoclock-theme.css` imported **exactly once** — `web/src/main.jsx:8`.
- `--ac-primary: #0F172A` (Ink Charcoal) ✓; `--ac-secondary: #DC2626` (Signal Red) ✓; brand-red focus ring via `--ac-focus-ring` ✓; dark-mode inversion at `[data-theme="dark"]` ✓.
- All three pages use canonical tokens (`var(--ac-*)`) or the `.ac-btn / .ac-card / .ac-banner / .ac-table / .ac-input` component classes. No hardcoded hex outside `autoclock-theme.css` itself (the `linear-gradient` on the Jira/Google icons uses provider brand colours, which is correct).

---

## 4. API CONTRACT — mismatches against `docs/Project Docs/AutoClock_ERD.md` §6

These become **ERD updates for Keval**, not frontend fixes.

### 🔴 Endpoints the frontend calls that the ERD does not define

| Frontend call | Where it's used | Required action |
|---|---|---|
| **`GET /api/auth/me`** | `AuthContext.jsx` on boot to resolve the current session | Add to ERD §6 (between EP-01 and EP-02). Response: `{ user: { id, name, email, role, team_id, onboarding_status, ... } }` or `401`. |
| **`POST /api/auth/logout`** | `signOut()` in `AuthContext`, called from Onboarding chrome + Today user menu | Add to ERD §6. Response: `{ ok: true }`. Clears the session cookie. |
| **`GET /api/auth/connections`** | `OnboardingPage` via `api.connections.status()` to drive the Stepper + ConnectionRow states | **Already flagged as OQ-F3.** Add to ERD §6. Response: `{ jira: 'idle'\|'connecting'\|'connected'\|'expired', google: same }`. Alternative: extend `GET /api/auth/me` with `connections.jira` + `connections.google` per-provider booleans (no separate EP). Pick one. |

### 🟡 Fields the frontend uses that are NOT in the ERD data model

| Field | Where it's used | Required action |
|---|---|---|
| **`projects.color`** | `TodayPage` (project swatch in Dropdown options, SlotRow's left-border color) | Add `color TEXT` to ERD TB-03 `projects`. Backend can default if not seeded; frontend falls back to grey. |
| **`projects.tag`** | `TodayPage` Dropdown option meta chip (`CLIENT` / `INTERNAL`) | Add `tag TEXT` to TB-03 (or derive from `is_active`/another existing field — but right now the mock hard-codes it). |

If you want to **keep these mock-only and not pollute the ERD**, the frontend gracefully falls back to defaults — but then the dropdowns lose their visual category cues. Recommend adding both to TB-03.

### 🟡 Response-shape inconsistency

**EP-09 `POST /api/entries`** — ERD's example shows the response as flat:
```json
{ "id": 481, "status": "draft", ...echo }
```
But **both** `backend/routes/entries.js` **and** `web/src/api/mocks.js` return wrapped:
```json
{ "entry": { id, ..., jira_key, project_name } }
```
The frontend doesn't read the response from `create()` today (it refetches `/api/entries?date=...`) so it doesn't bite — but **pick one** before more code is written against the wrong shape. Recommend the wrapped shape (`{ entry: {...} }`) and update the ERD example.

### 🟡 Joined-on-read response fields

`worklog_entries` rows returned from **EP-08** include `jira_key` and `project_name` from a SQL `JOIN` (see `backend/routes/entries.js`). These are **not columns on TB-05** — they're response-shape augmentation. The frontend hard-depends on them (`SlotRow` shows both). Document in the ERD that GET /api/entries returns `worklog_entries.* + jira_tasks.jira_key + projects.name AS project_name`. Otherwise the contract is implicit.

### ✅ Verified clean against ERD

- **EP-09 request body** matches the ERD example exactly: `{ project_id, jira_task_id, description, duration_minutes, slot_start, slot_end, work_date }`.
- **EP-13 body** sends `{ work_date, confirmed: true }`, matching the FR-04 mandatory-confirm pattern + ADR-09 idempotency.
- All keys use `snake_case` (matching the DB + ERD). No `camelCase` leaks.
- The full `api/*.js` surface maps cleanly onto **EP-01, EP-06..EP-15** (EP-02..EP-05 are redirect URLs only, EP-14/EP-15 are exposed but only EP-14 has a UI consumer in this PR).

---

## 5. Accessibility findings

### 🔴 BLOCKER — must fix before merge

**`TodayPage` description chips use `<span onClick>` instead of `<button>`.**

```jsx
// web/src/pages/TodayPage.jsx — lines 395–397
<span className="tdy-chip" onClick={() => setDesc(...)}>+ #bug</span>
<span className="tdy-chip" onClick={() => setDesc(...)}>+ #review</span>
<span className="tdy-chip" onClick={() => setDesc(...)}>+ #standup</span>
```

- Not in the tab order.
- Not announced by screen readers as actionable.
- No keyboard activation.
- Violates **WCAG 2.1.1 (Keyboard)** and **4.1.2 (Name, Role, Value)** — both required by PRD §11.

**Fix:** swap `<span className="tdy-chip"` → `<button type="button" className="tdy-chip"` (and add `border: 0; background: var(--ac-n-100); font: inherit;` to `.tdy-chip` so the visual remains identical — the existing rules nearly cover it).

### 🟡 Mediums — defer if needed, but log as follow-up

1. **Form labels in `TodayPage` lack `htmlFor`/`id` linkage** (lines 375, 379, 385, 403). `<label className="tdy-field-lbl">Project</label>` sits above the `Dropdown` / `<textarea>` but isn't programmatically associated. Screen readers won't announce the label when focus enters the field.
   - **Fix:** wrap the field in `<label>` (implicit association) or give the `Dropdown` button + textarea explicit `id`s + add `htmlFor` to the labels. `SignInPage` already uses implicit association via direct child placement — easy pattern to replicate.

2. **`Dropdown` options aren't keyboard-navigable.** The button correctly carries `aria-haspopup="listbox"` + `aria-expanded` + ARIA `role="option"` on items, but pressing `↓ / ↑ / Enter / Esc` does nothing. Mouse-only.
   - **Fix:** add `onKeyDown` to the option container handling `ArrowDown`/`ArrowUp` to move a `highlightedIndex` and `Enter` to select. Not blocking for an internal tool but is the kind of thing power-users notice immediately.

3. **Inert `<a>` tags in the `Sidebar` and `SlotRow`.**
   - `web/src/pages/TodayPage.jsx:69` (My History) and `:76` (Settings) — `<a className="tdy-nav-item">` with **no `href`**. Not in the tab order; screen readers may skip them.
   - `web/src/pages/TodayPage.jsx:91` — `<a className="ticket" href="#" onClick={e => e.preventDefault()}>` — dummy anchor.
   - **Fix:** make the unlinked nav items `<button type="button">` until they have real destinations; for the ticket key, prefer `<a target="_blank" rel="noopener" href={jiraIssueUrl(entry.jira_key)}>` (real Jira deep link), or `<button>` if it's not a link.

4. **`SidebarSidebar` "Settings" link** points nowhere — fine as a placeholder, but the legacy `App.jsx` already routes `/log /preview /dashboard`, and the prototype linked Settings to `Settings.html`. Decide: keep as inert placeholder, or wire to a `/settings` stub.

### 🟢 Verified good (a11y)

- **Visible focus ring** via canonical theme `:focus-visible` (3 px brand-red), inherited everywhere ✓
- **`type="button"`** on every non-submit `<button>` (grep finds 0 untyped buttons) ✓
- **`aria-label`** on icon-only buttons: Search, Help, Notifications, Edit, Delete, Dismiss ✓
- **`aria-pressed`** on the Range/Duration toggle + filter chips ✓
- **`aria-busy`** on the loading Google button ✓
- **`aria-expanded` + `aria-haspopup`** on the Dropdown trigger ✓
- **`aria-labelledby` / `aria-label`** on cards + the Stepper ✓
- **`G` keyboard shortcut** on the sign-in screen ignores keystrokes when an input/textarea is focused (good) ✓
- **`@media (prefers-reduced-motion: reduce)`** honoured by the canonical theme (`*, *::before, *::after { animation: none !important }`) ✓

---

## 6. Other observations (non-blocking)

- **`web/src/styles/autoclock-theme.css`** is now a copy of the canonical file from the Cowork workspace. Worth a small note in `docs/Project Docs/` or a `README` line in `web/src/styles/` that the source-of-truth lives elsewhere and how to re-sync (or even a check-in CI script that diffs them).
- **The `web/index.html` favicon link `<link rel="icon" type="image/svg+xml" href="/icon.svg" />`** — `/icon.svg` doesn't exist (and isn't in the PR). Cosmetic 404 in dev. Either drop the favicon line or ship the SVG.
- **`OnboardingPage` "do this later" link** calls `onSignOut()` from an `<a>` `onClick` with `e.preventDefault()` — should be a `<button className="signout">` (the `.signout` class on the `<a>` already styles it like a button).
- **`Logomark`** also exists as a CSS-only mark in the canonical TopBar of `TodayPage` (the `.tdy-brand-mark` block) — they're visually equivalent but technically two implementations. Worth consolidating in a follow-up so the brand mark is one source.
- **Smoke test** (`web/tests/smoke.spec.js`) asserts `await expect(page.getByRole('heading', { name: 'Jira' })).toHaveCount(0)` then `expect(page.getByText('Jira', { exact: true })).toBeVisible()` — the first line is a defensive "it's NOT a heading" check, the second is the real assertion. Works, but a comment would help future readers.

---

## Final action list

### Must fix in this PR before merge

1. **Change `.tdy-chip` `<span onClick>` → `<button type="button" onClick>`** in `web/src/pages/TodayPage.jsx` (lines 395–397). Update `.tdy-chip` CSS in `web/src/styles/today.css` if needed to keep the visual (likely just `border:0; background: var(--ac-n-100); font: inherit;`).

### Open as separate tickets for Keval (ERD amendments)

2. Add **`GET /api/auth/me`** and **`POST /api/auth/logout`** to ERD §6 with response shapes.
3. Add **`GET /api/auth/connections`** to ERD §6 — OR — extend **`GET /api/auth/me`** with per-provider booleans, and remove the `connections` endpoint from the frontend.
4. Add **`color TEXT`** + **`tag TEXT`** to **TB-03 `projects`** (or document them as frontend-only with grey/no-tag defaults).
5. Pin **EP-09 response shape** — wrapped `{ entry: {...} }` (recommended, matches the existing backend code) and update the ERD example.
6. Document the **joined fields** returned by EP-08 (`jira_key`, `project_name`) so the contract isn't implicit.

### Defer as follow-ups (own PR after this merges)

7. **htmlFor/id linkage** on `TodayPage` form labels.
8. **Keyboard navigation** for the `Dropdown` options (arrow keys + Enter/Esc).
9. **Inert `<a>` tags** → `<button>` (`Sidebar` nav items, `SlotRow` ticket link, `OnboardingPage` "do this later").
10. **`bg-soft.png`** asset (drop into `web/public/assets/`) to silence the build warning and enable the photo background.
11. **`/icon.svg` favicon** missing — ship or drop the link.
12. Consolidate the **two Logomark implementations** (`components/Logomark.jsx` + `.tdy-brand-mark` CSS) into one.

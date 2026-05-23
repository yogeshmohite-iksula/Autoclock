# AutoClock Frontend — Rebuild Plan (feat/frontend)

> Source-of-truth: the four prototype files in `docs/FrontEnd Design /` + endpoints `EP-01..EP-23` in `docs/Project Docs/AutoClock_ERD.md`.
> **No code is written until this plan is approved.**

---

## 0. Pre-flight & housekeeping

Currently on `feat/parser` with an uncommitted doc reorganisation in the working tree (`docs/AutoClock_*` deletions + new `docs/FrontEnd Design /` + `docs/Project Docs/`). Step 0:

1. `git stash push -u -m "WIP: doc reorg + design files"`
2. `git checkout feat/frontend` (the branch already exists at the initial scaffold)
3. `git stash pop` — brings the reorg onto `feat/frontend`
4. **Commit A** on `feat/frontend`: `chore(docs): reorganise into Project Docs/ + add FrontEnd Design/`. This isolates the move from any code change.

Then the implementation commits B…E below.

---

## 1. Web tree (under `web/`)

```
web/
├── index.html
├── vite.config.js               (unchanged; add `@` alias for src/)
├── package.json                 (+ react-router-dom; remove nothing)
├── playwright.config.js         (unchanged)
├── public/
│   └── (favicon SVG + optional bg-soft.png if provided)
├── src/
│   ├── main.jsx                 — Router + theme + AuthProvider bootstrap
│   ├── routes.jsx               — Route table + guards (RequireAuth, RequireOnboarded)
│   ├── auth/
│   │   └── AuthContext.jsx      — { user, isAuthed, onboardingComplete, signIn, signOut }
│   ├── api/
│   │   ├── client.js            — fetch wrapper (credentials, JSON, error normalisation)
│   │   ├── auth.js              — EP-01..EP-05
│   │   ├── connections.js       — onboarding status (mock-only for now — see OQ §6)
│   │   ├── projects.js          — EP-06, EP-07
│   │   ├── entries.js           — EP-08..EP-11
│   │   ├── day.js               — EP-12, EP-13
│   │   ├── mocks.js             — PROJECTS, TASKS, TODAY_SLOTS, mock auth state
│   │   └── index.js             — barrel: `import { api } from '@/api'`
│   ├── hooks/
│   │   ├── useISTClock.js       — 1 s tick, returns { hm, s }
│   │   └── useNow.js            — 30 s tick for date headers
│   ├── styles/
│   │   ├── autoclock-theme.css  — DERIVED from prototype `--ac-*` usages (see OQ §1)
│   │   ├── chrome.css           — shared corner chrome (wordmark / status-line / footer / kbd-hint)
│   │   ├── backgrounds.css      — `.bg-glow / .bg-dots / .bg-grid / .bg-rings / .bg-mesh / .bg-photo`
│   │   ├── sign-in.css          — ported from P01 `<style>`
│   │   ├── onboarding.css       — ported from P02 `<style>`
│   │   └── today.css            — REBUILT for P05 (its CSS wasn't exported)
│   ├── components/
│   │   ├── chrome/              — Wordmark, StatusLine, FooterLine, KbdHint, UserChip
│   │   ├── ui/                  — Button, KbdKey, Pill, Tag, Spinner, ErrorBanner, Logomark
│   │   ├── onboarding/          — Stepper, ConnectionRow
│   │   ├── today/               — TopBar, Sidebar, Hero, ReminderBanner, LogSlotForm,
│   │   │                          ProjectDropdown, TaskDropdown, SlotRow, GapRow, CloseDayBar
│   ├── pages/
│   │   ├── SignInPage.jsx       — P01
│   │   ├── OnboardingPage.jsx   — P02
│   │   ├── TodayPage.jsx        — P05
│   │   └── (existing LogPage / PreviewPage / DashboardPage stubs left in place — see §5)
└── tests/
    └── smoke.spec.js            — extend with `/sign-in`, `/onboarding`, `/today` reachability checks
```

**Removed entirely:**
- `tweaks-panel.jsx` (design harness)
- `useTweaks()` + every `TWEAK_DEFAULTS` / `EDITMODE-BEGIN/END` block
- Every `data-comment-anchor` attribute
- All CDN `<script>` tags + in-browser Babel — Vite handles ESM imports

**Prototype scenarios → real UI state:**
| Prototype tweak | Becomes |
|---|---|
| `state: default/loading/error` (P01) | `useState` inside `SignInPage` driven by the real sign-in call |
| `scenario: none/jira-only/connecting/all-connected/reconnect` (P02) | `useConnectionStatus()` hook backed by `api.connections.status()` (mock) |
| `view: with-logs/empty/overlap-error/just-saved` (P05) | Derived from `api.entries.list(today)` + form-validation state |
| `timeMode: range/duration` (P05) | Local `useState` in `LogSlotForm` (real toggle) |
| Background variants | One default per page (P01/P02: `bg-photo` with `bg-mesh` fallback; P05: plain) |

---

## 2. Routes (react-router v6)

```
/                       — index, redirects:
                          authed + onboarded  → /today
                          authed + !onboarded → /onboarding
                          !authed             → /sign-in

/sign-in                — public; if already authed, redirect upward
/onboarding             — RequireAuth
/today                  — RequireAuth + RequireOnboarded
                          (this is the prototype's P05 = "Today / Log a Slot")

/log                    — existing stub (kept; redirects to /today when authed)
/preview                — existing stub (kept; Yogesh's parser preview later)
/dashboard              — existing stub (kept; Keval/Ali later)

*                       — 404 → home
```

Guards live in `web/src/routes.jsx` and read from `AuthContext`. For M0 dev, `AuthContext` is hydrated from `api.auth.me()` (mocked).

---

## 3. API module surface

Every function returns `Promise<T>` and throws on `!res.ok` (same contract as the existing `api.js`). Mocks live behind `VITE_USE_MOCKS` (defaults `true` until Keval's backend is reachable). Swapping mock → real is a one-file change in `web/src/api/client.js`.

| Function | Method + path | EP | Used by |
|---|---|---|---|
| `api.auth.login({ email })` | `POST /api/auth/login` | EP-01 | SignInPage (Google OIDC flow → success → /onboarding or /today) |
| `api.auth.me()` | `GET /api/auth/me` | (helper) | AuthContext on boot |
| `api.auth.logout()` | `POST /api/auth/logout` | (helper) | Sign-out in onboarding chrome |
| `api.auth.jiraConnectUrl()` | string only — returns `/api/auth/jira/connect` | EP-02 | OnboardingPage `Connect Jira` button → `window.location.assign(url)` |
| `api.auth.googleConnectUrl()` | string only — returns `/api/auth/google/connect` | EP-04 | OnboardingPage `Connect Google` button |
| `api.connections.status()` | `GET /api/auth/connections` (**MOCK ONLY** — see OQ §6) | n/a | OnboardingPage; returns `{ jira, google }` ∈ `idle/connecting/connected/expired` |
| `api.projects.list()` | `GET /api/projects` | EP-06 | LogSlotForm project dropdown |
| `api.projects.tasks(projectId)` | `GET /api/projects/:id/tasks` | EP-07 | LogSlotForm task dropdown |
| `api.entries.list(date)` | `GET /api/entries?date=YYYY-MM-DD` | EP-08 | TodayPage list |
| `api.entries.create(entry)` | `POST /api/entries` | EP-09 | LogSlotForm save |
| `api.entries.update(id, patch)` | `PUT /api/entries/:id` | EP-10 | SlotRow edit |
| `api.entries.delete(id)` | `DELETE /api/entries/:id` | EP-11 | SlotRow delete |
| `api.day.preview(workDate)` | `POST /api/day/preview` | EP-12 | CloseDayBar (later) |
| `api.day.close(workDate)` | `POST /api/day/close { confirmed: true }` | EP-13 | Close My Day (later) |

**Entry request shape (per ERD EP-09 example):**
```json
{ "project_id": 1, "jira_task_id": 12, "description": "...",
  "duration_minutes": 90, "slot_start": "14:30", "slot_end": "16:00",
  "work_date": "2026-05-22" }
```

**Mock data behind the api/:** the prototype's `PROJECTS / TASKS / TODAY_SLOTS` move into `web/src/api/mocks.js` and are shaped to match the ERD response wrappers (`{ projects: [...] }`, `{ tasks: [...] }`, `{ entries: [...] }`). The components no longer reach for raw arrays — they call `api.*`.

EP-14..EP-23 are out of scope for this PR (dashboards / ops / admin / sync) and stay unexported until those screens land.

---

## 4. Implementation order (commit chunks on `feat/frontend`)

- **A. chore(docs):** doc reorg into `docs/Project Docs/` + add `docs/FrontEnd Design /`.
- **B. chore(web):** add `react-router-dom`; add `@` alias; theme + chrome + backgrounds CSS; AuthContext + RequireAuth/RequireOnboarded; routes wired but pages = "Coming soon" stubs.
- **C. feat(web/api):** `client.js` + `mocks.js` + per-endpoint modules + `VITE_USE_MOCKS` switch. Replaces the old monolithic `web/src/api.js` (kept as a re-export shim for the existing /log /preview /dashboard pages so nothing breaks).
- **D. feat(web/sign-in):** SignInPage (P01) — Logomark, Google button, error banner, IST clock, `G` shortcut.
- **E. feat(web/onboarding):** OnboardingPage (P02) — Stepper, ConnectionRow ×2, real button → `window.location` redirect to EP-02 / EP-04 mock; expired/reconnect states surfaced.
- **F. feat(web/today):** TodayPage (P05) — TopBar, Sidebar, Hero, ReminderBanner, LogSlotForm (range/duration toggle, searchable dropdowns), SlotRow + GapRow list, CloseDayBar.
- **G. test:** extend `smoke.spec.js` to walk `/sign-in → /onboarding → /today`; one test per route.
- **H. docs(changelog):** bump `[Unreleased]`.

Then push `feat/frontend` and `gh pr create --base main`. Yogesh reviews + merges.

---

## 5. What stays as-is

- `web/src/pages/LogPage.jsx`, `PreviewPage.jsx`, `DashboardPage.jsx` — kept under `/log`, `/preview`, `/dashboard`. Other swimlanes' PRs depend on them. The new screens live at new routes; there's no collision.
- `backend/` — untouched.
- The existing `web/src/api.js` becomes a thin re-export of `web/src/api/index.js` so the old pages keep compiling. No behaviour change.

---

## 6. Open questions for Yogesh (flag, don't guess)

| # | Question | My default if you say "use it" |
|---|---|---|
| **OQ-F1** | `autoclock-theme.css` is linked from P01/P02 but **not present anywhere in the repo**. Do you have a canonical copy, or should I **derive** one from every `--ac-*` token actually referenced in the prototypes (≈25 tokens — `--ac-bg`, `--ac-text`, `--ac-primary`, `--ac-secondary`, `--ac-success`, `--ac-warning`, `--ac-danger`, `--ac-info`, `--ac-surface`, `--ac-border` / `--ac-border-strong`, `--ac-text-muted` / `--ac-text-subtle`, `--ac-n-100` / `--ac-n-200`, `--ac-danger-soft` / `--ac-danger-text`, `--ac-primary-hover` / `--ac-primary-contrast`, `--ac-space-{4..8}`, `--ac-text-{xs,sm,base}`, `--ac-weight-{semibold,bold,black}`, `--ac-tracking-wide`, `--ac-transition`, `--ac-font-{sans,mono}`)? | **Derive** — values picked to match the `rgba(…)` hints in the prototypes' inline CSS. Easy to swap if you drop the canonical file later. |
| **OQ-F2** | `docs/AutoClock_UIUX_Plan.md` doesn't exist anywhere either. Anything else you'd like me to read? | **Proceed with prototypes + ERD** as the only sources. |
| **OQ-F3** | Onboarding needs to know `{ jira_connected, google_connected }`. **There's no EP for this in the ERD.** Two paths: (a) ask Keval to add `GET /api/auth/connections`; (b) piggyback on `GET /api/auth/me` (return `user.onboarding_status` + per-provider booleans). | **Mock both** behind `api.connections.status()` so swapping is trivial; **flag (a) as a small EP-add to suggest to Keval** in the PR description. |
| **OQ-F4** | `bg-soft.png` is referenced by both P01 and P02 but the asset isn't shipped. | **Fallback to `bg-mesh`** (already defined in both prototypes); user can drop the PNG into `web/public/assets/` later and the `bg-photo` class picks it up. |
| **OQ-F5** | The Connect buttons in P02 — should they `window.location.assign('/api/auth/jira/connect')` (redirect flow), or open in a popup window? | **Full redirect** — matches OAuth 3LO convention, simpler for cookie-based session continuity. |
| **OQ-F6** | The doc reorg (move `AutoClock_*` → `Project Docs/`) — should it land as a single isolated `chore(docs)` commit at the START of this PR (my plan), or in a SEPARATE branch / PR? | **Same PR, isolated commit (A)** — keeps the PR tree consistent. |

---

## 7. Hard rules respected

- **Zero cost:** only `react-router-dom` added (MIT). No paid SDK, no AI calls.
- **Production-sane:** real ESM imports, real fetch wrapper, keyboard focus rings + ARIA labels carried over from prototypes, two-step preview before any external write (FR-04) preserved when the Close-Day flow lands later.
- **Backend untouched.** Mocks come out cleanly behind one flag.

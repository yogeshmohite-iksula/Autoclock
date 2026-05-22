# AutoClock Frontend — Five More Screens (Plan)

> **Build order under the VG gate (one PR each, sequential):**
> P03 App Shell → P06 Close My Day → P07 Sync Result → P04 Settings → P08 My History.
> Plan first — **no code until Yogesh approves.**

---

## 0. Branching surprise — needs your call

`origin/main` is **still at `4a510f2` (the initial scaffold).** Both PR #1 (parser) and PR #2 (Sign-in/Onboarding/Today) are **still OPEN** — the work isn't on `main` yet.

That means "branch off the latest main" is ambiguous. Three options:

- **(a) Merge PR #2 first, then branch.** Cleanest. You merge PR #2 to `main`, I `git fetch && git checkout main && git pull && git checkout -b feat/p03-shell`. Each subsequent page also branches off fresh `main` after the previous page's PR lands. ← **My default if you say "proceed"**.
- **(b) Branch each page off `feat/frontend`** (which has PR #2's work). Faster but stacks PR-on-PR; if you ask for changes to PR #2 I rebase the stack.
- **(c) Wait** — you'll merge PR #2 and ping me.

I'll assume **(a)** unless you say otherwise.

---

## 1. Prototype analysis (extracted to `/tmp/autoclock-proto/`)

The prototypes use a `__bundler` runtime format. I decoded the gzipped+base64 manifest + JSON template, extracted each page's `<style>` + component. All five still have the tweak-panel harness inline (TWEAK_DEFAULTS, useTweaks, EDITMODE blocks) — that gets stripped on port, exactly as it was for PR #2.

| Prototype | Size | Tweaks captured (= scenarios to turn into real state) |
|---|---|---|
| **App Shell** (P03) | 15 KB jsx + 16 KB css | `role`, `collapsed`, `bellCount`, `showConnections`, `userName` |
| **Close My Day** (P06) | 23 KB jsx + 24 KB css | `state` (default/loading/error variants), `role`, `collapsed`. Provider glyphs for Jira/Sheets/Gmail. `posting`/`success` internal state. |
| **Sync Result** (P07) | 23 KB jsx + 22 KB css | `scenario` (partial / ok / failed). `ResultRow`, `StatusPill`. |
| **Settings** (P04) | 24 KB jsx + 22 KB css | `cadence` (`every2h` etc.), `quietStart`, `quietEnd`, `jiraExpired`, `saveState`, `role`. |
| **My History** (P08) | 30 KB jsx + 25 KB css | `view` (list / calendar), `history` (has / empty), `collapsed`. Components: `CalendarRail`, `DayPanel`, `ListRail`. |

---

## 2. New routes

| Path | Component | Notes |
|---|---|---|
| `/close-my-day` | `CloseMyDayPage` (P06) | Replaces the temporary hop through the legacy `/preview` route. TodayPage's "Close My Day" button now points here. |
| `/sync-result` | `SyncResultPage` (P07) | Lands after Confirm on Close My Day. Reads the EP-13 result from router state. |
| `/settings` | `SettingsPage` (P04) | Sidebar "Settings" link points here. Currently inert. |
| `/history` | `HistoryPage` (P08) | Sidebar "My History" link points here. Currently inert. |

Existing routes unchanged. Legacy `/log /preview /dashboard` stay (other swimlanes).

## 3. App Shell — reconciliation (P03)

Today, `TodayPage.jsx` defines its **own** inline TopBar + Sidebar. The prototype's App Shell is the same chrome, intended as the shared frame. Plan:

1. **Extract** the TopBar + Sidebar from `TodayPage.jsx` into `web/src/components/Shell/`:
   - `Shell.jsx` — `TopBar + Sidebar + <Outlet />` layout component
   - `TopBar.jsx` — extracted; accepts `{ user, onSignOut }` props
   - `Sidebar.jsx` — extracted; accepts `{ collapsed, onToggle, activePath }`
   - `Shell.css` — chrome layout (moves the `tdy-topbar` / `tdy-sidebar` / `tdy-body-grid` CSS from `today.css`)
2. **Promote shared bits to `web/src/components/`:**
   - `icons.jsx` — `<Icon name="…" />` (currently inlined in TodayPage; reused everywhere)
   - `ProviderGlyph.jsx` — Jira / Sheets / Gmail brand glyphs (used by Close My Day, Sync Result, Onboarding)
3. **Refactor TodayPage** to wrap its content in `<Shell>` via a layout route — no other behavioural change. This is part of P03's PR.
4. The four new pages (Close My Day, Sync Result, Settings, History) **render inside `<Shell>`** via React Router's layout-route pattern.
5. Routes **without** Shell: `/sign-in`, `/onboarding` — they keep their own chrome.

## 4. Component breakdown per page

**P03 App Shell** — `Shell`, `TopBar`, `Sidebar`, `icons.jsx`, `ProviderGlyph.jsx`. P03's PR also adds stub pages for the other 4 routes (just "coming soon") so the smoke test can walk them.

**P06 Close My Day** — `CloseMyDayPage` calls `api.day.preview(today)` on mount → renders `GroupedTicketCard[]` (one per Jira key) with totals + warnings/errors banners → `<button>` Confirm calls `api.day.close()`. Loading + posting + error states are real `useState`, not tweaks. Provider glyph row at the bottom (will sync to Jira ◯ Sheets ◯ Gmail).

**P07 Sync Result** — `SyncResultPage` consumes the EP-13 response shape (`{ jira, sheet, gmail, overall }`) via router state. Renders 3× `ResultRow` with `StatusPill` (synced / failed / pending). `overall === 'partial'` exposes a "Retry failed" button which re-POSTs EP-13 (idempotent — TB-13). Surfaces Jira worklog IDs / Sheet range / Gmail draft ID for diagnostics.

**P04 Settings** — `SettingsPage` reads from `api.settings.get()` + `api.connections.status()`. Sections: **Reminders** (cadence radio + quiet hours), **Routing** (sheet URL + EOD recipient), **Connections** (Jira + Google with reconnect for expired tokens), **Profile** (read-only name/email/role). Save = `api.settings.update(patch)`; surfaces save state.

**P08 My History** — `HistoryPage` reads `api.entries.history({ from, to })`. Two views: `ListRail` (compact list of past days) + `CalendarRail` (month grid). Selecting a day renders `DayPanel` — same slot list as Today but read-only.

## 5. API additions

| Method | Endpoint | ERD status | Use |
|---|---|---|---|
| `api.day.preview(workDate)` | `POST /api/day/preview` | ✅ EP-12 | Close My Day |
| `api.day.close(workDate)` | `POST /api/day/close` | ✅ EP-13 | Close My Day (+ Retry from Sync Result) |
| `api.settings.get()` | `GET /api/me/settings` | **NEW — see OQ-1** | Settings |
| `api.settings.update(patch)` | `PUT /api/me/settings` | **NEW — see OQ-1** | Settings |
| `api.connections.refresh(provider)` | `POST /api/auth/{jira\|google}/reconnect` | **NEW — see OQ-2** | Settings "Reconnect" button |
| `api.entries.history({from, to})` | `GET /api/entries/history?from=…&to=…&summary=1` | **NEW — see OQ-3** | My History |

All four new endpoints get **mocked behind `VITE_USE_MOCKS`** in `web/src/api/mocks.js`, isolated for a one-file swap when Keval lands them.

---

## 6. Open questions (ERD gaps — flag, don't invent)

- **OQ-1 (Settings):** ERD §6 has **EP-22 `GET/PUT /api/admin/settings` — admin only** for **global** config. P04 Settings is a **per-user** screen (cadence, quiet hours, sheet URL, EOD recipient). The per-user fields exist on TB-01 `users` (`sheet_id`, `sheet_range`, `eod_recipient_email`) but there is **no per-user settings EP**. Suggest Keval add `GET/PUT /api/me/settings` for the current user. I'll mock that shape.
- **OQ-2 (Reconnect):** P04 surfaces a "Reconnect Jira" button when the token is expired (the prototype's `jiraExpired` tweak). The ERD has EP-02..EP-05 for the OAuth start/callback but no explicit "force reconnect". Options: (a) reuse EP-02 (Connect Jira) — it's already a GET redirect, calling it again rotates the token via the same flow; (b) add a separate `POST /api/auth/jira/reconnect`. I'll mock (a) — `window.location.assign(api.auth.jiraConnectUrl())` matches today's Onboarding pattern.
- **OQ-3 (History range):** ERD EP-08 `GET /api/entries?date=YYYY-MM-DD` returns one day. My History needs a **range of days with per-day totals** (so the rail shows "Mon 5h 30m · Tue 7h 15m …"). Looping EP-08 N times is wrong. Suggest Keval add `GET /api/entries/history?from=YYYY-MM-DD&to=YYYY-MM-DD&summary=1` returning `[{ work_date, total_minutes, slot_count, ticket_keys: [...] }]`. Selecting a day still calls EP-08 for the full slot detail.
- **OQ-4 (still open from PR #2, surfaced again here):** `GET /api/auth/connections` — Settings re-uses this. The whole-PR question is the same: add the endpoint, or extend `GET /api/auth/me` with per-provider booleans.
- **OQ-5 (cosmetic):** the prototypes assume the `App Shell.html` brand mark in the top-bar is a small Ink-Charcoal square — same visual as the existing `tdy-brand-mark` we already use. Reusing the existing one. No new asset needed.

---

## 7. Build order (VG gate — your visual confirmation gates each PR)

For **every** page I follow this protocol:

1. `git fetch origin && git checkout main && git pull && git checkout -b feat/<page>` (assuming option (a) above).
2. Build the page. `cd web && npm run build` must be clean.
3. `cd web && npm run dev` running. I tell you the URL + a short checklist.
4. **STOP. Wait for your "confirmed" reply.** If you want changes, I make them and re-show the URL.
5. Only after "confirmed": `gh pr create` for that single PR. You merge it. I `git fetch && git checkout main && git pull` before starting the next page.

### Build sequence

| # | Page | Branch | URL (mock) | Depends on |
|---|---|---|---|---|
| 1 | **P03 App Shell** | `feat/p03-shell` | `http://localhost:5173/today` (the refactored TodayPage rendered via Shell) + the four new routes as stubs | PR #2 merged to main |
| 2 | **P06 Close My Day** | `feat/p06-close-my-day` | `http://localhost:5173/close-my-day` | P03 merged |
| 3 | **P07 Sync Result** | `feat/p07-sync-result` | `http://localhost:5173/sync-result` (deep link with a mock state for review) | P06 merged |
| 4 | **P04 Settings** | `feat/p04-settings` | `http://localhost:5173/settings` | P03 merged (P06/P07 not required) |
| 5 | **P08 My History** | `feat/p08-history` | `http://localhost:5173/history` | P03 merged |

Steps 4 and 5 don't depend on P06/P07 — I can re-sequence if you'd rather see Settings or History sooner. Default order is the one above (the "hero" flow first).

---

## 8. Hard rules — confirmed

- **Zero cost:** no new paid deps. Only adds beyond PR #2: nothing. Even `react-router-dom` was already there.
- **~60 real daily users:** every interactive control is a real `<button>` (PR #2 review's chip blocker won't repeat), focus rings inherited from the canonical theme, keyboard-navigable, ARIA labels on icon-only buttons.
- **Strip all prototype scaffolding:** TWEAK_DEFAULTS, EDITMODE blocks, useTweaks, TweaksPanel, data-comment-anchor, __bundler runtime — gone. Same discipline as PR #2.
- **API mocks isolated** — one-file swap (`web/src/api/mocks.js`) when the real backend lands.

---

## 9. Risks (for you to weigh)

- **R-1:** Stacking 5 PRs sequentially with VG gates is slow if you're not at a desk. Mitigation: I batch the **dev server still running** between PRs so each "confirm" only needs a quick browser visit.
- **R-2:** Refactoring TodayPage's inline TopBar/Sidebar into `<Shell>` (step P03) is a behavioural-no-op refactor but does touch the file. CI on PR #3 should re-run the existing smoke tests; if any fail, the refactor regressed something. Mitigation: extend smoke to walk through the shell's nav links.
- **R-3:** OQ-3 (history endpoint) is the only ERD addition that wasn't already on the table. Worst case if Keval can't add it for HackFest: My History stays demo-data-only and we don't gate the M0 demo on it (P08 is M1 anyway per your prompt).

# PR `feat/frontend-allpages` — Issues Log

> Per Yogesh's instruction: when functionality breaks or something looks off
> during the 14-page build, **do not stop** — log the issue here and continue.
> Yogesh reviews this list after the PR.

Format: one entry per issue, newest at the top.

```
## YYYY-MM-DD — <page or area> — <short title>
- **Where:**  file:line / route / component
- **What:**   what's wrong / what was expected vs what happens
- **Impact:** blocking / cosmetic / data-shape mismatch / a11y / responsive
- **Repro:**  steps if interactive
- **Next:**   suggested fix or owner (Keval/Yogesh/me)
```

---

## 2026-05-23 — P13 Leave Calendar — holidays endpoint not separated (OQ-AP-11)
- **Where:**  web/src/api/leave.js; web/src/api/mocks.js (`__buildLeave`).
- **What:**   `GET /api/leave?month=YYYY-MM` returns `{ holidays, leave, summary }` in one shot. Real ERD says holidays are global (TB-11 `settings`), but per OQ-AP-11 we ship them in the same payload to avoid a sister endpoint for M0. The frontend treats them as month-scoped.
- **Impact:** data-shape decision — keep an eye on it when M1 lands. Either keep the combined response or split `GET /api/leave?month=` + `GET /api/holidays?year=` (year-scoped is more cacheable).
- **Next:**   Keval / backend swimlane — confirm the combined response is the canonical shape; if so, EP-21 docs need an update.

## 2026-05-23 — P13 Leave Calendar — POST /api/leave response is permissive
- **Where:**  web/src/api/mocks.js (route handler for POST /api/leave) and web/src/pages/LeaveCalendarPage.jsx (`onAddSubmit`).
- **What:**   The mock returns `{ ok:true, leave:{ id, ...payload } }` — no validation, no overlap check, no team lookup. The frontend optimistically appends the row to the in-memory list with status `'pending'` if the server didn't supply one. Real EP-21 POST will need to (a) verify the actor has permission to create leave for `pid`, (b) compute team from the user record, (c) flag overlap with existing leave / holidays, (d) decide an approval workflow (auto-approve for ops? PM lead approval?).
- **Impact:** UX gap — current modal shows "Saving…" then closes; no approval flow visible.
- **Next:**   Keval / backend swimlane + Yogesh — define approval policy + response shape (status, approver, audit reference).

## 2026-05-23 — P10 Management Dashboard — EP-15 range param defaults to week (OQ-AP-09)
- **Where:**  web/src/pages/ManagementDashboardPage.jsx; web/src/api/dashboard.js (already wired); web/src/api/mocks.js (`__buildOrgDashboard`).
- **What:**   Backend currently stubs EP-15 (M1). Frontend defaults `range` to `week` (URL `?range=week|month|quarter`) and renders against the mock shape `{ range, kpis, donut, trend8w, teams, topProjects }`. Real EP-15 will need to accept the `range` query param and return the same shape (or equivalent).
- **Impact:** data-shape mismatch — only against the real backend post-M1. Mock is correct.
- **Next:**   Keval / backend swimlane — implement EP-15 to match `__buildOrgDashboard` when M1 lands. Donut split (logged/leave/untracked/holiday) needs an agreed source: `worklog_entries` SUM(minutes) for logged; `leave_days` for leave/holiday; (target - logged - leave) for untracked.

## 2026-05-23 — P10 Management Dashboard — donut colors hardcoded (not tokenised)
- **Where:**  web/src/pages/ManagementDashboardPage.jsx (`DONUT_COLORS` constant).
- **What:**   The four donut segments (logged/leave/untracked/holiday) use a literal palette `['#10B981', '#F59E0B', '#94A3B8', '#8B5CF6']` — those match the design intent but they're not pulled from `autoclock-theme.css` because the theme exposes `--ac-success`, `--ac-warning`, `--ac-n-400`, but not a fixed token for the violet leg.
- **Impact:** cosmetic / theming. If the brand colour set later changes, this list must be hand-updated.
- **Next:**   Yogesh — confirm the four-colour palette and either add tokens (e.g. `--ac-data-violet`) or accept the literal list as canonical.

## 2026-05-23 — P08 Team Dashboard — MOCK_USER role bumped to pm_lead
- **Where:**  web/src/api/mocks.js (MOCK_USER.role)
- **What:**   /team is gated to pm_lead+admin via RequireRole. The mock viewer was 'employee' which would 302 the Playwright run to /today. Bumped MOCK_USER.role from 'employee' to 'pm_lead' so the demo + tests can reach every role-gated page added in this PR. RequireRole already auto-allows admin; pm_lead sees Today, History, My Team, Settings in the sidebar.
- **Impact:** dev-only; production reads role from EP-01 sign-in response (Google OIDC, ERD §8).
- **Repro:**  Set MOCK_USER.role back to 'employee'; the /team route 302s to /today; Playwright fails to find the H1.
- **Next:**   When real backend lands (EP-01) the JSON returns the user's actual role — no mock-side change needed. Flag if upcoming /org or /admin pages assume 'employee' viewer.

## 2026-05-23 — P08 Team Dashboard — EP-14 extended (OQ-AP-07)
- **Where:**  web/src/api/mocks.js (`__buildTeamDashboard`); /api/dashboard/team handler.
- **What:**   PR #3 backend returns the slim shape {team_id, kpis:{team_logged_today}, members:[{id,name,minutes_today}]}. P08 needs {team, range, kpis:{hoursLogged,onTrack,behind,onLeave,teamSize}, members:[{id,name,role,hue,initial,today,week,target,weekTarget,status,lastClose}]}. Mock extended now; backend follow-up needed for OQ-AP-07.
- **Impact:** data-shape mismatch — frontend works on mocks; would 404/break on raw PR #3 backend until extension lands.
- **Next:**   Keval — extend EP-14 to match the shape above. Frontend's api.team.team() already passes `range`.

## 2026-05-23 — P11 Compliance Console — EP-16 mock made deterministic
- **Where:**  web/src/api/mocks.js (`__buildCompliance`).
- **What:**   Was using `Math.random()` to seed per-user weekly hours — that made the people list non-deterministic across reloads, which breaks Playwright counters / screenshot diffs. Swapped to a fixed pattern `[22, 38, 41, 30, 35, 18, 26, 40]` keyed by index.
- **Impact:** dev-only; cosmetic. Real EP-16 from the backend would obviously be deterministic per (user, week).
- **Next:**   None for backend. When EP-16 ships, mock can be removed from the route.

## 2026-05-23 — P11 Compliance Console — EP-17 manual-recipient run shape (mock)
- **Where:**  web/src/api/mocks.js (POST /api/ops/run-check handler) + web/src/api/ops.js.
- **What:**   The page POSTs `{ type: 'manual', recipientIds: [...] }` and renders the response `{ runId, status, emailed, by }`. The mock returns `emailed: recipientIds.length` already; the backend handler in PR #3 needs to accept the `manual` type and persist the run to `reminder_runs` + `reminder_recipients` (TB-08/TB-09) with the chosen subset.
- **Impact:** data-shape mismatch — frontend works on mocks; backend needs to widen EP-17 to accept the `manual` type alongside `friday`/`monday`.
- **Next:**   Keval — extend EP-17 to accept `type: 'manual'` + `recipientIds: number[]`. Friday/Monday cron paths stay as-is.

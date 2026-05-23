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

# AutoClock — Backend Status Audit

**Last updated:** 2026-05-23 (B1/B2/B3/B8 shape alignment)
**Branch:** `feat/backend`
**Tests:** 116 passing, 0 failing

Status legend: **REAL** = fully implemented + tested · **PARTIAL** = works but shape/params incomplete vs frontend contract · **STUB** = placeholder / 501

---

## Endpoints (EP-01 … EP-23)

| EP | Method + Path | Status | Gap / Notes |
|---|---|---|---|
| EP-01 | `POST /api/auth/login` | **PARTIAL** | M0 stub: accepts `{email}`, looks up user by email, sets session. M1 needs Google OIDC id_token verify (ADR-10, FR-23). |
| EP-02 | `GET /api/auth/jira/connect` | REAL | Wired to `jiraOAuth.startConnect`. Needs real `ATLASSIAN_CLIENT_ID` to exercise. |
| EP-03 | `GET /api/auth/jira/callback` | REAL | Wired to `jiraOAuth.handleCallback`. |
| EP-04 | `GET /api/auth/google/connect` | REAL | Wired to `googleOAuth.startConnect`. |
| EP-05 | `GET /api/auth/google/callback` | REAL | Wired to `googleOAuth.handleCallback`. |
| EP-06 | `GET /api/projects` | REAL | Returns active projects. |
| EP-07 | `GET /api/projects/:id/tasks` | REAL | Returns seeded tasks for project. 404 on unknown project. M1: live JQL refresh. |
| EP-08 | `GET /api/entries?date=` | REAL | IST-default date, returns `{entries, _tz:'IST'}`. |
| EP-09 | `POST /api/entries` | REAL | Full validation: duration, slot order, FK check, 24h cap, overlap warnings. |
| EP-10 | `PUT /api/entries/:id` | REAL | Ownership + synced guard. Patched validation same as create. |
| EP-11 | `DELETE /api/entries/:id` | REAL | Ownership + synced guard. |
| EP-12 | `POST /api/day/preview` | REAL | Groups by ticket, validateDay, returns warnings + errors. |
| EP-13 | `POST /api/day/close` | REAL | Idempotent via TB-13 `external_writes`. Jira → Sheet → Gmail. Records TB-07 `eod_reports`. |
| EP-14 | `GET /api/dashboard/team` | **REAL** | Returns `{team:{id,name}, range, kpis:{hoursLogged,onTrack,behind,onLeave,teamSize}, by_ticket, not_logged_today, members:[{week,target,status,hue,initial,role,lastClose,…}]}`. Gap #1 resolved. |
| EP-15 | `GET /api/dashboard/org` | **REAL** | Returns `{range, kpis, donut:{logged,leave,untracked,holiday}, trend8w (8 weeks), teams, topProjects}`. Gap #2 resolved. |
| EP-16 | `GET /api/ops/compliance?date=` | REAL | Leave-adjusted rows per user. `date` defaults to today. |
| EP-17 | `POST /api/ops/run-check` | **REAL** | Accepts `{type:'friday'|'monday'|'manual', recipientIds?:[…]}`. Gap #3 resolved. |
| EP-18 | `GET /api/ops/reminders` | REAL | Returns last 50 runs from TB-08, enriched with `emailed`/`complied` counts and `recipients` array. |
| EP-19 | `GET/POST/PUT /api/admin/users` | **PARTIAL** | GET returns all active users (no `?filter=&status=` server-side filtering). POST creates. PUT updates. **See Gap #4.** |
| EP-20 | `GET/POST /api/admin/projects` | **PARTIAL** | GET + POST exist. **`PUT /api/admin/projects/:id` is missing** — see Gap #5. Test-connection sub-EP not wired to real Jira — see Gap #6. |
| EP-21 | `GET/POST /api/leave` | **PARTIAL** | GET + POST exist. No approval workflow, no overlap check, no team lookup on POST. **See Gap #7.** |
| EP-22 | `GET/PUT /api/admin/settings` | **PARTIAL** | GET returns flat `{key:value}` map. PUT does flat `upsertSettings`. **Frontend (P16) POSTs `{section, body}` for integrations — see Gap #8.** |
| EP-23 | `POST /api/worklogs/sync` | **STUB** | Returns 501. `services/worklogSync.js` is complete; just needs wiring. |

---

## Gaps (priority order)

### Gap #1 — EP-14 extended shape ✅ RESOLVED 2026-05-23
**Frontend needs** (P08 Team Dashboard):
```json
{
  "team": { "id": 1, "name": "Team Alpha" },
  "range": "week",
  "kpis": { "hoursLogged": 123, "onTrack": 4, "behind": 1, "onLeave": 0, "teamSize": 5 },
  "members": [{
    "id": 2, "name": "Yogesh", "role": "employee",
    "today": 180, "week": 840, "target": 2400, "weekTarget": 2400,
    "status": "on_track", "lastClose": "2026-05-22"
  }]
}
```
**Backend currently returns** slim shape (`team_id`, flat kpis, raw `members` array with only `minutes_today`).
**Fix:** Extend EP-14 to accept `?range=week|month|quarter`, compute `onTrack/behind/onLeave` counts, and enrich member rows with `week`, `target`, `weekTarget`, `status`, `lastClose`.

---

### Gap #2 — EP-15 range param + shape ✅ RESOLVED 2026-05-23
**Frontend needs** (P10 Management Dashboard):
```json
{
  "range": "week",
  "kpis": { "workforce_logged_today": 4, "org_compliance_pct": 60, "org_utilization_pct": 45, "active_projects": 5 },
  "donut": { "logged": 1200, "leave": 240, "untracked": 600, "holiday": 0 },
  "trend8w": [{ "week_start": "2026-04-06", "total_minutes": 8400, "users_logged": 8 }],
  "teams": [{ "team_id": 1, "team_name": "Alpha", "total_minutes": 4200, "active_members": 4 }],
  "topProjects": [{ "name": "PIMCore", "jira_project_key": "PIM", "minutes": 3600 }]
}
```
**Backend currently returns** `{kpis, project_portfolio, team_comparison, trend_weeks}` — field names differ, no `donut`, `range` param ignored.
**Fix:** Accept `?range=`, rename `trend_weeks→trend8w` (or 8 weeks), rename `project_portfolio→topProjects`, rename `team_comparison→teams`, add `donut` computation (`leave_days` + `worklog_entries` + `(target - logged - leave)` for untracked).

---

### Gap #3 — EP-17 `manual` type + `recipientIds` ✅ RESOLVED 2026-05-23
**Frontend posts** `{ type: 'manual', recipientIds: [2, 5, 7] }` to send ad-hoc reminders to selected users.
**Backend only accepts** `friday` or `monday` and errors on anything else.
**Fix:** Add `type: 'manual'` branch in `run-check` handler. When `manual`: look up users by `recipientIds`, skip the "under target" computation, send reminders directly, persist run to TB-08/TB-09 with `triggered_by: 'manual'`.

---

### Gap #4 — EP-19 server-side filtering `LOW`
**Frontend** calls `GET /api/admin/users?filter=yogesh&status=active` for search + tab filtering.
**Backend** ignores query params and returns all active users.
**Fix:** Add `?filter=` (name/email LIKE) and `?status=active|inactive|all` to the GET handler + queries.

---

### Gap #5 — EP-20 missing `PUT /api/admin/projects/:id` `MEDIUM`
**Frontend** calls `PUT /api/admin/projects/:id` to edit a project's name/Jira key.
**Backend** has no PUT route — request is dropped (optimistic UI update only; lost on refresh).
**Fix:** Add `router.put('/projects/:id', admin, ...)` updating `name`, `jira_project_key`, `is_active`.

---

### Gap #6 — EP-20 test-connection not real `LOW`
**Frontend** posts `POST /api/admin/projects/test` — route doesn't exist in `admin.js` yet.
**Fix:** Add the route; call `GET /rest/api/3/project/{jiraKey}` with the stored admin Jira token; return `{ok, message}`.

---

### Gap #7 — EP-21 leave POST response + overlap `LOW`
**Frontend** expects `{ ok: true, leave: { id, user_id, leave_date, leave_type, hours, status } }`.
**Backend** returns `{ leave_id }` only.
**Fix:** Return the full created row. Optionally: add overlap check (existing leave on same date) and team lookup.

---

### Gap #8 — EP-22 section-scoped integrations PUT `MEDIUM`
**Frontend (P16 Integrations)** posts `PUT /api/admin/settings` with `{ section: 'jira'|'google'|'email'|'reader', body: {...} }`.
**Backend** does a flat `upsertSettings(req.body)` — a direct key:value map. Posting `{section:'jira', body:{…}}` would write a key `"section"` and a key `"body"` literally.
**Fix:** Update the PUT handler to detect `{section, body}` shape, validate `section` against enum, and merge only `body` keys under `section.*` namespace (e.g. `jira.baseUrl`, `reader.enabled`). Return merged integrations object.

---

### Gap #9 — EP-23 worklog sync not wired `LOW`
`services/worklogSync.js` is complete. EP-23 just returns 501.
**Fix:** Replace stub with `const { pullSince } = require('../services/worklogSync'); const result = await pullSince(since); res.json(result)`.

---

## Services — All REAL

| Service | File | Notes |
|---|---|---|
| `parser.js` | `services/parser.js` | `parseDuration`, `tidy`, `groupByTicket`, `validateEntry`, `validateDay`, `toJiraStarted` |
| `jira.js` | `services/jira.js` | `createWorklog` with retry + typed errors (Forbidden, RateLimit). Uses `JIRA_BASE_URL` or gateway if `JIRA_CLOUD_ID` set. |
| `sheets.js` | `services/sheets.js` | `appendRow` via `googleapis`. Demo refresh token for M0. |
| `gmail.js` | `services/gmail.js` | `createDraftFromGroups`. `gmail.compose` scope. UTF-8 MIME. |
| `crypto.js` | `services/crypto.js` | AES-256-GCM. `iv:authTag:ciphertext` base64 format. |
| `sync.js` | `services/sync.js` | `syncOne` + `buildResult`. TB-13 ledger. |
| `worklogSync.js` | `services/worklogSync.js` | `pullSince`. `worklog/updated` + `worklog/list` reader-account pull. |
| `notifier.js` | `services/notifier.js` | Compliance reminder emails via Gmail OAuth2 (`gmail.send` scope). Skips gracefully if creds absent. |

---

## Auth + DB

| Area | Status | Notes |
|---|---|---|
| `auth/session.js` | REAL | Signed HTTP-only cookie. |
| `auth/rbac.js` | REAL | `requireRole(...)` middleware. Server-side only. |
| `auth/jiraOAuth.js` | REAL (untested) | Needs `ATLASSIAN_CLIENT_ID/SECRET` + real Jira tenant to exercise. |
| `auth/googleOAuth.js` | REAL (untested) | Needs `GOOGLE_CLIENT_ID/SECRET` + real Workspace tenant. |
| `db/queries.js` | REAL | All 13 tables covered. Prepared statements. No TODOs. |
| `schema.sql` | REAL | TB-01..TB-13 complete including `external_writes` idempotency ledger. |
| `jobs/compliance.js` | REAL | `runCheck(type, triggeredBy, actorUserId)`. Cron: Fri 1pm + Mon 1pm IST. |

---

## M0 hero-flow status

| Item | Status | Notes |
|---|---|---|
| CORS | ✅ DONE | `ALLOWED_ORIGINS` env (default `http://localhost:5173`). Handles preflight. Credentials-safe. |
| DB seed | ✅ DONE | `db.js → seedIfEmpty()` runs on first boot. 10 users, 5 projects, 11 tasks, 5 demo entries for Yogesh. |
| Reseed script | ✅ DONE | `npm run reseed` → `scripts/reseed.js --yes`. Wipes all tables + re-seeds. |
| EP-06..09,12,13 | ✅ REAL | Projects, tasks, entries CRUD, preview, idempotent close all implemented. |
| Real .env secrets | ⏳ BLOCKED | Needs Jira token (Yogesh/Tejas), Google refresh token (Ravi). See E2E checklist below. |

## E2E verification checklist (run once .env is populated)

```bash
# 1. Backend
cd backend
cp .env.example .env        # fill SESSION_SECRET, TOKEN_ENC_KEY, JIRA_*, GOOGLE_*
npm run reseed               # fresh demo data
npm run dev                  # :4000

# 2. Frontend (separate terminal)
cd web
VITE_USE_MOCKS=false VITE_API_BASE_URL=http://localhost:4000 npm run dev  # :5173

# 3. Browser flow
#   a. Open http://localhost:5173
#   b. Sign in as yogesh@iksula.com  → expect: Today page with 3 demo entries
#   c. Click "Close My Day" → preview shows PIM-3073, PIM-3162, INTERNAL-1
#   d. Confirm → check:
#      ✓ Jira: worklog appears on PIM-3073 and PIM-3162 in Clockwork
#      ✓ Sheet: row appended to the Google Sheet timesheet
#      ✓ Gmail: EOD draft visible in yogesh@iksula.com Drafts
#   e. Click Close My Day again → idempotency: no duplicate entries

# 4. Verify DB wrote correctly
cd backend && node scripts/verify-db.js
```

## What to build next (ordered)

1. **Gap #1** — EP-14 extended shape (blocks P08 Team Dashboard from using real backend)
2. **Gap #2** — EP-15 range param + shape (blocks P10 Management Dashboard)
3. **Gap #3** — EP-17 `manual` type (blocks P11 Compliance "Send to selected" button)
4. **Gap #5** — EP-20 PUT projects (data loss on every project edit)
5. **Gap #8** — EP-22 section-scoped settings (P16 Integrations page saves broken)
6. **Gap #4** — EP-19 filter/status (nice-to-have; 60 users means client-side filter is fine)
7. **Gap #6** — EP-20 test-connection (diagnostic; not blocking any flow)
8. **Gap #7** — EP-21 leave POST response shape (minor; frontend handles missing fields)
9. **Gap #9** — EP-23 wire-up (worklogSync.js is ready; 30-min job)

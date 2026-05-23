# AutoClock — Pending List

> Living doc. Check this whenever you think you're done — there's always something here.
> Update status inline: `[ ]` → `[x]` when done, add date.
> Sections ordered by priority: M0 hero flow first, then shape gaps, then polish.

---

## SECTION A — M0 Hero Flow (Today → Close My Day → real Jira + Sheet + Gmail)

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| A1 | CORS added to server.js | ✅ done 2026-05-23 | Keval | `ALLOWED_ORIGINS` env, default `:5173` |
| A2 | DB seed (users, projects, tasks, demo entries) | ✅ done | Keval | Auto-runs on first boot via `seedIfEmpty()` |
| A3 | Reseed script (`npm run reseed`) | ✅ done 2026-05-23 | Keval | `scripts/reseed.js` |
| A4 | Jira API token in `.env` | [ ] BLOCKED | Yogesh / Tejas | Classic token, fresh 3-day (ADR-11). Fill `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` |
| A5 | Google refresh token in `.env` | [ ] BLOCKED | Ravi | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DEMO_REFRESH_TOKEN`, `GOOGLE_DEMO_EMAIL` |
| A6 | SESSION_SECRET + TOKEN_ENC_KEY in `.env` | [ ] | Keval | `openssl rand -hex 32` twice |
| A7 | Flip frontend off mocks | [ ] | Keval | `VITE_USE_MOCKS=false VITE_API_BASE_URL=http://localhost:4000 npm run dev` |
| A8 | E2E smoke test: sign in → create entry → Close My Day → verify Jira + Sheet + Gmail | [ ] BLOCKED on A4+A5 | Yogesh | Checklist in `docs/backend-status.md` |
| A9 | Idempotency check: click Close My Day twice → no duplicate Jira worklog | [ ] | Yogesh | Critical FR-22 / ADR-09 |

---

## SECTION B — Backend Shape Gaps (frontend pages broken until fixed)

### B-HIGH — blocks pages from using real backend

| # | Item | Status | EP | Notes |
|---|---|---|---|---|
| B1 | EP-14 extended shape for Team Dashboard (P08) | ✅ done 2026-05-23 | EP-14 | `?range=` echoed, `onTrack/behind/onLeave/teamSize` kpis, members enriched with `week/target/status/hue/initial/lastClose/role`. |
| B2 | EP-15 range param + reshape for Management Dashboard (P10) | ✅ done 2026-05-23 | EP-15 | `?range=` echoed, `topProjects/teams/trend8w` (8 weeks), `donut` added. |

### B-MEDIUM — data loss or broken saves

| # | Item | Status | EP | Notes |
|---|---|---|---|---|
| B3 | EP-17 `manual` type + `recipientIds` for Compliance Console (P11) | ✅ done 2026-05-23 | EP-17 | `manual` type accepted; `schema.sql` updated to allow `run_type='manual'`. |
| B4 | EP-20 `PUT /api/admin/projects/:id` missing (P15) | ✅ done 2026-05-23 | EP-20 | Route + `updateProject` query added. 404 on unknown id. |
| B5 | EP-22 section-scoped `{section, body}` PUT for Integrations (P16) | ✅ done 2026-05-23 | EP-22 | Detects `{section,body}`, namespaces keys as `section.*`. Flat map still works. |

### B-LOW — nice-to-have

| # | Item | Status | EP | Notes |
|---|---|---|---|---|
| B6 | EP-19 server-side `?filter=&status=` for Users page (P14) | ✅ done 2026-05-23 | EP-19 | JS-side filter on `getAllUsers()`. `?status=active\|inactive\|all`, `?filter=` name/email LIKE. |
| B7 | EP-20 `POST /api/admin/projects/test` real Jira check | ✅ done 2026-05-23 | EP-20 | Calls `GET /rest/api/3/project/{key}` with admin env creds. Returns `{ok, message}`. |
| B8 | EP-18 reminder runs enriched with `emailed`/`complied`/`recipients` | ✅ done 2026-05-23 | EP-18 | Each run now includes emailed/complied counts and full recipients array. |
| B9 | EP-21 POST response shape — return full leave row, not just `{leave_id}` | ✅ done 2026-05-23 | EP-21 | Returns `{ok, leave:{id,user_id,leave_date,leave_type,hours,status:'pending'}}`. |
| B9 | EP-23 wire worklogSync.js to the 501 stub | ✅ done 2026-05-23 | EP-23 | Replaces 501. Accepts `{since}` ISO date, defaults to 7 days. 503 if reader env unset. |

---

## SECTION C — Frontend ↔ Backend Integration Issues (from `frontend-allpages-issues.md`)

| # | Issue | Status | Page | Notes |
|---|---|---|---|---|
| C1 | Team Dashboard (P08) broken on real backend until B1 done | [ ] | P08 `/team` | Mock shape works; real EP-14 slim shape doesn't match |
| C2 | Management Dashboard (P10) broken on real backend until B2 done | [ ] | P10 `/org` | `donut`, `trend8w`, field renames all missing |
| C3 | Compliance "Send to selected" broken until B3 done | [ ] | P11 `/ops/compliance` | `recipientIds` rejected by backend |
| C4 | Project edit lost on refresh until B4 done | [ ] | P15 `/admin/projects` | Optimistic update only |
| C5 | Integrations page saves broken until B5 done | [ ] | P16 `/admin/integrations` | section-scoped PUT writes garbage |
| C6 | Edit User dialog is alert stub (P14) | [ ] | P14 `/admin/users` | `handleEdit` calls `window.alert`. Needs `EditUserModal` |
| C7 | Leave POST response missing fields | [ ] | P13 `/ops/leave` | Frontend appends row optimistically with status 'pending' |
| C8 | Reader account UI-only until EP-23 wired (B9) | [ ] | P16 | `enabled + email` stored but has no effect |

---

## SECTION D — Auth (M1 but track it)

| # | Item | Status | Notes |
|---|---|---|---|
| D1 | Google OIDC login (FR-23, ADR-10) — replace email-stub EP-01 | [ ] M1 | Needs `GOOGLE_OIDC_CLIENT_ID + SECRET`. `auth/googleOAuth.js` OIDC path exists but untested |
| D2 | Per-user Jira OAuth onboarding (EP-02/03) — real test | [ ] M1 | `auth/jiraOAuth.js` wired; needs real `ATLASSIAN_CLIENT_ID + SECRET` |
| D3 | Per-user Google OAuth onboarding (EP-04/05) — real test | [ ] M1 | Same — needs credentials |
| D4 | Rotating refresh token atomic overwrite on every Jira refresh | [ ] M1 | Critical — Atlassian invalidates previous token on each refresh (DevDoc §6.5) |

---

## SECTION E — Deployment (Fly.io — memory says this is the host)

| # | Item | Status | Notes |
|---|---|---|---|
| E1 | `fly.toml` has uncommitted local changes | [ ] | `git status` shows `fly.toml` modified but not staged |
| E2 | Persistent volume at `/data` for SQLite | [ ] | Must set `DB_FILE=/data/autoclock.db` in Fly env |
| E3 | Secrets set in Fly (`fly secrets set SESSION_SECRET=… TOKEN_ENC_KEY=… …`) | [ ] BLOCKED on A4+A5 | Never commit to `.env` |
| E4 | First deploy + smoke test against Fly URL | [ ] | After E2+E3 |
| E5 | Nightly SQLite backup cron on Fly | [ ] | `fly ssh console` + cron or Fly scheduled machine |

---

## SECTION F — Tests + Quality

| # | Item | Status | Notes |
|---|---|---|---|
| F1 | Stale todo items in Claude todo list | [ ] | `entries integration tests` still shows `in_progress` — check if done |
| F2 | Add tests for new B1/B2 EP-14/15 shapes once implemented | [ ] | Pattern: `test/dashboard.test.js` already exists |
| F3 | Add test for EP-17 `manual` type once B3 done | [ ] | Pattern: `test/ops.test.js` |
| F4 | Playwright E2E suite — flip `VITE_USE_MOCKS=false` and run | [ ] | Currently mocks. Real backend run is the integration gate |

---

## Quick reference — things most likely to be forgotten

1. **`fly.toml` has uncommitted edits** (E1) — easy to miss on next push
2. **`SECTION_SECRET` + `TOKEN_ENC_KEY`** need generating before any real run (A6)
3. **EP-22 section-scoped PUT** (B5) — looks like settings save works (200 OK) but writes garbage keys; silent data corruption
4. **Rotating Jira refresh token** (D4) — pilot will randomly lose Jira access if not implemented before per-user OAuth goes live
5. **EP-21 POST response** (B8) — leave row added shows 'pending' forever in UI; looks like a backend bug to the user

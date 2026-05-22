# PR #3 Review — feat/backend (Keval)

> **Scope:** 30 files · +2937 / −350 · 21 commits · base `main` ← head `feat/backend` @ `cdea0d1`
> **Reviewer:** Yogesh (via Claude Code)  ·  **Date:** 2026-05-23
> URL: https://github.com/yogeshmohite-iksula/Autoclock/pull/3

## Verdict — **APPROVE WITH ONE POLICY DECISION**

There are **no security blockers, no correctness blockers, and no merge conflicts.** All 75 backend tests pass on a clean `npm install`. The PR is the cleanest of the three so far — disciplined separation of concerns (`db/queries.js` DAL, typed errors in `jira.js`, idempotent `sync.js`), accurate FR/EP/TB references in headers, and comprehensive integration tests including RBAC negative paths.

The one decision that needs to land before merging is **policy, not code**: `fly.toml` + `Dockerfile` introduce a Fly.io deployment target that contradicts ADR-03 ("self-hosted on an Iksula server") and may contradict GM-05 ("zero cost" — Fly.io ended its free tier in Sept 2024). See **DEC-1** below. Once that's resolved, this is good to merge.

---

## What landed (mapped to the plan)

| Area | Coverage |
|---|---|
| **DAL** | New `backend/db/queries.js` (525 lines, parameterized `db.prepare()` everywhere). All route files now use it — `grep -rEn 'db\.prepare\(\|SELECT\|INSERT\|UPDATE\|DELETE' backend/routes/` returns zero hits. |
| **EP-08..EP-11** entries | Day-level OVER_24H gate, FK check INVALID_TASK, IST-default work_date, slot regex validation, self-ownership via `req.user.id`. |
| **EP-12 preview** | Calls `validateDay` + `groupByTicket` from PR #1 parser. Returns `errors`, `warnings`, `total_minutes`. |
| **EP-13 close** | **Idempotent** via `(user_id, work_date)` + `external_writes` ledger (TB-13). `sync.js` skips `status === 'synced'`, retries `failed`. Result object shape matches PRD §7 Flow B. Records `eod_reports` after sync. |
| **EP-14/15 dashboards** | `pm_lead` for team, `management` for org. KPI shape + `project_portfolio` + `trend_weeks` (length=4). |
| **EP-16/17/18 ops** | Compliance tracker + Friday/Monday `node-cron` jobs (`0 13 * * 5` / `0 13 * * 1`) + reminder history. `notifier.js` for email dispatch. |
| **EP-19..EP-22 admin** | Users / projects / settings — all gated `requireRole('admin')`. |
| **EP-23 worklog read-sync (stretch)** | `worklogSync.pullSince` via Browse-Projects reader account; typed `JiraApiError` on 403; test covers the 403 path. |
| **services/jira.js** | `createWorklog` with `JiraForbiddenError` (403, no retry) / `JiraRateLimitError` (429 with exponential backoff + jitter, 4 attempts) / `JiraApiError`. IST→UTC handled by parser's `toJiraStarted` (`+0530`). |
| **services/gmail.js** | `gmail.compose` scope only (matches security rule). EOD recipient resolves `users.eod_recipient_email` → `GOOGLE_DEMO_EOD_TO` → user's own email. |
| **services/sheets.js** | `ensureTab` + `ensureHeaders` before `values.append`. Month-wise tabs (`"May 2026"`). |
| **services/crypto.js** + `user_connections` queries | AES-256-GCM. `iv:authTag:ciphertext` base64. Format-violation throws. Round-trip + GCM-tamper + cross-key tests all pass. **`*_enc` columns never leave the queries module** — callers always get plaintext. |
| **server.js** | X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, HSTS (prod). 256 KB body cap. JSON 404 for unknown `/api/*`. Request logger after `res.finish` (zero-cost on hot path). Explicit "Never serverless" comment matching ADR-03. |
| **Tests** | 7 integration suites: crypto (11), dashboard (7), day (5), entries (~15), jira (6), ops (~7), server (4). Plus parser (44 from PR #1). **75/75 passing on Node v24.13.1.** |

---

## Verified manually

| Check | Result |
|---|---|
| `npm install && node --test test/*.test.js` (clean tree) | ✅ **75 pass, 0 fail** |
| No secrets in committed files (grep `ghp_`, `github_pat_`, `AIza`, `sk-`, `xoxb-`, hardcoded passwords) | ✅ clean |
| No inline SQL in `routes/` (must all go through `db/queries.js`) | ✅ clean |
| No `console.log` of tokens / passwords / refresh tokens | ✅ clean |
| TODOs | ✅ only 2, both intentional M1 OAuth stubs (`jiraOAuth.js`, `googleOAuth.js`) |
| `mergeable` / `mergeStateStatus` | ✅ MERGEABLE / BLOCKED only because of REVIEW_REQUIRED |
| CI checks | n/a (no CI configured yet — pre-existing gap) |

---

## Decision needed before merge

### DEC-1 — `fly.toml` + `Dockerfile`: ship to Fly.io or not?

The PR introduces:
- `fly.toml` — Fly.io app config in `bom` region, `auto_stop_machines = false`, `min_machines_running = 1`, `autoclock_data` persistent volume mounted at `/data`
- `Dockerfile` — multi-stage (web-builder → node runtime) targeting Fly.io
- `.dockerignore` — image hygiene
- Onboarding comment in `fly.toml`: `fly apps create autoclock-iksula` / `fly volumes create autoclock_data --region bom --size 3` / `fly secrets set ...` / `fly deploy`

**Why this needs a decision:**

1. **ADR-03** ("Self-hosted on Iksula server, PM2, SQLite persistent disk, never serverless") was the load-bearing choice. Fly.io is technically not serverless (with `auto_stop_machines = false` it's a real always-on VM with persistent volume — `node-cron` will run, SQLite will persist), but it's a third-party hosted platform, not the Iksula server.
2. **GM-05 ("Zero cost" hard rule)** — Fly.io's free tier ended September 2024. A `shared-cpu-1x` always-on VM in BOM + a 3 GB volume runs roughly **$5–10/month**, which is no longer ₹0. Whether this passes the zero-cost audit depends on whether Iksula is willing to fund a small recurring spend for this platform.
3. The code itself is sound — multi-stage build is clean, secrets via `fly secrets`, no secrets committed. So if the answer is "yes, Fly.io is approved", nothing has to change.

**Three reasonable options:**

| Option | What it means |
|---|---|
| **(a) Merge as-is** — Fly.io is the approved M1 path | Update ADR-03 + GM-05 wording in the docs to note "Fly.io shared-cpu BOM is the chosen pilot host; Iksula approved ~$10/mo". I can do this in a tiny follow-up. |
| **(b) Merge after Keval drops fly.toml + Dockerfile** | Keeps ADR-03 + GM-05 intact. Backend code is independent of these files. Quick rebase to remove the 3 deployment files. |
| **(c) Keep both options open** | Move fly files to `deploy/optional/fly/` with a README noting they're an alternative to PM2-on-Iksula-server. Doesn't break either path. |

---

## Non-blocking follow-ups (worth filing, fine to do post-merge)

### FU-1 — Add CORS allowlist + CSP to `server.js`

SECURITY.md §4 calls for "CORS allowlist set to the web app origin and the extension origin only" + "Content-Security-Policy restricting scripts to self". Current `server.js` sets X-Frame-Options / X-CTO / Referrer / HSTS but no CSP and no CORS middleware. For M0 demo it's not exploitable (Express serves the bundled frontend at the same origin), but it should land before M1 pilot — particularly because the Chrome extension and the web app will live at different origins.

### FU-2 — Tighten `TIME_RE` in `routes/entries.js`

```js
const TIME_RE = /^\d{2}:\d{2}$/;  // allows "99:99"
```

`validateEntry` (from parser) does the strict 00–23:00–59 check downstream, but two-layer defence is worth the 30 characters. Suggested:

```js
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
```

### FU-3 — Verify Sheets append escapes `=` in descriptions

`ensureHeaders` uses `valueInputOption: 'USER_ENTERED'` for the static `HEADERS` constant — fine. Worth confirming the actual data-row append uses `RAW` (or sanitises leading `=`), otherwise a user description like `=1+1` would be interpreted as a formula by Google Sheets. Low impact (internal tool, internal users) but worth a one-line guard.

### FU-4 — Add a CI workflow

`.github/workflows/ci.yml` is referenced in `docs/SECURITY.md §10` but not present in this PR. `npm audit` + `gitleaks` + `node --test` should run on every PR. Was likely deferred — fine to land post-merge.

---

## Quality / code-style observations (no action needed)

- **Header comments are excellent** — every file links to the FR/EP/TB/ADR ID it implements. Makes review against the source-of-truth docs trivial.
- **Test isolation is solid** — each suite seeds its own data; no order dependencies surfaced when re-running.
- **Typed errors in `jira.js`** are exactly the right abstraction. `withRetry` only retries `JiraRateLimitError`, never `JiraForbiddenError` (good — 403 should fail fast, not hammer the API).
- **`upsertConnection` uses `ON CONFLICT DO UPDATE`** — atomic refresh-token rotation in a single statement. Exactly what `security.md` asks for ("atomic-overwrite the stored Jira refresh_token").
- **`istToday()` derives the date via UTC+5:30 shift** — correct, avoids midnight-IST users landing on tomorrow's UTC date.

---

## Recommendation

If Yogesh picks **(a)** or **(c)** on DEC-1: approve + squash-merge as-is. Update `docs/ARCHITECTURE.md` + `docs/MILESTONES.md` afterward to record the deployment target shift.

If Yogesh picks **(b)**: leave a review comment on PR #3 asking Keval to drop the 3 Fly.io files, then re-approve once he force-pushes.

**FU-1 through FU-4 should be filed as follow-up issues**, not merge blockers.

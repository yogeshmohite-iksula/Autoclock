# AutoClock — Project Specification

> **Synthesized from** `AutoClock_PRD.md` + `AutoClock_ERD.md` + `AutoClock_DevDoc.md` + `AutoClock_WorkPlan.md`. Those four are the source of truth — this file is the navigable summary.

---

## Part A — Product Requirements

### Project Overview
AutoClock is an internal Iksula tool that lets an employee log a workday **once** and fans the data out to three downstream systems automatically: (1) Jira worklogs (which Clockwork displays), (2) a Google Sheet timesheet, (3) a Gmail end-of-day draft. Built for **~60 daily users**. **Zero running cost.**

### Target Users (5 roles — full detail in PRD §5)
| Role | Primary need |
|---|---|
| **Employee** | Log the day in seconds; never open 3 systems |
| **PM / QA Lead** | See *their team's* hours & ticket effort |
| **Management** | Org-wide utilization & trends (no ticket detail) |
| **Operations** | Chase the weekly 40-hour fill; Fri/Mon reminders |
| **Admin** | Manage users, roles, project↔Jira mapping, integrations |

### Core Features — by Milestone

**M0 — HackFest (P0 / must-demo):** FR-01–09, FR-18, FR-19, FR-22
- Create/edit/delete a work entry (project + Jira task + description + duration + slot).
- Project dropdown → dependent Jira-task dropdown.
- Free deterministic parser (durations, tidy, group-by-ticket).
- "Close My Day" preview + confirm + **idempotent** sync to Jira + Sheet + Gmail.
- Per-system success/failure + retry of failed only.
- IST↔UTC handling. AES-256-GCM token encryption. RBAC scaffolded.

**M1 — Pilot (P1):** FR-10–17, FR-23
- 5 role dashboards. Chrome extension with `chrome.alarms`. Friday/Monday cron. Leave calendar. Per-user OAuth onboarding. Google OIDC sign-in.

**Stretch (P2):** Chrome extension full popup (FR-14), worklog read-sync (FR-21 / EP-23).

### User Flows (narrative — full criteria in PRD §6/§7)
- **Flow A — Log a slot:** reminder fires → user opens AutoClock → Project → Jira Task → describe → save → appears in Today.
- **Flow B — Close My Day:** click → backend groups entries → preview screen shows grouped tickets → user confirms → backend posts Jira + appends Sheet + drafts Gmail → per-system status displayed.
- **Flow C — Ops weekly chase:** Fri 1 PM cron → email everyone under leave-adjusted 40h target → Mon 1 PM re-check, drop compliant.
- **Flow D — First-time connect:** user signs in via Google OIDC → connects Jira (OAuth) → connects Google (OAuth).

### Success Criteria (from PRD §3 — GM-01..GM-05)
- **GM-01:** ≥ 80% reduction in daily worklog time (12 min → ≤ 2 min).
- **GM-02:** ≥ 95% Clockwork compliance across pilot teams.
- **GM-03:** 100% EOD draft creation rate for pilot users.
- **GM-04:** ≥ 80% of the 60 still using after 2 weeks.
- **GM-05:** ₹0 running cost — non-negotiable.

---

## Part B — Engineering Requirements

### Tech Stack
| Component | Tech | Version | Purpose |
|---|---|---|---|
| Backend runtime | Node.js | 18+ | Express server |
| Web framework | Express | 4.x | HTTP API |
| Database | SQLite (WAL) via `better-sqlite3` | 9.x / 3.x | Persistent storage |
| Scheduler | `node-cron` | 3.x | Fri/Mon compliance chase |
| Google client | `googleapis` | latest | Sheets + Gmail + OIDC |
| Email helper | `nodemailer` | latest | (optional reminder MTA) |
| Process mgr | PM2 | latest (global) | Self-host auto-restart |
| Web frontend | React | 18 | Dashboards |
| Build tool | Vite | 5 | Dev server + bundler |
| Charts | Chart.js | 4 | Dashboard visualisations |
| Extension | Chrome MV3 vanilla JS | — | Daily logging |
| Tests | Playwright (**CLI**) | latest | E2E |

### Project Folder Structure
```
autoclock/
├── backend/                Node + Express + SQLite (WAL)
│   ├── server.js
│   ├── db.js + schema.sql
│   ├── auth/               session.js, rbac.js, jiraOAuth.js, googleOAuth.js
│   ├── routes/             entries.js, day.js, projects.js, dashboard.js, ops.js, admin.js, auth.js
│   ├── services/           parser.js, jira.js, sheets.js, gmail.js, crypto.js, sync.js, worklogSync.js
│   ├── jobs/               compliance.js (node-cron)
│   ├── test/
│   └── package.json
├── web/                    React + Vite
│   ├── src/{pages,components,assets}, api.js, main.jsx
│   ├── tests/              Playwright E2E (CLI)
│   └── package.json
├── extension/              Chrome MV3 vanilla JS
│   ├── manifest.json, background.js, popup.html, popup.js, icons/
├── docs/                   PRD, ERD, DevDoc, Work Plan + this file
└── .claude/                Project memory + slash commands + hooks
```

### Database Schema — 13 tables (TB-01..TB-13)
See [ERD §5](AutoClock_ERD.md) for the full ER diagram + Mermaid source. Tables: `users`, `teams`, `projects`, `jira_tasks`, `worklog_entries`, `user_connections`, `eod_reports`, `reminder_runs`, `reminder_recipients`, `leave_days`, `settings`, `audit_log`, **`external_writes`** (idempotent sync ledger — ADR-09). DDL lives in `backend/schema.sql`. WAL mode enabled in `backend/db.js`.

### API Endpoints — 23 endpoints (EP-01..EP-23)
All JSON over HTTPS; sessions enforced; RBAC checked server-side. See [ERD §6](AutoClock_ERD.md) for the full table. Stub route files live under `backend/routes/` and are wired to `backend/server.js` from Hr 1 of HackFest.

Critical endpoint: **`POST /api/day/close` (EP-13)** is **idempotent** per `(user_id, work_date)` via the `external_writes` ledger (TB-13).

### Auth & RBAC
- **Sign-in:** Google Workspace OIDC (ADR-10) — `users.google_sub` is the identity.
- **Per-user API tokens:** Jira OAuth 3LO (ADR-01) + Google OAuth — stored encrypted (AES-256-GCM) in `user_connections`.
- **RBAC:** 5 roles (`employee`, `pm_lead`, `management`, `operations`, `admin`) — middleware checks every endpoint.
- **Matrix:** see [ERD §8](AutoClock_ERD.md).

### Testing Strategy
- **Unit:** `services/parser.js` against the durations from DevDoc §11 (`30m`, `1h`, `1.5h`, `1h 30m`, `90`, `90 min`, `2 hrs`).
- **Integration:** Each external service (`jira.js`, `sheets.js`, `gmail.js`) standalone-tested with one real call before wiring into EP-13.
- **E2E:** Playwright via CLI. Tests live under `web/tests/`. Run via `npx playwright test`. **Never Playwright MCP.**
- **QA gate:** Yogesh runs the full employee flow on the demo laptop — happy path + one error path — every phase.

### Deployment
Self-hosted on an Iksula internal Linux server (ADR-03). Backend under **PM2**. Static web assets built with Vite and served by Express. Extension force-installed via Google Workspace Admin Console for the 60 users (M1, ADR-06). HTTPS via internal cert or Let's Encrypt. Nightly SQLite file backup.

### Third-Party Integrations (all free / Iksula-owned)
| Integration | Used for | Auth | Free? |
|---|---|---|---|
| Jira Cloud REST API | Write worklogs (EP-13); read all worklogs (EP-23) | Basic API token (M0) → OAuth 3LO (M1) | ✅ Included in Iksula Jira |
| Google Sheets API | Append timesheet row | OAuth 2.0 (per-user) | ✅ Included in Google Workspace |
| Gmail API | Create EOD draft | OAuth 2.0 (per-user, `gmail.compose` restricted scope, **Internal** consent screen) | ✅ Included in Google Workspace |
| Google OIDC | App sign-in | OAuth 2.0 | ✅ Included in Google Workspace |

**Atlassian Org Admin API key:** optional and only for the Admin console roster import — cannot read Jira worklogs (ADR-08).

---

*See @docs/AutoClock_PRD.md, @docs/AutoClock_ERD.md, @docs/AutoClock_DevDoc.md, @docs/AutoClock_WorkPlan.md for full detail.*

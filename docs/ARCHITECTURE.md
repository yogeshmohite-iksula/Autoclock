# AutoClock — Architecture

> **System overview:** Two thin clients (Chrome extension + React web app) → one backend (Node + Express + SQLite WAL, self-hosted on an Iksula server with PM2) → three downstream systems (Jira, Google Sheets, Gmail). All free; nothing serverless.

---

## 1. System Diagram

```
┌─────────────────────────┐      ┌─────────────────────────┐
│  CHROME EXTENSION (MV3)  │      │   WEB APP (React+Vite)  │
│  popup · reminders ·     │      │  log · 5 role dashboards │
│  chrome.alarms/storage   │      │                         │
└────────────┬────────────┘      └────────────┬────────────┘
             │        HTTPS / REST / JSON      │
             └────────────────┬────────────────┘
                              ▼
   ┌────────────────────────────────────────────────────┐
   │   AUTOCLOCK BACKEND  (Node + Express, self-hosted)  │
   │   • Auth + RBAC + per-user OAuth token store        │
   │   • Free deterministic parser                       │
   │   • Sync orchestrator (Jira · Sheets · Gmail)       │
   │   • node-cron (Fri/Mon compliance chase)            │
   │   • SQLite (WAL mode), PM2 process manager          │
   └───────┬───────────────┬───────────────┬─────────────┘
           ▼               ▼               ▼
   Jira Cloud API   Google Sheets API   Gmail API
   (per-user token) (per-user token)   (per-user token)
           │
   Clockwork Lite reads native Jira worklogs and displays them.
```

## 2. Backend Architecture
- **`server.js`** — Express app entry; mounts middleware (session, RBAC, body parser) and route files.
- **`db.js`** — `better-sqlite3` connection with `journal_mode = WAL`. Loads `schema.sql` on first boot.
- **`auth/`**
  - `session.js` — signed HTTP-only cookie sessions.
  - `rbac.js` — role-check middleware (`requireRole(['admin'])`).
  - `jiraOAuth.js` / `googleOAuth.js` — per-user 3LO flows (M1).
- **`routes/`** — one router per concern; one file per EP-group:
  - `auth.js` (EP-01..EP-05)
  - `projects.js` (EP-06, EP-07)
  - `entries.js` (EP-08..EP-11)
  - `day.js` (EP-12 preview, EP-13 close — idempotent)
  - `dashboard.js` (EP-14, EP-15)
  - `ops.js` (EP-16..EP-18, EP-23)
  - `admin.js` (EP-19..EP-22)
- **`services/`**
  - `parser.js` — free deterministic duration + tidy + group-by-ticket (no paid AI).
  - `jira.js` — `POST /rest/api/3/issue/{key}/worklog` (DevDoc §6.1).
  - `sheets.js` — `spreadsheets.values.append` (DevDoc §6.3).
  - `gmail.js` — `users.drafts.create` (DevDoc §6.4).
  - `crypto.js` — AES-256-GCM, `iv:authTag:ciphertext` (DevDoc §6.6).
  - `sync.js` — idempotent EP-13 orchestrator via `external_writes` (DevDoc §6.8).
  - `worklogSync.js` — EP-23 reader-account bulk pull (stretch).
- **`jobs/compliance.js`** — `node-cron` `0 13 * * 5` (Fri) and `0 13 * * 1` (Mon).

## 3. Data Flow — Close My Day (EP-13)
```
[User clicks Confirm]
       │
       ▼
EP-12 /api/day/preview ─── parser.groupByTicket(entries) ──► UI shows preview
       │
       ▼
EP-13 /api/day/close  (idempotent, keyed on user_id+work_date)
       │
       ├─► for each (entry, system) check external_writes (TB-13):
       │     • status='synced' → SKIP
       │     • status='failed'|'pending' → RETRY
       │
       ├─► jira.createWorklog(entry)  → external_id = jira_worklog_id
       ├─► sheets.appendRow(group)    → external_id = sheet range
       └─► gmail.createDraft(html)    → external_id = draft_id
              ▼
       Update TB-13 status='synced'|'failed'; store external_id
              ▼
       Return per-system result object (PRD §7 Flow B)
```

**Why idempotent matters:** a double-click, refresh, or retry never duplicates a worklog/row/draft (ADR-09).

## 4. Frontend Architecture
- **`web/src/pages/`** — Log (employee), Preview, Dashboard (PM scope = M0; Mgmt scope = M1), Ops, Admin.
- **`web/src/components/`** — DropdownProject, DropdownTask, EntryRow, TodayList, PreviewTable, KpiCard, etc.
- **`web/src/api.js`** — `fetch` wrapper with credentials + base URL from `VITE_API_BASE_URL`.
- **Routing:** React Router v6.
- **State:** local + URL params for M0; if anything cross-page is needed, lift to a single Zustand-style store later.

## 5. Extension Architecture
- **`manifest.json`** — MV3, permissions `alarms`, `notifications`, `storage`; `host_permissions` for backend.
- **`background.js`** — service worker; **registers `chrome.alarms` listener at the top level** (MV3 rule). Never `setInterval`.
- **`popup.html` + `popup.js`** — same backend client as the web app.

## 6. Database Schema (TB-01..TB-13)
Full ER diagram + Mermaid source in [AutoClock_ERD.md §5](AutoClock_ERD.md). DDL in [backend/schema.sql](../backend/schema.sql). **TB-13 `external_writes`** is the durable idempotent-sync ledger introduced per ADR-09.

## 7. API Architecture
- REST + JSON, sessions in HTTP-only cookies.
- Server-side RBAC on every endpoint (`requireRole(...)`).
- 23 endpoints — see [AutoClock_ERD.md §6](AutoClock_ERD.md) for the table. Frozen at Hr 1 of HackFest.
- Errors: structured `{ error: { code, message } }`. 4xx for client; 5xx for server.

## 8. Deployment Architecture (ADR-03)
- Iksula internal Linux server (existing — confirm hostname in OQ-2).
- Node 18+. `pm2 start server.js --name autoclock`. `pm2 startup && pm2 save`.
- Vite-built static assets served by the same Express process under `/`.
- HTTPS via internal CA or Let's Encrypt.
- Nightly `cp autoclock.db backups/autoclock-$(date +%F).db` via cron.
- **Never Vercel/serverless** — SQLite needs persistent disk, cron needs an always-on process.

## 9. Security Architecture
- AES-256-GCM token encryption (DevDoc §6.6).
- Server-side RBAC (ERD §8).
- HTTPS only.
- Secrets in `.env` (gitignored, .env.example provided).
- `gitleaks` config at repo root.
- Pre-tool-use `check-secrets.sh` hook blocks accidental leaks.

## 10. Observability (lightweight, sized for 60 users)
- **Logs:** PM2 stdout/stderr → `~/.pm2/logs/`. Structured `{ ts, level, msg, meta }`.
- **Audit log:** every Claude tool call appended to `.claude/audit.jsonl` (gitignored).
- **DB audit:** TB-12 `audit_log` records admin actions + syncs.
- **SLI/SLO:** API p95 < 500 ms locally; EOD sync (8 entries) < 10 s. See [ERD §9](AutoClock_ERD.md).

---

*Architecture decisions live in [AutoClock_ERD.md §4 — ADR-01..ADR-11](AutoClock_ERD.md). Read those before changing anything load-bearing.*

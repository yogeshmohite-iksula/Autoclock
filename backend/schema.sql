-- =============================================================================
-- AutoClock — DB Schema (SQLite, WAL mode)
-- Tables TB-01..TB-13 per ERD §5. Run automatically on first boot via db.js.
-- =============================================================================

PRAGMA foreign_keys = ON;

-- TB-02 teams (created first because TB-01 users references it)
CREATE TABLE IF NOT EXISTS teams (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL UNIQUE,
  lead_user_id    INTEGER,                                   -- FK → users(id) — set after seed
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- TB-01 users — all AutoClock users; role drives RBAC; google_sub is OIDC identity
CREATE TABLE IF NOT EXISTS users (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  name                 TEXT NOT NULL,
  email                TEXT NOT NULL UNIQUE,
  google_sub           TEXT UNIQUE,                          -- ADR-10 — Google OIDC subject
  role                 TEXT NOT NULL CHECK (role IN ('employee','pm_lead','management','operations','admin')),
  team_id              INTEGER REFERENCES teams(id),
  onboarding_status    TEXT NOT NULL DEFAULT 'invited' CHECK (onboarding_status IN ('invited','active','connected')),
  sheet_id             TEXT,                                 -- per-user Google Sheet ID (ERD §14.3)
  sheet_range          TEXT,                                 -- e.g. "May 2026!A:C"
  eod_recipient_email  TEXT,                                 -- per-user lead email
  is_active            INTEGER NOT NULL DEFAULT 1,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- TB-03 projects — mapped to a Jira project key; powers project dropdown
CREATE TABLE IF NOT EXISTS projects (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  jira_project_key  TEXT NOT NULL UNIQUE,                    -- PIM, ML, CUMI, INTERNAL, BENCH
  lead_user_id      INTEGER REFERENCES users(id),
  is_active         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- TB-04 jira_tasks — cached Jira issues per project; powers dependent dropdown
CREATE TABLE IF NOT EXISTS jira_tasks (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id          INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jira_key            TEXT NOT NULL UNIQUE,                  -- PIM-3073, ML-1045
  summary             TEXT,
  assignee_account_id TEXT,                                  -- ERD §14.2 — M1 JQL refresh
  status              TEXT,
  issue_type          TEXT,
  updated_at          TEXT,
  is_active           INTEGER NOT NULL DEFAULT 1,
  last_synced_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_jira_tasks_project ON jira_tasks(project_id, is_active);

-- TB-05 worklog_entries — the core table; one row per logged slot
CREATE TABLE IF NOT EXISTS worklog_entries (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  project_id       INTEGER NOT NULL REFERENCES projects(id),
  jira_task_id     INTEGER NOT NULL REFERENCES jira_tasks(id),
  description      TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  slot_start       TEXT NOT NULL,                            -- "HH:MM"
  slot_end         TEXT NOT NULL,                            -- "HH:MM"
  work_date        TEXT NOT NULL,                            -- "YYYY-MM-DD"
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','synced','failed')),
  jira_worklog_id  TEXT,                                     -- filled after successful Jira write
  error_message    TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_worklog_entries_user_date ON worklog_entries(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_worklog_entries_status ON worklog_entries(status);

-- TB-06 user_connections — encrypted per-user OAuth tokens (ADR-01)
CREATE TABLE IF NOT EXISTS user_connections (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL CHECK (provider IN ('jira','google')),
  access_token_enc    TEXT NOT NULL,                         -- iv:authTag:ciphertext (AES-256-GCM)
  refresh_token_enc   TEXT,                                  -- same format
  expires_at          TEXT,
  scope               TEXT,
  connected_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, provider)
);

-- TB-07 eod_reports — one row per user per day
CREATE TABLE IF NOT EXISTS eod_reports (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  work_date       TEXT NOT NULL,
  gmail_draft_id  TEXT,
  sheet_appended  INTEGER NOT NULL DEFAULT 0,                -- 0 / 1
  status          TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','partial','failed')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, work_date)
);

-- TB-08 reminder_runs — Ops Fri/Mon chase records
CREATE TABLE IF NOT EXISTS reminder_runs (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  run_type             TEXT NOT NULL CHECK (run_type IN ('friday','monday','manual')),
  run_at               TEXT NOT NULL DEFAULT (datetime('now')),
  triggered_by         TEXT NOT NULL CHECK (triggered_by IN ('cron','manual')),
  recipients_count     INTEGER NOT NULL DEFAULT 0,
  created_by_user_id   INTEGER REFERENCES users(id)
);

-- TB-09 reminder_recipients — who was chased in each run
CREATE TABLE IF NOT EXISTS reminder_recipients (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_run_id   INTEGER NOT NULL REFERENCES reminder_runs(id) ON DELETE CASCADE,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  week_hours        REAL,
  hours_short       REAL,
  email_status      TEXT NOT NULL CHECK (email_status IN ('sent','failed')),
  result            TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('complied','pending','escalated'))
);

-- TB-10 leave_days — approved leave; reduces weekly target (FR-17)
CREATE TABLE IF NOT EXISTS leave_days (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id              INTEGER NOT NULL REFERENCES users(id),
  leave_date           TEXT NOT NULL,
  leave_type           TEXT NOT NULL CHECK (leave_type IN ('holiday','sick','pto')),
  hours                REAL NOT NULL DEFAULT 8,
  created_by_user_id   INTEGER REFERENCES users(id),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, leave_date)
);

-- TB-11 settings — global config
CREATE TABLE IF NOT EXISTS settings (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  key                  TEXT NOT NULL UNIQUE,
  value                TEXT NOT NULL,
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by_user_id   INTEGER REFERENCES users(id)
);

-- TB-12 audit_log — who changed what
CREATE TABLE IF NOT EXISTS audit_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id   INTEGER REFERENCES users(id),
  action          TEXT NOT NULL,
  target_type     TEXT,
  target_id       INTEGER,
  detail          TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id, created_at);

-- TB-13 external_writes — IDEMPOTENT SYNC LEDGER (ADR-09, DevDoc §6.8)
-- One row per (worklog_entry × target system). Drives idempotent "Close My Day",
-- per-system retry, and partial-failure reporting.
CREATE TABLE IF NOT EXISTS external_writes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  worklog_entry_id    INTEGER NOT NULL REFERENCES worklog_entries(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id),
  work_date           TEXT NOT NULL,
  system              TEXT NOT NULL CHECK (system IN ('jira','sheet','gmail')),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','synced','failed')),
  external_id         TEXT,                                  -- jira worklog id / sheet range / draft id
  attempt_count       INTEGER NOT NULL DEFAULT 0,
  last_error          TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_writes_unique ON external_writes(worklog_entry_id, system);
CREATE INDEX IF NOT EXISTS idx_external_writes_user_date ON external_writes(user_id, work_date);

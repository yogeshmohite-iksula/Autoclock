---
paths:
  - "backend/db.js"
  - "backend/schema.sql"
  - "backend/services/sync.js"
  - "backend/migrations/**"
---
# Database Rules

- SQLite is the chosen store (ADR-04). WAL mode is enabled in `db.js`. PostgreSQL is a documented free upgrade path for a future >100-user scale — do not migrate now.
- The schema lives in `backend/schema.sql`. **Tables `TB-01..TB-13` are canonical** — adding a column is fine; renaming/dropping requires a migration script and a CHANGELOG entry.
- **TB-13 `external_writes` is load-bearing** — it is the idempotency guarantee for EP-13 (ADR-09). Never:
  - drop the `UNIQUE (worklog_entry_id, system)` index;
  - write to Jira / Sheets / Gmail outside of `services/sync.syncOne`;
  - mark a row `synced` without storing the returned `external_id`.
- All FK relationships use `ON DELETE CASCADE` only where the child is meaningless without the parent (e.g. `external_writes` follows the entry).
- Token columns in `user_connections` are AES-256-GCM ciphertext (`iv:authTag:ct`, base64, colon-separated). Never store plain text.
- Nightly backup is just `cp autoclock.db backups/autoclock-$(date +%F).db`. Don't introduce dump tools.
- NEVER `DROP TABLE` or `TRUNCATE` in production — the pre-tool-use hook will block it anyway.

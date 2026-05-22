---
paths:
  - "backend/routes/**"
  - "backend/services/**"
---
# Backend API Rules

- Every endpoint validates its inputs **before** any side-effect (DevDoc §4.4).
- Every endpoint enforces RBAC server-side via `requireRole(...)`. Never trust the client role.
- Every endpoint returns structured errors: `{ error: { code, message } }` with `4xx` for client / `5xx` for server.
- **`POST /api/day/close` (EP-13) MUST stay idempotent** per `(user_id, work_date)` via the `external_writes` ledger (TB-13, ADR-09). Never bypass `services/sync.syncOne`.
- IST → UTC: every Jira write goes through `parser.toJiraStarted` so `started` carries `+0530`.
- Never log secrets or token bodies. Log endpoint, status, duration.
- Never call Clockwork's API — Clockwork displays native Jira worklogs automatically (ADR-05).
- The API contract (ERD §6) is **frozen** — additions are fine; renames/breaking changes require team agreement.

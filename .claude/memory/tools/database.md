# Database: SQLite (WAL mode)
- Library: `better-sqlite3` (synchronous, fastest for our shape).
- Migration tool: none yet — schema.sql is canonical; future migrations go in `backend/migrations/NNNN-*.sql`.
- WAL gotchas: long transactions hold the writer lock; keep them short. `SQLITE_BUSY` → reduce transaction scope, not retry.

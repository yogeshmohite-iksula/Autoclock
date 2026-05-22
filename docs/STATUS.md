# AutoClock — Project Status

**Last updated:** 2026-05-22 (project scaffold complete)

---

## Current Milestone: **M0 — HackFest (Phase 0 setup)**

### Completed
- [x] PRD finalized (FR-01..FR-23, OQ-1..OQ-6)
- [x] ERD finalized (ADR-01..ADR-11, TB-01..TB-13, EP-01..EP-23)
- [x] Dev Doc finalized (env vars, parser, integrations, idempotent sync)
- [x] Work Plan finalized (per-person swimlanes)
- [x] Build plan reviewed and approved
- [x] Repository scaffolded (backend/, web/, extension/, docs/, .claude/)
- [x] API contract stubs registered (EP-01..EP-23)
- [x] DB schema written (TB-01..TB-13 in `backend/schema.sql`)
- [x] `.env.example` enumerated (no real secrets)
- [x] `.gitignore`, `.gitleaks.toml`, CLAUDE.md, README.md, docs/* in place

### In Progress
- [ ] **OQ-1** Jira classic token generated + tested (Tejas + Yogesh)
- [ ] **OQ-2** Iksula server confirmed + Node 18+ installed (Tejas)
- [ ] **OQ-3** Real Google Sheet structure captured (Ravi)
- [ ] **OQ-4** Real EOD email template captured (Yogesh)
- [ ] **OQ-6** Google Cloud project + Internal consent screen + demo refresh token (Ravi)

### Upcoming (M0 Hr 0–18)
- [ ] Phase 0 setup (Hr 0–1)
- [ ] Phase 1 foundations (Hr 1–5)
- [ ] Phase 2 core flow (Hr 5–9) — **Hr 9 gate: one real Jira worklog posted**
- [ ] Phase 3 integration (Hr 9–13) — **Hr 12 gate: extension if core solid**
- [ ] Phase 4 hardening + QA (Hr 13–16)
- [ ] Phase 5 demo prep (Hr 16–18)

### Blocked (not blockers for M0)
- **OQ-5** Leave/holiday data source — M1 only, deferred.

---

## Definition of Done — HackFest

- Works end-to-end on the demo laptop (not just a dev machine).
- Uses only free tools (Tejas zero-cost audit at Hr 16).
- Yogesh QA-tested happy path **and** one error path (e.g., 403 on a ticket).
- Committed to `main`. Yogesh is the sole merger.

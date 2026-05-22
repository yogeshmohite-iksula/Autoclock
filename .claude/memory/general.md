# General Project Memory

## Project: AutoClock
## Stack: Node 18 + Express + SQLite (WAL) · React + Vite · Chrome MV3 vanilla JS · node-cron · PM2
## Database: SQLite (WAL mode) — 13 tables (TB-01..TB-13)
## Goal Type: Production (internal Iksula tool, ~60 daily users post-HackFest)

## Key Decisions Made at Setup
- 2026-05-22: Self-host on Iksula internal server with PM2 (ADR-03) — NOT Vercel/serverless; SQLite needs persistent disk and `node-cron` needs an always-on process.
- 2026-05-22: SQLite WAL chosen over PostgreSQL (ADR-04) — 60 users fits comfortably; Postgres remains a free upgrade path.
- 2026-05-22: Per-user OAuth, never a shared bot account (ADR-01) — Jira worklogs are attributed to the calling token's owner.
- 2026-05-22: Free deterministic parser, no paid AI (ADR-02) — zero cost is a hard rule (GM-05).
- 2026-05-22: Idempotent EP-13 via `external_writes` ledger TB-13 (ADR-09) — protects against double-click / refresh duplicates.
- 2026-05-22: Sign-in via Google Workspace OIDC (ADR-10) — no passwords stored.
- 2026-05-22: Hackathon demo uses a **classic** Jira API token (ADR-11) — not scoped, no cloudId needed.
- 2026-05-22: Playwright via **CLI** only (`npx playwright test`) — never the Playwright MCP.

## Constraints (from PRD)
- **C-1 (hard):** Zero cost. No paid SaaS, paid API, paid hosting, per-user licence.
- **C-2 (hard):** Built for ~60 real daily users at Iksula.
- **C-3:** HackFest M0 build window is 18 hours.
- **C-4:** Iksula already owns Jira + Google Workspace — AutoClock adds no new subscription.

## Risky Assumptions to Validate Early
- **Technical:** Friday-morning Jira classic tokens will not expire mid-demo Saturday; demo user has *Browse Projects* + *Work On Issues* on PIM/ML/CUMI. Mitigated by P-1 (Tejas POSTs one test worklog before Hr 0).
- **Technical:** Google "Internal" OAuth consent screen exempts the Cloud project from `gmail.compose` restricted-scope verification. Mitigated by P-4 (Ravi captures + tests a demo refresh token before Friday).
- **Timeline:** 18 hours is enough to ship M0 end-to-end on real Jira + Sheets + Gmail. Mitigated by phase gates at Hr 9 and Hr 12 and a backup demo video by Hr 16.

## Owner & Workflow
- Yogesh owns `main` — **sole merger**. Teammates open PRs from `feat/backend`, `feat/jira-sync`, `feat/frontend`, `feat/extension`.

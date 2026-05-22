# AutoClock

> **One-Click Daily Worklog & EOD Reporter** — Iksula HackFest 2026
> Log your day once → posts Jira worklogs, appends the Google Sheet timesheet, and drafts the EOD email.
> Zero running cost. Built for ~60 daily users.

---

## Tech Stack

| Component | Technology | Why |
|---|---|---|
| Backend | Node 18+ + Express | Free, async-friendly |
| Database | SQLite (WAL mode) via `better-sqlite3` | Zero ops, fits 60 users (ADR-04) |
| Frontend | React 18 + Vite | Fast dev loop |
| Charts | Chart.js | MIT, free |
| Extension | Chrome MV3 (vanilla JS) | `chrome.alarms` survives sleep |
| Scheduler | `node-cron` | Fri/Mon compliance chase |
| Process manager | PM2 | Auto-restart, free |
| E2E tests | **Playwright CLI** (NOT MCP) | Deterministic browser tests |
| Hosting | Self-host on Iksula internal server | ADR-03 — never serverless |

**Everything is free or already-owned.** No paid SaaS, no per-user licence, no cloud bill.

## Prerequisites

- Node 18+ and npm
- Git
- A Jira **classic** API token (Yogesh's, for the demo) — see [docs/AutoClock_DevDoc.md §3](docs/AutoClock_DevDoc.md)
- A Google Cloud project with the OAuth consent screen set to **Internal**

## Quick Start

```bash
# 1. Install
cd backend && npm install
cd ../web && npm install
cd ..

# 2. Configure
cp .env.example backend/.env       # then fill in values
# .env is git-ignored — never commit a populated copy

# 3. Run backend (port 4000)
cd backend && npm run dev

# 4. Run web (port 5173)
cd ../web && npm run dev

# 5. Load extension (Chrome → chrome://extensions → Developer mode → Load unpacked → /extension)
```

## Repository Layout

```
autoclock/
├── backend/           Node + Express + SQLite (WAL)
│   ├── server.js
│   ├── db.js + schema.sql      (TB-01..TB-13)
│   ├── auth/                   (session, RBAC, OAuth)
│   ├── routes/                 (EP-01..EP-23)
│   ├── services/               (parser, jira, sheets, gmail, crypto, sync)
│   └── jobs/                   (node-cron Fri/Mon)
├── web/               React + Vite — 5 role dashboards
├── extension/         Chrome MV3 — daily logging surface
├── docs/              PRD, ERD, DevDoc, Work Plan — single source of truth
└── .claude/           Project memory + slash commands + hooks
```

## Documentation (single source of truth — read first)

- [Master Brainstorm](docs/brainstorm.md) — concept + 3-credential Jira model (§7.1)
- [PRD](docs/AutoClock_PRD.md) — FR-01..FR-23, OQ-1..OQ-6, milestone mapping
- [ERD](docs/AutoClock_ERD.md) — ADR-01..ADR-11, tables TB-01..TB-13, endpoints EP-01..EP-23
- [Dev Doc](docs/AutoClock_DevDoc.md) — env vars, parser logic, integration how-tos
- [Work Plan](docs/AutoClock_WorkPlan.md) — 18-hour plan + per-person swimlanes
- [Project Spec (generated)](docs/PROJECT_SPEC.md)
- [Architecture (generated)](docs/ARCHITECTURE.md)
- [Milestones (generated)](docs/MILESTONES.md)
- [Status (generated)](docs/STATUS.md)
- [Security policy (generated)](docs/SECURITY.md)
- [Changelog (generated)](docs/CHANGELOG.md)

## Available Scripts

| Where | Command | What |
|---|---|---|
| `backend/` | `npm run dev` | Start Express on `:4000` with auto-reload |
| `backend/` | `npm start` | Production server |
| `backend/` | `npm test` | Backend tests (Node test runner) |
| `web/` | `npm run dev` | Vite dev server on `:5173` |
| `web/` | `npm run build` | Production build → `web/dist/` |
| `web/` | `npm test` | Playwright E2E (CLI — never MCP) |

## Team & Branches

Yogesh owns `main` and is the **only person who merges**. Everyone else opens PRs.

| Person | Swimlane | Feature branch |
|---|---|---|
| Tejas | Infra / DevOps | `feat/backend` (deploy bits) |
| Keval | Backend Core | `feat/backend`, `feat/jira-sync` |
| Yogesh | Parser / QA | `feat/backend` (parser), QA on all |
| Ravi | Google Integration | `feat/jira-sync` (Sheet + Gmail) |
| Ali | UI / Presentation | `feat/frontend`, `feat/extension` |

## Roadmap

- **M0 — HackFest (18h):** Employee flow end-to-end + one dashboard on demo user's token.
- **M1 — Pilot (2–4 weeks):** Per-user OAuth, all 5 role consoles, Fri/Mon cron, leave calendar, 60 users onboarded.
- **Stretch:** Chrome extension + EP-23 worklog read-sync — only if M0 core is solid by Hr 12.

See [docs/MILESTONES.md](docs/MILESTONES.md) for full detail.

## License

Internal Iksula tool — not open-source.

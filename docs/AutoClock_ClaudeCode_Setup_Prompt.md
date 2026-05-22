# AutoClock — Claude Code Setup Prompt

**Purpose:** a paste-ready prompt that makes Claude Code (a) build a project plan from your
five planning docs, then (b) scaffold the repo using the Tech-project-forge skill, with
Playwright wired as a **CLI** (not MCP) from the start.

## How to use it

1. Clone the repo and make sure all five planning docs are committed under `docs/`:
   `brainstorm.md`, `AutoClock_PRD.md`, `AutoClock_ERD.md`, `AutoClock_DevDoc.md`,
   `AutoClock_WorkPlan.md`.
2. Open **Claude Code inside the cloned `autoclock` folder**.
3. Paste the prompt block below as your first message.
4. Claude Code will **plan first and stop** — review the plan, then type `go` to let it set
   the project up.

The prompt is deliberately two-stage so **you stay the decision-maker**: nothing gets built
until you approve the plan.

---

## THE PROMPT (copy everything between the lines)

---

```
You are helping set up the AutoClock project repository for Iksula HackFest 2026.
AutoClock is an internal tool: an employee logs their workday once, and it fans out
to (1) Jira worklogs, (2) a Google Sheet timesheet, and (3) a Gmail end-of-day draft.

=== READ FIRST — THE DOCS ARE THE SOURCE OF TRUTH ===
Before doing ANYTHING, read every file in the docs/ folder:
- docs/brainstorm.md         master concept; three-credential Jira model in section 7.1
- docs/AutoClock_PRD.md      requirements FR-01..FR-23, open questions OQ-1..OQ-6,
                             milestone mapping (M0 / M1 / stretch)
- docs/AutoClock_ERD.md      ADR-01..ADR-11, tables TB-01..TB-13, endpoints EP-01..EP-23
- docs/AutoClock_DevDoc.md   env vars, parser logic, Jira + Google integration detail
- docs/AutoClock_WorkPlan.md the 18-hour plan and per-person swimlanes
These five documents are the single source of truth. Do NOT invent requirements,
rename entities, or change the API contract. If anything is unclear or contradictory,
list it as a question for me — do not guess.

=== TWO HARD RULES (these override every other instruction) ===
1. ZERO COST. Use only free or already-owned tools. No paid SaaS, no paid API, no paid
   hosting, no per-user licence. If any step would cost money, STOP and ask me first.
2. This is built for ~60 real daily users at Iksula after the hackathon — it is NOT a
   throwaway demo. Make production-sane choices (input validation, error handling,
   idempotent external writes per TB-13, encrypted tokens per DevDoc section 6.6).

=== DEPLOYMENT TARGET ===
Self-host on an Iksula internal server, exactly as ERD ADR-03 specifies:
Node + Express + SQLite (WAL mode) + node-cron, kept alive with PM2.
Do NOT target Vercel or any serverless platform. SQLite needs a persistent disk,
node-cron needs an always-on process, and serverless free tiers are licensed for
non-commercial use only — none of that fits a 60-user internal tool. Keep every
deploy script, README instruction, and config pointed at self-hosting.

=== MY ROLE AND THE TEAM ===
I (Yogesh) own the GitHub repo and am the ONLY person who merges to `main`.
Five teammates work on feature branches and open Pull Requests for me to review:
- Tejas  — Infra / DevOps (server, PM2, deployment)
- Keval  — Backend Core (Express, SQLite, sync engine)
- Yogesh — Parser / QA (the day-log parser, Playwright tests)
- Ravi   — Google integration (Sheet timesheet, Gmail draft, Apps Script)
- Ali    — UI / Presentation (React dashboard, Chrome extension UI)
Set the project up so this parallel workflow is natural.

=== STAGE 1 — PLAN ONLY (write NO code yet) ===
Enter plan mode. Produce a phased build plan that:
- maps each piece of work to the five swimlanes above,
- sequences the work by milestone: M0 (must-demo) -> M1 (should-have) -> stretch,
- freezes the API contract (endpoints EP-01..EP-23) up front so swimlanes can build
  in parallel without colliding,
- lists every external credential the build needs (Jira tokens, Google OAuth, etc.)
  and confirms each one is zero-cost,
- surfaces the open questions OQ-1..OQ-6 from the PRD that still need a decision
  from me.
Present the plan and WAIT for my approval. Do not begin Stage 2 until I reply "go".

=== STAGE 2 — PROJECT SETUP (only after I approve) ===

1. USE THE TECH-PROJECT-FORGE SKILL.
   Install it per its README: npx skills add yogeshcodeshare/Tech-project-forge-skill -y -g
   Then trigger it ("Set up my project" / "tech-project-forge"). It reads the PRD + ERD
   and runs its automated setup steps against this repo.

2. PLAYWRIGHT — CLI, NOT MCP. THIS IS A HARD OVERRIDE.
   The Tech-project-forge skill defaults to Playwright MCP. Do NOT use the MCP.
   Install and use the Playwright CLI / test runner from the very start:
     npm init playwright@latest    (in the relevant package)
     npx playwright test           (to run E2E tests)
   Do not install, configure, or reference Playwright MCP at any point. All end-to-end
   tests must run through the Playwright CLI and its test runner.

3. SCAFFOLD THE MONOREPO exactly as Dev Doc section 1:
     autoclock/
       backend/      Node + Express, SQLite
       web/          React + Vite
       extension/    Chrome MV3 (vanilla JS)
       docs/         already populated — leave it untouched
       .env.example  variable NAMES only, blank values
       README.md
   Wire the API contract (EP-01..EP-23) and DB schema (TB-01..TB-13) as defined in
   the ERD. Set up the env vars listed in DevDoc section 3 in .env.example.

4. SECRETS HYGIENE.
   .gitignore must cover: .env, node_modules/, *.db, *.sqlite, build outputs, and any
   coverage/ or test-results/ folders. Commit ONLY .env.example with blank values.
   NEVER commit a real token, key, or secret.

5. GIT WORKFLOW.
   `main` stays always-demoable and is protected. Create these feature branches:
   feat/backend, feat/jira-sync, feat/frontend, feat/extension.
   Convention: small, frequent commits -> Pull Request into `main` -> I review and merge.
   Do not push directly to `main`.

=== WHEN DONE ===
Summarize: what was created, what each of the five swimlanes should pick up first, and
any open questions that still need my decision. Do NOT deploy anything — stop after setup.
```

---

## Notes for you (not part of the prompt)

- **Two-stage by design.** Claude Code shows you the plan and pauses. You approve before
  any code is written — you remain the decision-maker, consistent with you being the sole
  merger to `main`.
- **Playwright CLI override is explicit.** The Tech-project-forge skill ships with
  Playwright MCP as its default; the prompt overrides that to the CLI in two places so it
  can't be missed.
- **Vercel is deliberately excluded.** The prompt locks the deploy target to a self-hosted
  Iksula server, matching ERD ADR-03 and the zero-cost rule. See the deployment note in
  the chat — Vercel cannot host the SQLite + node-cron backend and its free tier is
  non-commercial only.
- **Run it inside the repo.** Open Claude Code with the cloned `autoclock` folder as the
  working directory, after the five docs are committed to `docs/`, so the skill can read
  the PRD and ERD.
- **Each teammate runs their own Claude Code** with their own GitHub PAT — never share one
  token. Branch protection on `main` is what keeps you as the only merger.

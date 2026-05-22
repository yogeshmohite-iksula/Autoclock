---
description: Show what each AutoClock swimlane should pick up next, derived from STATUS.md + open OQs + branch state.
---
Print a one-screen summary:

1. **Tejas** — infra/DevOps next step.
2. **Keval** — backend core next step.
3. **Yogesh** — parser/QA/log-screen next step.
4. **Ravi** — Google integration next step.
5. **Ali** — UI / extension next step.

Pull the work from:
- `docs/STATUS.md` "In Progress" + "Upcoming"
- `docs/MILESTONES.md` current milestone
- `docs/AutoClock_PRD.md` OQ-1..OQ-6 — flag any open questions blocking the swimlane.
- `git branch --no-merged main` — show in-flight branches.

Be specific (file paths, EP IDs). Do not invent work that is not in the docs.

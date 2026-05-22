---
description: Save learnings from the just-finished feature/session to project memory, and bump CHANGELOG.
---
Review what just happened in this session. For each kind of learning, append a date-stamped entry to the right file:

- Architecture decision → `.claude/memory/domain/architecture.md`
- Bug + fix          → `.claude/memory/domain/bugs.md`
- API design choice  → `.claude/memory/domain/api.md`
- DB / SQLite gotcha → `.claude/memory/tools/database.md`
- Stack gotcha (Node / Vite / Chrome MV3) → `.claude/memory/tools/stack.md`

Then update `docs/CHANGELOG.md` `[Unreleased]` with what shipped.

Print a short summary: X learnings saved, Y CHANGELOG lines added. Don't add anything you can't anchor to a concrete change in the diff or transcript.

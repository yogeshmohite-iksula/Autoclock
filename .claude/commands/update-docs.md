---
description: Update docs/CHANGELOG.md, docs/STATUS.md, and CLAUDE.md to reflect the current state of the repo. Idempotent — safe to re-run.
---
Use the `@changelog-updater` sub-agent to append to `docs/CHANGELOG.md`, then update `docs/STATUS.md`:

1. Move any line under "In Progress" that is now done to "Completed", with today's date.
2. Add anything newly started under "In Progress".
3. Update the "Last updated" header to today.
4. Print a short summary of what changed in STATUS.md; nothing more.

If `CLAUDE.md` references files that no longer exist, fix the link. Do not rewrite sections without an explicit instruction.

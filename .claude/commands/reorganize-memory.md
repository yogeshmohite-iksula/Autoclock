---
description: Clean up and reorganize all AutoClock project memory files. Run when any file in .claude/memory/ grows beyond 200 lines.
---
Read every file in `.claude/memory/`. Apply these cleanup rules:

1. Remove duplicate entries (keep the most recent date).
2. Remove outdated / superseded entries.
3. Merge entries about the same topic into one.
4. Split files larger than 200 lines into focused sub-files (e.g. `bugs-parser.md`, `bugs-jira.md`).
5. Re-sort entries by date within each file.
6. Update `.claude/memory/memory.md` to point at any new files.
7. Print a one-line summary: `X duplicates removed, Y merged, Z split`.

Do not invent content. Only re-organise what is already there.

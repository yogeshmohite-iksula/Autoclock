#!/bin/bash
# PreToolUse * hook — append one JSONL line per tool call to .claude/audit.jsonl (gitignored).
set -euo pipefail
INPUT=$(cat || echo "{}")
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "{\"ts\":\"$TS\",\"event\":$INPUT}" >> .claude/audit.jsonl 2>/dev/null || true
exit 0

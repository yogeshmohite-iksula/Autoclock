#!/bin/bash
# PreToolUse hook — blocks irreversible destructive operations.
# Receives a JSON event on stdin; exits 2 to deny, 0 to allow.
set -euo pipefail

INPUT=$(cat || echo "{}")
CMD=$(echo "$INPUT" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("command",""))' 2>/dev/null || echo "")

if echo "$CMD" | grep -qE 'rm -rf|rm -fr|--force|force-with-lease|DROP TABLE|TRUNCATE TABLE|drop database'; then
  echo "🚫 Blocked dangerous command: $CMD" >&2
  exit 2
fi
exit 0

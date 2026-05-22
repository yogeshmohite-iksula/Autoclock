#!/bin/bash
# PreToolUse Bash hook — scans the command for obvious live-secret patterns.
# Best-effort: if gitleaks isn't installed, fall back to a regex sniff.
set -euo pipefail

INPUT=$(cat || echo "{}")
CMD=$(echo "$INPUT" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("command",""))' 2>/dev/null || echo "")

# Fast deny: obviously-pasted live credentials in a command.
if echo "$CMD" | grep -qE 'ATATT[A-Za-z0-9_=-]{20,}|GOCSPX-[A-Za-z0-9_-]{20,}|github_pat_[A-Za-z0-9_]{40,}|ghp_[A-Za-z0-9]{36,}|1//[A-Za-z0-9_-]{40,}'; then
  echo "🚫 Live-credential pattern detected in command — refuse to run." >&2
  echo "   Rotate the secret and use env vars instead." >&2
  exit 2
fi

# Run gitleaks against staged content if available.
if command -v gitleaks >/dev/null 2>&1; then
  if echo "$CMD" | grep -qE '^git (commit|push)'; then
    gitleaks protect --staged --redact >/dev/null 2>&1 || {
      echo "🚫 gitleaks detected a secret in staged changes — fix before committing." >&2
      exit 2
    }
  fi
fi
exit 0

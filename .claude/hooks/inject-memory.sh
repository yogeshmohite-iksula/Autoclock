#!/bin/bash
# PreToolUse * hook — inject the memory index before tool calls so Claude stays grounded.
# Cheap (one cat). Index is intentionally short (under 100 lines).
set -euo pipefail
MEM=".claude/memory/memory.md"
if [ -f "$MEM" ]; then
  echo "=== PROJECT MEMORY ==="
  cat "$MEM"
  echo "====================="
fi
exit 0

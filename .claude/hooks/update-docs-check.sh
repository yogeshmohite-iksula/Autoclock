#!/bin/bash
# Stop hook — nudges Claude to run /update-docs when src changed without a CHANGELOG bump.
set -euo pipefail
if ! command -v git >/dev/null 2>&1; then exit 0; fi
SRC_CHANGED=$(git status --porcelain 2>/dev/null | grep -E ' (backend|web|extension)/' || true)
CL_CHANGED=$(git status --porcelain 2>/dev/null | grep -E ' docs/CHANGELOG\.md' || true)
if [ -n "$SRC_CHANGED" ] && [ -z "$CL_CHANGED" ]; then
  echo "ℹ src/ changed but docs/CHANGELOG.md untouched. Consider running /update-docs before commit."
fi
exit 0

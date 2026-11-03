#!/bin/sh
# Runs every copy-mode test; exits nonzero if any fails (printing its output).
# The nvim comparison (diff.mjs) needs nvim on PATH and is skipped without it.
set -e
dir=$(cd "$(dirname "$0")" && pwd)
cd "$dir"
sh build.sh
suites="unit regex searchline spans history wrap"
command -v nvim >/dev/null && suites="$suites diff" || echo "diff: skipped, nvim not found"
for t in $suites; do
  if out=$(node "$t.mjs" 2>&1); then
    printf '%-11s %s\n' "$t" "$(echo "$out" | grep -E 'passed|cases match|unexplained' | tr '\n' ' ')"
  else
    echo "$out"
    echo "FAILED: $t"
    exit 1
  fi
done

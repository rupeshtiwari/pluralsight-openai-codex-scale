#!/usr/bin/env bash
# Restore Module 1 to a clean, deterministic starting state.
# Requires no manual cleanup afterwards.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FMT="node ${ROOT}/scripts/fmt.mjs"
cd "$ROOT"

$FMT title "Module 1 reset" "Return the repository to the demo starting state"

# 1. Working tree
$FMT section "working tree"
# Count only what this script actually discards: tracked modifications, and
# untracked files inside the directories it cleans.
TRACKED=$(git diff --name-only | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard supporthub-api plans | wc -l | tr -d ' ')
if [ "$TRACKED" -gt 0 ] || [ "$UNTRACKED" -gt 0 ]; then
  git checkout -- . 2>/dev/null
  git clean -fd supporthub-api plans >/dev/null 2>&1
  $FMT item "reverted ${TRACKED} modified file(s), removed ${UNTRACKED} untracked file(s)"
else
  $FMT item "already clean"
fi

# 2. Staged changes left behind by a hunk-review demo
if [ -n "$(git diff --cached --name-only)" ]; then
  git reset -q
  $FMT item "unstaged previously staged changes"
fi

# 3. ExecPlans back to their start-state content
$FMT section "execplans"
for plan in plans/ExecPlan.md plans/migration-plan.md; do
  git checkout -- "$plan" 2>/dev/null && $FMT item "$(basename "$plan") restored"
done

# 4. Dependencies present, without reinstalling what is already correct
$FMT section "dependencies"
if [ -d node_modules ]; then
  $FMT item "node_modules present - not reinstalling"
else
  $FMT item "installing dependencies"
  npm install >/dev/null 2>&1
fi

# 5. Verify the baseline the demos start from
$FMT section "baseline"
if npm test >/dev/null 2>&1; then
  $FMT item "contract tests pass"
  $FMT verdict pass "Module 1 is at its starting state."
  exit 0
fi

$FMT item "contract tests FAIL"
$FMT verdict fail "Baseline is red. Run 'npm install' then re-run this script."
exit 1

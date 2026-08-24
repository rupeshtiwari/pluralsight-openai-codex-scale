#!/usr/bin/env bash
# Restore Module 2 to a clean, deterministic starting state.
# Requires no manual cleanup afterwards.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FMT="node ${ROOT}/scripts/fmt.mjs"
cd "$ROOT"

# --- Safety guard -----------------------------------------------------------
# This script discards work. Between takes that is exactly what is wanted: the
# dirty files are demo artifacts. During development it is not: unstaged edits
# to scripts, runbooks or docs are real work, and a reset destroys them.
#
# So the guard is not "refuse when dirty", which would make the script useless
# between takes. It refuses only when the dirt lies OUTSIDE the demo surface.
DEMO_SURFACE_RE='^(supporthub-api/|plans/|automation/|module1/logs/|module2/logs/|docs/triage-rubric\.md)'
FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

OUTSIDE="$(git status --porcelain | awk '{print $2}' | grep -Ev "$DEMO_SURFACE_RE" || true)"
if [ -n "$OUTSIDE" ] && [ "$FORCE" -eq 0 ]; then
  $FMT title "Reset refused" "Changes exist outside the demo surface"
  $FMT section "WOULD BE DISCARDED"
  while IFS= read -r f; do [ -n "$f" ] && $FMT item "$f"; done <<< "$OUTSIDE"
  $FMT section "WHAT TO DO"
  $FMT item "Commit or stash this work first, then re-run."
  $FMT item "Or pass --force to discard it deliberately."
  $FMT verdict fail "Nothing was changed."
  exit 2
fi
# ---------------------------------------------------------------------------

$FMT title "Module 2 reset" "Return fixtures and working tree to the demo starting state"

# 1. Unstage anything a hunk-review demo left staged
$FMT section "working tree"
if [ -n "$(git diff --cached --name-only)" ]; then
  git reset -q
  $FMT item "unstaged previously staged changes"
fi

# Count only what this script actually discards: tracked modifications, and
# untracked files inside the directories it cleans.
TRACKED=$(git diff --name-only | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard supporthub-api docs automation | wc -l | tr -d ' ')
if [ "$TRACKED" -gt 0 ] || [ "$UNTRACKED" -gt 0 ]; then
  git checkout -- . 2>/dev/null
  git clean -fd supporthub-api docs automation >/dev/null 2>&1
  $FMT item "reverted ${TRACKED} modified file(s), removed ${UNTRACKED} untracked file(s)"
else
  $FMT item "already clean"
fi

# 2. Fixtures restored to their recorded values
$FMT section "fixtures"
git checkout -- automation/ 2>/dev/null
for f in automation/sentry-fixtures/issues.json \
         automation/github-seed/commits.json \
         automation/triage/baseline-manual-sweep.json; do
  if node "${ROOT}/scripts/json.mjs" valid "$f" >/dev/null 2>&1; then
    $FMT item "$(basename "$f") valid"
  else
    $FMT item "$(basename "$f") INVALID - restore with: git checkout -- $f"
  fi
done

# 3. Run patches must still apply, or the review demos cannot be seeded
$FMT section "run patches"
PATCH_FAIL=0
for p in automation/runs/run-3001.patch automation/runs/run-3002.patch; do
  if git apply --check "$p" >/dev/null 2>&1; then
    $FMT item "$(basename "$p") applies cleanly"
  else
    $FMT item "$(basename "$p") DOES NOT APPLY"
    PATCH_FAIL=1
  fi
done

# 4. Rubric threshold must be at its committed value
$FMT section "triage rubric"
if grep -q '| \*\*P1\*\*.*| 100 or more |' docs/triage-rubric.md; then
  $FMT item "P1 threshold is 100 or more"
else
  $FMT item "P1 threshold ALTERED - restore with: git checkout -- docs/triage-rubric.md"
  PATCH_FAIL=1
fi

if [ "$PATCH_FAIL" -eq 0 ]; then
  $FMT verdict pass "Module 2 is at its starting state."
  exit 0
fi
$FMT verdict fail "Fixtures are not at their starting state. See the items above."
exit 1

#!/usr/bin/env bash
# Reset both modules, then pull.
#
# In that order, always. Every demo dirties tracked files -- plans/ExecPlan.md,
# plans/migration-plan.md, anything under supporthub-api/ -- and the preflight
# rewrites the transcripts under module*/logs/. git pull refuses to overwrite
# any of them and aborts with "Your local changes to the following files would
# be overwritten by merge", which has cost four cycles in this repository,
# always identically: pull out of habit, read the abort, reset, pull again.
#
# Nothing is lost when that happens -- the pull simply did not run. This script
# exists because the abort lands before anyone reads the paragraph explaining
# it.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FMT="node ${ROOT}/scripts/fmt.mjs"
cd "$ROOT"

# --- Safety guard -----------------------------------------------------------
# This script resets before it pulls, so it discards demo output. Between takes
# that is right, and demo_reset.sh's own guard permits it: a walk's artifacts
# lie INSIDE the demo surface, which is exactly what that guard is written to
# allow.
#
# That is the wrong answer here. Resetting between takes and syncing to pull are
# different intents, and the second has no business destroying a walk nobody has
# captured yet. It did: a completed C6 walk was lost this way and had to be
# restored from a manual copy to cut demo/m1-c6-captured.
#
# So this guard sits one layer up and asks a narrower question -- does the tree
# hold walk OUTPUT? -- rather than demo_reset.sh's "is anything outside the
# surface?".
WALK_OUTPUT="$(
  {
    git ls-files --others --exclude-standard supporthub-api
    git diff --name-only -- plans/migration-plan.md plans/ExecPlan.md
  } | sort -u
)"
FORCE=0
for arg in "$@"; do
  case "$arg" in --force) FORCE=1 ;; esac
done

if [ -n "$WALK_OUTPUT" ] && [ "$FORCE" -eq 0 ]; then
  $FMT title "Sync refused" "The tree holds walk output that has not been captured"
  $FMT section "WOULD BE DISCARDED"
  while IFS= read -r f; do [ -n "$f" ] && $FMT item "$f"; done <<< "$WALK_OUTPUT"
  $FMT section "WHAT TO DO"
  $FMT item "Capture it first: save the transcript, and copy these files outside the repository."
  $FMT item "To keep it in git, cut the captured branch now -- branch first, then commit:"
  $FMT item "  git checkout -b demo/<clip>-captured && git add -A && git commit"
  $FMT item "Or pass --force to discard it deliberately."
  $FMT verdict fail "Nothing was reset, nothing was pulled."
  exit 2
fi
# ---------------------------------------------------------------------------

# --force is this script's own flag. Do not hand it to demo_reset.sh, whose
# --force means something wider, or to git pull, which does not take it.
ARGS=()
for arg in "$@"; do
  case "$arg" in --force) ;; *) ARGS+=("$arg") ;; esac
done

./module1/scripts/demo_reset.sh || exit 1
./module2/scripts/demo_reset.sh || exit 1

echo
git pull ${ARGS+"${ARGS[@]}"}

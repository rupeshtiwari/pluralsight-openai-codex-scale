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
cd "$ROOT"

./module1/scripts/demo_reset.sh || exit 1
./module2/scripts/demo_reset.sh || exit 1

echo
git pull "$@"

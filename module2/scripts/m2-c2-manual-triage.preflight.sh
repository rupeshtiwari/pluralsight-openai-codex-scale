#!/usr/bin/env bash
# Preflight for one demo: m2-c2-manual-triage
#
# Runs the checks that gate this clip -- those tagged [all], which gate every
# clip in Module 2, plus those tagged [c2] -- and writes a readable log to
# module2/logs/m2-c2_preflight.txt, grouped by the clip's four steps with each
# step mapped to the objective it serves. Full command output for the same run
# lands beside it as m2-c2_preflight.full.txt.
#
# A thin wrapper on purpose. One implementation runs every clip's checks, so a
# check cannot pass here and fail in the module pass, or drift between the two.
set -uo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/preflight_check.sh" c2

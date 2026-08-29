#!/usr/bin/env bash
# Preflight for one demo: m1-c3-execute-codex-refactor
#
# Runs the checks that gate this clip -- those tagged [all], which gate every
# clip in Module 1, plus those tagged [c3] -- and writes a readable log to
# module1/logs/m1-c3_preflight.txt, grouped by the clip's four steps with each
# step mapped to the objective it serves. Full command output for the same run
# lands beside it as m1-c3_preflight.full.txt.
#
# A thin wrapper on purpose. One implementation runs every clip's checks, so a
# check cannot pass here and fail in the module pass, or drift between the two.
set -uo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/preflight_check.sh" c3

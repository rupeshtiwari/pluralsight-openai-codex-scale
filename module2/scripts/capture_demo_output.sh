#!/usr/bin/env bash
# Capture the deterministic evidence behind every Module 2 demo claim.
# Node only - the course requires no Python prerequisite.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FMT="node ${ROOT}/scripts/fmt.mjs"
JSON="node ${ROOT}/scripts/json.mjs"
OUT="${ROOT}/module2/logs/module2_demo_output.txt"
cd "$ROOT"
mkdir -p "$(dirname "$OUT")"

{
echo "MODULE 2 DEMO OUTPUT CAPTURE"
echo "============================"
echo
echo "CLIP 2 - Run a manual Codex triage sweep across Sentry and GitHub"
echo "  Objective: EO3a, EO3b"
echo
echo "\$ sentry issues in the query window"
echo "  window from: $($JSON get automation/sentry-fixtures/issues.json query_window.from)"
echo "  window to:   $($JSON get automation/sentry-fixtures/issues.json query_window.to)"
$JSON rows automation/sentry-fixtures/issues.json issues id affectedUsers occurrences | sed 's/^/  /'
echo "  EXPECTED  five issues"
echo
echo "\$ commit timing - recency is not causation"
$JSON rows automation/github-seed/commits.json commits sha committedAt | sed 's/^/  /'
echo "  EXPECTED  d4e5f6a is newer than a1b2c3d but touches no failing-path file"
echo "  CHECK     misleading-newer = $($JSON check automation/github-seed/commits.json misleading-newer)"
echo
echo "CLIP 3 - Schedule Codex triage and route work to Slack and Linear"
echo "  Objective: EO3c, EO3d"
echo
echo "\$ validated triage baseline"
$JSON rows automation/triage/baseline-manual-sweep.json findings id priority affectedUsers route | sed 's/^/  /'
echo "  EXPECTED  P0, P2, P3, deferred; exactly two routable"
echo
echo "CLIP 5 - Inspect automation diffs"
echo "  Objective: EO4a"
echo
echo "\$ run-3001 hunks"
$JSON rows automation/runs/run-3001.json hunks verdict file | sed 's/^/  /'
echo "  EXPECTED  one valid, one invalid"
echo "  CHECK     one-of-each = $($JSON check automation/runs/run-3001.json one-of-each)"
echo
echo "\$ git apply --check automation/runs/run-3001.patch"
git apply --check automation/runs/run-3001.patch && echo "  applies cleanly"
echo
echo "CLIP 6 - Trace a failed automation and recover"
echo "  Objective: EO4a"
echo
echo "\$ run-3002 failure trace"
echo "  status       = $($JSON get automation/runs/run-3002.json status)"
echo "  chose commit = $($JSON get automation/runs/run-3002.json correlation.chose)"
echo "  correct      = $($JSON get automation/runs/run-3002.json correlation.correct)"
echo "  fault type   = $($JSON get automation/runs/run-3002.json correlation.faultType)"
$JSON rows automation/runs/run-3002.json hunks verdict file | sed 's/^/  /'
echo "  EXPECTED  failed, bad source assumption, at least one valid hunk to preserve"
echo
echo "\$ run-3003 corrected rerun"
echo "  status = $($JSON get automation/runs/run-3003.json status)"
echo "  commit = $($JSON get automation/runs/run-3003.json correlation.chose)"
$JSON rows automation/runs/run-3003.json hunks verdict file | sed 's/^/  /'
echo
echo "END OF CAPTURE"
} > "$OUT" 2>&1

$FMT title "Module 2 output capture" "Deterministic evidence behind every demo claim"
$FMT value "written to" "module2/logs/module2_demo_output.txt"
$FMT value "lines" "$(wc -l < "$OUT" | tr -d ' ')"
$FMT verdict pass "Capture complete."

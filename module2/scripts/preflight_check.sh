#!/usr/bin/env bash
# Module 2 preflight.
#
# Runs every precondition the four Module 2 demos depend on, in runbook order,
# prints each command and its result, and writes a plain-text transcript to
# preflight-logs/. Ends with a readiness verdict.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FMT="python3 ${ROOT}/scripts/fmt.py"
LOG="${ROOT}/preflight-logs/module2_preflight.txt"
cd "$ROOT"
mkdir -p "$(dirname "$LOG")"
: > "$LOG"

FAILED=()
log(){ echo "$@" >> "$LOG"; }

check(){
  local demo="$1" name="$2" cmd="$3" why="$4" fix="$5" prompt="$6"
  local out rc
  log ""; log "\$ $cmd"
  out="$(eval "$cmd" 2>&1)"; rc=$?
  log "$out"
  if [ $rc -eq 0 ]; then
    $FMT item "$name: PASS"; log "RESULT PASS  [$demo] $name"
  else
    $FMT item "$name: FAIL"
    log "RESULT FAIL  [$demo] $name"
    log "WHY IT MATTERS  $why"; log "HOW TO FIX      $fix"; log "CODEX PROMPT    $prompt"
    FAILED+=("$demo|$name|$why|$fix|$prompt")
  fi
}

$FMT box "Module 2 preflight" "Verify every precondition the four demos depend on"

log "MODULE 2 PREFLIGHT - Automating and debugging Codex workflows at team scale"
log "=========================================================================="
log ""
log "PROBLEM THIS MODULE ADDRESSES"
log "  Production errors arrive faster than a team can triage by hand, but"
log "  automating triage before it is known to be correct only scales the"
log "  wrong answers, and automation that edits code needs review before"
log "  anything is accepted."
log ""
log "WHAT THE LEARNER GAINS"
log "  A validated triage pattern that can be scheduled, routed only after"
log "  approval, reviewed hunk by hunk, and recovered from when it fails."
log ""
log "LEARNING OBJECTIVES"
log "  TO3  Apply Codex automations to run recurring bug triage across"
log "       multiple data sources at team scale."
log "  EO3a Configure a bug triage automation using the Sentry, Slack, Linear,"
log "       and GitHub plugins to sweep a defined time window"
log "  EO3b Evaluate a Codex-generated triage report for correct P0-P3"
log "       prioritization, deduplicated bug entries, and evidence-backed"
log "       recommendations"
log "  EO3c Convert a tested manual triage sweep into a scheduled automation"
log "       using the same thread context"
log "  EO3d Apply a routing workflow to draft Slack updates, Linear issues, or"
log "       GitHub comments after triage approval"
log "  TO4  Demonstrate how to debug and trace Codex automations"
log "  EO4a Use the Codex review pane to inspect uncommitted diffs from an"
log "       automation run, including per-hunk staging and revert controls"

$FMT section "environment"
check "all" "working tree clean" '[ -z "$(git status --porcelain)" ]' \
  "The review demos seed changes with a patch; leftover edits make the diff unreadable." \
  "./module2/scripts/demo-reset.sh" \
  "Show me every uncommitted change in this repository and what produced it."

check "all" "nothing left staged" '[ -z "$(git diff --cached --name-only)" ]' \
  "A previous hunk-review run leaves changes staged, which breaks the next run's starting state." \
  "git reset" \
  "git diff --cached shows staged changes. Show me what they are."

$FMT section "clip 2 - manual triage sweep"
check "c2" "sentry fixtures valid" 'python3 -m json.tool automation/sentry-fixtures/issues.json' \
  "The whole sweep reads this file; malformed JSON stops the demo." \
  "git checkout -- automation/sentry-fixtures/issues.json" \
  "automation/sentry-fixtures/issues.json will not parse. Show the syntax error."

check "c2" "five sentry issues in window" \
  '[ "$(python3 -c "import json;print(len(json.load(open(\"automation/sentry-fixtures/issues.json\"))[\"issues\"]))")" -eq 5 ]' \
  "The runbook states five issues; a different count breaks the expected output." \
  "git checkout -- automation/sentry-fixtures/issues.json" \
  "The Sentry fixture should contain five issues. Show how many it contains."

check "c2" "duplicate pair shares a stack frame" \
  '[ "$(python3 -c "
import json
d=json.load(open(\"automation/sentry-fixtures/issues.json\"))
i={x[\"id\"]:x for x in d[\"issues\"]}
print(len(set(i[\"evt-1042\"][\"stack\"]) & set(i[\"evt-1043\"][\"stack\"])))")" -ge 1 ]' \
  "Deduplication is taught by a shared frame; without it the merge has no evidence." \
  "git checkout -- automation/sentry-fixtures/issues.json" \
  "evt-1042 and evt-1043 must share at least one stack frame. Show their stacks."

check "c2" "misleading commit is nearer in time than the real cause" \
  '[ "$(python3 -c "
import json
c={x[\"sha\"]:x[\"committedAt\"] for x in json.load(open(\"automation/github-fixtures/commits.json\"))[\"commits\"]}
print(1 if c[\"d4e5f6a\"] > c[\"a1b2c3d\"] else 0)")" -eq 1 ]' \
  "The lesson that recency is not causation requires the wrong commit to be the newer one." \
  "git checkout -- automation/github-fixtures/commits.json" \
  "d4e5f6a must be committed later than a1b2c3d. Show both timestamps."

check "c2" "rubric P1 threshold is 100" \
  'grep -qF "| **P1** | Core workflow degraded or failing for many users | 100 or more |" docs/triage-rubric.md' \
  "incident-2002 sits at 61 users; the P2 call depends on the threshold being 100." \
  "git checkout -- docs/triage-rubric.md" \
  "The P1 row in docs/triage-rubric.md must read 100 or more. Show what it reads."

$FMT section "clip 3 - schedule and route"
check "c3" "triage baseline present" 'python3 -m json.tool automation/triage/baseline-manual-sweep.json' \
  "The scheduled run is compared against this baseline." \
  "git checkout -- automation/triage/" \
  "automation/triage/baseline-manual-sweep.json will not parse. Show the error."

check "c3" "baseline has four findings" \
  '[ "$(python3 -c "import json;print(len(json.load(open(\"automation/triage/baseline-manual-sweep.json\"))[\"findings\"]))")" -eq 4 ]' \
  "The runbook prints four rows; a different count breaks the expected output." \
  "git checkout -- automation/triage/baseline-manual-sweep.json" \
  "The triage baseline should hold four findings. Show how many it holds."

check "c3" "exactly two findings are routable" \
  '[ "$(python3 -c "import json;print(sum(1 for f in json.load(open(\"automation/triage/baseline-manual-sweep.json\"))[\"findings\"] if f[\"route\"]))")" -eq 2 ]' \
  "Clip 3 approves a subset; if all four were routable there would be no subset to choose." \
  "git checkout -- automation/triage/baseline-manual-sweep.json" \
  "Exactly two baseline findings should have route true. Show which do."

check "c3" "all routing payloads are drafts" \
  '[ "$(grep -l "\"status\": \"draft\"" automation/slack-drafts/*.json automation/linear-drafts/*.json | wc -l | tr -d " ")" -eq 3 ]' \
  "Nothing may be marked sent; routing happens only after approval." \
  "git checkout -- automation/slack-drafts automation/linear-drafts" \
  "Every file in slack-drafts and linear-drafts must have status draft. Show any that do not."

check "c3" "no draft is pre-approved" \
  '[ "$(grep -h "approvedBy" automation/slack-drafts/*.json automation/linear-drafts/*.json | grep -cv "null")" -eq 0 ]' \
  "A pre-approved draft removes the approval decision the clip teaches." \
  "git checkout -- automation/slack-drafts automation/linear-drafts" \
  "Every draft must have approvedBy null. Show any that do not."

$FMT section "clip 5 - inspect automation diffs"
check "c5" "run-3001 patch applies" 'git apply --check automation/runs/run-3001.patch' \
  "The clip seeds its uncommitted changes with this patch; if it will not apply there is nothing to review." \
  "git checkout -- . then re-run this check" \
  "automation/runs/run-3001.patch does not apply. Show the conflict."

check "c5" "run-3001 touches exactly two files" \
  '[ "$(grep -c "^diff --git" automation/runs/run-3001.patch)" -eq 2 ]' \
  "The clip contrasts one valid hunk with one invalid hunk." \
  "git checkout -- automation/runs/run-3001.patch" \
  "run-3001.patch should change exactly two files. Show which it changes."

check "c5" "run-3001 declares one valid and one invalid hunk" \
  '[ "$(python3 -c "
import json
h=json.load(open(\"automation/runs/run-3001.json\"))[\"hunks\"]
print(1 if sorted(x[\"verdict\"] for x in h)==[\"invalid\",\"valid\"] else 0)")" -eq 1 ]' \
  "The review decision depends on exactly one of each." \
  "git checkout -- automation/runs/run-3001.json" \
  "run-3001.json must declare one valid and one invalid hunk. Show its hunks."

$FMT section "clip 6 - trace and recover"
check "c6" "run-3002 patch applies" 'git apply --check automation/runs/run-3002.patch' \
  "The recovery clip seeds the failed run with this patch." \
  "git checkout -- . then re-run this check" \
  "automation/runs/run-3002.patch does not apply. Show the conflict."

check "c6" "run-3002 carries work worth preserving" \
  '[ "$(python3 -c "
import json
h=json.load(open(\"automation/runs/run-3002.json\"))[\"hunks\"]
print(sum(1 for x in h if x[\"verdict\"]==\"valid\"))")" -ge 1 ]' \
  "Recovery teaches preserving valid work; a wholly bad run has nothing to preserve." \
  "git checkout -- automation/runs/run-3002.json automation/runs/run-3002.patch" \
  "run-3002 must contain at least one valid hunk alongside the faulty one."

check "c6" "run-3002 records a bad source assumption" \
  'grep -q "bad source assumption" automation/runs/run-3002.json' \
  "The clip traces the failure to the input rather than to the generator." \
  "git checkout -- automation/runs/run-3002.json" \
  "run-3002.json must record faultType bad source assumption."

check "c6" "run-3003 is the corrected rerun" \
  'grep -q "\"chose\": \"a1b2c3d\"" automation/runs/run-3003.json' \
  "The corrected rerun must correlate to the commit that touches the failing stack." \
  "git checkout -- automation/runs/run-3003.json" \
  "run-3003.json must correlate incident-2001 to a1b2c3d."

check "c6" "baseline gates green before seeding a failure" \
  '[ "$(npm test 2>&1 | grep -cF "Tests  25 passed (25)")" -ge 1 ]' \
  "A red baseline makes the seeded failure indistinguishable from a pre-existing one." \
  "npm install then npm test" \
  "npm test does not report 25 passing tests. Show the failure."

log ""
log "STEP TO OBJECTIVE COVERAGE"
log "  Clip 2 step 1    EO3a  sources, destinations, and window configured"
log "  Clip 2 step 2-4  EO3b  dedup, P0-P3 priority, evidence-backed"
log "  Clip 3 step 1-2  EO3c  scheduled from the same thread context"
log "  Clip 3 step 3-4  EO3d  routing drafts after approval"
log "  Clip 5 step 1-4  EO4a  review pane, per-hunk stage and revert"
log "  Clip 6 step 1-4  EO4a  trace, revert bad hunk, rerun corrected"

$FMT section "verdict"
if [ ${#FAILED[@]} -eq 0 ]; then
  $FMT item "all checks passed"
  log ""; log "VERDICT  READY - all Module 2 demos can be run."
  $FMT verdict pass "Module 2 is ready. Transcript: preflight-logs/module2_preflight.txt"
  exit 0
fi
log ""; log "FAILED CHECKS"
for e in "${FAILED[@]}"; do
  IFS='|' read -r demo name why fix prompt <<< "$e"
  log "  [$demo] $name"; log "    why it matters : $why"
  log "    how to fix     : $fix"; log "    codex prompt   : $prompt"
  $FMT item "[$demo] $name -> $fix"
done
log ""; log "VERDICT  NOT READY - ${#FAILED[@]} check(s) failed."
$FMT verdict fail "${#FAILED[@]} check(s) failed. See preflight-logs/module2_preflight.txt"
exit 1

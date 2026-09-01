#!/usr/bin/env bash
# Module 2 preflight.
#
# Runs every precondition the four Module 2 demos depend on, in runbook order,
# prints each command and its result, and writes a plain-text transcript to
# module1/logs/. Ends with a readiness verdict.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FMT="node ${ROOT}/scripts/fmt.mjs"
LOG="${ROOT}/module2/logs/module2_preflight.txt"
cd "$ROOT"

# Optional clip argument. "preflight_check.sh c3" runs only the checks that gate
# clip 3 -- the ones tagged [all], which gate every clip, plus [c3]. With no
# argument every clip runs, which is what you want once per recording session.
ONLY=""
if [ $# -gt 0 ]; then
  case "$1" in
    c2|c3|c5|c6) ONLY="$1" ;;
    *) echo "usage: $(basename "$0") [c2|c3|c5|c6]" >&2; exit 2 ;;
  esac
fi

mkdir -p "$(dirname "$LOG")"
: > "$LOG"

# Per-clip transcripts. The master log above covers the whole module; an author
# about to record one clip wants the gates for that clip and nothing else. Every
# check is already scoped -- check "all" gates every clip, check "cN" gates one
# -- so the run is partitioned rather than repeated. Headers come from
# docs/outline-clip-map.json so a clip's title and objectives cannot drift from
# the approved outline.
CLIPS="c2 c3 c5 c6"
[ -n "$ONLY" ] && CLIPS="$ONLY"
CLIPDIR="${ROOT}/module2/logs"
PREFLIGHT_ONLY="$ONLY" node -e '
  const fs = require("fs");
  const map = JSON.parse(fs.readFileSync("docs/outline-clip-map.json", "utf8"));
  const only = process.env.PREFLIGHT_ONLY;
  for (const c of (only ? [only] : ["c2", "c3", "c5", "c6"])) {
    const key = "m2-" + c;
    const e = map.clips[key] || {};
    const objs = (e.objectives || []).map((o) => "  " + o.padEnd(6) + (map.objectives[o] || ""));
    fs.writeFileSync("module2/logs/" + key + "_preflight.txt", [
      key.toUpperCase() + " PREFLIGHT",
      "=".repeat(key.length + 10), "",
      e.title || key, "",
      "RUNBOOK", "  " + (e.runbook || "unknown"), "",
      "LEARNING OBJECTIVES", ...objs, "",
      "SCOPE",
      "  Checks tagged [all] gate every clip in this module.",
      "  Checks tagged [" + c + "] gate this clip only.",
      "  Both must pass before this clip is recorded.",
      "",
    ].join("\n"));
  }
'

FAILED=()
log(){ echo "$@" >> "$LOG"; }

# Command output is captured verbatim, which embeds this machine's absolute
# paths and this run's millisecond timings. That makes the committed transcript
# differ on every run and on every machine, so running the preflight leaves the
# tree dirty -- and clip 2 step 4 proves its point with an empty Source Control
# view. Normalise the volatile fields so a rerun produces identical bytes.
norm(){
  sed -e "s#${ROOT}#.#g" \
      -e 's#[0-9][0-9]*ms#<ms>#g' \
      -e 's#[0-9][0-9]*\.[0-9][0-9]*s#<s>#g' \
      -e 's#Start at  [0-9][0-9]:[0-9][0-9]:[0-9][0-9]#Start at  <time>#'
}

# sect <demo> <title> -- a clip heading that disappears from a scoped run,
# so "preflight_check.sh c3" does not print empty headings for c5 and c6.
sect(){
  if [ -n "$ONLY" ] && [ "$1" != "all" ] && [ "$1" != "$ONLY" ]; then return 0; fi
  $FMT section "$2"
}

check(){
  local demo="$1" name="$2" cmd="$3" why="$4" fix="$5" prompt="$6"
  local out rc
  # A scoped run still executes every [all] check, because those gate the clip
  # as surely as its own do.
  if [ -n "$ONLY" ] && [ "$demo" != "all" ] && [ "$demo" != "$ONLY" ]; then return 0; fi
  log ""; log "\$ $cmd"
  out="$(eval "$cmd" 2>&1)"; rc=$?
  log "$(printf '%s\n' "$out" | norm)"
  if [ $rc -eq 0 ]; then
    $FMT item "$name: PASS"; log "RESULT PASS  [$demo] $name"
  else
    $FMT item "$name: FAIL"
    log "RESULT FAIL  [$demo] $name"
    log "WHY IT MATTERS  $why"; log "HOW TO FIX      $fix"; log "CODEX PROMPT    $prompt"
    FAILED+=("$demo|$name|$why|$fix|$prompt")
  fi

  # Fan the same block out to every clip this check gates. Written here rather
  # than parsed back out of the master log afterwards, so the per-clip files
  # cannot drift from what actually ran.
  local targets t f
  if [ "$demo" = "all" ]; then targets="$CLIPS"; else targets="$demo"; fi
  for t in $targets; do
    f="${CLIPDIR}/m2-${t}_preflight.txt"
    [ -f "$f" ] || continue
    { echo ""; echo "\$ $cmd"; printf '%s\n' "$out" | norm; } >> "$f"
    if [ $rc -eq 0 ]; then
      echo "RESULT PASS  [$demo] $name" >> "$f"
    else
      { echo "RESULT FAIL  [$demo] $name"
        echo "WHY IT MATTERS  $why"
        echo "HOW TO FIX      $fix"
        echo "CODEX PROMPT    $prompt"; } >> "$f"
    fi
  done
}

$FMT title "Module 2 preflight" "Verify every precondition the four demos depend on"

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
# Both log directories are excluded: each preflight writes its own transcript,
# and running one module's preflight must not fail the other's clean-tree check.
check "all" "working tree clean" '[ -z "$(git status --porcelain -- ":!module1/logs" ":!module2/logs")" ]' \
  "The review demos seed changes with a patch; leftover edits make the diff unreadable." \
  "./module2/scripts/demo_reset.sh" \
  "Show me every uncommitted change in this repository and what produced it."

check "all" "runbooks match the approved outline" \
  'node "${ROOT}/scripts/check.mjs" clip-outline-alignment' \
  "The outline is the contract Curriculum approved. A step heading shortened for readability reads fine on its own while dropping scope the outline promised." \
  "Restore the runbook to match docs/outline-clip-map.json. Edit the runbook, never the map." \
  "Which runbook steps differ from their outline bullets?"

check "all" "nothing left staged" '[ -z "$(git diff --cached --name-only)" ]' \
  "A previous hunk-review run leaves changes staged, which breaks the next run's starting state." \
  "git reset" \
  "git diff --cached shows staged changes. Show me what they are."

sect c2 "clip 2 - manual triage sweep"
check "all" "fixtures, rubric and config shape are ready" \
  './scripts/verify_integrations.sh' \
  "Every Module 2 clip reads these fixtures and this rubric. Running the preparation script from here means it cannot be the separate thing an author forgets -- and it deliberately does not claim plugin reachability, which is C2 step 1's on-camera job." \
  "Read its own output: it names the fixture, rubric row or config key that failed." \
  "Which fixture, rubric row or .env.example key does ./scripts/verify_integrations.sh report as failing?"

check "c2" "C2 starts without its own answer on disk" \
  'node "${ROOT}/scripts/check.mjs" m2-c2-starts-without-the-correction' \
  "Codex persists a mid-thread correction to disk, not only to conversation context -- Gate 1 measured it editing four files to record one. Step 4 writes automation/triage/corrected-sweep.json, and if that survives to the next take this clip starts from the answer it is supposed to reach." \
  "./module2/scripts/demo_reset.sh removes it." \
  "Is automation/triage/corrected-sweep.json present before the take, and is the recorded baseline unmodified?"

check "c2" "sentry fixtures valid" 'node "${ROOT}/scripts/json.mjs" valid automation/sentry-fixtures/issues.json' \
  "The whole sweep reads this file; malformed JSON stops the demo." \
  "git checkout -- automation/sentry-fixtures/issues.json" \
  "automation/sentry-fixtures/issues.json will not parse. Show the syntax error."

check "c2" "five sentry issues in window" \
  '[ "$(node "${ROOT}/scripts/json.mjs" count automation/sentry-fixtures/issues.json issues)" -eq 5 ]' \
  "The runbook states five issues; a different count breaks the expected output." \
  "git checkout -- automation/sentry-fixtures/issues.json" \
  "The Sentry fixture should contain five issues. Show how many it contains."

check "c2" "duplicate pair shares a stack frame" \
  '[ "$(node "${ROOT}/scripts/json.mjs" check automation/sentry-fixtures/issues.json shared-frame)" -ge 1 ]' \
  "Deduplication is taught by a shared frame; without it the merge has no evidence." \
  "git checkout -- automation/sentry-fixtures/issues.json" \
  "evt-1042 and evt-1043 must share at least one stack frame. Show their stacks."

check "c2" "misleading commit is nearer in time than the real cause" \
  '[ "$(node "${ROOT}/scripts/json.mjs" check automation/github-seed/commits.json misleading-newer)" -eq 1 ]' \
  "The lesson that recency is not causation requires the wrong commit to be the newer one." \
  "git checkout -- automation/github-seed/commits.json" \
  "d4e5f6a must be committed later than a1b2c3d. Show both timestamps."

check "c2" "rubric P1 threshold is 100" \
  'grep -qF "| **P1** | Core workflow degraded or failing for many users | 100 or more |" docs/triage-rubric.md' \
  "incident-2002 sits at 61 users; the P2 call depends on the threshold being 100." \
  "git checkout -- docs/triage-rubric.md" \
  "The P1 row in docs/triage-rubric.md must read 100 or more. Show what it reads."

sect c3 "clip 3 - schedule and route"
check "c3" "step 4 is verified in-thread, not in a browser" \
  'node "${ROOT}/scripts/check.mjs" m2-c3-verifies-in-thread' \
  "Gate 1 measured what the plugins render in-thread and it is enough to verify a draft. Sending an author to Slack or Linear costs screen time, leaves the surface the clip is about, and shows a destination this demo deliberately does not write to." \
  "Keep step 4 reading priority and evidence off Codex's reply, and keep the stay-in-panel instruction." \
  "Does m2-c3 step 4 tell the author to open Slack or Linear?"

check "c3" "triage baseline present" 'node "${ROOT}/scripts/json.mjs" valid automation/triage/baseline-manual-sweep.json' \
  "The scheduled run is compared against this baseline." \
  "git checkout -- automation/triage/" \
  "automation/triage/baseline-manual-sweep.json will not parse. Show the error."

check "c3" "baseline has four findings" \
  '[ "$(node "${ROOT}/scripts/json.mjs" count automation/triage/baseline-manual-sweep.json findings)" -eq 4 ]' \
  "The runbook prints four rows; a different count breaks the expected output." \
  "git checkout -- automation/triage/baseline-manual-sweep.json" \
  "The triage baseline should hold four findings. Show how many it holds."

check "c3" "exactly two findings are routable" \
  '[ "$(node "${ROOT}/scripts/json.mjs" rows automation/triage/baseline-manual-sweep.json findings route | grep -c "route=true")" -eq 2 ]' \
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

sect c5 "clip 5 - inspect automation diffs"
check "c5" "run-3001 patch applies" 'git apply --check automation/runs/run-3001.patch' \
  "The clip seeds its uncommitted changes with this patch; if it will not apply there is nothing to review." \
  "./module2/scripts/demo_reset.sh then re-run this check" \
  "automation/runs/run-3001.patch does not apply. Show the conflict."

check "c5" "run-3001 touches exactly two files" \
  '[ "$(grep -c "^diff --git" automation/runs/run-3001.patch)" -eq 2 ]' \
  "The clip contrasts one valid hunk with one invalid hunk." \
  "git checkout -- automation/runs/run-3001.patch" \
  "run-3001.patch should change exactly two files. Show which it changes."

check "c5" "run-3001 declares one valid and one invalid hunk" \
  '[ "$(node "${ROOT}/scripts/json.mjs" check automation/runs/run-3001.json one-of-each)" -eq 1 ]' \
  "The review decision depends on exactly one of each." \
  "git checkout -- automation/runs/run-3001.json" \
  "run-3001.json must declare one valid and one invalid hunk. Show its hunks."

sect c6 "clip 6 - trace and recover"
check "c6" "run-3002 patch applies" 'git apply --check automation/runs/run-3002.patch' \
  "The recovery clip seeds the failed run with this patch." \
  "./module2/scripts/demo_reset.sh then re-run this check" \
  "automation/runs/run-3002.patch does not apply. Show the conflict."

check "c6" "run-3002 carries work worth preserving" \
  '[ "$(node "${ROOT}/scripts/json.mjs" check automation/runs/run-3002.json has-valid-hunk)" -ge 1 ]' \
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

log ""
log "PER-CLIP TRANSCRIPTS"
# What the closing line should name. A scoped run checked one clip, so claiming
# the module is ready would overstate it, and pointing at the module log would
# send the author to the wrong file.
SUBJECT="Module 2"
SUBJ_LOG="module2/logs/module2_preflight.txt"
if [ -n "$ONLY" ]; then
  SUBJECT="m2-$ONLY"
  SUBJ_LOG="module2/logs/m2-${ONLY}_preflight.txt"
fi

# Per-clip verdicts, counted from each clip's own transcript rather than tracked
# in a parallel counter that could disagree with the file an author opens.
# Rewrite each clip transcript as a step-grouped report before verdicts are
# appended. The raw run is kept beside it as <clip>_preflight.full.txt.
for c in $CLIPS; do
  node "${ROOT}/scripts/clip-report.mjs" "m2-$c" "${CLIPDIR}/m2-${c}_preflight.txt"
done

$FMT section "per-clip readiness"
for c in $CLIPS; do
  f="${CLIPDIR}/m2-${c}_preflight.txt"
  [ -f "$f" ] || continue
  n="$(grep -c '^    FAIL  ' "$f" 2>/dev/null || true)"
  n="${n:-0}"
  if [ "$n" -eq 0 ]; then
    printf '\nVERDICT  READY - this clip can be recorded.\n' >> "$f"
    $FMT item "m2-$c: READY"
  else
    printf '\nVERDICT  NOT READY - %s check(s) failed above.\n' "$n" >> "$f"
    $FMT item "m2-$c: NOT READY ($n failed)"
  fi
  log "  m2-$c  $( [ "$n" -eq 0 ] && echo READY || echo "NOT READY ($n)" )  logs/m2-${c}_preflight.txt"
done

$FMT section "verdict"
if [ ${#FAILED[@]} -eq 0 ]; then
  $FMT item "all checks passed"
  log ""; log "VERDICT  READY - $SUBJECT can be run."
  $FMT verdict pass "$SUBJECT is ready. Transcript: $SUBJ_LOG"
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
$FMT verdict fail "${#FAILED[@]} check(s) failed. See $SUBJ_LOG"
exit 1

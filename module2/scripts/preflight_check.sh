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
check "all" "every prep block proves the agent is in this checkout" \
  'node "${ROOT}/scripts/check.mjs" runbooks-probe-agent-identity' \
  "Two folders on the recording machine shared the basename pluralsight-openai-codex-scale and Codex Desktop pointed at the wrong one, on a master branch this repository does not have. Two C6 Step 1 runs reported files created and gates green while nothing reached disk -- accurate reports about a different checkout. No verification downstream can see this, because they all read the terminal's checkout." \
  "Restore the prep block's identity probe: the project chip's branch, then pwd and git rev-parse --abbrev-ref HEAD against what the agent prints. node scripts/check.mjs runbooks-probe-agent-identity names the runbook and the missing half." \
  "Which runbook prep blocks do not make Codex print its absolute working directory and branch before the first prompt?"

check "all" "no assertion matches a tool's printed prose" \
  'node "${ROOT}/scripts/check.mjs" checks-do-not-match-tool-output' \
  "The C6 baseline check ran npm test and grepped for the literal line 'Tests  25 passed (25)'. On an author's machine the suite passed 25 of 25 and the check failed anyway, because it tested Vitest's formatting rather than the result -- and then printed a remediation for a red baseline, which was never the condition it detected." \
  "Assert the exit status, or assert the state on disk. Machine-readable output -- git --porcelain, node -p, scripts/json.mjs -- is fine to parse; a runner's summary line is not." \
  "Which preflight assertions depend on the exact words a tool prints?"

check "all" "every preflight calls check after defining it" \
  'node "${ROOT}/scripts/check.mjs" preflight-checks-run-after-their-definition' \
  "A new block was spliced into the middle of a prose comment because the insertion anchored on the first literal occurrence of a string that turned out to be a sentence. It escaped the comment and ran fifty lines above the function definition, so the author's terminal opened with 'check: command not found'. bash -n passed, and the runs meant to catch it discarded stderr." \
  "Move the invocation below check(). Read stderr when you run a preflight: a script that half-works still prints a verdict." \
  "Does either preflight script call check before check() is defined?"

check "all" "a clip's own failure cannot print READY" \
  'node "${ROOT}/scripts/check.mjs" per-clip-verdict-counts-every-failure' \
  "The per-clip count was re-derived from the rendered transcript by grepping four-space FAIL lines, which match only the SHARED GATES block. Clip-scoped failures render two spaces in, under their step, so they counted zero -- one failure, clip-scoped, and the preflight printed READY into a file whose own READINESS line said NOT READY - 1 of 24 checks failed." \
  "Take the count from clip-report.mjs's exit status, which is the number of failures it recorded into the transcript the verdict is appended to." \
  "Where does each preflight get its per-clip failure count, and can it disagree with the transcript?"

check "all" "fixtures, rubric and config shape are ready" \
  './scripts/verify_integrations.sh' \
  "Every Module 2 clip reads these fixtures and this rubric. Running the preparation script from here means it cannot be the separate thing an author forgets -- and it deliberately does not claim plugin reachability, which is C2 step 1's on-camera job." \
  "Read its own output: it names the fixture, rubric row or config key that failed." \
  "Which fixture, rubric row or .env.example key does ./scripts/verify_integrations.sh report as failing?"

check "c3" "C3 starts without its own answer on disk" \
  'node "${ROOT}/scripts/check.mjs" m2-c2-starts-without-the-correction' \
  "C3 step 1's scheduled run writes scheduled-sweep.json. It used to inherit C2's output path from the thread and overwrite corrected-sweep.json, destroying clip 2's evidence." \
  "./module2/scripts/demo_reset.sh removes both." \
  "Is a previous take's triage output still on disk under automation/triage?"

check "c2" "C2 starts without its own answer on disk" \
  'node "${ROOT}/scripts/check.mjs" m2-c2-starts-without-the-correction' \
  "Codex persists a mid-thread correction to disk, not only to conversation context -- Gate 1 measured it editing four files to record one. Step 4 writes automation/triage/corrected-sweep.json, and if that survives to the next take this clip starts from the answer it is supposed to reach." \
  "./module2/scripts/demo_reset.sh removes it." \
  "Is automation/triage/corrected-sweep.json present before the take, and is the recorded baseline unmodified?"

check "c2" "step 4 specifies the shape it compares" \
  'node "${ROOT}/scripts/check.mjs" c2-step4-specifies-the-shape-it-compares' \
  "Three walks produced three shapes -- route, then routedNow with a nested routing.routed, then routingDecision.shouldRoute with priority renamed too. The prompt named the keys in prose each time, and the first version of this check confirmed that it did, which was the defect: it asserted the prompt while the artifact is what step 4 compares. The contract now lives in automation/triage/corrected-sweep.template.json, a file Codex reads." \
  "Keep the template, the baseline and step 4's selectors on the same keys, and keep the require lines above the tables. node scripts/check.mjs c2-step4-specifies-the-shape-it-compares says which key and which file." \
  "Do m2-c2 step 4's template, baseline and verification selectors agree on the same keys?"

check "c2" "step 4's prompt asks for the file before the content" \
  'node "${ROOT}/scripts/check.mjs" c2-step4-prompt-leads-with-the-write' \
  "Three walks on the correct project binding wrote the file zero times. One replied that the report was saved at an absolute path for a file that existed nowhere on the machine. The prompt opened with nine lines of content requirements and named the output path below them, so the report read as the deliverable and the write as a footnote. This asserts the order and the closing wc -c, which is all a prompt can be held to -- whether the file lands is c2-step4-output-carries-the-corrected-shape, which step 4's verification runs after the walk." \
  "Put the output path in the prompt's opening paragraph, above the bullets, and close with wc -c automation/triage/corrected-sweep.json. Keep the relative-path rule: ls -l would print the account name on camera." \
  "Does m2-c2 step 4's prompt name its output file before it states what to put in it, and does it end by requiring wc -c on the result?"

check "c2" "the plugins the objective names are shown on camera" \
  'node "${ROOT}/scripts/check.mjs" c2-shows-the-plugins-the-objective-names' \
  "EO3a reads 'using the Sentry, Slack, Linear, and GitHub plugins'. Step 1's prompt named all four sources by role while the connections lived only in the prep block, which is not on camera -- so the prompt claimed four plugins and the screen proved none. A coverage audit found it; no check could, because naming a source in a prompt is not showing a connection." \
  "Open the plugins panel in step 1's Navigation and name each one in bold. The four names come from EO3a in docs/outline-clip-map.json, so change the outline and this moves with it." \
  "Does m2-c2 step 1 show the four plugins EO3a names, or only mention them?"

check "c2" "every seeded commit is inside the swept window" \
  'node "${ROOT}/scripts/check.mjs" c2-seed-commits-are-inside-the-swept-window' \
  "Step 1 has the author say 'five Sentry issues and three commits' with the window just restated, so the fixture has to make that sentence true. Two commits sat outside it until they were moved in; the trap survived the move -- d4e5f6a is still seventeen minutes before evt-1042 while a1b2c3d precedes its errors by hours -- so only window membership changed. This guards against drift back, and is not a claim that a root cause must fall inside a sweep window." \
  "Move the commit inside the window, or change what step 1 tells the author to expect. node scripts/check.mjs c2-seed-commits-are-inside-the-swept-window names which." \
  "Which seeded commits fall outside the window m2-c2 sweeps, and does step 1's expected count match the fixture?"

check "c2" "every baseline priority derives from the rubric" \
  'node "${ROOT}/scripts/check.mjs" baseline-priorities-derive-from-rubric' \
  "incident-2001 sat at P0 for the life of this repository and could not be derived: the rubric's P0 affected-user column is \"any number\", which subsumes P1's \"100 or more\", so only the impact column separates them and the fixture describes a subset of status updates failing. The walk's Codex said P1 and quoted the row. Step 4 calls this file the rubric-derived baseline." \
  "Fix the baseline priority, or the fixture evidence it rests on. node scripts/check.mjs baseline-priorities-derive-from-rubric names the finding and the band." \
  "Which baseline priorities cannot be derived from docs/triage-rubric.md and the sentry fixtures?"

check "c2" "step 4 expects the baseline it compares against" \
  'node "${ROOT}/scripts/check.mjs" runbook-expects-the-baseline-it-compares-to' \
  "Step 4 states the four expected priorities in prose and then verifies against the baseline JSON. Two statements of one fact drift, and the author reading the prose would be told to expect a priority the verification rejects." \
  "Bring step 4's expected result and automation/triage/baseline-manual-sweep.json back into agreement." \
  "Which priorities does m2-c2 step 4 tell the author to expect, and do they match the baseline?"

check "c2" "the evidence fixtures carry no answer key" \
  'node "${ROOT}/scripts/check.mjs" fixtures-carry-no-answer-key' \
  "Every commit in the seed once carried a note stating what a reviewer should conclude from it -- all three of step 3's findings were written into the data step 2 reads, and the walk's Codex rejected d4e5f6a in almost the words of the note." \
  "Remove the field. Evidence fixtures hold facts about each record; the conclusion is the demo." \
  "Which fields in automation/github-seed or automation/sentry-fixtures state a conclusion rather than a fact?"

check "c2" "every fixture stack frame opens on real code" \
  'node "${ROOT}/scripts/check.mjs" fixture-stack-frames-resolve' \
  "The fixture promised frames that cross-reference against real code and mostly could not: changeStatus was given at line 196 when it starts at 244, and evt-1043 named a bulkImport that exists nowhere. An agent that opens them reports the real sites instead, and step 3's Highlight is a stack frame." \
  "Point each frame at a symbol that exists and a line that defines or calls it. A frame may carry ? for the line where none was captured." \
  "Which fixture stack frames name a file, symbol or line that does not exist?"

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
check "all" "the prompts name destinations the drafts are written for" \
  'node "${ROOT}/scripts/check.mjs" destinations-match-the-drafts-fixture' \
  "A C3 walk had Codex report that Linear shows no project named SupportHub reliability -- the prompt was asking for issues in a project that does not exist, and nothing tied the name in the prompt to the name in the fixture the drafts are written against." \
  "Rename the Linear project in the recording workspace to match the fixture, or change the fixture and every prompt together. The fixture is the reference: a real team name is a private workspace identifier and does not belong in this repository." \
  "Which Slack channel and Linear project do the M2 prompts name, and do the drafts agree?"

check "c3" "the scheduled sweep names the window the fixtures cover" \
  'node "${ROOT}/scripts/check.mjs" scheduled-sweep-window-matches-the-fixtures' \
  "Step 1 told the scheduled task to sweep 'the most recent 24-hour window'. The fixtures cover 2025-03-03 only, so the run reported 'No actionable update' -- correct behaviour applied to an empty window -- and step 2 had no report to compare, steps 3 and 4 nothing to approve or draft. Clip 2 step 1 had named the window explicitly all along, so one conversation was being told two different things." \
  "Name the fixture window in both step 1 prompts, or re-date the fixtures and the baseline together. node scripts/check.mjs scheduled-sweep-window-matches-the-fixtures says which is out of step." \
  "Which window do the M2 step 1 prompts sweep, and is it the window the fixtures cover?"

check "c3" "step 1's instruction asks for the file before the content" \
  'node "${ROOT}/scripts/check.mjs" c3-step1-prompt-leads-with-the-write' \
  "Step 1's instruction had the shape that wrote nothing in three C2 walks: window, four rules, then the file. This one becomes a scheduled task, so nobody is watching the turn in which the write does not happen, and step 2 then has no artifact to compare. It also inherits clip 2's thread, so corrected-sweep.json is on disk where the run can overwrite it or read it back as its own answer." \
  "Put automation/triage/scheduled-sweep.json in the instruction's opening paragraph, keep the refusal to write corrected-sweep.json, and close with wc -c on the result." \
  "Does m2-c3 step 1's instruction name its output file before the rules, refuse corrected-sweep.json, and end by requiring wc -c?"

check "c3" "drafts carry the priority their finding was triaged at" \
  'node "${ROOT}/scripts/check.mjs" drafts-carry-the-triaged-priority' \
  "Step 4 verifies on camera that Slack and Linear drafts preserve the evidence and priority from the triage decision. Both incident-2001 drafts said P0 in four places -- title, priority, label, and the Slack headline -- while the baseline moved to P1." \
  "Bring the drafts onto the baseline's priority. node scripts/check.mjs drafts-carry-the-triaged-priority names the file and the field." \
  "Do the Slack and Linear drafts state the same priority the baseline triaged their finding at?"

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
check "all" "the seed branch excludes what the patches add" \
  'node "${ROOT}/scripts/check.mjs" seed-branch-excludes-what-the-patches-add' \
  "A C5 walk committed run-3001.patch's content onto demo/m2-c2-start -- one commit, empty message, identical to the patch. Step 3 stages a hunk and a staged hunk is one keystroke from a commit. Afterwards git status read clean and Changes was empty, which is what a reverted change looks like and equally what a committed one looks like. The patch then no longer applied for C5, and the committed rubric repriced incident-2002 from P2 to P1 in every C2 and C3 comparison." \
  "Reset the seed branch to the build head and force-push with a lease. git apply --check cannot see this: it reads the working tree of whatever is checked out, so a preflight run elsewhere passes while the seed carries the change." \
  "Does demo/m2-c2-start already contain the rubric threshold or the sev mapping that run-3001.patch adds?"

check "all" "each seeded patch touches the files its runbook names" \
  'node "${ROOT}/scripts/check.mjs" seeded-patches-apply-and-touch-what-the-runbook-says' \
  "C5 and C6 apply their patches live in the prep block rather than carrying them on a branch, so the patch and the 'Expect two modified files' line ARE the starting state and nothing was holding them to each other. C6's line had been split by an inserted paragraph, stranding one of its two filenames, so the block named one file where the patch touches two." \
  "Bring the prep block's file list and the patch back into agreement. node scripts/check.mjs seeded-patches-apply-and-touch-what-the-runbook-says names the clip and the file." \
  "Do the M2 prep blocks name the same files their seeded patches touch?"

check "all" "prep blocks run the preflight before they seed" \
  'node "${ROOT}/scripts/check.mjs" m2-prep-blocks-preflight-before-seeding' \
  "Both blocks said: apply the patch, then run the preflight. The preflight's first gate is working tree clean and the patch modifies two tracked files, so following the block top to bottom failed a check doing its job -- and the printed remedy for a red preflight is a reset, which throws the seed away. Reordering opened a second gap, found on the first walk after the fix: the preflight rewrites the transcripts under both logs directories, so git status after seeding showed eleven files where the block promises two." \
  "Order the block preflight, then git checkout -- module1/logs module2/logs, then git apply. node scripts/check.mjs m2-prep-blocks-preflight-before-seeding names the clip and what is out of order." \
  "Do the M2 prep blocks run the preflight before seeding, and clear the transcripts it rewrote?"

check "c5" "run-3001 patch applies" 'git apply --check automation/runs/run-3001.patch' \
  "The clip seeds its uncommitted changes with this patch; if it will not apply there is nothing to review." \
  "./module2/scripts/demo_reset.sh then re-run this check" \
  "automation/runs/run-3001.patch does not apply. Show the conflict."

check "c5" "run-3001 touches exactly two files" \
  '[ "$(grep -c "^diff --git" automation/runs/run-3001.patch)" -eq 2 ]' \
  "The clip contrasts one valid hunk with one invalid hunk." \
  "git checkout -- automation/runs/run-3001.patch" \
  "run-3001.patch should change exactly two files. Show which it changes."

check "c5" "each seeded hunk traces to a finding, or provably does not" \
  'node "${ROOT}/scripts/check.mjs" seeded-run-hunks-trace-to-findings' \
  "Every hunk in the seeded runs used to carry a verdict of valid or invalid with a reason, and this preflight read it. That verdict IS clip 5 step 2's work and clip 6 step 2's -- does the finding ask for this change -- sitting in a file the agent also reads. The shape is now derived from the baseline evidence and the patch." \
  "Fix the seeded run or the finding it names, not by adding a verdict back. node scripts/check.mjs seeded-run-hunks-trace-to-findings says which run and which hunk." \
  "Which hunks in automation/runs are traceable to the findings their run was given, and which are not?"

sect c6 "clip 6 - trace and recover"
check "c6" "run-3002 patch applies" 'git apply --check automation/runs/run-3002.patch' \
  "The recovery clip seeds the failed run with this patch." \
  "./module2/scripts/demo_reset.sh then re-run this check" \
  "automation/runs/run-3002.patch does not apply. Show the conflict."

check "c6" "run-3002 records the reason it chose its commit" \
  'node "${ROOT}/scripts/json.mjs" get automation/runs/run-3002.json correlation.chosenBecause | grep -q .' \
  "Step 1 reads the failed run's own log: the commit it correlated to and the reason it gave itself. That reason -- a timestamp -- is what step 2 works from. The run used to carry the answer too, a correct: field and a fault type, printed on camera a minute before step 2 asked Codex to name it." \
  "Restore correlation.chosenBecause in automation/runs/run-3002.json. Do not restore correct or faultType; fixtures-carry-no-answer-key rejects them." \
  "What does run-3002 record about why it chose the commit it did?"

check "c6" "run-3003 is the corrected rerun" \
  'grep -q "\"chose\": \"a1b2c3d\"" automation/runs/run-3003.json' \
  "The corrected rerun must correlate to the commit that touches the failing stack." \
  "git checkout -- automation/runs/run-3003.json" \
  "run-3003.json must correlate incident-2001 to a1b2c3d."

check "c6" "baseline gates green before seeding a failure" \
  'npm test' \
  "A red baseline makes the seeded failure indistinguishable from a pre-existing one. This asserts the suite's exit status. It used to grep for the literal line \"Tests  25 passed (25)\", which is Vitest's formatting rather than the result -- so it failed on a machine whose suite was passing, and sent its author to npm install for a problem that was never there." \
  "Run npm test and read the first failing test. The baseline must be green before clip 6 seeds its failure; the transcript above this line has the full output." \
  "npm test fails on the unmodified baseline. Show which test and the minimal fix."

check "c6" "the seeded failure actually fails" \
  'node "${ROOT}/scripts/check.mjs" c6-seeded-failure-actually-fails' \
  "run-3002.json records build: fail and test: fail, and step 1 reads both on camera. For a long time neither was true of this repository: applying run-3002.patch produced a green build and 25 passing tests, because nothing under supporthub-api/modern depended on Express 5, so pinning Express 4 changed nothing a gate could see. This runs the gates in three states rather than inspecting the patch -- clean, patched, bad hunk reverted -- and takes about twenty seconds." \
  "Read its own output: it names the state that disagreed. A patch that does not break a gate cannot seed the failure step 1 narrates." \
  "With run-3002.patch applied, do npm run build and npm test both fail, and does reverting the package.json hunk alone make both pass again?"

check "c6" "no prompt here can answer with an absolute path" \
  'node "${ROOT}/scripts/check.mjs" c6-prompts-forbid-absolute-paths' \
  "Step 2 asks Codex to judge two changed files and Codex answers with file links. In Codex Desktop those render from the project root, which sits under the operator's home directory, so the account name lands on camera in the one clip that spends its middle section reading file names aloud. C2 step 4 and C3 step 1 already carry the rule; this runbook did not." \
  "Close each prompt block with: Refer to files by relative path only. Do not print absolute paths. The check names the prompt and the line." \
  "Do m2-c6's prompts forbid absolute paths, the way m2-c2 step 4 and m2-c3 step 1 do?"

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
$FMT section "per-clip readiness"
for c in $CLIPS; do
  f="${CLIPDIR}/m2-${c}_preflight.txt"
  [ -f "$f" ] || continue
  # clip-report.mjs exits with the number of failures the transcript records, and
  # the verdict below is appended to that same transcript, so the two cannot
  # disagree. The count used to be re-derived here with `grep -c '^    FAIL  '`,
  # which matches only the SHARED GATES block -- clip-scoped failures render two
  # spaces in, under their step. A clip whose own check was the only red one
  # counted zero and printed READY into a file whose READINESS line read
  # NOT READY.
  node "${ROOT}/scripts/clip-report.mjs" "m2-$c" "$f"
  n=$?
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

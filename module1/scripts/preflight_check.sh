#!/usr/bin/env bash
# Module 1 preflight.
#
# Runs every precondition the four Module 1 demos depend on, in runbook order,
# prints each command and its result, and writes a plain-text transcript to
# module1/logs/. Ends with a readiness verdict per demo.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FMT="node ${ROOT}/scripts/fmt.mjs"
LOG="${ROOT}/module1/logs/module1_preflight.txt"
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
CLIPDIR="${ROOT}/module1/logs"
PREFLIGHT_ONLY="$ONLY" node -e '
  const fs = require("fs");
  const map = JSON.parse(fs.readFileSync("docs/outline-clip-map.json", "utf8"));
  const only = process.env.PREFLIGHT_ONLY;
  for (const c of (only ? [only] : ["c2", "c3", "c5", "c6"])) {
    const key = "m1-" + c;
    const e = map.clips[key] || {};
    const objs = (e.objectives || []).map((o) => "  " + o.padEnd(6) + (map.objectives[o] || ""));
    fs.writeFileSync("module1/logs/" + key + "_preflight.txt", [
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

# check <demo> <name> <command> <why-it-matters> <how-to-fix> <codex-prompt>
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
    $FMT item "$name: PASS"
    log "RESULT PASS  [$demo] $name"
  else
    $FMT item "$name: FAIL"
    log "RESULT FAIL  [$demo] $name"
    log "WHY IT MATTERS  $why"
    log "HOW TO FIX      $fix"
    log "CODEX PROMPT    $prompt"
    FAILED+=("$demo|$name|$why|$fix|$prompt")
  fi

  # Fan the same block out to every clip this check gates. Written here rather
  # than parsed back out of the master log afterwards, so the per-clip files
  # cannot drift from what actually ran.
  local targets t f
  if [ "$demo" = "all" ]; then targets="$CLIPS"; else targets="$demo"; fi
  for t in $targets; do
    f="${CLIPDIR}/m1-${t}_preflight.txt"
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

$FMT title "Module 1 preflight" "Verify every precondition the four demos depend on"

log "MODULE 1 PREFLIGHT - Refactoring and migrating codebases with Codex"
log "===================================================================="
log ""
log "PROBLEM THIS MODULE ADDRESSES"
log "  A working codebase has accumulated duplication and dead code, and a"
log "  legacy service needs migrating. Both invite an agent to edit before it"
log "  understands, producing changes nobody reviewed."
log ""
log "WHAT THE LEARNER GAINS"
log "  A repeatable way to plan before editing, keep a diff bounded, and"
log "  migrate in checkpoints that can each be validated and rolled back."
log ""
log "LEARNING OBJECTIVES"
log "  TO1  Apply Codex to plan and execute a codebase refactoring operation"
log "       using reviewable passes."
log "  EO1a Construct a refactoring prompt that instructs Codex to map noisy"
log "       modules, identify dead code, and propose one cleanup theme at a"
log "       time before editing"
log "  EO1b Apply the ExecPlan pattern to maintain a running log of intended"
log "       changes, behavior contracts, and validation checks across a"
log "       multi-session refactor"
log "  EO1c Evaluate a Codex-generated refactoring diff to confirm that public"
log "       behavior is preserved and that architecture migrations are"
log "       separated into discrete tasks"
log "  EO1d Explain when to use Plan mode before committing Codex to"
log "       implementation"
log "  TO2  Demonstrate how to orchestrate a legacy-to-modern stack migration"
log "       with Codex using incremental checkpoints."
log "  EO2a Direct Codex to inventory a legacy system's routing, data models,"
log "       auth, build tooling, tests, and external contracts before"
log "       proposing a migration plan"
log "  EO2b Evaluate a Codex-generated migration plan for compatibility"
log "       layers, explicit behavioral exceptions, and rollback visibility"
log "  EO2c Apply validation checks (lint, type-check, focused tests) after"
log "       each migration milestone rather than batching cleanup"
log "  EO2d Use the ASP.NET Core skill or equivalent framework skill to apply"
log "       platform-specific migration guidance"

# ---------------------------------------------------------------- environment
$FMT section "environment"
# Both log directories are excluded: each preflight writes its own transcript,
# and running one module's preflight must not fail the other's clean-tree check.
check "all" "working tree clean" \
  '[ -z "$(git status --porcelain -- ":!module1/logs" ":!module2/logs")" ]' \
  "Every demo starts from a clean tree; leftover edits change what the diff shows." \
  "./module1/scripts/demo_reset.sh" \
  "Show me every uncommitted change in this repository and what produced it."

check "all" "ESLint parser root pinned in both workspaces" \
  'node "${ROOT}/scripts/check.mjs" eslint-tsconfigrootdir-set' \
  "Two sibling TypeScript workspaces mean an editor cannot infer the parser root. Unpinned, the VS Code ESLint extension puts a parsing-error badge on every open .ts tab while the command line stays green -- and clip 2 closes by proving nothing is wrong." \
  "Set parserOptions.tsconfigRootDir in the config the check names: import.meta.dirname in modern, __dirname in migration." \
  "Which ESLint config is missing parserOptions.tsconfigRootDir?"

check "all" "every tracked document lints clean" \
  'node "${ROOT}/scripts/check.mjs" all-docs-lint-clean' \
  "lint:md covered the two on-camera plans and nothing else, so 46 real defects sat in the runbooks and docs unseen. They surfaced only when a copy of a runbook was opened from outside the repository, where .markdownlint.json does not apply." \
  "npm run lint:md, then fix what it names." \
  "Which tracked markdown files have markdownlint findings?"

check "all" "no on-camera markdown shows a lint badge" \
  'node "${ROOT}/scripts/check.mjs" oncamera-markdown-lint-silent' \
  "plans/ExecPlan.md is on screen for all four clip 3 steps and Codex rewrites its tables in step 1, and markdownlint put 518 problems on it while the command line said nothing. This covers the tools that ship a CLI. Spell Right ships none, so a green result here does not mean the editor is quiet -- open the file and look before recording." \
  "npm run lint:md, then fix what it names, or add the word to cspell.json / the rule to .markdownlint.json when it is a house-style disagreement rather than a defect." \
  "Which rule is firing, and is it a real defect or a style default this repository does not follow?"

check "all" "no workspace shows a lint badge" \
  'node "${ROOT}/scripts/check.mjs" workspace-lint-silent' \
  "Section 12: nothing unexplained shows a badge on camera, and a warning badge is an error badge in a friendlier colour. Clip 2 held a yellow badge on ticketService.ts for six minutes from two no-unused-vars warnings on the seeded dead helpers." \
  "Fix the finding it names. If the code is right for the demo, suppress the rule in the workspace eslint.config.js -- never with an eslint-disable in a file that opens on camera." \
  "Which file and line is ESLint reporting, and is that code deliberate?"

check "all" "no prompt bans commands outright" \
  'node "${ROOT}/scripts/check.mjs" prompts-allow-read-only-inspection' \
  "Clip 2 Step 1 said \"do not run any commands\" to stop tests and installs. Codex read it as covering reading too and refused to inspect the repository, which is the whole step. A prompt has to forbid writes and permit reads separately." \
  "Replace the blanket ban with the read-only permission sentence the check names." \
  "Which prompt in this repository forbids running any command at all?"

check "all" "saved clip 2 prompts match the runbook" \
  'node "${ROOT}/scripts/check.mjs" c2-prompts-saved' \
  "The runbook names plans/prompts/m1-c2-map-codebase.md as the saved copy, so either is a plausible paste source on recording day. They had already drifted: the runbook carried the command ban and the saved file did not." \
  "Copy the runbook prompt blocks over the saved ones; the runbook is the source." \
  "Which saved clip 2 prompt differs from the runbook?"

check "all" "every check is mapped to a demo step" \
  'node "${ROOT}/scripts/check.mjs" preflight-step-map-complete' \
  "The per-clip transcripts group results by the clip's four steps. A check with no entry in docs/preflight-step-map.json runs but appears under no step, so the report silently understates what gates a clip." \
  "Add the check to docs/preflight-step-map.json under its clip, naming the step numbers it gates." \
  "Which preflight check has no entry in docs/preflight-step-map.json?"

check "all" "runbooks match the approved outline" \
  'node "${ROOT}/scripts/check.mjs" clip-outline-alignment' \
  "The outline is the contract Curriculum approved. A step heading shortened for readability reads fine on its own while dropping scope the outline promised -- two did, and one of those carried EO2d's framework-skill substitution." \
  "Restore the runbook to match docs/outline-clip-map.json. Edit the runbook, never the map." \
  "Which runbook steps differ from their outline bullets?"

check "all" "no runnable block checks out a missing branch" \
  'node "${ROOT}/scripts/check.mjs" demo-checkout-refs-exist' \
  "Four demo checkpoints do not exist yet and depend on walkthroughs. A runbook that hands out a checkout of one fails on its first line, in front of the camera." \
  "Show the commands as indented prose with the dependency named, instead of a runnable bash block." \
  "Which markdown bash blocks check out a demo branch that does not exist?"

check "all" "runbook links resolve" \
  'node "${ROOT}/scripts/check.mjs" doc-links-resolve' \
  "The module READMEs are how a learner finds a runbook. Every runbook link in both of them was once written without its opening paren, so markdown rendered it as text pointing nowhere." \
  "Run node scripts/check.mjs doc-links-resolve to see which link and which file." \
  "Which markdown links in this repository point at files that do not exist?"

check "all" "dependencies installed" \
  '[ -d node_modules ]' \
  "Without dependencies no validation gate can run." \
  "npm install" \
  "npm install fails in this repository. Read the error and tell me what to fix."

# ------------------------------------------------------------------- baseline
$FMT section "baseline gates"
check "all" "ESLint" "npm run lint" \
  "A red baseline makes it impossible to attribute a later failure to the refactor." \
  "npm run lint -- --fix, then fix what remains by hand" \
  "npm run lint fails. Show the failing rules and fix them without changing behavior."

check "all" "TypeScript type-check" "npm run typecheck" \
  "Type errors before the demo starts will be blamed on the refactor." \
  "Read the tsc output and correct the types" \
  "npm run typecheck fails. Show each error and the minimal fix."

check "all" "build" "npm run build" \
  "Clip 6 uses build as a validation gate; it must be green beforehand." \
  "Resolve the tsc emit errors" \
  "npm run build fails but typecheck passes. Explain the difference and fix it."

check "all" "contract tests (expect 25)" \
  'node "${ROOT}/scripts/check.mjs" contract-tests-pass' \
  "The 25 contract tests are the behavior contract the refactor must preserve." \
  "npm install then npm test; if a test genuinely changed, update the runbook expectations" \
  "npm test does not report 25 passing tests. Show which test changed and why."

# ------------------------------------------------------------------- clip 2
sect c2 "clip 2 - map noisy modules"
check "c2" "clip 2 seed matches the runbook's expected values" \
  'node "${ROOT}/scripts/check.mjs" c2-seed-shape' \
  "The author reads three quantities off the Expected values table on camera: three priority-normalization sites, five unreferenced exports, and two dead private helpers. Every one of them was wrong until a live walk measured it -- this check counted files while claiming to count sites." \
  "Restore supporthub-api/modern/src, or correct the Expected values table in m1-c2-map-noisy-typescript-modules.md to match the code." \
  "How many priority-normalization sites, unreferenced exports, and uncalled private functions are in supporthub-api/modern/src?"

check "c2" "dead helper has no importers" \
  '[ "$(grep -rn "from '"'"'.*utils/legacy" supporthub-api/modern/src supporthub-api/modern/tests | wc -l | tr -d " ")" -eq 0 ]' \
  "normalizeLegacySeverity must be genuinely unreferenced or the dead-code finding is false." \
  "Remove any import of utils/legacy" \
  "Find every importer of supporthub-api/modern/src/utils/legacy.ts and remove them."

check "c2" "one load-bearing function carries all four responsibilities" \
  'node "${ROOT}/scripts/check.mjs" load-bearing-function' \
  "The plan-time rejection and the diff-time removal must act on the same code. If validation, normalization, storage access and response shaping are not all inside createTicket, the two clips teach the same thing twice." \
  "git checkout -- supporthub-api/modern/src/services/ticketService.ts" \
  "createTicket must carry validation, priority normalization, storage access and response shaping in one body. Show which are missing."

check "c2" "the route does not normalize priority" \
  '[ "$(grep -c "value === '"'"'p0'"'"'" supporthub-api/modern/src/routes/tickets.ts)" -eq 0 ]' \
  "A second copy in the route would be an independent smell, splitting the escalation between clips." \
  "git checkout -- supporthub-api/modern/src/routes/tickets.ts" \
  "The route must pass the raw priority through. Show where it normalizes."

# This demo produces no diff by design, so its two checkpoints must be the same
# commit. A difference means the planning pass edited files, which is a failure.
check "c2" "start and captured checkpoints are the same commit" \
  'node "${ROOT}/scripts/check.mjs" c2-refs-identical' \
  "This demo writes nothing. If the two checkpoints differ, the planning pass edited files." \
  "git branch -f demo/m1-c2-captured demo/m1-c2-start" \
  "demo/m1-c2-start and demo/m1-c2-captured must reference the same commit. Show both."

check "c2" "prompt file present" '[ -f plans/prompts/m1-c2-map-codebase.md ]' \
  "The runbook tells the author to paste this prompt." \
  "git checkout -- plans/prompts/" \
  "plans/prompts/m1-c2-map-codebase.md is missing. Restore it from git history."

# ------------------------------------------------------------------- clip 3
sect c3 "clip 3 - execute refactor with ExecPlan"
check "c3" "refactor ExecPlan present" '[ -f plans/ExecPlan.md ]' \
  "Clip 3 reads this file in its first step." \
  "git checkout -- plans/ExecPlan.md" \
  "plans/ExecPlan.md is missing. Restore it."

check "c3" "ExecPlan sections Step 1 fills are unwritten" \
  'node "${ROOT}/scripts/check.mjs" execplan-starts-unwritten' \
  "Step 1 writes Validation checks, and Steps 2 and 4 run whatever it names. A gate list left over from a previous take leaves Codex nothing to record, and the step plays as a no-op." \
  "git checkout -- plans/ExecPlan.md" \
  "Which section of plans/ExecPlan.md is already written?"

check "c3" "clip 3's prompt does not forbid the drift step 4 removes" \
  'node "${ROOT}/scripts/check.mjs" c3-prompt-does-not-preempt-removal' \
  "Step 4 removes an architecture migration Codex bundled in. The implementation prompt used to forbid exactly that, and a measured run complied: three files, all inside the theme, and Codex said 'No route files were changed.' Same shape as the clip 5 failure." \
  "Remove the structural prohibition from the implementation prompt; keep the route, status code and field-name contract." \
  "What in the clip 3 implementation prompt would stop Codex from over-reaching?"

check "c3" "no document fixes the clip 3 gate count" \
  'node "${ROOT}/scripts/check.mjs" c3-gates-not-hardcoded' \
  "Step 1 asks Codex for the commands that prove the contracts, so the gate list is its judgment. A measured run recorded four, adding a build gate unprompted, against a runbook that said three." \
  "Remove the count; Steps 2 and 4 run what the ExecPlan names." \
  "Which document states how many gates clip 3 runs?"

check "c3" "ExecPlan progress log is empty" \
  'grep -q "not started" plans/ExecPlan.md' \
  "A pre-filled progress log means a previous run was not reset." \
  "git checkout -- plans/ExecPlan.md" \
  "Reset the Progress log and Deferred work tables in plans/ExecPlan.md to empty."

check "c3" "ExecPlan names four intended changes" \
  '[ "$(sed -n "/## Intended changes/,/## Behavior contracts/p" plans/ExecPlan.md | grep -cE "^[0-9]+\.")" -eq 4 ]' \
  "Clip 3 compares the diff against four intended changes." \
  "git checkout -- plans/ExecPlan.md" \
  "The Intended changes list should contain four numbered items. Show what it contains."

# ------------------------------------------------------------------- clip 5
sect c5 "clip 5 - inventory legacy service"
check "c5" "legacy service present" '[ -f supporthub-api/migration/app.js ]' \
  "There is nothing to inventory without it." \
  "git checkout -- supporthub-api/migration" \
  "supporthub-api/migration is missing. Restore it from git history."

check "c5" "legacy is CommonJS, not ESM" \
  '! grep -q "\"type\": \"module\"" supporthub-api/migration/package.json' \
  "The migration source must be CommonJS or the demo's premise is wrong." \
  "Remove the type field from supporthub-api/migration/package.json" \
  "supporthub-api/migration/package.json declares type module. It must remain CommonJS."

check "c5" "migration tests pass (expect 8)" \
  'node "${ROOT}/scripts/check.mjs" migration-tests-pass' \
  "Clip 5 shows the legacy service working before planning its migration." \
  "npm install then npm run test:migration" \
  "npm run test:migration does not report 8 passing tests. Show the failure."

check "c5" "both services seed the same tickets" \
  'node "${ROOT}/scripts/check.mjs" seed-parity-across-services' \
  "Clip 6 migrates a route slice from the legacy service into the modern one, and clip 5 lists seeded data among the caller-visible contracts. Legacy seeded two tickets and modern three, while both set nextId to 1004, so the legacy service skipped an id that never existed." \
  "Align the seed arrays in both ticketService files, and set nextId to one past the highest seeded id." \
  "Which tickets does each service seed, and where does each start generating ids?"

check "c5" "legacy route surface matches step 1's expected result" \
  'node "${ROOT}/scripts/check.mjs" c5-route-surface' \
  "Step 1 expects four routes: GET /health with no auth, and three ticket routes behind requireApiKey. /health is the evidence for the Highlight that auth is per route, not global. The expected result named three and left it out." \
  "Correct the expected result, or restore the route the service is missing." \
  "How many routes does supporthub-api/migration expose, and which of them has no auth?"

check "c5" "all six inventory categories exist" \
  '[ -f supporthub-api/migration/routes/tickets.js ] && [ -f supporthub-api/migration/models/ticket.js ] && [ -f supporthub-api/migration/auth/apiKey.js ] && [ -f supporthub-api/migration/package.json ] && [ -f supporthub-api/migration/tests/tickets.test.js ] && [ -f supporthub-api/migration/config/limits.json ]' \
  "EO2a requires routes, models, auth, build tooling, tests, and external contracts to all be present." \
  "git checkout -- supporthub-api/migration" \
  "One of the six inventory categories is missing from supporthub-api/migration. Find which."

check "c5" "__dirname used in legacy service" \
  'grep -q "__dirname" supporthub-api/migration/services/ticketService.js' \
  "The CommonJS-to-ESM compatibility discussion depends on a real __dirname use." \
  "git checkout -- supporthub-api/migration/services/ticketService.js" \
  "Restore the __dirname-based config load in the legacy ticket service."

check "c5" "clip 5's milestone prompt does not impose what step 4 audits" \
  'node "${ROOT}/scripts/check.mjs" c5-step3-does-not-decompose' \
  "Step 4 audits the milestone list for one that both changes code and upgrades a dependency. Step 3 used to instruct 'change one thing, not several', and a walk produced thirteen compliant milestones with nothing for step 4 to flag." \
  "Remove the atomicity rule from the milestone prompt; keep the independent-validation half." \
  "What in the clip 5 milestone prompt tells Codex not to combine concerns?"

check "c5" "no clip 5 prompt references the framework skill" \
  'node "${ROOT}/scripts/check.mjs" c5-prompts-skill-free' \
  "The skill forbids combining a route migration with a dependency upgrade. If a clip 5 prompt points Codex at it, Codex plans by that rule and Step 4 has no batched milestone left to reject. The clip loses the decision it exists for." \
  "Remove the reference from the prompt, and keep the explicit prohibition - omission alone does not stop retrieval." \
  "Which clip 5 prompts mention the framework skill?"

check "c5" "migration plan opens on exactly one milestone" \
  '[ "$(grep -c "^### Milestone" plans/migration-plan.md)" -eq 1 ]' \
  "The rejection step needs a single batched milestone to act on. Two already-split checkpoints mean a previous run was not reset." \
  "git checkout -- plans/migration-plan.md" \
  "plans/migration-plan.md must contain exactly one proposed milestone. Show how many it contains."

check "c5" "step 4 audits the plan file, not the conversation" \
  'node "${ROOT}/scripts/check.mjs" c5-step4-audits-the-plan-file' \
  "The batched milestone is seeded in plans/migration-plan.md, not produced in the chat. Step 4 asked about 'each milestone' with no referent, so two walks graded the well-decomposed list Codex had just written and correctly answered 'none'." \
  "Name plans/migration-plan.md in the step 4 audit prompt." \
  "Which milestone list does the clip 5 step 4 prompt actually point at?"

check "c5" "that milestone batches code with a dependency upgrade" \
  'node "${ROOT}/scripts/check.mjs" milestone-batched' \
  "If the milestone does not combine a route migration with a dependency upgrade, there is nothing objectionable to reject." \
  "git checkout -- plans/migration-plan.md" \
  "Milestone 1 must combine the route migration with the Express upgrade. Show its scope."

check "c5" "that milestone is unreviewed" \
  'grep -q "Not yet reviewed" plans/migration-plan.md' \
  "A reviewed plan means a previous run was not reset." \
  "git checkout -- plans/migration-plan.md" \
  "The proposed milestones must be marked as not yet reviewed."

# ------------------------------------------------------------------- clip 6
sect c6 "clip 6 - migrate one route"
check "c6" "framework skill present" \
  '[ -f framework-skill/node-express-migration/SKILL.md ]' \
  "EO2d requires the equivalent framework skill to be available in the repository." \
  "git checkout -- framework-skill/" \
  "The express-typescript-migration skill is missing. Restore it."

check "c6" "skill-off tells still unique to the skill" \
  'node "${ROOT}/scripts/check.mjs" skill-tells-unique' \
  "The toggle pre-check decides whether Codex read the skill by looking for wording that exists nowhere else. If a tell is copied into another document it stops being evidence, and the pre-check would keep reporting a load that never happened." \
  "Remove the duplicated phrasing named above, or pick a new tell and update the evidence artifact." \
  "Which files besides SKILL.md contain the skill-off tell phrases?"

check "c6" "Run A prompt saved and matching the runbook" \
  'node "${ROOT}/scripts/check.mjs" c6-prompt-saved' \
  "The negative control is only valid if Run A and Run B differ by exactly one line. If the runbook prompt and the saved file drift apart, the comparison stops measuring the skill and nothing says so." \
  "Re-sync plans/prompts/m1-c6-migrate-route.md with the Prompt block in module1/m1-c6-migrate-one-express-route.md." \
  "Do the saved C6 prompt and the runbook Prompt block match exactly, and does the saved one open on the skill line?"

check "c6" "skill is opt-in, not ambient" \
  'node "${ROOT}/scripts/check.mjs" skill-not-ambient' \
  "The negative control needs the skill to load only when a prompt asks for it. An ambient directive in AGENTS.md would load it in both runs, make them identical, and turn the evidence artifact into a comparison of nothing." \
  "Restore the opt-out wording in AGENTS.md: Do not consult it unless the prompt asks you to." \
  "Does anything in AGENTS.md direct you to read framework-skill/node-express-migration/SKILL.md without being asked?"

check "c6" "skill names all four validation gates" \
  'grep -q "ESLint" framework-skill/node-express-migration/SKILL.md && grep -q "type-check" framework-skill/node-express-migration/SKILL.md && grep -q "build validation" framework-skill/node-express-migration/SKILL.md && grep -q "Vitest" framework-skill/node-express-migration/SKILL.md' \
  "Clip 6 relies on the skill prescribing the four gates by name." \
  "git checkout -- framework-skill/node-express-migration/SKILL.md" \
  "The migration skill must name ESLint, TypeScript type-check, build validation, and focused Vitest tests."

check "c6" "compat modules present" \
  '[ -f supporthub-api/modern/src/compat/dirname.ts ] && [ -f supporthub-api/modern/src/compat/legacyRequire.ts ]' \
  "The compatibility layer must be real code, not a description." \
  "git checkout -- supporthub-api/modern/src/compat" \
  "The compat modules under supporthub-api/modern/src/compat are missing. Restore them."

check "c6" "focused route tests pass" "npm run test:route" \
  "Clip 6 runs this as its fourth gate and expects it green before the migration." \
  "npm test to see which contract broke" \
  "npm run test:route fails. Show which route contract broke."

check "c6" "express 5 in modern workspace" \
  '[ "$(node -p "require(require.resolve(\"express/package.json\",{paths:[\"./supporthub-api/modern\"]})).version" | cut -d. -f1)" = "5" ]' \
  "The migration target is Express 5; a different version invalidates the premise." \
  "npm install" \
  "The modern workspace should resolve express 5. Show what version is installed and why."

check "c6" "express 4 in migration workspace" \
  '[ "$(node -p "require(require.resolve(\"express/package.json\",{paths:[\"./supporthub-api/migration\"]})).version" | cut -d. -f1)" = "4" ]' \
  "The migration source is Express 4; without it source and target are not materially different." \
  "npm install" \
  "The legacy workspace should resolve express 4. Show what version is installed."

# ------------------------------------------------------------------- verdict
# What the closing line should name. A scoped run checked one clip, so claiming
# the module is ready would overstate it, and pointing at the module log would
# send the author to the wrong file.
SUBJECT="Module 1"
SUBJ_LOG="module1/logs/module1_preflight.txt"
if [ -n "$ONLY" ]; then
  SUBJECT="m1-$ONLY"
  SUBJ_LOG="module1/logs/m1-${ONLY}_preflight.txt"
fi

log ""
log "STEP TO OBJECTIVE COVERAGE"
log "  Clip 2 step 1-2  EO1a  map modules, identify dead code"
log "  Clip 2 step 3-4  EO1d  Plan mode before implementation"
log "  Clip 3 step 1-2  EO1b  ExecPlan running log"
log "  Clip 3 step 3-4  EO1c  diff evaluated, architecture separated"
log "  Clip 5 step 1    EO2a  six inventory categories"
log "  Clip 5 step 2-4  EO2b  compatibility, exceptions, rollback"
log "  Clip 6 step 1    EO2d  framework skill guidance"
log "  Clip 6 step 2-4  EO2c  validation after the milestone"

log ""
log "PER-CLIP TRANSCRIPTS"
# Per-clip verdicts, counted from each clip's own transcript rather than tracked
# in a parallel counter that could disagree with the file an author opens.
# Rewrite each clip transcript as a step-grouped report before verdicts are
# appended. The raw run is kept beside it as <clip>_preflight.full.txt.
for c in $CLIPS; do
  node "${ROOT}/scripts/clip-report.mjs" "m1-$c" "${CLIPDIR}/m1-${c}_preflight.txt"
done

$FMT section "per-clip readiness"
for c in $CLIPS; do
  f="${CLIPDIR}/m1-${c}_preflight.txt"
  [ -f "$f" ] || continue
  n="$(grep -c '^    FAIL  ' "$f" 2>/dev/null || true)"
  n="${n:-0}"
  if [ "$n" -eq 0 ]; then
    printf '\nVERDICT  READY - this clip can be recorded.\n' >> "$f"
    $FMT item "m1-$c: READY"
  else
    printf '\nVERDICT  NOT READY - %s check(s) failed above.\n' "$n" >> "$f"
    $FMT item "m1-$c: NOT READY ($n failed)"
  fi
  log "  m1-$c  $( [ "$n" -eq 0 ] && echo READY || echo "NOT READY ($n)" )  logs/m1-${c}_preflight.txt"
done

$FMT section "verdict"
if [ ${#FAILED[@]} -eq 0 ]; then
  $FMT item "all checks passed"
  log ""; log "VERDICT  READY - $SUBJECT can be run."
  $FMT verdict pass "$SUBJECT is ready. Transcript: $SUBJ_LOG"
  exit 0
fi

log ""
log "FAILED CHECKS"
for e in "${FAILED[@]}"; do
  IFS='|' read -r demo name why fix prompt <<< "$e"
  log "  [$demo] $name"
  log "    why it matters : $why"
  log "    how to fix     : $fix"
  log "    codex prompt   : $prompt"
  $FMT item "[$demo] $name -> $fix"
done
log ""
log "VERDICT  NOT READY - ${#FAILED[@]} check(s) failed."
$FMT verdict fail "${#FAILED[@]} check(s) failed. See $SUBJ_LOG"
exit 1

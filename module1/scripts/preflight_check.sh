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
mkdir -p "$(dirname "$LOG")"
: > "$LOG"

FAILED=()

log(){ echo "$@" >> "$LOG"; }

# check <demo> <name> <command> <why-it-matters> <how-to-fix> <codex-prompt>
check(){
  local demo="$1" name="$2" cmd="$3" why="$4" fix="$5" prompt="$6"
  local out rc
  log ""; log "\$ $cmd"
  out="$(eval "$cmd" 2>&1)"; rc=$?
  log "$out"
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
  '[ "$(npm test 2>&1 | grep -cF "Tests  25 passed (25)")" -ge 1 ]' \
  "The 25 contract tests are the behavior contract the refactor must preserve." \
  "npm install then npm test; if a test genuinely changed, update the runbook expectations" \
  "npm test does not report 25 passing tests. Show which test changed and why."

# ------------------------------------------------------------------- clip 2
$FMT section "clip 2 - map noisy modules"
check "c2" "two duplicate normalization sites" \
  '[ "$(grep -rl "value === '"'"'p0'"'"'" supporthub-api/modern/src | wc -l | tr -d " ")" -eq 2 ]' \
  "The duplication must exist in exactly two places: the util and the inline copy inside createTicket." \
  "git checkout -- supporthub-api/modern/src" \
  "Priority normalization should appear in exactly three files under supporthub-api/modern/src. List where it appears now."

check "c2" "dead helper has no importers" \
  '[ "$(grep -rn "from '"'"'.*utils/legacy" supporthub-api/modern/src supporthub-api/modern/tests | wc -l | tr -d " ")" -eq 0 ]' \
  "normalizeLegacySeverity must be genuinely unreferenced or the dead-code finding is false." \
  "Remove any import of utils/legacy" \
  "Find every importer of supporthub-api/modern/src/utils/legacy.ts and remove them."

check "c2" "one load-bearing function carries all four responsibilities" \
  'node -e "
    const fs=require(\"fs\");
    const s=fs.readFileSync(\"supporthub-api/modern/src/services/ticketService.ts\",\"utf8\");
    const fn=s.slice(s.indexOf(\"export function createTicket(\"), s.indexOf(\"export interface TransitionResult\"));
    const ok = /failures\.push/.test(fn) && /value === .p0./.test(fn) && /tickets\.set\(/.test(fn) && /createdAt: ticket\.createdAt/.test(fn);
    process.exit(ok ? 0 : 1);
  "' \
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
  '[ "$(git rev-parse --verify -q demo/m1-c2-start 2>/dev/null)" = "$(git rev-parse --verify -q demo/m1-c2-captured 2>/dev/null)" ] && [ -n "$(git rev-parse --verify -q demo/m1-c2-start 2>/dev/null)" ]' \
  "This demo writes nothing. If the two checkpoints differ, the planning pass edited files." \
  "git branch -f demo/m1-c2-captured demo/m1-c2-start" \
  "demo/m1-c2-start and demo/m1-c2-captured must reference the same commit. Show both."

check "c2" "prompt file present" '[ -f plans/prompts/m1-c2-map-codebase.md ]' \
  "The runbook tells the author to paste this prompt." \
  "git checkout -- plans/prompts/" \
  "plans/prompts/m1-c2-map-codebase.md is missing. Restore it from git history."

# ------------------------------------------------------------------- clip 3
$FMT section "clip 3 - execute refactor with ExecPlan"
check "c3" "refactor ExecPlan present" '[ -f plans/ExecPlan.md ]' \
  "Clip 3 reads this file in its first step." \
  "git checkout -- plans/ExecPlan.md" \
  "plans/ExecPlan.md is missing. Restore it."

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
$FMT section "clip 5 - inventory legacy service"
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
  '[ "$(npm run test:migration 2>&1 | grep -cF "# pass 8")" -ge 1 ]' \
  "Clip 5 shows the legacy service working before planning its migration." \
  "npm install then npm run test:migration" \
  "npm run test:migration does not report 8 passing tests. Show the failure."

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

check "c5" "migration plan opens on exactly one milestone" \
  '[ "$(grep -c "^### Milestone" plans/migration-plan.md)" -eq 1 ]' \
  "The rejection step needs a single batched milestone to act on. Two already-split checkpoints mean a previous run was not reset." \
  "git checkout -- plans/migration-plan.md" \
  "plans/migration-plan.md must contain exactly one proposed milestone. Show how many it contains."

check "c5" "that milestone batches code with a dependency upgrade" \
  'node -e "
    const fs=require(\"fs\");
    const t=fs.readFileSync(\"plans/migration-plan.md\",\"utf8\");
    const i=t.indexOf(\"### Milestone 1\");
    const j=t.indexOf(\"## Rollback visibility\");
    const m=t.slice(i, j<0?t.length:j);
    const code=/routes\/tickets\.js.*routes\/tickets\.ts/.test(m);
    const dep=/express.{0,4}4\.x to 5\.x/.test(m);
    process.exit(code \&\& dep ? 0 : 1);
  "' \
  "If the milestone does not combine a route migration with a dependency upgrade, there is nothing objectionable to reject." \
  "git checkout -- plans/migration-plan.md" \
  "Milestone 1 must combine the route migration with the Express upgrade. Show its scope."

check "c5" "that milestone is unreviewed" \
  'grep -q "Not yet reviewed" plans/migration-plan.md' \
  "A reviewed plan means a previous run was not reset." \
  "git checkout -- plans/migration-plan.md" \
  "The proposed milestones must be marked as not yet reviewed."

# ------------------------------------------------------------------- clip 6
$FMT section "clip 6 - migrate one route"
check "c6" "framework skill present" \
  '[ -f framework-skill/node-express-migration/SKILL.md ]' \
  "EO2d requires the equivalent framework skill to be available in the repository." \
  "git checkout -- .codex/" \
  "The express-typescript-migration skill is missing. Restore it."

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

$FMT section "verdict"
if [ ${#FAILED[@]} -eq 0 ]; then
  $FMT item "all checks passed"
  log ""; log "VERDICT  READY - all Module 1 demos can be run."
  $FMT verdict pass "Module 1 is ready. Transcript: module1/logs/module1_preflight.txt"
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
$FMT verdict fail "${#FAILED[@]} check(s) failed. See module1/logs/module1_preflight.txt"
exit 1

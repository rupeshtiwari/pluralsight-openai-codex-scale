#!/usr/bin/env bash
# Module 2 author preparation: assert what a shell can actually assert.
#
# This script was referenced in docs/integration-readiness.md long before it
# existed, and was deliberately left unwritten until Gate 1's three answers were
# recorded -- a script reporting "integrations ready" against an unconfirmed
# contract would have been a false PASS on the gate that decides Module 2's
# shape.
#
# It is now written, and its scope is the point:
#
#   IT DOES NOT CHECK PLUGIN REACHABILITY. Nothing here talks to Sentry, Slack,
#   Linear or GitHub. A shell cannot ask the Codex desktop app whether its
#   plugins answer, and a script that claimed to would be asserting on a
#   contract it never tested. Reachability is established on camera, by C2 step
#   1's readiness step, where a viewer sees the response.
#
# What it does check: the fixtures, the rubric and the configuration shape that
# have to be right BEFORE that on-camera step is worth running.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FMT="node ${ROOT}/scripts/fmt.mjs"
cd "$ROOT"

FAILED=0
ok()   { $FMT item "$1: PASS"; }
bad()  { $FMT item "$1: FAIL - $2"; FAILED=$((FAILED+1)); }

$FMT title "Module 2 integration preparation" "Fixtures, rubric and config shape - not plugin reachability"

# --- fixtures parse and carry their seeded ids ------------------------------
$FMT section "FIXTURES"
for f in automation/sentry-fixtures/issues.json \
         automation/github-seed/issues.json \
         automation/github-seed/commits.json \
         automation/triage/baseline-manual-sweep.json; do
  if [ ! -f "$f" ]; then bad "$(basename "$f")" "missing"; continue; fi
  if node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" 2>/dev/null; then
    ok "$(basename "$f") parses"
  else
    bad "$(basename "$f")" "invalid JSON - git checkout -- $f"
  fi
done

# Stable ids are asserted because downstream steps quote them verbatim.
for id in evt-1042 evt-1043 evt-1088 evt-1099; do
  if grep -q "$id" automation/sentry-fixtures/issues.json 2>/dev/null; then ok "$id seeded"
  else bad "$id" "not in automation/sentry-fixtures/issues.json"; fi
done
if grep -q "incident-2001" automation/triage/baseline-manual-sweep.json 2>/dev/null; then
  ok "baseline names incident-2001"
else bad "baseline" "incident-2001 missing - the recorded standard C2 step 4 compares against"; fi

# --- starting state ---------------------------------------------------------
$FMT section "STARTING STATE"
if node "${ROOT}/scripts/check.mjs" m2-c2-starts-without-the-correction 2>/dev/null; then
  ok "C2 starts without its own answer on disk"
else bad "C2 starting state" "run ./module2/scripts/demo_reset.sh"; fi

# --- rubric -----------------------------------------------------------------
$FMT section "TRIAGE RUBRIC"
if [ -f docs/triage-rubric.md ]; then
  MISSING=""
  for p in P0 P1 P2 P3; do
    grep -qE "^\|\s*\*\*$p\*\*\s*\|" docs/triage-rubric.md || MISSING="$MISSING $p"
  done
  if [ -z "$MISSING" ]; then ok "P0-P3 all defined"
  else bad "rubric" "no row defines:$MISSING"; fi
  grep -q "100 or more" docs/triage-rubric.md \
    && ok "P1 affected-user threshold present" \
    || bad "rubric" "P1 threshold altered - git checkout -- docs/triage-rubric.md"
else
  bad "rubric" "docs/triage-rubric.md missing"
fi

# --- configuration SHAPE, never values --------------------------------------
# Keys only. No value is read, compared or printed: .env.local holds real
# tokens, and this script must be safe to run with a recording in progress.
$FMT section "CONFIG SHAPE"
if [ -f .env.example ]; then
  MISSING=""
  for k in SENTRY_DSN SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT SENTRY_BASE_URL \
           SLACK_DEMO_CHANNEL LINEAR_DEMO_TEAM LINEAR_DEMO_PROJECT; do
    grep -qE "^$k=" .env.example || MISSING="$MISSING $k"
  done
  if [ -z "$MISSING" ]; then ok ".env.example declares every key the demo needs"
  else bad ".env.example" "missing:$MISSING"; fi
else
  bad ".env.example" "missing"
fi
if git ls-files --error-unmatch .env .env.local >/dev/null 2>&1; then
  bad "secrets" ".env or .env.local is TRACKED - remove it from git immediately"
else
  ok ".env and .env.local untracked"
fi

# --- verdict ----------------------------------------------------------------
$FMT section "WHAT THIS DOES NOT COVER"
$FMT item "Plugin reachability - Sentry, Slack, Linear and GitHub answering."
$FMT item "That is C2 step 1's on-camera readiness step, and cannot be asserted from a shell."
$FMT item "Gate results are recorded in docs/integration-readiness.md."

if [ "$FAILED" -eq 0 ]; then
  $FMT verdict pass "Fixtures, rubric and config shape are ready. Reachability is still C2 step 1's job."
  exit 0
else
  $FMT verdict fail "$FAILED check(s) failed above."
  exit 1
fi

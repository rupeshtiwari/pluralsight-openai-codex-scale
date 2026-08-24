#!/usr/bin/env bash
# SupportHub environment setup for macOS.
#
# Checks every dependency the demos need, installs what is missing, and leaves
# correct existing installations alone. Prints the installed version next to the
# expected version for each item and ends with an overall readiness verdict.
#
# Run once after cloning:
#   ./environment-setup/setup.sh

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${REPO_ROOT}/environment-setup/install.log"
FMT="node ${REPO_ROOT}/scripts/fmt.mjs"

NODE_MAJOR_EXPECTED=24
FAILURES=()

mkdir -p "$(dirname "$LOG")"
: > "$LOG"

log() { echo "$@" >> "$LOG"; }

report() {
  # report <name> <expected> <installed-or-empty> <fix-hint>
  local name="$1" expected="$2" installed="$3" fix="$4" found="${5:-}"
  if [ -n "$installed" ]; then
    $FMT value "$name" "$installed   (expected $expected)"
    log "PASS $name installed=$installed expected=$expected"
  else
    $FMT value "$name" "${found:-MISSING}   (expected $expected)"
    log "FAIL $name found=${found:-MISSING} expected=$expected fix=$fix"
    FAILURES+=("$name|$fix")
  fi
}

$FMT title "SupportHub environment setup" \
        "Verify every dependency the SupportHub demos require on macOS"

# --- Homebrew -------------------------------------------------------------
if command -v brew >/dev/null 2>&1; then
  report "Homebrew" "any" "$(brew --version | head -1 | awk '{print $2}')" ""
else
  echo "  Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" >>"$LOG" 2>&1
  if command -v brew >/dev/null 2>&1; then
    report "Homebrew" "any" "$(brew --version | head -1 | awk '{print $2}')" ""
  else
    report "Homebrew" "any" "" "Install manually from https://brew.sh then re-run this script"
  fi
fi

# --- Node.js --------------------------------------------------------------
# Returns the running Node version only when it meets the required major.
# A version that is present but too old must not count as satisfied - the
# demos rely on Node 24 semantics.
node_if_satisfied() {
  command -v node >/dev/null 2>&1 || return 0
  local v major
  v="$(node --version)"                            # e.g. v24.4.1
  major="$(echo "$v" | sed 's/^v//' | cut -d. -f1)"
  case "$major" in
    ''|*[!0-9]*) return 0 ;;
  esac
  [ "$major" -ge "$NODE_MAJOR_EXPECTED" ] && echo "$v"
  return 0
}

NODE_OK="$(node_if_satisfied)"
if [ -z "$NODE_OK" ] && command -v brew >/dev/null 2>&1; then
  echo "  Installing Node.js ${NODE_MAJOR_EXPECTED}..."
  brew install "node@${NODE_MAJOR_EXPECTED}" >>"$LOG" 2>&1
  brew link --overwrite --force "node@${NODE_MAJOR_EXPECTED}" >>"$LOG" 2>&1
  NODE_OK="$(node_if_satisfied)"                   # re-validate, do not assume
fi
NODE_FOUND=""
if [ -z "$NODE_OK" ] && command -v node >/dev/null 2>&1; then
  NODE_FOUND="$(node --version) (too old)"
fi
report "Node.js" "v${NODE_MAJOR_EXPECTED}.x or newer" "$NODE_OK" \
       "brew install node@${NODE_MAJOR_EXPECTED} && brew link --overwrite --force node@${NODE_MAJOR_EXPECTED}" \
       "$NODE_FOUND"

# --- npm ------------------------------------------------------------------
report "npm" "bundled with Node" \
       "$(command -v npm >/dev/null 2>&1 && npm --version || echo '')" \
       "Reinstall Node.js; npm ships with it"

# --- Git ------------------------------------------------------------------
report "Git" "any" \
       "$(command -v git >/dev/null 2>&1 && git --version | awk '{print $3}' || echo '')" \
       "brew install git"

# --- tmux -----------------------------------------------------------------
if ! command -v tmux >/dev/null 2>&1 && command -v brew >/dev/null 2>&1; then
  echo "  Installing tmux..."
  brew install tmux >>"$LOG" 2>&1
fi
report "tmux" "any" \
       "$(command -v tmux >/dev/null 2>&1 && tmux -V | awk '{print $2}' || echo '')" \
       "brew install tmux"

# --- Project dependencies -------------------------------------------------
$FMT section "project dependencies"
if [ -d "${REPO_ROOT}/node_modules" ]; then
  $FMT item "node_modules present - skipping install"
  log "PASS node_modules already present"
else
  echo "  Installing project dependencies (npm install)..."
  ( cd "$REPO_ROOT" && npm install >>"$LOG" 2>&1 )
  if [ -d "${REPO_ROOT}/node_modules" ]; then
    $FMT item "npm install completed"
    log "PASS npm install completed"
  else
    $FMT item "npm install FAILED - see environment-setup/install.log"
    log "FAIL npm install"
    FAILURES+=("project dependencies|Run 'npm install' from the repository root and read environment-setup/install.log")
  fi
fi

# --- Environment file -----------------------------------------------------
$FMT section "environment file"
if [ -f "${REPO_ROOT}/.env.local" ]; then
  $FMT item ".env.local present"
else
  $FMT item ".env.local not found - copy .env.example to .env.local and fill it in"
fi

# --- Verdict --------------------------------------------------------------
if [ ${#FAILURES[@]} -eq 0 ]; then
  $FMT verdict pass "Environment is ready. Full transcript: environment-setup/install.log"
  exit 0
fi

$FMT section "how to fix"
for entry in "${FAILURES[@]}"; do
  $FMT item "${entry%%|*}: ${entry##*|}"
done
$FMT verdict fail "${#FAILURES[@]} dependency check(s) failed. Fix the items above and re-run."
exit 1

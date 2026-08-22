#!/usr/bin/env bash
# Attribution gate.
#
# Fails if any commit about to be pushed carries an unwanted author,
# committer, or message trailer. Touches no application code and runs no
# tests; it inspects commit metadata only.
#
# Install as a pre-push hook:
#   ./scripts/check-attribution.sh --install
#
# Run manually against everything:
#   ./scripts/check-attribution.sh

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FMT="python3 ${ROOT}/scripts/fmt.py"
cd "$ROOT"

# Identity fields: any mention of these names is disqualifying.
IDENT_PATTERN='claude|anthropic|noreply@anthropic\.com'
# Commit messages: match an actual trailer at the start of a line, not prose
# that happens to discuss attribution. A commit explaining this very gate must
# not trip it.
MSG_PATTERN='^[[:space:]]*co-authored-by:'

if [ "${1:-}" = "--install" ]; then
  HOOK="${ROOT}/.git/hooks/pre-push"
  printf '#!/usr/bin/env bash\nexec "%s/scripts/check-attribution.sh"\n' "$ROOT" > "$HOOK"
  chmod +x "$HOOK"
  $FMT box "Attribution gate installed" "Runs automatically before every push"
  $FMT star "hook" ".git/hooks/pre-push"
  exit 0
fi

# Decide what to inspect. A pre-push hook receives ranges on stdin; when there
# is no upstream yet, or when run by hand, inspect every reachable commit.
RANGE="--all"
if [ -n "${1:-}" ]; then
  RANGE="$1"
elif UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)"; then
  RANGE="${UPSTREAM}..HEAD"
  [ -z "$(git rev-list "$RANGE" 2>/dev/null)" ] && RANGE="--all"
fi

$FMT box "Attribution gate" "Reject commits attributed to anyone but the author"

BAD_IDENT="$(git log $RANGE --format='%H|%an <%ae>|%cn <%ce>' 2>/dev/null \
             | grep -iE "$IDENT_PATTERN" || true)"
BAD_MSG="$(git log $RANGE --format='%H%n%B%n---' 2>/dev/null \
           | grep -iE "$MSG_PATTERN" || true)"

$FMT star "range inspected" "$RANGE"
$FMT star "commits inspected" "$(git rev-list $RANGE 2>/dev/null | wc -l | tr -d ' ')"

if [ -z "$BAD_IDENT" ] && [ -z "$BAD_MSG" ]; then
  $FMT verdict pass "No unwanted attribution found."
  exit 0
fi

if [ -n "$BAD_IDENT" ]; then
  $FMT section "commits with an unwanted author or committer"
  while IFS= read -r line; do $FMT item "$line"; done <<< "$BAD_IDENT"
fi
if [ -n "$BAD_MSG" ]; then
  $FMT section "commit messages with an unwanted trailer"
  while IFS= read -r line; do $FMT item "$line"; done <<< "$BAD_MSG"
fi

$FMT section "how to fix"
$FMT item "Latest commit only: git commit --amend --reset-author --no-edit"
$FMT item "Then re-run: ./scripts/check-attribution.sh"
$FMT verdict fail "Push blocked. Correct the attribution above first."
exit 1

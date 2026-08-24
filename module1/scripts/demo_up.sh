#!/usr/bin/env bash
# Bring the Module 1 demo environment up.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FMT="node ${ROOT}/scripts/fmt.mjs"
cd "$ROOT"

$FMT title "Module 1 demo up" "Start the SupportHub API and confirm it answers"

if [ ! -d node_modules ]; then
  $FMT item "installing dependencies"
  npm install >/dev/null 2>&1
fi

if lsof -ti:3000 >/dev/null 2>&1; then
  $FMT item "port 3000 already in use - reusing the running service"
else
  npm run build >/dev/null 2>&1
  node supporthub-api/modern/dist/src/server.js > "${ROOT}/module1/logs/module1_server.log" 2>&1 &
  echo $! > "${ROOT}/.demo-server-1.pid"
  sleep 2
  $FMT item "started supporthub-api on port 3000"
fi

HEALTH="$(curl -sS http://localhost:3000/health 2>/dev/null)"
if [ -n "$HEALTH" ]; then
  $FMT value "health" "$HEALTH"
  $FMT verdict pass "Module 1 environment is up."
  exit 0
fi
$FMT verdict fail "Service did not answer on port 3000. See module1/logs/module1_server.log"
exit 1

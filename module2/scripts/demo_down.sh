#!/usr/bin/env bash
# Stop the Module 2 demo environment.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FMT="node ${ROOT}/scripts/fmt.mjs"
cd "$ROOT"

$FMT title "Module 2 demo down" "Stop the SupportHub API started for this module"

PIDFILE="${ROOT}/.demo-server-2.pid"
if [ -f "$PIDFILE" ]; then
  PID="$(cat "$PIDFILE")"
  if kill "$PID" 2>/dev/null; then
    $FMT item "stopped process $PID"
  else
    $FMT item "process $PID was not running"
  fi
  rm -f "$PIDFILE"
else
  $FMT item "no process was started by this module"
fi
$FMT verdict pass "Module 2 environment is down."

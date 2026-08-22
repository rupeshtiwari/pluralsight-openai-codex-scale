#!/usr/bin/env bash
# Stop the Module 1 demo environment.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FMT="python3 ${ROOT}/scripts/fmt.py"
cd "$ROOT"

$FMT box "Module 1 demo down" "Stop the SupportHub API started for this module"

PIDFILE="${ROOT}/.demo-server-1.pid"
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
$FMT verdict pass "Module 1 environment is down."

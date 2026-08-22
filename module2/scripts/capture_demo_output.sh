#!/usr/bin/env bash
# Capture the deterministic evidence behind every Module 2 demo claim.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FMT="python3 ${ROOT}/scripts/fmt.py"
OUT="${ROOT}/preflight-logs/module2_demo_output.txt"
cd "$ROOT"
mkdir -p "$(dirname "$OUT")"

{
echo "MODULE 2 DEMO OUTPUT CAPTURE"
echo "============================"
echo
echo "CLIP 2 - Run a manual Codex triage sweep across Sentry and GitHub"
echo "  Objective: EO3a, EO3b"
echo
echo "\$ sentry issues in window"
python3 -c "
import json
d=json.load(open('automation/sentry-fixtures/issues.json'))
print('  window:', d['query_window']['from'], 'to', d['query_window']['to'])
for i in d['issues']:
    wa = 'none' if i['workaround']=='none' else ('unknown' if i['workaround']=='unknown' else 'yes')
    print(f\"  {i['id']:<15} users={i['affectedUsers']:<4} occ={i['occurrences']:<5} workaround={wa}\")
print('  groups:', [g['id'] for g in d['groups']])
"
echo "  EXPECTED  five issues, one group"
echo
echo "\$ commit timing - recency is not causation"
python3 -c "
import json
for c in json.load(open('automation/github-fixtures/commits.json'))['commits']:
    print(f\"  {c['sha']}  {c['committedAt']}  {c['message']}\")
"
echo "  EXPECTED  d4e5f6a is newer than a1b2c3d but touches no failing-path file"
echo
echo "CLIP 3 - Schedule Codex triage and route work to Slack and Linear"
echo "  Objective: EO3c, EO3d"
echo
echo "\$ validated triage baseline"
python3 -c "
import json
b=json.load(open('automation/triage/baseline-manual-sweep.json'))
for f in b['findings']:
    print(f\"  {f['id']:<16} {f['priority']:<9} users={f['affectedUsers']:<4} route={f['route']}\")
print('  rejected:', b['rejectedCorrelations'][0]['commit'])
"
echo "  EXPECTED  P0, P2, P3, deferred; two routable; d4e5f6a rejected"
echo
echo "\$ routing payloads"
python3 -c "
import json,glob
for p in sorted(glob.glob('automation/*-drafts/*.json')):
    d=json.load(open(p))
    print(f\"  {p.split('/')[1]:<14} {d['sourceFinding']:<15} status={d['status']:<6} approvedBy={d['approvedBy']}\")
"
echo "  EXPECTED  three drafts, none approved, none sent"
echo
echo "CLIP 5 - Inspect automation diffs in the Codex review pane"
echo "  Objective: EO4a"
echo
echo "\$ run-3001 hunks"
python3 -c "
import json
for h in json.load(open('automation/runs/run-3001.json'))['hunks']:
    print(f\"  {h['verdict']:<8} {h['file']}\")
"
echo "  EXPECTED  one valid, one invalid"
echo
echo "\$ git apply --check automation/runs/run-3001.patch"
git apply --check automation/runs/run-3001.patch && echo "  applies cleanly"
echo
echo "CLIP 6 - Trace a failed Codex automation and recover safely"
echo "  Objective: EO4a"
echo
echo "\$ run-3002 failure trace"
python3 -c "
import json
r=json.load(open('automation/runs/run-3002.json'))
print('  status      :', r['status'])
print('  chose commit:', r['correlation']['chose'])
print('  correct     :', r['correlation']['correct'])
print('  fault type  :', r['correlation']['faultType'])
for h in r['hunks']:
    print(f\"  {h['verdict']:<8} {h['file']}\")
"
echo "  EXPECTED  failed, bad source assumption, one valid and one invalid hunk"
echo
echo "\$ run-3003 corrected rerun"
python3 -c "
import json
r=json.load(open('automation/runs/run-3003.json'))
print('  status:', r['status'], ' commit:', r['correlation']['chose'])
print('  gates :', r['validation'])
"
echo
echo "END OF CAPTURE"
} > "$OUT" 2>&1

$FMT box "Module 2 output capture" "Deterministic evidence behind every demo claim"
$FMT star "written to" "preflight-logs/module2_demo_output.txt"
$FMT star "lines" "$(wc -l < "$OUT" | tr -d ' ')"
$FMT verdict pass "Capture complete."

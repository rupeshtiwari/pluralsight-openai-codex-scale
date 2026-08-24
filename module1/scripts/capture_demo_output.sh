#!/usr/bin/env bash
# Capture the deterministic evidence behind every Module 1 demo claim.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FMT="node ${ROOT}/scripts/fmt.mjs"
OUT="${ROOT}/module1/logs/module1_demo_output.txt"
cd "$ROOT"
mkdir -p "$(dirname "$OUT")"

{
echo "MODULE 1 DEMO OUTPUT CAPTURE"
echo "============================"
echo
echo "CLIP 2 - Map noisy TypeScript modules with Codex before editing"
echo "  Objective: EO1a, EO1d"
echo
echo "\$ grep -rl \"value === 'p0'\" supporthub-api/modern/src"
grep -rl "value === 'p0'" supporthub-api/modern/src
echo "  EXPECTED  three files"
echo
echo "\$ grep -rn \"from '.*utils/legacy\" supporthub-api/modern/src supporthub-api/modern/tests | wc -l"
grep -rn "from '.*utils/legacy" supporthub-api/modern/src supporthub-api/modern/tests | wc -l
echo "  EXPECTED  0 importers"
echo
echo "\$ wc -l supporthub-api/modern/src/services/ticketService.ts"
wc -l supporthub-api/modern/src/services/ticketService.ts
echo
echo "CLIP 3 - Execute a Codex refactor with ExecPlan checkpoints"
echo "  Objective: EO1b, EO1c"
echo
echo "\$ sed -n '/## Intended changes/,/## Behavior contracts/p' plans/ExecPlan.md"
sed -n '/## Intended changes/,/## Behavior contracts/p' plans/ExecPlan.md
echo
echo "\$ npm test"
npm test 2>&1 | grep -E "Test Files|Tests "
echo "  EXPECTED  25 passed"
echo
echo "CLIP 5 - Inventory a legacy Express 4 service with Codex"
echo "  Objective: EO2a, EO2b"
echo
echo "\$ find supporthub-api/migration -type f -not -path '*/node_modules/*' | sort"
find supporthub-api/migration -type f -not -path '*/node_modules/*' | sort
echo
echo "\$ npm run test:legacy"
npm run test:legacy 2>&1 | grep -E "^# (tests|pass|fail)"
echo "  EXPECTED  8 pass, 0 fail"
echo
echo "\$ grep -n __dirname supporthub-api/migration/services/ticketService.js"
grep -n __dirname supporthub-api/migration/services/ticketService.js
echo
echo "CLIP 6 - Migrate one Express route to TypeScript with framework guidance"
echo "  Objective: EO2c, EO2d"
echo
echo "\$ express version per workspace"
node -p "'  modern: express ' + require('./node_modules/express/package.json').version"
node -p "'  legacy: express ' + require('./supporthub-api/migration/node_modules/express/package.json').version"
echo "  EXPECTED  modern 5.x, legacy 4.x"
echo
echo "\$ npm run lint && npm run typecheck && npm run build && npm run test:route"
npm run lint >/dev/null 2>&1 && echo "  lint      PASS" || echo "  lint      FAIL"
npm run typecheck >/dev/null 2>&1 && echo "  typecheck PASS" || echo "  typecheck FAIL"
npm run build >/dev/null 2>&1 && echo "  build     PASS" || echo "  build     FAIL"
npm run test:route 2>&1 | grep -E "Tests " | sed 's/^/  test:route /'
echo
echo "END OF CAPTURE"
} > "$OUT" 2>&1

$FMT title "Module 1 output capture" "Deterministic evidence behind every demo claim"
$FMT value "written to" "module1/logs/module1_demo_output.txt"
$FMT value "lines" "$(wc -l < "$OUT" | tr -d ' ')"
$FMT verdict pass "Capture complete."

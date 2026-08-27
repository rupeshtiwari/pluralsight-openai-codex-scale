#!/usr/bin/env node
/**
 * Proves every named check FAILS on the condition it exists to detect.
 *
 * A check that cannot fail is worse than no check: it reports green on the one
 * state it was written to catch, and it is believed. Reading a check does not
 * establish that it works — `milestone-batched` read correctly for weeks while
 * passing on a correctly-split plan, because its slice spanned two milestone
 * entries and its two patterns matched in different ones.
 *
 * So each case below states the mutation in the terms the demo would produce —
 * "Codex split the milestone in two", not "delete line 84" — writes it into a
 * throwaway CHECK_ROOT, and asserts the check goes red. Each case also asserts
 * the UNMUTATED copy goes green, so a mutation that fails for an unrelated
 * reason (a typo, a bad path) cannot be mistaken for proof.
 *
 *   node scripts/check-negatives.mjs        exit 0 = every check discriminates
 *
 * See "Prove the negative case" in docs/troubleshooting.md. Adding a check to
 * scripts/check.mjs without adding a case here leaves it unproven, and this
 * script fails if any relocatable check has no case.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const TMP = join(process.cwd(), '.check-negatives-tmp');

/**
 * Checks that read git rather than files. CHECK_ROOT cannot relocate them, so
 * they are not provable here; each names how it was proven instead.
 */
const GIT_BACKED = {
  'c2-refs-identical': 'reads git, so CHECK_ROOT cannot relocate it. Proven both ways by hand: point origin/demo/m1-c2-captured at a different commit and it reports "different commits in the repository"; leave a local branch stale and it PASSES with a note, which is the distinction it was rebuilt to make',
  'no-route-migrated': 'create a throwaway supporthub-api/migration/routes/x.ts and watch it go red',
  'demo-checkout-refs-exist': 'it found two on its first run -- the C6 evidence artifact and the C6 runbook both handed out a checkout of demo/m1-c6-start, which cannot exist until C5 is walked',
  'contract-tests-pass': 'it needs the real node_modules, so CHECK_ROOT cannot relocate it. Proven by hand both ways: append a failing test and it reports "1 contract test(s) failing"; append a passing one and it reports "26 contract tests passed, expected 25"',
  'migration-tests-pass': 'append a failing test to supporthub-api/migration/tests/tickets.test.js and watch it go red -- done, it does',
};

const CASES = [
  {
    check: 'load-bearing-function',
    file: 'supporthub-api/modern/src/services/ticketService.ts',
    what: 'the cleanup already happened — storage access moved out of createTicket',
    mutate: (s) => {
      const i = s.indexOf('export function createTicket(');
      const j = s.indexOf('export interface TransitionResult');
      if (i < 0 || j < 0) throw new Error('createTicket bounds not found');
      // Extracting the store write is exactly what the C3 cleanup pass does.
      const body = s.slice(i, j).replace(/tickets\.set\(/, 'storeTicket(');
      return s.slice(0, i) + body + s.slice(j);
    },
  },
  {
    check: 'milestone-batched',
    file: 'plans/migration-plan.md',
    what: 'Codex split the batched milestone into two checkpoints',
    mutate: (s) => {
      const line = s.split('\n').find((l) => l.startsWith('| Scope |') && l.includes('4.x to 5.x'));
      if (!line) throw new Error('batched scope row not found');
      return s.replace(
        line,
        '| Scope | `routes/tickets.js` to `routes/tickets.ts` |\n'
          + '\n### Milestone 2 — Upgrade Express 4.x to 5.x\n\n| | |\n|---|---|\n'
          + '| Scope | `express` 4.x to 5.x |',
      );
    },
  },
  {
    check: 'milestone-batched',
    file: 'plans/migration-plan.md',
    what: 'the milestone lost its route migration and is only a dependency bump',
    mutate: (s) => s.replace('`routes/tickets.js` to `routes/tickets.ts`; ', ''),
  },
  {
    check: "skill-not-ambient",
    file: "AGENTS.md",
    what: "the old ambient directive is back — AGENTS.md tells Codex to consult the skill",
    mutate: (s) => s.replace(
      "Do not consult it unless the prompt asks you to.",
      "Consult it before migrating any route.",
    ),
  },
  {
    check: "skill-not-ambient",
    file: "AGENTS.md",
    what: "the opt-out sentence was dropped, so nothing states the skill is opt-in",
    mutate: (s) => s.replace("Do not consult it unless the prompt asks you to.", ""),
  },
  {
    check: "skill-not-ambient",
    file: "AGENTS.md",
    what: "an always-consult instruction was added alongside the opt-out",
    mutate: (s) => s.replace(
      "Do not consult it unless the prompt asks you to.",
      "Do not consult it unless the prompt asks you to. Always consult it for migrations.",
    ),
  },
];

/**
 * Cases whose control and negative are written from scratch rather than mutated
 * from a repository file. doc-links-resolve needs this: mutating one real README
 * would drag in every path it links to, so the control could not be green for the
 * right reason. A synthetic root isolates the two detectors instead.
 */
/**
 * Builds a plans/migration-plan.md body with the given checkpoint entries, so
 * the split-plan guards can be exercised against shapes that do not exist in
 * the repository yet. Each entry is [title, scope, extraRows].
 */
function planWith(entries) {
  let s = "# Migration plan\n\n## Milestones\n\n";
  for (const [title, scope, rows] of entries) {
    s += "### " + title + "\n\n| | |\n|---|---|\n| Scope | " + scope + " |\n";
    s += (rows === undefined ? "| Validation | `npm test` |\n| Rollback point | abc1234 |\n" : rows);
    s += "\n";
  }
  return s + "## Validation checks\n\nrun the gates\n";
}

const ROUTE_ONLY = "`routes/tickets.js` to `routes/tickets.ts`";
const DEP_ONLY = "`express` 4.x to 5.x";
const BATCHED = ROUTE_ONLY + "; " + DEP_ONLY;

const SPLIT = [
  ["Checkpoint 1 — Migrate the route slice", ROUTE_ONLY],
  ["Checkpoint 2 — Upgrade the platform", DEP_ONLY],
];

const SPLIT_CASES = [];
for (const check of ["c5-captured-opens-on-split", "c6-start-opens-on-split"]) {
  SPLIT_CASES.push(
    {
      check,
      what: "the batched milestone is back — the plan was never split, or the branch was cut from the wrong parent",
      control: { "plans/migration-plan.md": planWith(SPLIT) },
      negative: { "plans/migration-plan.md": planWith([["Milestone 1 — Migrate and upgrade", BATCHED]]) },
    },
    {
      check,
      what: "the plan has three checkpoints, so the split did not produce the two the demo claims",
      control: { "plans/migration-plan.md": planWith(SPLIT) },
      negative: {
        "plans/migration-plan.md": planWith([...SPLIT, ["Checkpoint 3 — Tidy up", "leftovers"]]),
      },
    },
  );
}

// The subtle one: two entries, but the split did not actually separate the
// concerns. Counting entries alone would pass this.
SPLIT_CASES.push(
  {
    check: "c6-start-opens-on-split",
    what: "there are two entries but one still batches the route with the dependency upgrade",
    control: { "plans/migration-plan.md": planWith(SPLIT) },
    negative: {
      "plans/migration-plan.md": planWith([
        ["Checkpoint 1 — Migrate and upgrade", BATCHED],
        ["Checkpoint 2 — Tidy up", "leftovers"],
      ]),
    },
  },
  {
    check: "c6-start-opens-on-split",
    what: "a checkpoint has no rollback point, so it cannot be reverted independently",
    control: { "plans/migration-plan.md": planWith(SPLIT) },
    negative: {
      "plans/migration-plan.md": planWith([
        ["Checkpoint 1 — Migrate the route slice", ROUTE_ONLY, "| Validation | `npm test` |\n"],
        ["Checkpoint 2 — Upgrade the platform", DEP_ONLY],
      ]),
    },
  },
);

for (const [what, negative] of [["a step heading was shortened, quietly dropping scope the outline promised",{"docs/outline-clip-map.json":"{\"objectives\":{\"TO1\":\"Do the terminal thing\",\"EO1a\":\"Do the enabling thing\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\",\"EO1a\"],\"bullets\":[\"First bullet\",\"Second bullet\"]}}}","rb.md":"## Learning Objectives\n\n| LO | Description |\n|---|---|\n| TO1 | Do the terminal thing |\n| EO1a | Do the enabling thing |\n\n## Terms\n\n## Step 1 — First bullet cut short\n\n## Step 2 — Second bullet\n"}],["a clip carries an objective the outline does not assign it",{"docs/outline-clip-map.json":"{\"objectives\":{\"TO1\":\"Do the terminal thing\",\"EO1a\":\"Do the enabling thing\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\",\"EO1a\"],\"bullets\":[\"First bullet\",\"Second bullet\"]}}}","rb.md":"## Learning Objectives\n\n| LO | Description |\n|---|---|\n| TO1 | Do the terminal thing |\n| EO1a | Do the enabling thing |\n| EO1d | Extra |\n\n## Terms\n\n## Step 1 — First bullet\n\n## Step 2 — Second bullet\n"}],["an objective description was reworded away from the outline",{"docs/outline-clip-map.json":"{\"objectives\":{\"TO1\":\"Do the terminal thing\",\"EO1a\":\"Do the enabling thing\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\",\"EO1a\"],\"bullets\":[\"First bullet\",\"Second bullet\"]}}}","rb.md":"## Learning Objectives\n\n| LO | Description |\n|---|---|\n| TO1 | Do the terminal thing |\n| EO1a | Do the enabling thing differently |\n\n## Terms\n\n## Step 1 — First bullet\n\n## Step 2 — Second bullet\n"}],["a step was dropped, so the clip no longer covers four bullets",{"docs/outline-clip-map.json":"{\"objectives\":{\"TO1\":\"Do the terminal thing\",\"EO1a\":\"Do the enabling thing\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\",\"EO1a\"],\"bullets\":[\"First bullet\",\"Second bullet\"]}}}","rb.md":"## Learning Objectives\n\n| LO | Description |\n|---|---|\n| TO1 | Do the terminal thing |\n| EO1a | Do the enabling thing |\n\n## Terms\n\n## Step 1 — First bullet\n"}]]) {
  SPLIT_CASES.push({ check: "clip-outline-alignment", what, control: {"docs/outline-clip-map.json":"{\"objectives\":{\"TO1\":\"Do the terminal thing\",\"EO1a\":\"Do the enabling thing\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\",\"EO1a\"],\"bullets\":[\"First bullet\",\"Second bullet\"]}}}","rb.md":"## Learning Objectives\n\n| LO | Description |\n|---|---|\n| TO1 | Do the terminal thing |\n| EO1a | Do the enabling thing |\n\n## Terms\n\n## Step 1 — First bullet\n\n## Step 2 — Second bullet\n"}, negative });
}

for (const [what, negative] of [["a prompt references the framework skill again, so Codex plans by its rule and Step 4 has nothing left to reject",{"module1/m1-c5-inventory-legacy-express4.md":"```text\nInventory the legacy service.\n```\n\n```text\nPropose a plan.\nReference framework-skill/node-express-migration for platform guidance.\nDo not read or apply any framework skill, migration playbook, or external\nguidance - plan from the inventory and the code alone.\n```\n"}],["the explicit prohibition was tidied away, leaving omission — which does not stop retrieval",{"module1/m1-c5-inventory-legacy-express4.md":"```text\nInventory the legacy service.\n```\n\n```text\nPropose a plan.\n```\n"}],["a prompt names SKILL.md directly",{"module1/m1-c5-inventory-legacy-express4.md":"```text\nRead SKILL.md first.\n```\n\n```text\nPropose a plan.\nDo not read or apply any framework skill, migration playbook, or external\nguidance - plan from the inventory and the code alone.\n```\n"}]]) {
  SPLIT_CASES.push({ check: "c5-prompts-skill-free", what, control: {"module1/m1-c5-inventory-legacy-express4.md":"```text\nInventory the legacy service.\n```\n\n```text\nPropose a plan.\nDo not read or apply any framework skill, migration playbook, or external\nguidance - plan from the inventory and the code alone.\n```\n"}, negative });
}

for (const [what, negative] of [["a priority-normalization site was removed, so the seed no longer shows three",{"supporthub-api/modern/src/utils/priority.ts":"export function normalizePriority(v){ if (value === 'p0') return 'urgent'; }\n","supporthub-api/modern/src/utils/legacy.ts":"export function normalizeLegacySeverity(s){ return s; }\n","supporthub-api/modern/src/compat/dirname.ts":"export function moduleDir(u){ return u; }\n","supporthub-api/modern/src/compat/legacyRequire.ts":"export function requireFromEsm(u){ return u; }\n","supporthub-api/modern/src/routes/tickets.ts":"import { getTicket } from '../services/ticketService.js';\ngetTicket('1');\n","supporthub-api/modern/src/services/ticketService.ts":"function toPriority(v){ return v; }\nfunction validateNewTicket(p){ return []; }\nexport function ticketsForIncident(i){ return []; }\nexport function getTicket(id){ if (value === 'p0') return null; return null; }\n"}],["toPriority was exported, turning a dead private helper into an unreferenced export",{"supporthub-api/modern/src/utils/priority.ts":"export function normalizePriority(v){ if (value === 'p0') return 'urgent'; }\n","supporthub-api/modern/src/utils/legacy.ts":"export function normalizeLegacySeverity(s){ return s; }\n","supporthub-api/modern/src/compat/dirname.ts":"export function moduleDir(u){ return u; }\n","supporthub-api/modern/src/compat/legacyRequire.ts":"export function requireFromEsm(u){ return u; }\n","supporthub-api/modern/src/routes/tickets.ts":"import { getTicket } from '../services/ticketService.js';\ngetTicket('1');\n","supporthub-api/modern/src/services/ticketService.ts":"export function toPriority(v){ if (value === 'p0') return 'urgent'; }\nfunction validateNewTicket(p){ return []; }\nexport function ticketsForIncident(i){ return []; }\nexport function getTicket(id){ if (value === 'p0') return null; return null; }\n"}],["validateNewTicket is now called, so it is no longer dead",{"supporthub-api/modern/src/utils/priority.ts":"export function normalizePriority(v){ if (value === 'p0') return 'urgent'; }\n","supporthub-api/modern/src/utils/legacy.ts":"export function normalizeLegacySeverity(s){ return s; }\n","supporthub-api/modern/src/compat/dirname.ts":"export function moduleDir(u){ return u; }\n","supporthub-api/modern/src/compat/legacyRequire.ts":"export function requireFromEsm(u){ return u; }\n","supporthub-api/modern/src/routes/tickets.ts":"import { getTicket } from '../services/ticketService.js';\ngetTicket('1');\n","supporthub-api/modern/src/services/ticketService.ts":"function toPriority(v){ if (value === 'p0') return 'urgent'; }\nfunction validateNewTicket(p){ return []; }\nexport function ticketsForIncident(i){ return []; }\nexport function getTicket(id){ if (value === 'p0') return null; return null; }\nvalidateNewTicket({});\n"}],["an unreferenced export gained a caller, changing the count the runbook states",{"supporthub-api/modern/src/utils/priority.ts":"export function normalizePriority(v){ if (value === 'p0') return 'urgent'; }\n","supporthub-api/modern/src/utils/legacy.ts":"export function normalizeLegacySeverity(s){ return s; }\n","supporthub-api/modern/src/compat/dirname.ts":"export function moduleDir(u){ return u; }\n","supporthub-api/modern/src/compat/legacyRequire.ts":"export function requireFromEsm(u){ return u; }\n","supporthub-api/modern/src/routes/tickets.ts":"import { getTicket } from '../services/ticketService.js';\nimport { ticketsForIncident } from '../services/ticketService.js';\ngetTicket('1'); ticketsForIncident('x');\n","supporthub-api/modern/src/services/ticketService.ts":"function toPriority(v){ if (value === 'p0') return 'urgent'; }\nfunction validateNewTicket(p){ return []; }\nexport function ticketsForIncident(i){ return []; }\nexport function getTicket(id){ if (value === 'p0') return null; return null; }\n"}]]) {
  SPLIT_CASES.push({ check: "c2-seed-shape", what, control: {"supporthub-api/modern/src/utils/priority.ts":"export function normalizePriority(v){ if (value === 'p0') return 'urgent'; }\n","supporthub-api/modern/src/utils/legacy.ts":"export function normalizeLegacySeverity(s){ return s; }\n","supporthub-api/modern/src/compat/dirname.ts":"export function moduleDir(u){ return u; }\n","supporthub-api/modern/src/compat/legacyRequire.ts":"export function requireFromEsm(u){ return u; }\n","supporthub-api/modern/src/routes/tickets.ts":"import { getTicket } from '../services/ticketService.js';\ngetTicket('1');\n","supporthub-api/modern/src/services/ticketService.ts":"function toPriority(v){ if (value === 'p0') return 'urgent'; }\nfunction validateNewTicket(p){ return []; }\nexport function ticketsForIncident(i){ return []; }\nexport function getTicket(id){ if (value === 'p0') return null; return null; }\n"}, negative });
}

const SYNTHETIC_CASES = [
  {
    check: 'skill-tells-unique',
    what: 'a tell was copied into another document, so it silently stops being evidence',
    control: { 'framework-skill/node-express-migration/SKILL.md': 'gate 3 catches emit failures that --noEmit does not surface, and a later gate cannot substitute for an earlier one. Never combine a route migration with a dependency upgrade in one milestone.\n' },
    negative: {
      'framework-skill/node-express-migration/SKILL.md': 'gate 3 catches emit failures that --noEmit does not surface, and a later gate cannot substitute for an earlier one. Never combine a route migration with a dependency upgrade in one milestone.\n',
      'docs/troubleshooting.md': 'remember that a later gate cannot substitute for an earlier one.\n',
    },
  },
  {
    check: 'skill-tells-unique',
    what: 'a tell was removed from the skill, so the pre-check looks for wording that is not there',
    control: { 'framework-skill/node-express-migration/SKILL.md': 'gate 3 catches emit failures that --noEmit does not surface, and a later gate cannot substitute for an earlier one. Never combine a route migration with a dependency upgrade in one milestone.\n' },
    negative: { 'framework-skill/node-express-migration/SKILL.md': 'gate 3 runs the build.\n' },
  },
  {
    check: 'c6-prompt-saved',
    what: 'the runbook prompt was edited and the saved file was not — the drift this exists to catch',
    control: {
      'module1/m1-c6-migrate-one-express-route.md': '**Prompt.**\n\n```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the route.\n```\n',
      'plans/prompts/m1-c6-migrate-route.md': '```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the route.\n```\n',
    },
    negative: {
      'module1/m1-c6-migrate-one-express-route.md': '**Prompt.**\n\n```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the route, and also add tests.\n```\n',
      'plans/prompts/m1-c6-migrate-route.md': '```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the route.\n```\n',
    },
  },
  {
    check: 'c6-prompt-saved',
    what: 'the saved prompt no longer opens on the skill line, so Run B is not one line away',
    control: {
      'module1/m1-c6-migrate-one-express-route.md': '```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate.\n```\n',
      'plans/prompts/m1-c6-migrate-route.md': '```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate.\n```\n',
    },
    negative: {
      'module1/m1-c6-migrate-one-express-route.md': '```text\nRead framework-skill/node-express-migration/SKILL.md first.\n\nMigrate.\n```\n',
      'plans/prompts/m1-c6-migrate-route.md': '```text\nRead framework-skill/node-express-migration/SKILL.md first.\n\nMigrate.\n```\n',
    },
  },
  {
    check: 'doc-links-resolve',
    what: 'a backtick path points at a renamed file — invisible to a link checker',
    control: { 'a.md': 'see `plans/ExecPlan.md` for detail\n', 'plans/ExecPlan.md': 'x\n' },
    negative: { 'a.md': 'see `plans/refactor-execplan.md` for detail\n', 'plans/ExecPlan.md': 'x\n' },
  },
  {
    check: 'doc-links-resolve',
    what: 'a backtick path uses a workspace short form — prose, and must NOT be flagged',
    control: { 'a.md': 'the file `utils/priority.ts` normalizes it\n' },
    negative: null,
  },
  {
    check: 'doc-links-resolve',
    what: 'a link points at a file that does not exist — what a rename leaves behind',
    control: { 'a.md': '[ok](b.md)\n', 'b.md': 'x\n' },
    negative: { 'a.md': '[gone](m1-demo1-map-noisy-typescript-modules.md)\n' },
  },
  {
    check: 'doc-links-resolve',
    what: "a link is missing its opening paren — '[label]path)', which renders as plain text",
    control: { 'a.md': '[ok](b.md)\n', 'b.md': 'x\n' },
    negative: { 'a.md': '[label]m1-c2-map-noisy-typescript-modules.md)\n', 'b.md': 'x\n' },
  },
];

function runCheck(name, root) {
  try {
    execFileSync(process.execPath, ['scripts/check.mjs', name], {
      env: { ...process.env, CHECK_ROOT: root },
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function buildFrom(files) {
  rmSync(TMP, { recursive: true, force: true });
  for (const [rel, body] of Object.entries(files)) {
    const dest = join(TMP, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, body);
  }
  return TMP;
}

function build(file, contents) {
  rmSync(TMP, { recursive: true, force: true });
  const dest = join(TMP, file);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(file, dest);
  if (contents !== undefined) writeFileSync(dest, contents);
  return TMP;
}

let failures = 0;
const pass = (m) => process.stdout.write(`  ok    ${m}\n`);
const fail = (m) => { failures += 1; process.stdout.write(`  FAIL  ${m}\n`); };

process.stdout.write('PROVING EACH CHECK FAILS ON ITS NEGATIVE CASE\n\n');

for (const c of CASES) {
  const original = readFileSync(c.file, 'utf8');

  // Control: the check must be green on the unmutated copy, or the negative
  // result below proves nothing about the mutation.
  if (runCheck(c.check, build(c.file, original))) pass(`${c.check}: green on the unmutated copy`);
  else fail(`${c.check}: RED on the unmutated copy — the harness is broken, not the artifact`);

  let mutated;
  try {
    mutated = c.mutate(original);
  } catch (err) {
    fail(`${c.check}: mutation could not be applied (${err.message})`);
    continue;
  }
  if (mutated === original) {
    fail(`${c.check}: mutation changed nothing — "${c.what}" was not actually simulated`);
    continue;
  }
  if (runCheck(c.check, build(c.file, mutated))) fail(`${c.check}: STILL GREEN when ${c.what}`);
  else pass(`${c.check}: red when ${c.what}`);
}

for (const c of [...SYNTHETIC_CASES, ...SPLIT_CASES]) {
  const green = runCheck(c.check, buildFrom(c.control));
  // negative: null marks a case that exists to prove the check does NOT fire --
  // a false positive is a defect too, and an over-eager check gets switched off.
  if (c.negative === null) {
    if (green) pass(`${c.check}: stays green when ${c.what}`);
    else fail(`${c.check}: FIRED when ${c.what} — false positive`);
    continue;
  }
  if (green) pass(`${c.check}: green on a clean synthetic root`);
  else fail(`${c.check}: RED on a clean synthetic root — the harness is broken, not the artifact`);

  if (runCheck(c.check, buildFrom(c.negative))) fail(`${c.check}: STILL GREEN when ${c.what}`);
  else pass(`${c.check}: red when ${c.what}`);
}

rmSync(TMP, { recursive: true, force: true });

// A check with no case here is an unproven check. Fail rather than stay quiet.
const listed = execFileSync(process.execPath, ['scripts/check.mjs', '--list']).toString().trim().split('\n');
const proven = new Set([...CASES, ...SYNTHETIC_CASES, ...SPLIT_CASES].map((c) => c.check));
process.stdout.write('\n');
for (const name of listed) {
  if (proven.has(name)) continue;
  if (name in GIT_BACKED) pass(`${name}: not relocatable; proven by ${GIT_BACKED[name]}`);
  else fail(`${name}: no negative case — add one to scripts/check-negatives.mjs`);
}

process.stdout.write(
  failures === 0
    ? '\n  PASS: every check discriminates.\n'
    : `\n  FAIL: ${failures} problem(s) above.\n`,
);
process.exit(failures === 0 ? 0 : 1);

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
  'c2-refs-identical': 'clean-clone check — the local-refs-only version failed there, as it should have',
  'no-route-migrated': 'create a throwaway supporthub-api/migration/routes/x.ts and watch it go red',
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
const SYNTHETIC_CASES = [
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

for (const c of SYNTHETIC_CASES) {
  if (runCheck(c.check, buildFrom(c.control))) pass(`${c.check}: green on a clean synthetic root`);
  else fail(`${c.check}: RED on a clean synthetic root — the harness is broken, not the artifact`);

  if (runCheck(c.check, buildFrom(c.negative))) fail(`${c.check}: STILL GREEN when ${c.what}`);
  else pass(`${c.check}: red when ${c.what}`);
}

rmSync(TMP, { recursive: true, force: true });

// A check with no case here is an unproven check. Fail rather than stay quiet.
const listed = execFileSync(process.execPath, ['scripts/check.mjs', '--list']).toString().trim().split('\n');
const proven = new Set([...CASES, ...SYNTHETIC_CASES].map((c) => c.check));
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

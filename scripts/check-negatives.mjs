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
  'no-route-migrated': 'create a throwaway supporthub-api/migration/routes/x.ts and watch it go red -- done, it does, and the .mts case it was widened for was proven the same way',
  'c6-start-descends-from-c5-captured': 'reads git, so CHECK_ROOT cannot relocate it. Proven red both ways by hand: pointing demo/m1-c6-start at the build branch reproduces the walkthrough\'s mis-cut and it names the fix; building a commit on top of demo/m1-c5-captured with a changed tree reports the drift instead. It was added because the guard had already broken silently -- doc fixes cherry-picked onto both branches gave identical trees and unrelated commits',
  'cut-blocks-branch-before-committing': 'it reads module1/walkthrough-c5-c6.md, which CHECK_ROOT could relocate, but the two cut blocks are the artifact and mutating the real file is the honest test. Proven red both ways by hand: swapping the lines in step 9 reproduces the defect it was written for -- that block had commit before branch and was about to be run -- and swapping them in step 3 shows it is not keyed to one block',
  'outline-map-matches-source': 'both files are in the repository, so CHECK_ROOT could relocate it, but the pair IS the artifact and mutating the real map is the honest test. Proven red four ways by hand: an objective reworded, a bullet reworded, a duration changed, and a clip dropped. Checked once against the .docx itself -- all nine objectives and all thirty-two bullets matched',
  'm2-c2-starts-without-the-correction': 'it reads the real automation/triage tree and git, so CHECK_ROOT cannot relocate it. Proven red both ways by hand: writing automation/triage/corrected-sweep.json makes it report a previous take\'s correction still on disk; appending a line to baseline-manual-sweep.json makes it report the recorded baseline modified. Both restored afterwards',
  'clip-start-checkpoint-exists': 'reads git, so CHECK_ROOT cannot relocate it. Proven both ways by hand on the live case: with demo/m1-c6-start and demo/m1-c5-captured absent it names both and points at the walkthrough; cutting throwaway branches at those names turns it green; deleting one again turns it red naming only that one. The throwaways were removed afterwards, so the repository is back to the state the check reports',
  'demo-branch-refs-exist': 'reads git, so CHECK_ROOT cannot relocate it. It found two on its first run -- the C6 evidence artifact and the C6 runbook both handed out a checkout of demo/m1-c6-start, which cannot exist until C5 is walked -- and three more when widened to prose, where m2-c3, m2-c5 and m2-c6 each named a demo/m2-cN-start that has never existed. Proven red again by hand on the widened form: restoring the prose branch name to any of those three runbooks reports it by file, and pointing one at demo/m2-c2-start clears it',
  'contract-tests-pass': 'it needs the real node_modules, so CHECK_ROOT cannot relocate it. Proven by hand both ways: append a failing test and it reports "1 contract test(s) failing"; append a passing one and it reports "26 contract tests passed, expected 25"',
  'workspace-lint-silent': 'it needs the real node_modules, so CHECK_ROOT cannot relocate it. Proven by hand both ways: it is what reported the two no-unused-vars warnings on ticketService.ts that put a yellow badge on clip 2, naming both file and line; silenced in eslint.config.js it goes green, and restoring the rule to \'warn\' turns it red again with the same two lines',
  'oncamera-markdown-lint-silent': 'it needs the real node_modules and the bundled config schema, so CHECK_ROOT cannot relocate it. Proven by hand on each of its assertions: a string-valued key in .markdownlint.json makes it report that an editor validating the config discards all of it; the inert `<!-- markdownlint-disable -- why -->` form makes it report that suppression does not happen; dropping MD013 and MD060 makes it report that agent-shaped tables are rejected; and removing <!-- cspell:disable --> makes it report the unknown words still flagged. Both tools are measured because both put an error badge on the same tab and neither is visible to the other',
  'all-docs-lint-clean': 'it needs the real node_modules, so CHECK_ROOT cannot relocate it. Proven by hand both ways: it is what found the 46 defects the two-file lint:md had never looked for -- headings with no blank line under them, lists with none above, and two roster rows orphaned out of their table -- and appending a heading with no blank line under it turns it red again',
  'runbook-plan-greps-resolve': 'it reads the clip\'s starting-checkpoint branch with git show, so CHECK_ROOT cannot relocate it. Proven red three ways by hand on the live case: renaming the heading back to "### Checkpoint" reports 0 against an expected 2, which is the defect it was written for; changing the expected count to 3 reports the real 2; and renaming the grepped file reports that the file does not exist on demo/m1-c6-start',
  'seeded-patches-apply-and-touch-what-the-runbook-says': 'it shells out to git apply against the real tree, so CHECK_ROOT cannot relocate it. It found C6\'s prep block on its first run -- the sentence naming the two files had been split by the preflight paragraph, stranding the second filename below it, so the block named one file where the patch touches two. Proven red both ways by hand: pointing C5\'s prep block at utils/legacy.ts reports both the unnamed file and the missing one, and appending a malformed hunk to run-3001.patch reports that it no longer applies. Both restored afterwards',
  'destinations-match-the-drafts-fixture': 'it globs the real automation/*-drafts tree, so CHECK_ROOT cannot relocate it. Proven red three ways by hand: pointing C3 at "the SupportHub project" -- the name Codex reported actually existing in the workspace -- reports the mismatch against the fixture; renaming the fixture and leaving the runbooks behind reports both the sibling draft and both runbooks; and giving one draft a different project reports that the two drafts disagree. All restored afterwards',
  'seed-branch-excludes-what-the-patches-add': 'it reads the seed branch with git show, so CHECK_ROOT cannot relocate it. Proven red on the real defect: a C5 walk committed run-3001.patch onto demo/m2-c2-start (9773b04, empty message, byte-identical to the patch), and pointing the branch back at that commit reports both hunks by name -- the rubric threshold at 50 and the sev1/sev2/sev3 mapping. Proven red again on the rubric hunk alone, built in a throwaway worktree, so neither half depends on the other. The branch was restored to the build head and force-pushed with a lease',
  'diff-verifications-see-the-index': 'it globs the tracked runbooks with git ls-files, so CHECK_ROOT cannot relocate it. Proven red three ways by hand: restoring C5 step 1 to the bare git diff --stat reports it by line -- the form a walk found blind to staged changes; removing step 3\'s --cached partner leaves its bare diff alone and reports that too, which shows the pairing rule is what makes the difference rather than the file; and reverting m1-c3 step 4 reports the second instance the sweep found. All restored afterwards',
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
        '| Scope | `routes/tickets.js` to `routes/tickets.mts` |\n'
          + '\n### Milestone 2 — Upgrade Express 4.x to 5.x\n\n| | |\n|---|---|\n'
          + '| Scope | `express` 4.x to 5.x |',
      );
    },
  },
  {
    check: 'milestone-batched',
    file: 'plans/migration-plan.md',
    what: 'the milestone lost its route migration and is only a dependency bump',
    mutate: (s) => s.replace('`routes/tickets.js` to `routes/tickets.mts`; ', ''),
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

const ROUTE_ONLY = "`routes/tickets.js` to `routes/tickets.mts`";
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

for (const [what, negative] of [["the modern config lost tsconfigRootDir, so the editor sees two candidate roots again",{"supporthub-api/modern/eslint.config.js":"export default [{ languageOptions: { ecmaVersion: 2023 } }];\n","supporthub-api/migration/eslint.config.js":"module.exports = [{ languageOptions: { parserOptions: { tsconfigRootDir: __dirname } } }];\n"}],["the migration config lost tsconfigRootDir",{"supporthub-api/modern/eslint.config.js":"export default [{ languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } }];\n","supporthub-api/migration/eslint.config.js":"module.exports = [{ languageOptions: {} }];\n"}],["a literal path was hardcoded — works on one machine, breaks for everyone else",{"supporthub-api/modern/eslint.config.js":"export default [{ languageOptions: { parserOptions: { tsconfigRootDir: '/Users/someone/repo/supporthub-api/modern' } } }];\n","supporthub-api/migration/eslint.config.js":"module.exports = [{ languageOptions: { parserOptions: { tsconfigRootDir: __dirname } } }];\n"}],["the migration config used import.meta.dirname, which is undefined in CommonJS",{"supporthub-api/modern/eslint.config.js":"export default [{ languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } }];\n","supporthub-api/migration/eslint.config.js":"module.exports = [{ languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } }];\n"}]]) {
  SPLIT_CASES.push({ check: "eslint-tsconfigrootdir-set", what, control: {"supporthub-api/modern/eslint.config.js":"export default [{ languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } }];\n","supporthub-api/migration/eslint.config.js":"module.exports = [{ languageOptions: { parserOptions: { tsconfigRootDir: __dirname } } }];\n"}, negative });
}

SPLIT_CASES.push({ check: "c2-seed-shape", what: "the seed was quietened with an eslint-disable, hiding the linter finding the clip narrates", control: {"supporthub-api/modern/src/utils/priority.ts":"export function normalizePriority(v){ if (value === 'p0') return 'urgent'; }\n","supporthub-api/modern/src/utils/legacy.ts":"export function normalizeLegacySeverity(s){ return s; }\n","supporthub-api/modern/src/compat/dirname.ts":"export function moduleDir(u){ return u; }\n","supporthub-api/modern/src/compat/legacyRequire.ts":"export function requireFromEsm(u){ return u; }\n","supporthub-api/modern/src/routes/tickets.ts":"import { getTicket } from '../services/ticketService.js';\ngetTicket('1');\n","supporthub-api/modern/src/services/ticketService.ts":"function toPriority(v){ if (value === 'p0') return 'urgent'; }\nfunction validateNewTicket(p){ return []; }\nexport function ticketsForIncident(i){ return []; }\nexport function getTicket(id){ if (value === 'p0') return null; return null; }\n"}, negative: {"supporthub-api/modern/src/utils/priority.ts":"export function normalizePriority(v){ if (value === 'p0') return 'urgent'; }\n","supporthub-api/modern/src/utils/legacy.ts":"export function normalizeLegacySeverity(s){ return s; }\n","supporthub-api/modern/src/compat/dirname.ts":"export function moduleDir(u){ return u; }\n","supporthub-api/modern/src/compat/legacyRequire.ts":"export function requireFromEsm(u){ return u; }\n","supporthub-api/modern/src/routes/tickets.ts":"import { getTicket } from '../services/ticketService.js';\ngetTicket('1');\n","supporthub-api/modern/src/services/ticketService.ts":"// eslint-disable-next-line @typescript-eslint/no-unused-vars\nfunction toPriority(v){ if (value === 'p0') return 'urgent'; }\nfunction validateNewTicket(p){ return []; }\nexport function ticketsForIncident(i){ return []; }\nexport function getTicket(id){ if (value === 'p0') return null; return null; }\n"} });

SPLIT_CASES.push({ check: "execplan-starts-unwritten", what: "Validation checks shipped pre-filled, so Step 1 rewrites a section that was already written", control: {"plans/ExecPlan.md":"# ExecPlan\n\n## Validation checks\n\n_Not yet recorded._\n\n## Risks\n\nsome risk\n\n## Progress log\n\n| # | Change | Validation | State |\n|---|---|---|---|\n| — | — | — | not started |\n\n## Deferred work\n\nOut-of-scope items.\n\n| Item | Why deferred |\n|---|---|\n| — | — |\n"}, negative: {"plans/ExecPlan.md":"# ExecPlan\n\n## Validation checks\n\n```bash\nnpm run lint\nnpm test\n```\n\n## Risks\n\nsome risk\n\n## Progress log\n\n| # | Change | Validation | State |\n|---|---|---|---|\n| — | — | — | not started |\n\n## Deferred work\n\nOut-of-scope items.\n\n| Item | Why deferred |\n|---|---|\n| — | — |\n"} });
SPLIT_CASES.push({ check: "execplan-starts-unwritten", what: "a previous take's Progress row survived the reset", control: {"plans/ExecPlan.md":"# ExecPlan\n\n## Validation checks\n\n_Not yet recorded._\n\n## Risks\n\nsome risk\n\n## Progress log\n\n| # | Change | Validation | State |\n|---|---|---|---|\n| — | — | — | not started |\n\n## Deferred work\n\nOut-of-scope items.\n\n| Item | Why deferred |\n|---|---|\n| — | — |\n"}, negative: {"plans/ExecPlan.md":"# ExecPlan\n\n## Validation checks\n\n_Not yet recorded._\n\n## Risks\n\nsome risk\n\n## Progress log\n\n| # | Change | Validation | State |\n|---|---|---|---|\n| 1 | centralized normalization | lint, test | done |\n\n## Deferred work\n\nOut-of-scope items.\n\n| Item | Why deferred |\n|---|---|\n| — | — |\n"} });
SPLIT_CASES.push({ check: "execplan-starts-unwritten", what: "a previous take's Deferred work row survived the reset", control: {"plans/ExecPlan.md":"# ExecPlan\n\n## Validation checks\n\n_Not yet recorded._\n\n## Risks\n\nsome risk\n\n## Progress log\n\n| # | Change | Validation | State |\n|---|---|---|---|\n| — | — | — | not started |\n\n## Deferred work\n\nOut-of-scope items.\n\n| Item | Why deferred |\n|---|---|\n| — | — |\n"}, negative: {"plans/ExecPlan.md":"# ExecPlan\n\n## Validation checks\n\n_Not yet recorded._\n\n## Risks\n\nsome risk\n\n## Progress log\n\n| # | Change | Validation | State |\n|---|---|---|---|\n| — | — | — | not started |\n\n## Deferred work\n\nOut-of-scope items.\n\n| Item | Why deferred |\n|---|---|\n| repository layer | out of scope |\n"} });

SPLIT_CASES.push({ check: "c3-gates-not-hardcoded", what: "the runbook grades the gate list against a number again", control: {"module1/m1-c3-execute-codex-refactor.md":"Run every command in the ExecPlan's Validation checks section.\n","plans/prompts/m1-c3-bounded-cleanup.md":"Then run every command in the ExecPlan's Validation checks section.\n","plans/ExecPlan.md":"## Validation checks\n\n_Not yet recorded._\n"}, negative: {"module1/m1-c3-execute-codex-refactor.md":"PASS if the diff is in scope and all three gates pass.\n","plans/prompts/m1-c3-bounded-cleanup.md":"Then run every command in the ExecPlan's Validation checks section.\n","plans/ExecPlan.md":"## Validation checks\n\n_Not yet recorded._\n"} });
SPLIT_CASES.push({ check: "c3-gates-not-hardcoded", what: "the ExecPlan opens on a fixed count again", control: {"module1/m1-c3-execute-codex-refactor.md":"Run every command in the ExecPlan's Validation checks section.\n","plans/prompts/m1-c3-bounded-cleanup.md":"Then run every command in the ExecPlan's Validation checks section.\n","plans/ExecPlan.md":"## Validation checks\n\n_Not yet recorded._\n"}, negative: {"module1/m1-c3-execute-codex-refactor.md":"Run every command in the ExecPlan's Validation checks section.\n","plans/prompts/m1-c3-bounded-cleanup.md":"Then run every command in the ExecPlan's Validation checks section.\n","plans/ExecPlan.md":"## Validation checks\n\nRun all four. Every one must pass.\n"} });
SPLIT_CASES.push({ check: "c3-gates-not-hardcoded", what: "the saved prompt hardcodes the gate command line", control: {"module1/m1-c3-execute-codex-refactor.md":"Run every command in the ExecPlan's Validation checks section.\n","plans/prompts/m1-c3-bounded-cleanup.md":"Then run every command in the ExecPlan's Validation checks section.\n","plans/ExecPlan.md":"## Validation checks\n\n_Not yet recorded._\n"}, negative: {"module1/m1-c3-execute-codex-refactor.md":"Run every command in the ExecPlan's Validation checks section.\n","plans/prompts/m1-c3-bounded-cleanup.md":"Then run: npm run lint && npm run typecheck && npm test\n","plans/ExecPlan.md":"## Validation checks\n\n_Not yet recorded._\n"} });

SPLIT_CASES.push({ check: "c3-prompt-does-not-preempt-removal", what: "the repository-layer prohibition is back, so Codex complies and Step 4 has nothing to remove", control: {"module1/m1-c3-execute-codex-refactor.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n","plans/prompts/m1-c3-bounded-cleanup.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n"}, negative: {"module1/m1-c3-execute-codex-refactor.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\nDo not introduce a repository layer, a new directory, or any new abstraction.\n```\n","plans/prompts/m1-c3-bounded-cleanup.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n"} });
SPLIT_CASES.push({ check: "c3-prompt-does-not-preempt-removal", what: "the reorganize prohibition is back", control: {"module1/m1-c3-execute-codex-refactor.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n","plans/prompts/m1-c3-bounded-cleanup.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n"}, negative: {"module1/m1-c3-execute-codex-refactor.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n","plans/prompts/m1-c3-bounded-cleanup.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\nDo not reorganize the service architecture.\n```\n"} });
SPLIT_CASES.push({ check: "c3-prompt-does-not-preempt-removal", what: "\"Implement ONLY\" is back — a scope suppressor in the first line", control: {"module1/m1-c3-execute-codex-refactor.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n","plans/prompts/m1-c3-bounded-cleanup.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n"}, negative: {"module1/m1-c3-execute-codex-refactor.md":"```text\nImplement ONLY the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n","plans/prompts/m1-c3-bounded-cleanup.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n"} });
SPLIT_CASES.push({ check: "c3-prompt-does-not-preempt-removal", what: "the behavioral contract was dropped along with the structural bans, so the diff can change behavior too", control: {"module1/m1-c3-execute-codex-refactor.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n","plans/prompts/m1-c3-bounded-cleanup.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n"}, negative: {"module1/m1-c3-execute-codex-refactor.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\n```\n","plans/prompts/m1-c3-bounded-cleanup.md":"```text\nImplement the approved cleanup theme recorded in plans/ExecPlan.md.\nDo not change any route path, HTTP status code, or response field name.\n```\n"} });

SPLIT_CASES.push({ check: "preflight-step-map-complete", what: "a new check was added to the preflight and never mapped, so it would vanish from the transcript", control: {"docs/preflight-step-map.json": "{\"m1-c2\":{\"seed is right\":[1],\"refs match\":[4]}}", "docs/outline-clip-map.json": "{\"objectives\":{\"TO1\":\"t\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\"],\"bullets\":[\"One\",\"Two\",\"Three\",\"Four\"]}}}", "module1/scripts/preflight_check.sh": "check \"all\" \"shared gate\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"seed is right\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"refs match\" 'true' \"w\" \"f\" \"p\"\n", "module2/scripts/preflight_check.sh": "check \"all\" \"x\" 'true' \"w\" \"f\" \"p\"\n"}, negative: {"docs/preflight-step-map.json": "{\"m1-c2\":{\"seed is right\":[1]}}", "docs/outline-clip-map.json": "{\"objectives\":{\"TO1\":\"t\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\"],\"bullets\":[\"One\",\"Two\",\"Three\",\"Four\"]}}}", "module1/scripts/preflight_check.sh": "check \"all\" \"shared gate\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"seed is right\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"refs match\" 'true' \"w\" \"f\" \"p\"\n", "module2/scripts/preflight_check.sh": "check \"all\" \"x\" 'true' \"w\" \"f\" \"p\"\n"} });
SPLIT_CASES.push({ check: "preflight-step-map-complete", what: "a check was renamed, leaving the map pointing at a name that no longer exists", control: {"docs/preflight-step-map.json": "{\"m1-c2\":{\"seed is right\":[1],\"refs match\":[4]}}", "docs/outline-clip-map.json": "{\"objectives\":{\"TO1\":\"t\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\"],\"bullets\":[\"One\",\"Two\",\"Three\",\"Four\"]}}}", "module1/scripts/preflight_check.sh": "check \"all\" \"shared gate\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"seed is right\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"refs match\" 'true' \"w\" \"f\" \"p\"\n", "module2/scripts/preflight_check.sh": "check \"all\" \"x\" 'true' \"w\" \"f\" \"p\"\n"}, negative: {"docs/preflight-step-map.json": "{\"m1-c2\":{\"seed is right\":[1],\"refs match\":[4],\"old name\":[2]}}", "docs/outline-clip-map.json": "{\"objectives\":{\"TO1\":\"t\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\"],\"bullets\":[\"One\",\"Two\",\"Three\",\"Four\"]}}}", "module1/scripts/preflight_check.sh": "check \"all\" \"shared gate\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"seed is right\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"refs match\" 'true' \"w\" \"f\" \"p\"\n", "module2/scripts/preflight_check.sh": "check \"all\" \"x\" 'true' \"w\" \"f\" \"p\"\n"} });
SPLIT_CASES.push({ check: "preflight-step-map-complete", what: "a check maps to a step number the outline does not give this clip", control: {"docs/preflight-step-map.json": "{\"m1-c2\":{\"seed is right\":[1],\"refs match\":[4]}}", "docs/outline-clip-map.json": "{\"objectives\":{\"TO1\":\"t\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\"],\"bullets\":[\"One\",\"Two\",\"Three\",\"Four\"]}}}", "module1/scripts/preflight_check.sh": "check \"all\" \"shared gate\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"seed is right\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"refs match\" 'true' \"w\" \"f\" \"p\"\n", "module2/scripts/preflight_check.sh": "check \"all\" \"x\" 'true' \"w\" \"f\" \"p\"\n"}, negative: {"docs/preflight-step-map.json": "{\"m1-c2\":{\"seed is right\":[9],\"refs match\":[4]}}", "docs/outline-clip-map.json": "{\"objectives\":{\"TO1\":\"t\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\"],\"bullets\":[\"One\",\"Two\",\"Three\",\"Four\"]}}}", "module1/scripts/preflight_check.sh": "check \"all\" \"shared gate\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"seed is right\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"refs match\" 'true' \"w\" \"f\" \"p\"\n", "module2/scripts/preflight_check.sh": "check \"all\" \"x\" 'true' \"w\" \"f\" \"p\"\n"} });
SPLIT_CASES.push({ check: "preflight-step-map-complete", what: "the map has no entry for a clip that has scoped checks", control: {"docs/preflight-step-map.json": "{\"m1-c2\":{\"seed is right\":[1],\"refs match\":[4]}}", "docs/outline-clip-map.json": "{\"objectives\":{\"TO1\":\"t\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\"],\"bullets\":[\"One\",\"Two\",\"Three\",\"Four\"]}}}", "module1/scripts/preflight_check.sh": "check \"all\" \"shared gate\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"seed is right\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"refs match\" 'true' \"w\" \"f\" \"p\"\n", "module2/scripts/preflight_check.sh": "check \"all\" \"x\" 'true' \"w\" \"f\" \"p\"\n"}, negative: {"docs/preflight-step-map.json": "{\"m1-c3\":{\"x\":[1]}}", "docs/outline-clip-map.json": "{\"objectives\":{\"TO1\":\"t\"},\"clips\":{\"m1-c2\":{\"runbook\":\"rb.md\",\"title\":\"T\",\"objectives\":[\"TO1\"],\"bullets\":[\"One\",\"Two\",\"Three\",\"Four\"]}}}", "module1/scripts/preflight_check.sh": "check \"all\" \"shared gate\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"seed is right\" 'true' \"w\" \"f\" \"p\"\ncheck \"c2\" \"refs match\" 'true' \"w\" \"f\" \"p\"\n", "module2/scripts/preflight_check.sh": "check \"all\" \"x\" 'true' \"w\" \"f\" \"p\"\n"} });

SPLIT_CASES.push({ check: "c5-step3-does-not-decompose", what: "the atomicity rule is back verbatim, so step 4 audits a list that already complies", control: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nBreak the migration into incremental milestones.\n\nKeep it to between three and five. Each milestone must:\n- be validated on its own by a named command\n- be undoable on its own, to a named commit\n```\n"}, negative: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nBreak the migration into incremental milestones.\n\nKeep it to between three and five. Each milestone must:\n- change one thing, not several\n- be validated on its own by a named command\n- be undoable on its own, to a named commit\n```\n"} });
SPLIT_CASES.push({ check: "c5-step3-does-not-decompose", what: "the same rule phrased as a prohibition", control: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nBreak the migration into incremental milestones.\n\nKeep it to between three and five. Each milestone must:\n- be validated on its own by a named command\n- be undoable on its own, to a named commit\n```\n"}, negative: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nBreak the migration into incremental milestones.\n\nKeep it to between three and five. Each milestone must:\n- do not combine a route migration with a dependency upgrade\n- be validated on its own by a named command\n- be undoable on its own, to a named commit\n```\n"} });
SPLIT_CASES.push({ check: "c5-step3-does-not-decompose", what: "the same rule phrased as one concern per milestone", control: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nBreak the migration into incremental milestones.\n\nKeep it to between three and five. Each milestone must:\n- be validated on its own by a named command\n- be undoable on its own, to a named commit\n```\n"}, negative: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nBreak the migration into incremental milestones.\n\nKeep it to between three and five. Each milestone must:\n- keep one concern per milestone\n- be validated on its own by a named command\n- be undoable on its own, to a named commit\n```\n"} });
SPLIT_CASES.push({ check: "c5-step3-does-not-decompose", what: "independent validation was dropped along with the atomicity rule, losing the EO2b half", control: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nBreak the migration into incremental milestones.\n\nKeep it to between three and five. Each milestone must:\n- be validated on its own by a named command\n- be undoable on its own, to a named commit\n```\n"}, negative: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nBreak the migration into incremental milestones.\n\nKeep it to between three and five. Each milestone must:\n- be undoable on its own, to a named commit\n```\n"} });

SPLIT_CASES.push({ check: "c5-route-surface", what: "/health was removed, so nothing shows that auth is per route rather than global", control: {"supporthub-api/migration/app.js": "var app = express();\napp.use(express.json());\napp.get('/health', function (req, res) { res.status(200); });\napp.use(ticketsRouter);\n", "supporthub-api/migration/routes/tickets.js": "router.get('/tickets/:id', requireApiKey, function (req, res) {});\nrouter.post('/tickets', requireApiKey, function (req, res) {});\nrouter.patch('/tickets/:id/status', requireApiKey, function (req, res) {});\n"}, negative: {"supporthub-api/migration/app.js": "var app = express();\napp.use(express.json());\napp.use(ticketsRouter);\n", "supporthub-api/migration/routes/tickets.js": "router.get('/tickets/:id', requireApiKey, function (req, res) {});\nrouter.post('/tickets', requireApiKey, function (req, res) {});\nrouter.patch('/tickets/:id/status', requireApiKey, function (req, res) {});\n"} });
SPLIT_CASES.push({ check: "c5-route-surface", what: "auth was hoisted to app.use, which would make the per-route highlight false", control: {"supporthub-api/migration/app.js": "var app = express();\napp.use(express.json());\napp.get('/health', function (req, res) { res.status(200); });\napp.use(ticketsRouter);\n", "supporthub-api/migration/routes/tickets.js": "router.get('/tickets/:id', requireApiKey, function (req, res) {});\nrouter.post('/tickets', requireApiKey, function (req, res) {});\nrouter.patch('/tickets/:id/status', requireApiKey, function (req, res) {});\n"}, negative: {"supporthub-api/migration/app.js": "var app = express();\napp.use(express.json());\napp.get('/health', function (req, res) { res.status(200); });\napp.use(requireApiKey);\napp.use(ticketsRouter);\n", "supporthub-api/migration/routes/tickets.js": "router.get('/tickets/:id', requireApiKey, function (req, res) {});\nrouter.post('/tickets', requireApiKey, function (req, res) {});\nrouter.patch('/tickets/:id/status', requireApiKey, function (req, res) {});\n"} });
SPLIT_CASES.push({ check: "c5-route-surface", what: "a ticket route lost its auth middleware", control: {"supporthub-api/migration/app.js": "var app = express();\napp.use(express.json());\napp.get('/health', function (req, res) { res.status(200); });\napp.use(ticketsRouter);\n", "supporthub-api/migration/routes/tickets.js": "router.get('/tickets/:id', requireApiKey, function (req, res) {});\nrouter.post('/tickets', requireApiKey, function (req, res) {});\nrouter.patch('/tickets/:id/status', requireApiKey, function (req, res) {});\n"}, negative: {"supporthub-api/migration/app.js": "var app = express();\napp.use(express.json());\napp.get('/health', function (req, res) { res.status(200); });\napp.use(ticketsRouter);\n", "supporthub-api/migration/routes/tickets.js": "router.get('/tickets/:id', requireApiKey, function (req, res) {});\nrouter.post('/tickets', function (req, res) {});\nrouter.patch('/tickets/:id/status', requireApiKey, function (req, res) {});\n"} });
SPLIT_CASES.push({ check: "c5-route-surface", what: "a fifth route was added, so the count an author reads aloud is wrong", control: {"supporthub-api/migration/app.js": "var app = express();\napp.use(express.json());\napp.get('/health', function (req, res) { res.status(200); });\napp.use(ticketsRouter);\n", "supporthub-api/migration/routes/tickets.js": "router.get('/tickets/:id', requireApiKey, function (req, res) {});\nrouter.post('/tickets', requireApiKey, function (req, res) {});\nrouter.patch('/tickets/:id/status', requireApiKey, function (req, res) {});\n"}, negative: {"supporthub-api/migration/app.js": "var app = express();\napp.use(express.json());\napp.get('/health', function (req, res) { res.status(200); });\napp.use(ticketsRouter);\n", "supporthub-api/migration/routes/tickets.js": "router.get('/tickets/:id', requireApiKey, function (req, res) {});\nrouter.post('/tickets', requireApiKey, function (req, res) {});\nrouter.patch('/tickets/:id/status', requireApiKey, function (req, res) {});\nrouter.delete('/tickets/:id', requireApiKey, function (req, res) {});\n"} });

SPLIT_CASES.push({ check: "seed-parity-across-services", what: "the legacy service is missing a seed the modern one has \u2014 the defect this was written for", control: {"supporthub-api/migration/services/ticketService.js": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\n  { id: 'ticket-1003' },\nvar nextId = 1004;\n", "supporthub-api/modern/src/services/ticketService.ts": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\n  { id: 'ticket-1003' },\nvar nextId = 1004;\n"}, negative: {"supporthub-api/migration/services/ticketService.js": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\nvar nextId = 1004;\n", "supporthub-api/modern/src/services/ticketService.ts": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\n  { id: 'ticket-1003' },\nvar nextId = 1004;\n"} });
SPLIT_CASES.push({ check: "seed-parity-across-services", what: "nextId skips an id that never existed", control: {"supporthub-api/migration/services/ticketService.js": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\n  { id: 'ticket-1003' },\nvar nextId = 1004;\n", "supporthub-api/modern/src/services/ticketService.ts": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\n  { id: 'ticket-1003' },\nvar nextId = 1004;\n"}, negative: {"supporthub-api/migration/services/ticketService.js": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\n  { id: 'ticket-1003' },\nvar nextId = 1005;\n", "supporthub-api/modern/src/services/ticketService.ts": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\n  { id: 'ticket-1003' },\nvar nextId = 1005;\n"} });
SPLIT_CASES.push({ check: "seed-parity-across-services", what: "the two services disagree about where generated ids start", control: {"supporthub-api/migration/services/ticketService.js": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\n  { id: 'ticket-1003' },\nvar nextId = 1004;\n", "supporthub-api/modern/src/services/ticketService.ts": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\n  { id: 'ticket-1003' },\nvar nextId = 1004;\n"}, negative: {"supporthub-api/migration/services/ticketService.js": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\n  { id: 'ticket-1003' },\nvar nextId = 1004;\n", "supporthub-api/modern/src/services/ticketService.ts": "  { id: 'ticket-1001' },\n  { id: 'ticket-1002' },\n  { id: 'ticket-1003' },\nvar nextId = 1010;\n"} });

SPLIT_CASES.push({ check: "c5-step4-audits-the-plan-file", what: "the audit prompt lost its referent, so Codex grades its own conversational list", control: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nOpen plans/migration-plan.md and read its Milestones section.\n\nFor each milestone recorded there, state whether it changes application code,\nupgrades a dependency, or both. Flag any that answers \"both\".\n```\n"}, negative: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nReview the milestones you listed above.\n\nFor each milestone recorded there, state whether it changes application code,\nupgrades a dependency, or both. Flag any that answers \"both\".\n```\n"} });
SPLIT_CASES.push({ check: "c5-step4-audits-the-plan-file", what: "it points at the runbook instead of the plan of record", control: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nOpen plans/migration-plan.md and read its Milestones section.\n\nFor each milestone recorded there, state whether it changes application code,\nupgrades a dependency, or both. Flag any that answers \"both\".\n```\n"}, negative: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nOpen module1/m1-c5-inventory-legacy-express4.md and read the milestones.\n\nFor each milestone recorded there, state whether it changes application code,\nupgrades a dependency, or both. Flag any that answers \"both\".\n```\n"} });
SPLIT_CASES.push({ check: "c5-step4-audits-the-plan-file", what: "the audit prompt was removed entirely", control: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nOpen plans/migration-plan.md and read its Milestones section.\n\nFor each milestone recorded there, state whether it changes application code,\nupgrades a dependency, or both. Flag any that answers \"both\".\n```\n"}, negative: {"module1/m1-c5-inventory-legacy-express4.md": "```text\nInventory the legacy service.\n```\n"} });

SPLIT_CASES.push({ check: "prompts-allow-read-only-inspection", what: "the blanket ban is back in a clip 2 prompt — Codex reads it as covering reading and declines the step", control: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files. Read-only inspection is fine; do not run tests, builds,\nor installs.\n```\n","module1/m1-c5-inventory-legacy-express4.md":"```text\nInventory the legacy service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose a plan.\nDo not implement anything. Read-only inspection is fine; do not run tests,\nbuilds, or installs.\n```\n"}, negative: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files and do not run any commands.\n```\n","module1/m1-c5-inventory-legacy-express4.md":"```text\nInventory the legacy service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose a plan.\nDo not implement anything. Read-only inspection is fine; do not run tests,\nbuilds, or installs.\n```\n"} });
SPLIT_CASES.push({ check: "prompts-allow-read-only-inspection", what: "clip 2 lost the read-only permission, leaving prompts silent about reading beside \"do not edit any files\"", control: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files. Read-only inspection is fine; do not run tests, builds,\nor installs.\n```\n","module1/m1-c5-inventory-legacy-express4.md":"```text\nInventory the legacy service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose a plan.\nDo not implement anything. Read-only inspection is fine; do not run tests,\nbuilds, or installs.\n```\n"}, negative: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\nDo not edit any files.\n```\n\n```text\nPropose one theme.\nDo not edit files.\n```\n","module1/m1-c5-inventory-legacy-express4.md":"```text\nInventory the legacy service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose a plan.\nDo not implement anything. Read-only inspection is fine; do not run tests,\nbuilds, or installs.\n```\n"} });
SPLIT_CASES.push({ check: "prompts-allow-read-only-inspection", what: "clip 5 lost the read-only permission", control: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files. Read-only inspection is fine; do not run tests, builds,\nor installs.\n```\n","module1/m1-c5-inventory-legacy-express4.md":"```text\nInventory the legacy service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose a plan.\nDo not implement anything. Read-only inspection is fine; do not run tests,\nbuilds, or installs.\n```\n"}, negative: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files. Read-only inspection is fine; do not run tests, builds,\nor installs.\n```\n","module1/m1-c5-inventory-legacy-express4.md":"```text\nInventory the legacy service.\nDo not edit any files.\n```\n\n```text\nPropose a plan.\nDo not implement anything.\n```\n"} });
SPLIT_CASES.push({ check: "prompts-allow-read-only-inspection", what: "a different runbook picked the phrasing up — \"Run no commands\" in clip 3", control: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files. Read-only inspection is fine; do not run tests, builds,\nor installs.\n```\n","module1/m1-c5-inventory-legacy-express4.md":"```text\nInventory the legacy service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose a plan.\nDo not implement anything. Read-only inspection is fine; do not run tests,\nbuilds, or installs.\n```\n"}, negative: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files. Read-only inspection is fine; do not run tests, builds,\nor installs.\n```\n","module1/m1-c5-inventory-legacy-express4.md":"```text\nInventory the legacy service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose a plan.\nDo not implement anything. Read-only inspection is fine; do not run tests,\nbuilds, or installs.\n```\n","module1/m1-c3-execute-bounded-refactor.md":"```text\nImplement the approved theme.\nRun no commands.\n```\n"} });

SPLIT_CASES.push({ check: "c2-prompts-saved", what: "the runbook prompt was edited and the saved copy was not — the drift that had already happened", control: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files.\n```\n","plans/prompts/m1-c2-map-codebase.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files.\n```\n"}, negative: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files.\n```\n","plans/prompts/m1-c2-map-codebase.md":"```text\nAnalyze the TypeScript service.\nDo not edit any files.\n```\n\n```text\nPropose one theme.\nDo not edit files.\n```\n"} });
SPLIT_CASES.push({ check: "c2-prompts-saved", what: "a prompt was added to the runbook and not to the saved copy", control: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files.\n```\n","plans/prompts/m1-c2-map-codebase.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files.\n```\n"}, negative: {"module1/m1-c2-map-noisy-typescript-modules.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files.\n```\n\n```text\nSummarize the pass.\n```\n","plans/prompts/m1-c2-map-codebase.md":"```text\nAnalyze the TypeScript service.\n\nRead the repository freely with read-only commands such as ls, find, rg, sed\nand cat. Do not edit any files, and do not run tests, builds, installs, or any\ncommand that writes to the working tree.\n```\n\n```text\nPropose one theme.\nDo not edit files.\n```\n"} });

const SYNTHETIC_CASES = [
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

SPLIT_CASES.push({ check: "c6-migrates-in-place", what: "the prompt names the modern workspace as the target again, which is what put a route, a contract test and an app.ts edit in the wrong service", control: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n**Verification.**\n\n```bash\ngit status --short\ngit status --porcelain supporthub-api/modern | wc -l    # must be 0\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/modern/src/routes/legacyTickets.ts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n**Verification.**\n\n```bash\ngit status --short\ngit status --porcelain supporthub-api/modern | wc -l    # must be 0\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/modern/src/routes/legacyTickets.ts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n"} });
SPLIT_CASES.push({ check: "c6-migrates-in-place", what: "the constraint forbidding writes under modern/ was dropped from the saved prompt, so Run A and the runbook no longer agree on scope", control: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n**Verification.**\n\n```bash\ngit status --short\ngit status --porcelain supporthub-api/modern | wc -l    # must be 0\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n**Verification.**\n\n```bash\ngit status --short\ngit status --porcelain supporthub-api/modern | wc -l    # must be 0\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\n```\n"} });
SPLIT_CASES.push({ check: "c6-migrates-in-place", what: "step 1 stopped proving the modern workspace stayed untouched, so a run that drifts there is only found two clips later", control: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n**Verification.**\n\n```bash\ngit status --short\ngit status --porcelain supporthub-api/modern | wc -l    # must be 0\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n**Verification.**\n\n```bash\ngit status --short\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n"} });
SPLIT_CASES.push({ check: "c6-migrates-in-place", what: "the prompt stopped saying where the migrated route lands, leaving the workspace to Codex's judgement", control: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n**Verification.**\n\n```bash\ngit status --short\ngit status --porcelain supporthub-api/modern | wc -l    # must be 0\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create the migrated route as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n**Verification.**\n\n```bash\ngit status --short\ngit status --porcelain supporthub-api/modern | wc -l    # must be 0\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nMigrate ONLY the GET /tickets/:id route inside supporthub-api/migration.\n\nThen create the migrated route as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n"} });

SPLIT_CASES.push({ check: "c5-captured-opens-on-split", what: "a checkpoint states no scope under any label, so nothing says what it touches", control: {"plans/migration-plan.md": "# Migration plan\n\n## Milestones\n\n### Milestone 1 \u2014 Migrate `GET /tickets/:id` to ESM TypeScript on Express 4\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Application code only |\n| Files touched | `supporthub-api/migration/routes/tickets.js`; `supporthub-api/migration/routes/tickets.mts` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `92f7a9d` |\n\n### Milestone 2 \u2014 Upgrade Express 4 to Express 5\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Dependency upgrade only |\n| Files touched | `supporthub-api/migration/package.json`; `package-lock.json` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `abc1234` |\n\n## Validation checks\n\nrun the gates\n"}, negative: {"plans/migration-plan.md": "# Migration plan\n\n## Milestones\n\n### Milestone 1 \u2014 Migrate `GET /tickets/:id` to ESM TypeScript on Express 4\n\nOne line of summary.\n\n| | |\n|---|---|\n| Files listed | `supporthub-api/migration/routes/tickets.js`; `supporthub-api/migration/routes/tickets.mts` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `92f7a9d` |\n\n### Milestone 2 \u2014 Upgrade Express 4 to Express 5\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Dependency upgrade only |\n| Files touched | `supporthub-api/migration/package.json`; `package-lock.json` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `abc1234` |\n\n## Validation checks\n\nrun the gates\n"} });
SPLIT_CASES.push({ check: "c5-captured-opens-on-split", what: "checkpoint 2 carries the route migration too, phrased \"Upgrade Express 4 to Express 5\" rather than the seed's \"4.x to 5.x\"", control: {"plans/migration-plan.md": "# Migration plan\n\n## Milestones\n\n### Milestone 1 \u2014 Migrate `GET /tickets/:id` to ESM TypeScript on Express 4\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Application code only |\n| Files touched | `supporthub-api/migration/routes/tickets.js`; `supporthub-api/migration/routes/tickets.mts` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `92f7a9d` |\n\n### Milestone 2 \u2014 Upgrade Express 4 to Express 5\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Dependency upgrade only |\n| Files touched | `supporthub-api/migration/package.json`; `package-lock.json` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `abc1234` |\n\n## Validation checks\n\nrun the gates\n"}, negative: {"plans/migration-plan.md": "# Migration plan\n\n## Milestones\n\n### Milestone 1 \u2014 Migrate `GET /tickets/:id` to ESM TypeScript on Express 4\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Application code only |\n| Files touched | `supporthub-api/migration/routes/tickets.js`; `supporthub-api/migration/routes/tickets.mts` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `92f7a9d` |\n\n### Milestone 2 \u2014 Upgrade Express 4 to Express 5\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Dependency upgrade only |\n| Files touched | `supporthub-api/migration/routes/tickets.js`; `supporthub-api/migration/routes/tickets.mts`; `package-lock.json` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `abc1234` |\n\n## Validation checks\n\nrun the gates\n"} });
SPLIT_CASES.push({ check: "c6-start-opens-on-split", what: "a checkpoint states no scope under any label, so nothing says what it touches", control: {"plans/migration-plan.md": "# Migration plan\n\n## Milestones\n\n### Milestone 1 \u2014 Migrate `GET /tickets/:id` to ESM TypeScript on Express 4\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Application code only |\n| Files touched | `supporthub-api/migration/routes/tickets.js`; `supporthub-api/migration/routes/tickets.mts` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `92f7a9d` |\n\n### Milestone 2 \u2014 Upgrade Express 4 to Express 5\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Dependency upgrade only |\n| Files touched | `supporthub-api/migration/package.json`; `package-lock.json` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `abc1234` |\n\n## Validation checks\n\nrun the gates\n"}, negative: {"plans/migration-plan.md": "# Migration plan\n\n## Milestones\n\n### Milestone 1 \u2014 Migrate `GET /tickets/:id` to ESM TypeScript on Express 4\n\nOne line of summary.\n\n| | |\n|---|---|\n| Files listed | `supporthub-api/migration/routes/tickets.js`; `supporthub-api/migration/routes/tickets.mts` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `92f7a9d` |\n\n### Milestone 2 \u2014 Upgrade Express 4 to Express 5\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Dependency upgrade only |\n| Files touched | `supporthub-api/migration/package.json`; `package-lock.json` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `abc1234` |\n\n## Validation checks\n\nrun the gates\n"} });
SPLIT_CASES.push({ check: "c6-start-opens-on-split", what: "checkpoint 2 carries the route migration too, phrased \"Upgrade Express 4 to Express 5\" rather than the seed's \"4.x to 5.x\"", control: {"plans/migration-plan.md": "# Migration plan\n\n## Milestones\n\n### Milestone 1 \u2014 Migrate `GET /tickets/:id` to ESM TypeScript on Express 4\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Application code only |\n| Files touched | `supporthub-api/migration/routes/tickets.js`; `supporthub-api/migration/routes/tickets.mts` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `92f7a9d` |\n\n### Milestone 2 \u2014 Upgrade Express 4 to Express 5\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Dependency upgrade only |\n| Files touched | `supporthub-api/migration/package.json`; `package-lock.json` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `abc1234` |\n\n## Validation checks\n\nrun the gates\n"}, negative: {"plans/migration-plan.md": "# Migration plan\n\n## Milestones\n\n### Milestone 1 \u2014 Migrate `GET /tickets/:id` to ESM TypeScript on Express 4\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Application code only |\n| Files touched | `supporthub-api/migration/routes/tickets.js`; `supporthub-api/migration/routes/tickets.mts` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `92f7a9d` |\n\n### Milestone 2 \u2014 Upgrade Express 4 to Express 5\n\nOne line of summary.\n\n| | |\n|---|---|\n| Kind | Dependency upgrade only |\n| Files touched | `supporthub-api/migration/routes/tickets.js`; `supporthub-api/migration/routes/tickets.mts`; `package-lock.json` |\n| Validation | `npm run lint:migration && npm run test:migration` |\n| Rollback point | commit `abc1234` |\n\n## Validation checks\n\nrun the gates\n"} });


SPLIT_CASES.push({ check: "c6-step1-proves-its-files-exist", what: "the existence test is gone, so the verification can only report a scope breach and not a run that wrote nothing", control: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n**Verification.**\n\n```bash\nls -l supporthub-api/migration/routes/ticketRead.mts \\\n      supporthub-api/migration/tests/contracts/ticket-read.route.test.mts\ngit status --short -- ':!plans/prompts'\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n**Verification.**\n\n```bash\ngit status --short -- ':!plans/prompts'\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n"} });
SPLIT_CASES.push({ check: "c6-step1-proves-its-files-exist", what: "only the route file is proved to exist, so a missing contract test passes step 1", control: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n**Verification.**\n\n```bash\nls -l supporthub-api/migration/routes/ticketRead.mts \\\n      supporthub-api/migration/tests/contracts/ticket-read.route.test.mts\ngit status --short -- ':!plans/prompts'\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n**Verification.**\n\n```bash\nls -l supporthub-api/migration/routes/ticketRead.mts\ngit status --short -- ':!plans/prompts'\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n"} });
SPLIT_CASES.push({ check: "c6-step1-proves-its-files-exist", what: "the existence test was demoted below git status, so the reply is read before the disproof", control: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n**Verification.**\n\n```bash\nls -l supporthub-api/migration/routes/ticketRead.mts \\\n      supporthub-api/migration/tests/contracts/ticket-read.route.test.mts\ngit status --short -- ':!plans/prompts'\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n**Verification.**\n\n```bash\ngit status --short -- ':!plans/prompts'\nls -l supporthub-api/migration/routes/ticketRead.mts \\\n      supporthub-api/migration/tests/contracts/ticket-read.route.test.mts\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n"} });

SPLIT_CASES.push({ check: "agent-file-greps-assert-contract-values", what: "the exact regression -- a grep for expect(res.status), which returned 0 on a correct run that named the variable response", control: {"module1/m1-c6-migrate-one-express-route.md": "# ON-CAMERA\n\n**Commands.**\n\n```bash\ngit status --short -- ':!plans/prompts'\ngrep -oE '\\b(200|401|403|404)\\b' \\\n  supporthub-api/migration/tests/contracts/ticket-read.route.test.mts | sort -u | wc -l\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "# ON-CAMERA\n\n**Commands.**\n\n```bash\ngit status --short -- ':!plans/prompts'\ngrep -c \"expect(res.status)\" supporthub-api/migration/tests/contracts/ticket-read.route.test.mts\n```\n"} });
SPLIT_CASES.push({ check: "agent-file-greps-assert-contract-values", what: "a different identifier, response.body, so the rule is not keyed to one name", control: {"module1/m1-c6-migrate-one-express-route.md": "# ON-CAMERA\n\n**Commands.**\n\n```bash\ngit status --short -- ':!plans/prompts'\ngrep -oE '\\b(200|401|403|404)\\b' \\\n  supporthub-api/migration/tests/contracts/ticket-read.route.test.mts | sort -u | wc -l\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "# ON-CAMERA\n\n**Commands.**\n\n```bash\ngit status --short -- ':!plans/prompts'\ngrep -c \"expect(response.body)\" supporthub-api/migration/tests/contracts/ticket-read.route.test.mts\n```\n"} });
SPLIT_CASES.push({ check: "agent-file-greps-assert-contract-values", what: "an identifier hidden across a line continuation", control: {"module1/m1-c6-migrate-one-express-route.md": "# ON-CAMERA\n\n**Commands.**\n\n```bash\ngit status --short -- ':!plans/prompts'\ngrep -oE '\\b(200|401|403|404)\\b' \\\n  supporthub-api/migration/tests/contracts/ticket-read.route.test.mts | sort -u | wc -l\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "# ON-CAMERA\n\n**Commands.**\n\n```bash\ngit status --short -- ':!plans/prompts'\ngrep -c 'expect(res.statusCode)' \\\n  supporthub-api/migration/tests/contracts/ticket-read.route.test.mts\n```\n"} });

SPLIT_CASES.push({ check: "c6-migrates-in-place", what: "the status narrows to supporthub-api/, going blind to a run that also rewrote plans/migration-plan.md -- step 4's job, done early", control: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n# ON-CAMERA\n\n**Verification.**\n\n```bash\ngit status --short -- ':!plans/prompts'\ngit status --porcelain supporthub-api/modern | wc -l    # must be 0\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n# ON-CAMERA\n\n**Verification.**\n\n```bash\ngit status --short supporthub-api/\ngit status --porcelain supporthub-api/modern | wc -l    # must be 0\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n"} });
SPLIT_CASES.push({ check: "c6-migrates-in-place", what: "the status narrows to plans/, going blind to the workspace it is supposed to be checking", control: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n# ON-CAMERA\n\n**Verification.**\n\n```bash\ngit status --short -- ':!plans/prompts'\ngit status --porcelain supporthub-api/modern | wc -l    # must be 0\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n\n# ON-CAMERA\n\n**Verification.**\n\n```bash\ngit status --short plans/\ngit status --porcelain supporthub-api/modern | wc -l    # must be 0\n```\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\nThen create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n\nDo not create or modify any file under supporthub-api/modern.\n```\n"} });

SPLIT_CASES.push({ check: "no-fixed-offsets-into-agent-files", what: "grep -A4 is back against the file this clip's prompt tells Codex to write -- the live defect, where the recorded exception sat below line 4", control: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRecord in plans/migration-plan.md the behavioral exception.\n```\n\n# ON-CAMERA\n\n**Verification.**\n\n```bash\nawk '/^## /{p = /^## Behavioral exceptions/} p' plans/migration-plan.md\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRecord in plans/migration-plan.md the behavioral exception.\n```\n\n# ON-CAMERA\n\n**Verification.**\n\n```bash\ngrep -A4 \"## Behavioral exceptions\" plans/migration-plan.md\n```\n"} });
SPLIT_CASES.push({ check: "no-fixed-offsets-into-agent-files", what: "a -B offset, so the rule is not keyed to -A", control: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRecord in plans/migration-plan.md the behavioral exception.\n```\n\n# ON-CAMERA\n\n**Verification.**\n\n```bash\nawk '/^## /{p = /^## Behavioral exceptions/} p' plans/migration-plan.md\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRecord in plans/migration-plan.md the behavioral exception.\n```\n\n# ON-CAMERA\n\n**Verification.**\n\n```bash\ngrep -B3 \"## Behavioral exceptions\" plans/migration-plan.md\n```\n"} });
SPLIT_CASES.push({ check: "no-fixed-offsets-into-agent-files", what: "a -C offset written with a space", control: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRecord in plans/migration-plan.md the behavioral exception.\n```\n\n# ON-CAMERA\n\n**Verification.**\n\n```bash\nawk '/^## /{p = /^## Behavioral exceptions/} p' plans/migration-plan.md\n```\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "```text\nRecord in plans/migration-plan.md the behavioral exception.\n```\n\n# ON-CAMERA\n\n**Verification.**\n\n```bash\ngrep -C 5 \"## Behavioral exceptions\" plans/migration-plan.md\n```\n"} });



SPLIT_CASES.push({ check: "c6-step1-states-conversions-first", what: "the two prompts are recombined in BOTH files, which nothing caught -- a combined turn returned correct files and no stated conversions twice", control: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n"} });
SPLIT_CASES.push({ check: "c6-step1-states-conversions-first", what: "the saved file is recombined while the runbook still shows two, so an author pasting from the file sends the failing shape", control: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n"} });
SPLIT_CASES.push({ check: "c6-step1-states-conversions-first", what: "the first prompt keeps its no-writing line but also asks for a file, so the turn has a deliverable again", control: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n\nThen create supporthub-api/migration/routes/ticketRead.mts.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n\nThen create supporthub-api/migration/routes/ticketRead.mts.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n"} });
SPLIT_CASES.push({ check: "c6-step1-states-conversions-first", what: "the conversions request is dropped, so step 1's Highlight and EO2d's demonstration have nothing to rest on", control: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. State the exact conversions the skill requires.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n"}, negative: {"module1/m1-c6-migrate-one-express-route.md": "## Step 1 \u2014 Apply the skill\n\n```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. Summarize the route.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n## Step 2 \u2014 Run the gates\n\nnothing here\n", "plans/prompts/m1-c6-migrate-route.md": "```text\nRead framework-skill/node-express-migration/SKILL.md and follow its guidance.\n\n1. Summarize the route.\n\nDo not create, edit or delete any file yet. Read the repository freely with\nread-only commands such as ls, find, rg, sed and cat.\n```\n\n```text\nNow apply exactly the conversions you listed.\n\nCreate supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript.\n```\n\n"} });

SPLIT_CASES.push({ check: "m2-c3-verifies-in-thread", what: "step 4 sends the author to a destination, leaving the surface the clip is about", control: {"module2/m2-c3-schedule-triage.md": "## Step 4 \u2014 Verify Slack and Linear drafts\n\n**Operator action.** Read the priority off Codex's reply.\n\n**Stay in the Codex panel. Do not open Slack or Linear.** Gate 1 measured what renders in-thread.\n\n---\n"}, negative: {"module2/m2-c3-schedule-triage.md": "## Step 4 \u2014 Verify Slack and Linear drafts\n\n**Operator action.** Open Linear and confirm the priority.\n\n**Stay in the Codex panel. Do not open Slack or Linear.** Gate 1 measured what renders in-thread.\n\n---\n"} });
SPLIT_CASES.push({ check: "m2-c3-verifies-in-thread", what: "the stay-in-panel instruction is gone, so the bullet reads as though the destinations must be opened", control: {"module2/m2-c3-schedule-triage.md": "## Step 4 \u2014 Verify Slack and Linear drafts\n\n**Operator action.** Read the priority off Codex's reply.\n\n**Stay in the Codex panel. Do not open Slack or Linear.** Gate 1 measured what renders in-thread.\n\n---\n"}, negative: {"module2/m2-c3-schedule-triage.md": "## Step 4 \u2014 Verify Slack and Linear drafts\n\n**Operator action.** Read the priority off Codex's reply.\n\nGate 1 measured what renders in-thread.\n\n---\n"} });

let failures = 0;
const pass = (m) => process.stdout.write(`  ok    ${m}\n`);
const fail = (m) => { failures += 1; process.stdout.write(`  FAIL  ${m}\n`); };

/**
 * every-check-is-wired reads the two preflight scripts, so the pair IS the
 * artifact: the honest control is the real files, and the honest negative is one
 * invocation removed from them. Its other two branches -- an exemption with an
 * empty reason, an exemption for a check that no longer exists, and a check that
 * is both wired and exempted -- read an EXEMPT literal inside scripts/check.mjs
 * that CHECK_ROOT cannot relocate. All three were proven red by hand: blanking
 * c6-start-opens-on-split's reason reports "exempted with no reason given";
 * exempting the retired skill-tells-unique reports "exempted but no longer
 * exists"; and exempting no-route-migrated while a preflight still runs it
 * reports "both wired and exempted -- drop the exemption, it is stale".
 */
{
  const M1 = 'module1/scripts/preflight_check.sh';
  const M2 = 'module2/scripts/preflight_check.sh';
  const control = { [M1]: readFileSync(M1, 'utf8'), [M2]: readFileSync(M2, 'utf8') };
  // The check this was written for: it sat in check.mjs wired to nothing while
  // the C2 absence guarantee rested on it.
  const unwired = 'm2-c2-starts-without-the-correction';
  const stripped = control[M2]
    .split('\n')
    .filter((l) => !(l.includes('check.mjs') && l.includes(unwired)))
    .join('\n');
  if (stripped === control[M2]) {
    throw new Error(`${unwired} is not invoked in ${M2} -- the negative case cannot remove it`);
  }
  SYNTHETIC_CASES.push({
    check: 'every-check-is-wired',
    what: `${unwired} is written but no preflight runs it`,
    control,
    negative: { ...control, [M2]: stripped },
  }, {
    // The inverse, which the check did not cover until it happened: rewriting a
    // check in place deleted its neighbour, both preflights aborted that step
    // with "unknown check", and this check stayed green.
    check: 'every-check-is-wired',
    what: 'a preflight runs a check scripts/check.mjs no longer defines, so the gate silently stops being enforced',
    control,
    negative: {
      ...control,
      [M2]: control[M2].replace(`scripts/check.mjs" ${unwired}`, 'scripts/check.mjs" a-check-that-was-deleted'),
    },
  });
}

/**
 * runbooks-probe-agent-identity reads five runbooks at once, so build()'s
 * one-file root cannot host it. buildFrom() copies all five, and each negative
 * removes one half of the probe from ONE of them -- which also proves the check
 * is not satisfied by the other four still having it.
 */
{
  const RUNBOOKS = [
    'module1/m1-c2-map-noisy-typescript-modules.md',
    'module1/m1-c3-execute-codex-refactor.md',
    'module1/m1-c5-inventory-legacy-express4.md',
    'module1/m1-c6-migrate-one-express-route.md',
    'module2/m2-c2-manual-triage.md',
  ];
  const control = Object.fromEntries(RUNBOOKS.map((f) => [f, readFileSync(f, 'utf8')]));
  // Each case edits one runbook's prep block only. Cutting at ON-CAMERA keeps a
  // mutation from landing in a step's verification, where it would prove nothing
  // about the precondition.
  const cases = [
    ['module1/m1-c2-map-noisy-typescript-modules.md',
      'the probe asks for a working directory but no longer says absolute, so a folder name passes',
      (s) => s.replace('absolute working directory', 'working directory')],
    ['module1/m1-c3-execute-codex-refactor.md',
      'the probe stopped asking for the branch, which is the half that catches a master checkout at a glance',
      (s) => s.replace('Print your absolute working directory and the current git branch.',
        'Print your absolute working directory.')],
    ['module1/m1-c5-inventory-legacy-express4.md',
      'the terminal no longer prints pwd, so the agent\'s answer has nothing to be compared against',
      (s) => s.replace('```bash\npwd\ngit rev-parse --abbrev-ref HEAD\n```',
        '```bash\ngit rev-parse --abbrev-ref HEAD\n```')],
    ['module1/m1-c6-migrate-one-express-route.md',
      'the prep block stopped naming the branch this clip starts from, so "does it match" has no right answer',
      (s) => s.slice(0, s.search(/^#+ *ON-CAMERA/m)).replaceAll('demo/m1-c6-start', 'the start branch')
        + s.slice(s.search(/^#+ *ON-CAMERA/m))],
    ['module2/m2-c2-manual-triage.md',
      'the warning against comparing the project name is gone -- the one field that was identical between the two folders',
      (s) => s.replace(
        'Do not check the project *name* — it is truncated\nin the chip and was identical between the two folders, so it looks right either way.', '')],
  ];
  for (const [file, what, mutate] of cases) {
    const negative = { ...control, [file]: mutate(control[file]) };
    if (negative[file] === control[file]) {
      throw new Error(`runbooks-probe-agent-identity: mutation for "${what}" changed nothing in ${file}`);
    }
    SYNTHETIC_CASES.push({ check: 'runbooks-probe-agent-identity', what, control, negative });
  }
}

/**
 * The two prompt-parity checks now count only the ```text blocks below the
 * ON-CAMERA marker, because plans/prompts/ is the record of what is typed in
 * front of the viewer and the prep blocks send prompts of their own. Their
 * synthetic runbooks predate that boundary, so give them one -- the saved-copy
 * files are prompts only and correctly have none.
 */
const RUNBOOK_OF = {
  'c2-prompts-saved': 'module1/m1-c2-map-noisy-typescript-modules.md',
  'c6-prompt-saved': 'module1/m1-c6-migrate-one-express-route.md',
};
for (const c of [...SYNTHETIC_CASES, ...SPLIT_CASES]) {
  const rb = RUNBOOK_OF[c.check];
  if (!rb) continue;
  for (const files of [c.control, c.negative]) {
    if (files && files[rb] !== undefined && !/^#+ *ON-CAMERA/m.test(files[rb])) {
      files[rb] = '# ON-CAMERA\n\n' + files[rb];
    }
  }
}

// And prove the boundary itself: a prompt that sits in the prep block is not an
// on-camera prompt, and one that drifts below the marker is.
for (const [check, rb, saved] of [
  ['c2-prompts-saved', RUNBOOK_OF['c2-prompts-saved'], 'plans/prompts/m1-c2-map-codebase.md'],
  ['c6-prompt-saved', RUNBOOK_OF['c6-prompt-saved'], 'plans/prompts/m1-c6-migrate-route.md'],
]) {
  const ONE = '```text\nDo the thing.\n```\n';
  const PROBE = '```text\nPrint your absolute working directory and the current git branch. Do nothing else.\n```\n';
  SPLIT_CASES.push({
    check,
    what: 'a prep-block prompt is counted as an on-camera one, which is what adding the identity probe did to both parity checks',
    control: { [rb]: PROBE + '\n# ON-CAMERA\n\n' + ONE, [saved]: ONE },
    negative: { [rb]: '# ON-CAMERA\n\n' + PROBE + ONE, [saved]: ONE },
  });
}

/**
 * The three C2 evidence checks read several real files together, so their
 * controls are those files and each negative changes one of them. The baseline
 * cases include the defect that actually shipped: incident-2001 at P0.
 */
{
  const RUBRIC = 'docs/triage-rubric.md';
  const BASE = 'automation/triage/baseline-manual-sweep.json';
  const COMMITS = 'automation/github-seed/commits.json';
  const ISSUES = 'automation/sentry-fixtures/issues.json';
  const SVC = 'supporthub-api/modern/src/services/ticketService.ts';
  const RTE = 'supporthub-api/modern/src/routes/tickets.ts';
  const load = (...fs) => Object.fromEntries(fs.map((f) => [f, readFileSync(f, 'utf8')]));
  const edit = (files, f, fn) => {
    const doc = JSON.parse(files[f]);
    fn(doc);
    return { ...files, [f]: JSON.stringify(doc, null, 2) + '\n' };
  };
  const find = (doc, id) => doc.findings.find((x) => x.id === id);

  // The P0 clause reads the source issues, so they belong in the control too.
  const baseCtl = load(RUBRIC, BASE, ISSUES);
  SYNTHETIC_CASES.push(
    {
      check: 'baseline-priorities-derive-from-rubric',
      what: 'incident-2001 is back at P0 — the priority this file shipped with, which the rubric cannot derive at 500 users because its P0 band is "any number"',
      control: baseCtl,
      negative: edit(baseCtl, BASE, (d) => { find(d, 'incident-2001').priority = 'P0'; }),
    },
    {
      check: 'baseline-priorities-derive-from-rubric',
      what: 'incident-2002 is priced P1 on 61 affected users, outside the band the rubric gives P1',
      control: baseCtl,
      negative: edit(baseCtl, BASE, (d) => { find(d, 'incident-2002').priority = 'P1'; }),
    },
    {
      check: 'baseline-priorities-derive-from-rubric',
      what: 'evt-1099 is deferred on high confidence, which the rubric defers for nothing but low',
      control: baseCtl,
      negative: edit(baseCtl, BASE, (d) => { find(d, 'evt-1099').confidence = 'high'; }),
    },
    {
      // Proves the bands are read from the rubric rather than hardcoded: C5's
      // seeded diff edits this very row, in the other direction.
      check: 'baseline-priorities-derive-from-rubric',
      what: 'the rubric raises the P1 threshold above 500, so a baseline that was derivable no longer is',
      control: baseCtl,
      negative: { ...baseCtl, [RUBRIC]: baseCtl[RUBRIC].replace('| 100 or more |', '| 600 or more |') },
    },
  );

  SYNTHETIC_CASES.push({
    check: 'baseline-priorities-derive-from-rubric',
    what: 'incident-2001 is P0 and argues for it in its own evidence string, which is the form that slipped past the first draft of this clause',
    control: baseCtl,
    negative: edit(baseCtl, BASE, (d) => {
      const f = find(d, 'incident-2001');
      f.priority = 'P0';
      f.evidence = 'Core workflow unavailable for 500 users with no workaround. Data loss is possible.';
    }),
  });

  const RB = 'module2/m2-c2-manual-triage.md';
  const RB3 = 'module2/m2-c3-schedule-triage.md';
  const rbCtl = load(RB, RB3, BASE);
  SYNTHETIC_CASES.push(
    {
      check: 'runbook-expects-the-baseline-it-compares-to',
      what: 'the baseline moves incident-2001 to P1 and step 4 still tells the author to expect P0 — the drift this pair produced',
      control: rbCtl,
      negative: { ...rbCtl, [RB]: rbCtl[RB].replace('`incident-2001` at P1', '`incident-2001` at P0') },
    },
    {
      check: 'runbook-expects-the-baseline-it-compares-to',
      what: "step 4 tells the author to expect evt-1099 at a priority, when the baseline defers it -- low confidence is not a priority",
      control: rbCtl,
      negative: { ...rbCtl, [RB]: rbCtl[RB].replace('`evt-1099` deferred. Two marked', '`evt-1099` at P3. Two marked') },
    },
    {
      check: 'runbook-expects-the-baseline-it-compares-to',
      what: "C3's transcribed table still shows the old P0 -- output that appears on camera beside the command that prints the real value",
      control: rbCtl,
      negative: {
        ...rbCtl,
        [RB3]: rbCtl[RB3].replace('  incident-2001    P1        users=500  route=true',
          '  incident-2001    P0        users=500  route=true'),
      },
    },
    {
      check: 'runbook-expects-the-baseline-it-compares-to',
      what: "C3's transcribed table shows a combined user count the baseline does not hold",
      control: rbCtl,
      negative: {
        ...rbCtl,
        [RB3]: rbCtl[RB3].replace('  incident-2001    P1        users=500  route=true',
          '  incident-2001    P1        users=412  route=true'),
      },
    },
  );

  // The check widened to the seeded runs, so they belong in this control too.
  const keyCtl = load(COMMITS, ISSUES, 'automation/runs/run-3001.json',
    'automation/runs/run-3002.json', 'automation/runs/run-3003.json');
  SYNTHETIC_CASES.push(
    {
      check: 'fixtures-carry-no-answer-key',
      what: 'a commit carries a note again — "touches no application code on the failing path" is step 3\'s second finding, handed over',
      control: keyCtl,
      negative: edit(keyCtl, COMMITS, (d) => {
        d.commits[1].note = 'Landed 17 minutes before the first error. Touches no application code on the failing path.';
      }),
    },
    {
      check: 'fixtures-carry-no-answer-key',
      what: 'the file comment reasons about a specific record instead of describing the file',
      control: keyCtl,
      negative: edit(keyCtl, ISSUES, (d) => {
        d._comment = 'Deterministic Sentry evidence. evt-1042 and evt-1043 are the same fault.';
      }),
    },
  );

  // incident-2002's frame now points at the real inbound mapping, so that
  // file has to be in the control for the frames to resolve.
  const PRI = 'supporthub-api/modern/src/utils/priority.ts';
  const frameCtl = load(ISSUES, SVC, RTE, PRI);
  SYNTHETIC_CASES.push(
    {
      check: 'fixture-stack-frames-resolve',
      what: 'evt-1043 names bulkImport again, a function that exists nowhere in the repository',
      control: frameCtl,
      negative: edit(frameCtl, ISSUES, (d) => {
        d.issues.find((i) => i.id === 'evt-1043').stack[1] = `at bulkImport (${SVC}:214)`;
      }),
    },
    {
      check: 'fixture-stack-frames-resolve',
      what: 'changeStatus is given at line 196 again — the number this fixture shipped with, inside a different function entirely',
      control: frameCtl,
      negative: edit(frameCtl, ISSUES, (d) => {
        d.issues.find((i) => i.id === 'evt-1042').stack[0] = `at changeStatus (${SVC}:196)`;
      }),
    },
    {
      check: 'fixture-stack-frames-resolve',
      what: 'a frame points past the end of the file it names',
      control: frameCtl,
      negative: edit(frameCtl, ISSUES, (d) => {
        d.issues.find((i) => i.id === 'evt-1088').stack[0] = `at listTickets (${SVC}:99999)`;
      }),
    },
  );
}

/**
 * The C3/C5/C6 fixture checks. Same pattern: controls are the real files,
 * each negative restores one form of the answer key the walk exposed.
 */
{
  const BASE = 'automation/triage/baseline-manual-sweep.json';
  const ISSUES = 'automation/sentry-fixtures/issues.json';
  const R1 = 'automation/runs/run-3001.json';
  const R2 = 'automation/runs/run-3002.json';
  const R3 = 'automation/runs/run-3003.json';
  const LIN = 'automation/linear-drafts/incident-2001.json';
  const SLK = 'automation/slack-drafts/incident-2001.json';
  const LIN2 = 'automation/linear-drafts/incident-2002.json';
  const load = (...fs) => Object.fromEntries(fs.map((f) => [f, readFileSync(f, 'utf8')]));
  const edit = (files, f, fn) => {
    const doc = JSON.parse(files[f]);
    fn(doc);
    return { ...files, [f]: JSON.stringify(doc, null, 2) + '\n' };
  };

  const traceCtl = load(BASE, ISSUES, R1, R2, R3);
  SYNTHETIC_CASES.push(
    {
      check: 'seeded-run-hunks-trace-to-findings',
      what: 'a hunk carries a verdict again — the field that was C5 step 2\'s answer, in a file the agent reads',
      control: traceCtl,
      negative: edit(traceCtl, R1, (d) => { d.hunks[0].verdict = 'valid'; d.hunks[0].why = 'the finding asks for it'; }),
    },
    {
      check: 'seeded-run-hunks-trace-to-findings',
      what: 'run-3001\'s unrequested hunk stops being the rubric, so the clip becomes an ordinary scope complaint rather than an automation editing the standard it is judged by',
      control: traceCtl,
      negative: edit(traceCtl, R1, (d) => { d.hunks[1].file = 'supporthub-api/modern/src/routes/tickets.ts'; }),
    },
    {
      check: 'seeded-run-hunks-trace-to-findings',
      what: 'both of run-3001\'s hunks are asked for, leaving step 2 nothing to reject',
      control: traceCtl,
      negative: edit(traceCtl, R1, (d) => { d.hunks[1].file = 'supporthub-api/modern/src/utils/priority.ts'; }),
    },
    {
      check: 'seeded-run-hunks-trace-to-findings',
      what: 'run-3002 keeps no hunk traceable to incident-2001, so the recovery has nothing to preserve and is just a revert',
      control: traceCtl,
      negative: edit(traceCtl, R2, (d) => { d.hunks[0].file = 'supporthub-api/modern/src/routes/health.ts'; }),
    },
    {
      // The trace is only as good as the evidence it reads.
      check: 'seeded-run-hunks-trace-to-findings',
      what: 'incident-2002 points back at the dead ticketService.toPriority copy, so the fix that answers it is no longer traceable to it',
      control: traceCtl,
      negative: edit(traceCtl, ISSUES, (d) => {
        d.issues.find((i) => i.id === 'incident-2002').stack = ['at toPriority (supporthub-api/modern/src/services/ticketService.ts:85)'];
      }),
    },
  );

  const keyCtl2 = load(R1, R2, R3, 'automation/github-seed/commits.json', ISSUES);
  SYNTHETIC_CASES.push(
    {
      check: 'fixtures-carry-no-answer-key',
      what: 'the failed run knows the right commit again — printed on camera by C6 step 1, a minute before step 2 asks Codex to work it out',
      control: keyCtl2,
      negative: edit(keyCtl2, R2, (d) => { d.correlation.correct = 'a1b2c3d'; }),
    },
    {
      check: 'fixtures-carry-no-answer-key',
      what: 'the failed run names its own fault type, which is step 2\'s conclusion',
      control: keyCtl2,
      negative: edit(keyCtl2, R2, (d) => { d.correlation.faultType = 'bad source assumption'; }),
    },
    {
      check: 'fixtures-carry-no-answer-key',
      what: 'the validation block explains which hunk is at fault instead of reporting the gates',
      control: keyCtl2,
      negative: edit(keyCtl2, R2, (d) => { d.validation.note = 'The guard is sound; only the dependency hunk is at fault.'; }),
    },
  );

  const draftCtl = load(BASE, LIN, LIN2, SLK);
  SYNTHETIC_CASES.push(
    {
      check: 'drafts-carry-the-triaged-priority',
      what: 'the Linear draft is back at P0 while the baseline triaged P1 — the state both drafts shipped in',
      control: draftCtl,
      negative: edit(draftCtl, LIN, (d) => { d.priority = 'P0'; d.title = d.title.replace('P1:', 'P0:'); }),
    },
    {
      check: 'drafts-carry-the-triaged-priority',
      what: 'only the label is stale, so the field and the title agree and the drift hides in the metadata',
      control: draftCtl,
      negative: edit(draftCtl, LIN, (d) => { d.labels = d.labels.map((l) => (l === 'p1' ? 'p0' : l)); }),
    },
    {
      check: 'drafts-carry-the-triaged-priority',
      what: 'the Slack headline states a priority the triage did not reach',
      control: draftCtl,
      negative: edit(draftCtl, SLK, (d) => { d.text = d.text.replace('P1 —', 'P0 —'); }),
    },
    {
      check: 'drafts-carry-the-triaged-priority',
      what: 'a draft is pre-approved, which is not draft-only',
      control: draftCtl,
      negative: edit(draftCtl, SLK, (d) => { d.approvedBy = 'demo-operator'; }),
    },
    {
      // The body argues about bands and must stay legal: incident-2002's draft
      // explains it is P2 "rather than P1", and an over-eager scan rejects it.
      check: 'drafts-carry-the-triaged-priority',
      what: 'a draft body reasons about the band it did not land in — a false positive, and must NOT fire',
      control: draftCtl,
      negative: null,
    },
  );
}

{
  const M1P = 'module1/scripts/preflight_check.sh';
  const M2P = 'module2/scripts/preflight_check.sh';
  const pfCtl = { [M1P]: readFileSync(M1P, 'utf8'), [M2P]: readFileSync(M2P, 'utf8') };
  const defLine = pfCtl[M2P].split('\n').findIndex((l) => /^\s*check\s*\(\s*\)\s*\{/.test(l));
  const spliced = (() => {
    const lines = pfCtl[M2P].split('\n');
    // Exactly what happened: a block anchored on the first literal occurrence of
    // `check "all" ` in the file, which was a sentence in a comment.
    lines.splice(5, 0, 'check "all" "spliced into a comment" \\', "  'true' \\", '  "why" "fix" "ask"');
    return lines.join('\n');
  })();
  SYNTHETIC_CASES.push(
    {
      check: 'checks-do-not-match-tool-output',
      what: "an assertion greps npm test for Vitest's banner again — the form that failed on a machine whose suite was passing",
      control: pfCtl,
      negative: {
        ...pfCtl,
        [M2P]: pfCtl[M2P].replace("  'npm test' \\\n",
          '  \'[ "$(npm test 2>&1 | grep -cF "Tests  25 passed (25)")" -ge 1 ]\' \\\n'),
      },
    },
    {
      check: 'checks-do-not-match-tool-output',
      what: 'an assertion greps a runner for the words it prints when it finds nothing to run',
      control: pfCtl,
      negative: {
        ...pfCtl,
        [M1P]: pfCtl[M1P].replace(
          '  \'[ -z "$(ls supporthub-api/migration/tests/contracts/*.test.mts 2>/dev/null)" ]\' \\\n',
          '  \'[ "$(npm run test:route:migration 2>&1 | grep -c "No test files found")" -eq 1 ]\' \\\n'),
      },
    },
    {
      check: 'preflight-checks-run-after-their-definition',
      what: `a check block is spliced in above check(), which is defined at line ${defLine + 1} — the shell says "check: command not found" and the run continues without it`,
      control: pfCtl,
      negative: { ...pfCtl, [M2P]: spliced },
    },
    {
      check: 'preflight-checks-run-after-their-definition',
      what: 'the splice leaves a bare unquoted invocation behind, which is prose the shell will try to run',
      control: pfCtl,
      negative: {
        ...pfCtl,
        [M2P]: pfCtl[M2P].replace(/^check "all" "working tree clean"/m, 'check "all" gates every clip, check "cN" gates one\ncheck "all" "working tree clean"'),
      },
    },
  );

  const RB = 'module2/m2-c2-manual-triage.md';
  const BASE = 'automation/triage/baseline-manual-sweep.json';
  const TPL = 'automation/triage/corrected-sweep.template.json';
  const shapeCtl = {
    [RB]: readFileSync(RB, 'utf8'),
    [BASE]: readFileSync(BASE, 'utf8'),
    [TPL]: readFileSync(TPL, 'utf8'),
  };
  const dropKey = (files, key) => {
    const t = JSON.parse(files[TPL]);
    delete t.findings[0][key];
    return { ...files, [TPL]: JSON.stringify(t, null, 2) + '\n' };
  };
  SYNTHETIC_CASES.push(
    {
      check: 'c2-step4-specifies-the-shape-it-compares',
      what: 'the template stops carrying "route", so Codex is shown a shape without the key the comparison then selects',
      control: shapeCtl,
      negative: dropKey(shapeCtl, 'route'),
    },
    {
      check: 'c2-step4-specifies-the-shape-it-compares',
      what: 'the template renames priority the way walk 3 did, to priorityLevel',
      control: shapeCtl,
      negative: (() => {
        const t = JSON.parse(shapeCtl[TPL]);
        t.findings[0].priorityLevel = t.findings[0].priority;
        delete t.findings[0].priority;
        return { ...shapeCtl, [TPL]: JSON.stringify(t, null, 2) + '\n' };
      })(),
    },
    {
      check: 'c2-step4-specifies-the-shape-it-compares',
      what: 'the prompt goes back to listing key names in prose instead of pointing at the template — the form that produced three different shapes in three walks',
      control: shapeCtl,
      negative: {
        ...shapeCtl,
        [RB]: shapeCtl[RB].replace('automation/triage/corrected-sweep.template.json and write your report to\nautomation/triage/corrected-sweep.json using exactly that structure',
          'the finding list and write your report to\nautomation/triage/corrected-sweep.json with keys id, priority, affectedUsers and route'),
      },
    },
    {
      check: 'c2-step4-specifies-the-shape-it-compares',
      what: 'the verification stops requiring the shape, so a renamed key reaches the tables and prints absent with nothing on screen saying what to re-prompt with',
      control: shapeCtl,
      negative: {
        ...shapeCtl,
        [RB]: shapeCtl[RB]
          .replace('node scripts/json.mjs require "$OUT" findings id priority affectedUsers route\n', '')
          .replace('node scripts/json.mjs require "$OUT" . rejectedCorrelations\n', ''),
      },
    },
    {
      check: 'c2-step4-specifies-the-shape-it-compares',
      what: 'the tables are read before the shape is required, so the author meets four absent rows before the line that explains them',
      control: shapeCtl,
      negative: {
        ...shapeCtl,
        [RB]: shapeCtl[RB].replace(
          'node scripts/json.mjs require "$OUT" findings id priority affectedUsers route\nnode scripts/json.mjs require "$OUT" . rejectedCorrelations\nnode scripts/json.mjs table "$OUT"',
          'node scripts/json.mjs table "$OUT"')
          .replace('node scripts/json.mjs fields "$OUT" "rejected=rejectedCorrelations.0.commit"',
            'node scripts/json.mjs require "$OUT" findings id priority affectedUsers route\nnode scripts/json.mjs require "$OUT" . rejectedCorrelations\nnode scripts/json.mjs fields "$OUT" "rejected=rejectedCorrelations.0.commit"'),
      },
    },
    {
      check: 'c2-step4-specifies-the-shape-it-compares',
      what: 'a selector names a key the baseline does not hold',
      control: shapeCtl,
      negative: (() => {
        const t = JSON.parse(shapeCtl[TPL]);
        t.findings[0].userCount = 0;
        return {
          ...shapeCtl,
          [TPL]: JSON.stringify(t, null, 2) + '\n',
          [RB]: shapeCtl[RB]
            .replace(/users=affectedUsers:4/g, 'users=userCount:4')
            .replace('require "$OUT" findings id priority affectedUsers route', 'require "$OUT" findings id priority userCount route'),
        };
      })(),
    },
  );

}

{
  const C2 = 'module2/m2-c2-manual-triage.md';
  const C3 = 'module2/m2-c3-schedule-triage.md';
  const ISS = 'automation/sentry-fixtures/issues.json';
  const BASE = 'automation/triage/baseline-manual-sweep.json';
  const ctl = Object.fromEntries([C2, C3, ISS, BASE].map((f) => [f, readFileSync(f, 'utf8')]));
  const WIN = '2025-03-03T00:00:00Z to 2025-03-04T00:00:00Z';
  SYNTHETIC_CASES.push(
    {
      check: 'scheduled-sweep-window-matches-the-fixtures',
      what: 'C3 asks for "the most recent 24-hour window" again -- the wording that made the scheduled run report "No actionable update" and left steps 2 to 4 with nothing',
      control: ctl,
      negative: { ...ctl, [C3]: ctl[C3].replace(`for the window\n${WIN}.`, 'for the most recent\n24-hour window.') },
    },
    {
      check: 'scheduled-sweep-window-matches-the-fixtures',
      what: 'C3 sweeps a real window, but the day after the one the fixtures cover',
      control: ctl,
      negative: { ...ctl, [C3]: ctl[C3].replace(WIN, '2025-03-04T00:00:00Z to 2025-03-05T00:00:00Z') },
    },
    {
      check: 'scheduled-sweep-window-matches-the-fixtures',
      what: 'the fixtures are re-dated and the two prompts are left behind',
      control: ctl,
      negative: (() => {
        const d = JSON.parse(ctl[ISS]);
        d.query_window = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' };
        return { ...ctl, [ISS]: JSON.stringify(d, null, 2) + '\n' };
      })(),
    },
    {
      check: 'scheduled-sweep-window-matches-the-fixtures',
      what: 'the baseline records a window the fixtures do not cover',
      control: ctl,
      negative: (() => {
        const d = JSON.parse(ctl[BASE]);
        d.window = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' };
        return { ...ctl, [BASE]: JSON.stringify(d, null, 2) + '\n' };
      })(),
    },
    {
      check: 'scheduled-sweep-window-matches-the-fixtures',
      what: 'C2 drifts off the window while C3 stays on it, so one conversation is told two things again',
      control: ctl,
      negative: { ...ctl, [C2]: ctl[C2].replace(WIN, '2025-03-01T00:00:00Z to 2025-03-02T00:00:00Z') },
    },
  );
}

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

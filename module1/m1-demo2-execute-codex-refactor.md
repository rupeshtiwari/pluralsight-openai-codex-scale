# Execute a Codex refactor with ExecPlan checkpoints

Module 1 · Clip 3 · Demo · 6 minutes

---

## The problem this demo solves

A cleanup has been approved. Now an agent implements it — and returns a diff containing the
cleanup plus a change nobody asked for. The extra change is often defensible on its own merits,
which is exactly why it is dangerous: it is easy to accept without noticing.

You need a record of what was intended so you can tell, hunk by hunk, what belongs.

## The decision you will make

**Which generated changes belong in this refactor?**

## Learning Objectives

| LO | Description |
|---|---|
| TO1 | Apply Codex to plan and execute a codebase refactoring operation using reviewable passes. |
| EO1b | Apply the ExecPlan pattern to maintain a running log of intended changes, behavior contracts, and validation checks across a multi-session refactor |
| EO1c | Evaluate a Codex-generated refactoring diff to confirm that public behavior is preserved and that architecture migrations are separated into discrete tasks |
  and validation checks across a multi-session refactor
- Evaluate a Codex-generated refactoring diff to confirm that public behavior is preserved and
  that architecture migrations are separated into discrete tasks

## Terms used here

- **ExecPlan** — a file recording what a piece of work intends to change, what it must not break,
  and what was deliberately left out.
- **Diff** — the set of changes not yet committed.
- **Deferred work** — a change worth making, recorded rather than made now.

## AUTHOR PREP — DO NOT NARRATE

**Surface: Stage A — VS Code with Codex panel**

| | |
|---|---|
| Starting checkpoint | `demo/m1-c3-start` |
| Working directory | repository root |
| Application | VS Code, opened on the repository root |
| Panes visible | editor, Codex panel, and the integrated terminal in the same window |
| Secondary surface | integrated terminal in the same VS Code window |
| Exact file to have open | `supporthub-api/modern/src/services/ticketService.ts` and `plans/ExecPlan.md` |
| Expected Git state | clean working tree, nothing staged |
| External integrations | none |
| Narration budget | 774 words — see below |

**Narration budget**

This is a six-minute demo, so the planning target is **774 words**. Presentation clips are 405.

Clip duration is the hard ceiling and the word count never overrides it. Render the narration and
measure it against six minutes before recording; if it runs long, cut narration rather than
extending the clip or speeding up delivery.

A larger word budget buys deeper explanation of mechanism, evidence, operator decision and
production consequence. It does not buy more technical actions: the demo stays at four major steps.
Editing out agent waits frees screen time, not narration time — do not add words to fill it.

**Reset command**

```bash
./module1/scripts/demo_reset.sh
```

The reset refuses if changes exist outside the demo surface and lists what it would have discarded.
That guard exists because a plain reset destroyed unstaged work three times while this repository
was being built. Between takes the dirty files are demo artifacts and it proceeds normally.

**Prepare before recording**

```bash
git checkout demo/m1-c3-start
npm install                     # only on a fresh checkout
./module1/scripts/demo_reset.sh
npm test                        # Tests  25 passed (25)
git status --short              # must print nothing at all
```

Run these outside the recording, not in the integrated terminal.

**Expected values**

| Evidence | Value |
|---|---|
| Baseline tests | 25 passed |
| ExecPlan intended changes | 4 numbered items |
| Progress log at start | empty |
| Deferred work at start | empty |
| Files the plan intends to change | 3 |
| Changed files after Codex runs | more than 3 — the extra one is the teaching moment |

**Recovery path**

If the generated diff contains only the intended changes, the fallback prompt in Step 3 asks Codex
for an architectural improvement so the removal decision still has something to act on. If the
validation gates fail, reset and rerun the pass rather than repairing it by hand on camera.

**Troubleshooting**

| Symptom | Cause | Fix |
|---|---|---|
| `npm test` reports `Missing script: "test"` | wrong branch | `git checkout demo/m1-c3-start` |
| Tests fail on a fresh checkout | dependencies not installed | `npm install` |
| Source Control shows changes before Step 1 | previous run not reset | `./module1/scripts/demo_reset.sh` |

---

# ON-CAMERA

## Step 1 — Create an ExecPlan that records intended changes, contracts, and validation checks

**Purpose.** The ExecPlan is the contract for this pass. Writing it before any code exists is what
makes the later review possible: you cannot judge whether a change belongs without a written
statement of what was intended.

**Starting state.** Branch `demo/m1-c3-start`, clean tree. `plans/ExecPlan.md` holds the
approved theme and the empty tables this step fills in.

**Navigation.** VS Code, with `plans/ExecPlan.md` open in the editor beside the Codex panel.

**Prompt.**

```text
Open plans/ExecPlan.md.

Complete it for this refactor, without changing the Objective or the approved
cleanup theme:

- Behavior contracts: every route path, HTTP status code, and response field
  name in supporthub-api/modern that this work must not change, and the test files that
  lock them
- Validation checks: the exact commands that will prove those contracts hold
- Progress log: leave empty, ready to fill in as work proceeds
- Deferred work: leave empty, ready for anything found and set aside

Edit only plans/ExecPlan.md. Do not touch any file under supporthub-api/.
```

**Expected result.** The Behavior contracts section names the four contract test files and the
route, status code, field-name, and priority contracts. Validation checks lists `npm run lint`,
`npm run typecheck`, `npm run build`, and `npm test`. Both tables remain empty.

**Highlight.** The empty Progress log and Deferred work tables. Those two are where this demo's
evidence will land, and they are empty right now.

**Decision produced.** The scope is fixed in writing before implementation starts.

**Verification.**

```bash
git status --short
```

PASS if the only modified file is `plans/ExecPlan.md`, its Intended changes list holds
four numbered items, and the Progress log is still empty.
FAIL if anything under `supporthub-api/` was modified — this step writes the plan, not the code.

**Recovery.** `./module1/scripts/demo_reset.sh`.

---

## Step 2 — Let Codex implement one bounded cleanup pass and run Vitest plus TypeScript validation

**Purpose.** Execute one pass and validate it immediately. Validation right after implementation
tells you whether behavior held, while the change is still small enough to reason about.

**Starting state.** Step 1 complete.

**Navigation.** VS Code, Codex panel. This step applies edits, so select the workflow that
implements changes rather than the planning one used to inspect without editing.

> Confirm the exact control in your installed Codex panel before running this demo,
> and use the label you actually see. The prompt below carries the hard boundary regardless
> of which control you use.


**Prompt.** Saved at `prompts/m1-c3-bounded-refactor.md`.

```text
Implement ONLY the approved cleanup theme recorded in plans/ExecPlan.md:
centralize duplicate ticket-priority normalization.

Constraints:
- normalizePriority() in supporthub-api/modern/src/utils/priority.ts is the single implementation
- the private toPriority() in ticketService.ts calls it instead of duplicating it
- the POST /tickets handler stops normalizing inline and passes the raw value through
- remove normalizeLegacySeverity() only after confirming it has no importers

Do not change any route path, HTTP status code, or response field name.
Do not introduce a repository layer, a new directory, or any new abstraction.
Do not reorganize the service architecture.

After implementing, update the Progress log in plans/ExecPlan.md, and
record anything you chose not to do under Deferred work.

Then run: npm run lint && npm run typecheck && npm test
```

**Expected result.** Codex edits several files and reports the validation commands passing.

**Highlight.** `Tests  25 passed (25)`. The same 25 that passed before the change still pass after
it — that is the behavior contract holding.

**Decision produced.** The change compiles and preserves behavior. Whether all of it belongs is
still unknown.

**Verification.** PASS if lint, typecheck, and all 25 tests pass. FAIL if any test fails.

**Recovery.** If tests fail, run `./module1/scripts/demo_reset.sh` and repeat this step. Do not
attempt to fix a failed refactor by hand.

---

## Step 3 — Inspect the generated diff and confirm public behavior is preserved

**Purpose.** Green tests mean behavior held. They do not mean the diff is in scope. Tests cannot
detect an added abstraction, because a well-built abstraction keeps every test passing. Only
reading the diff finds it.

**Starting state.** Step 2 complete, working tree modified.

**Navigation.** Integrated terminal, then the Codex panel.

**Command.**

```bash
git status --short
git diff --stat
```

**Expected result.** More files changed than the ExecPlan's Intended changes listed. Alongside the
expected edits to `utils/priority.ts`, `services/ticketService.ts`, `routes/tickets.ts`, and
`utils/legacy.ts`, expect at least one file the plan never mentioned — commonly a new
`repositories/` or `store/` module, with `ticketService.ts` rewired to use it.

**Highlight.** Compare the changed-file list against the ExecPlan's four intended changes. Say the
count out loud: the plan named four changes, the diff contains more.

**Decision produced.** The extra change is identified as out of scope, whatever its merit.

**Verification.** PASS if at least one changed file appears that the ExecPlan does not list.

If the diff happens to contain only the four intended changes, ask Codex:

```text
Suggest one architectural improvement to supporthub-api/modern that would make this code
easier to maintain, and implement it now.
```

That produces the out-of-scope change this step depends on.

**Recovery.** `./module1/scripts/demo_reset.sh` then repeat Step 2.

---

## Step 4 — Remove the architecture migration Codex bundled in and log it as a separate ExecPlan task

**Purpose.** Separate the two kinds of work and leave a record of the decision. Deferring is not
discarding — the idea survives in a place someone will read.

**Starting state.** Step 3 complete.

**Navigation.** VS Code, Codex panel.

**Prompt.**

```text
Revert only the architectural change you introduced: remove the new module and
restore ticketService.ts to using its existing storage directly.

Keep the priority normalization cleanup exactly as it is.

Then add the reverted architectural change to the Deferred work table in
plans/ExecPlan.md as its own task, with one sentence on why it was
deferred.

Then run: npm run lint && npm run typecheck && npm test
```

**Expected result.** The extra module is gone, the cleanup remains, all 25 tests still pass, and
the ExecPlan's Deferred work table has one row.

**Operator action.** Accept the cleanup. Confirm the deferred row reads as a task someone could
pick up later.

**Highlight.** Three things, in order: the changed-file list now matches the ExecPlan; the Deferred
work table has an entry; 25 tests pass.

**Verification.**

```bash
git diff --stat
npm run lint && npm run typecheck && npm test
grep -A3 "## Deferred work" plans/ExecPlan.md
```

PASS if the diff touches only the ExecPlan's intended files, all three gates pass, and Deferred
work contains one row. FAIL if the extra module is still present, or Deferred work is empty.

**Recovery.** `./module1/scripts/demo_reset.sh` and restart from Step 2.

---

## Coverage

| Step | LO | Objective element | Proof |
|---|---|---|---|
| 1 | EO1b | ExecPlan records intended changes, contracts, validation checks | plan completed before any edit |
| 2 | EO1b | running log maintained across the refactor | Progress log updated, 25 tests pass |
| 3 | EO1c | evaluate the diff for preserved public behavior | contract tests green against the changed code |
| 4 | EO1c, TO1 | architecture migrations separated into discrete tasks | drift reverted, Deferred work row added |

## Final state

- priority normalization has one implementation
- the dead helper is gone
- the architectural change is reverted and recorded as deferred
- lint, type-check, and 25 tests pass
- the diff contains only the approved cleanup

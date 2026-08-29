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

**Pulling? Reset first.** `git pull` refuses to overwrite modified tracked files, and every demo
dirties tracked files — `plans/ExecPlan.md`, `plans/migration-plan.md`, anything under
`supporthub-api/`. A pull straight after a run aborts with *"Your local changes to the following
files would be overwritten by merge"*. Run the reset, then pull. Never the other way round.

**Run this clip's preflight before recording it.**

```bash
bash module1/scripts/m1-c3-execute-codex-refactor.preflight.sh
```

It runs the checks tagged `[all]`, which gate every clip in the module, plus the ones tagged
`[c3]`, and must end `PASS: m1-c3 is ready.` If any check fails it names the check, why it
matters, and the command that fixes it. Do not record against a failing preflight.

`module1/scripts/preflight_check.sh c3` is the same run, if you prefer the argument form.

Once per recording session, run it with no argument to validate all four demos in one pass:

```bash
module1/scripts/preflight_check.sh
```

It writes `module1/logs/m1-c3_preflight.txt`: a one-page report grouped by this clip's four
steps, each step marked READY or BLOCKED and mapped to the objective it serves, each gating check
listed with the command that ran it, and a closing `PASS: n  FAIL: n`. Read that rather than the
module log — a failure elsewhere in the module does not necessarily block this clip, and the
per-step verdict is what says so. Full command output for the same run sits beside it as
`m1-c3_preflight.full.txt`.

Run these outside the recording, not in the integrated terminal.

**Expected values**

| Evidence | Value |
|---|---|
| Baseline tests | 25 passed |
| Validation gates in the ExecPlan | whatever Step 1 records — it has differed on every measured run |
| Bundled architecture change in Step 2 | not guaranteed — one measured run produced none; Step 3 carries the branch |
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

## Step 1 — Create an ExecPlan that records intended changes, behavior contracts, validation checks, and progress across the refactor

**Purpose.** The ExecPlan is the contract for this pass. Writing it before any code exists is what
makes the later review possible: you cannot judge whether a change belongs without a written
statement of what was intended.

**Starting state.** Branch `demo/m1-c3-start`, clean tree. `plans/ExecPlan.md` holds the
approved theme and the empty tables this step fills in.

**Navigation.** VS Code, with `plans/ExecPlan.md` open in the editor beside the Codex panel.

That file is on screen for all four steps, and Codex rewrites its tables in this one. Section 12
applies: `npm run lint:md` must be silent before you record, and again if you reset between takes.

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
route, status code, field-name, and priority contracts. Validation checks lists real scripts from
the modern workspace. Both tables remain empty.

**The gate list is Codex's answer, not a fixed one.** The prompt asks for *the exact commands that
will prove those contracts hold*, so the set it records is a judgment and the runbook does not
grade it against a number. A measured run recorded four — `lint`, `typecheck`, `build`, `test` —
adding a build gate on its own initiative. That is correct: `npm run build` exists in this
workspace, and a full `tsc` writes output, so it can fail where a type-check-only run passes.
Three is also correct. Accept either.

FAIL only if a recorded command does not resolve — every one must be a real script, at the
repository root or in the modern workspace, since Step 2 runs whatever this section names.

Invocation style is Codex's too. A measured run wrote its gates as
`npm --prefix supporthub-api/modern run ...`, and recorded both a focused contract-test command and
a full test run. Root-level `npm test` and workspace-prefixed forms are equally correct; do not
rewrite them to match a house style on camera, and do not read the list as a target — the count
has differed on every run so far.

**Operator action.** Read the Validation checks section aloud before moving on. Step 2 runs
exactly what it names, so this is the moment the plan becomes executable — and if Codex recorded a
command this workspace does not have, this is where it costs a retake instead of a failed gate on
camera.

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


**Prompt.** Saved at `plans/prompts/m1-c3-bounded-cleanup.md`.

```text
Implement the approved cleanup theme recorded in plans/ExecPlan.md:
centralize duplicate ticket-priority normalization.

- normalizePriority() in supporthub-api/modern/src/utils/priority.ts is the single implementation
- the private toPriority() in ticketService.ts calls it instead of duplicating it
- the inline copy inside createTicket() is replaced by a call to it
- remove normalizeLegacySeverity() only after confirming it has no importers

Do not change any route path, HTTP status code, or response field name.

After implementing, update the Progress log in plans/ExecPlan.md.

Then run every command in the ExecPlan's Validation checks section.
```

**Expected result.** Codex edits several files and reports every command in Validation checks
passing. The count is whatever Step 1 recorded — read it off the screen rather than saying a
number.

**A first test run may fail with `listen EPERM`, then pass on a retry.** That is not a flake and
not a broken test. The contract tests use supertest, which binds an ephemeral port, and Codex's
sandbox denies the bind; rerunning outside the sandbox succeeds. Expect it, and narrate it rather
than cutting it — an agent hitting a sandbox boundary and retrying is worth three seconds in a
course about running agents at scale. What must not pass unexplained is a red result the narration
ignores.

**Highlight.** `Tests  25 passed (25)`. The same 25 that passed before the change still pass after
it — that is the behavior contract holding.

**Decision produced.** The change compiles and preserves behavior. Whether all of it belongs is
still unknown.

**Verification.** PASS if every gate the ExecPlan names passes, including all 25 contract tests.
FAIL if any gate fails, or if a gate the plan names was not run.

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

**Expected result.** A diff that stays inside the plan. Two measured runs both produced
`plans/ExecPlan.md` modified, `services/ticketService.ts` modified, `utils/legacy.ts` deleted —
and nothing else. No new file, no new directory, no repository module.

**This is the normal outcome, and it is worth saying so.** Given a precise ExecPlan, Codex
implements the plan. Run 1 had the structural prohibition in the prompt and stayed in scope; run 2
had it removed and stayed in scope, doing *more* cleanup — `validateNewTicket()` and the
unreachable status guard — but all of it inside the theme, because those are the plan's own
intended changes 3 and 4. The prohibition was never the binding constraint. **The ExecPlan is.**

So do not stand at the mic waiting for an over-reach. Read the diff, confirm it is in scope and
behavior-preserving — that is bullet 3, and it holds either way — then produce the architectural
change deliberately, below.

**Highlight.** The changed-file list against the plan's intended changes. Read the counts off the
screen; do not say a number you rehearsed.

**Decision produced.** The diff is confirmed in scope and behavior-preserving.

**Verification.** PASS if every changed file appears in the ExecPlan's intended changes and all
contract tests pass. An unprompted extra file is a pass too — it just means you can skip the
prompt below.

**Operator action — produce the architectural change.** Ask for the one the ExecPlan's own Risks
table predicts, rated **High**:

```text
createTicket() still reads and writes the ticket store inline. Extract that data
access into its own module and rewire createTicket() to use it.
```

**Narrate it as what it is.** Do not imply Codex reached for this on its own — it did not, in two
measured runs, and a viewer who later tries this will find the same. The honest framing is the one
the plan already wrote down:

> The plan flagged this as the High risk for this cleanup: *the cleanup touches the load-bearing
> function and drags data access with it.* So let us find out. I will ask for exactly that change,
> and then decide whether it belongs in this pass.

That is a stronger beat than a lucky over-reach, because the risk was predicted in writing before
any code was touched, and the decision in Step 4 is the same decision either way. Naming the
extraction rather than asking for "an architectural improvement" keeps both branches producing the
same diff, so Step 4 and the narration do not change.

**Recovery.** `./module1/scripts/demo_reset.sh` then repeat Step 2.

---

## Step 4 — Remove the architecture migration Codex bundled into the cleanup diff and log it as a separate ExecPlan task

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

Then run every command in the ExecPlan's Validation checks section.
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
grep -A6 "## Validation checks" plans/ExecPlan.md   # run each command it names
grep -A3 "## Deferred work" plans/ExecPlan.md
```

PASS if the diff touches only the ExecPlan's intended files, every gate the plan names passes, and
Deferred work contains one row. FAIL if the extra module is still present, or Deferred work is empty.

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

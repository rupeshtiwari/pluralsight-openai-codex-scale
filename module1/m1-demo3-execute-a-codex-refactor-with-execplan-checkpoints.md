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

## Learning objectives

- Apply the ExecPlan pattern to maintain a running log of intended changes, behavior contracts,
  and validation checks across a multi-session refactor
- Evaluate a Codex-generated refactoring diff to confirm that public behavior is preserved and
  that architecture migrations are separated into discrete tasks

## Terms used here

- **ExecPlan** — a file recording what a piece of work intends to change, what it must not break,
  and what was deliberately left out.
- **Diff** — the set of changes not yet committed.
- **Deferred work** — a change worth making, recorded rather than made now.

## Before you start

- Codex Desktop is open on the repository
- the working tree is clean on `demo/m1-c3-start`
- `plans/refactor-execplan.md` exists and records the approved theme

```bash
git status --short
```

Expect no output.

---

## Step 1 — Read the ExecPlan before any code is written

**Purpose.** The ExecPlan is the contract for this pass. Reading it first is what makes the later
review possible: you cannot judge whether a change belongs without a written statement of what was
intended.

**Starting state.** Branch `demo/m1-c3-start`, clean tree.

**Navigation.** Open `plans/refactor-execplan.md` in Codex Desktop.

**Command.**

```bash
sed -n '1,40p' plans/refactor-execplan.md
```

**Expected result.** The Objective, Current state listing three duplicate sites, Intended changes
as four numbered items, and Behavior contracts.

**Highlight.** The Behavior contracts section, and the empty Progress log and Deferred work tables.
Those two tables are where this demo's evidence will land.

**Decision produced.** The scope is fixed in writing before implementation starts.

**Verification.** PASS if Intended changes lists four items and Progress log is empty.
FAIL if the plan already shows progress — that means a previous run was not reset.

**Recovery.** `./module1/scripts/demo-reset.sh`.

---

## Step 2 — Let Codex implement the bounded change

**Purpose.** Execute one pass and validate it immediately. Validation right after implementation
tells you whether behavior held, while the change is still small enough to reason about.

**Starting state.** Step 1 complete.

**Navigation.** Codex Desktop. Switch the mode selector from Plan to **Code**. This step edits
files, so Code mode is correct here.

**Prompt.** Saved at `prompts/m1-c3-bounded-refactor.md`.

```text
Implement ONLY the approved cleanup theme recorded in plans/refactor-execplan.md:
centralize duplicate ticket-priority normalization.

Constraints:
- normalizePriority() in apps/api/src/utils/priority.ts is the single implementation
- the private toPriority() in ticketService.ts calls it instead of duplicating it
- the POST /tickets handler stops normalizing inline and passes the raw value through
- remove normalizeLegacySeverity() only after confirming it has no importers

Do not change any route path, HTTP status code, or response field name.
Do not introduce a repository layer, a new directory, or any new abstraction.
Do not reorganize the service architecture.

After implementing, update the Progress log in plans/refactor-execplan.md, and
record anything you chose not to do under Deferred work.

Then run: npm run lint && npm run typecheck && npm test
```

**Expected result.** Codex edits several files and reports the validation commands passing.

**Highlight.** `Tests  25 passed (25)`. The same 25 that passed before the change still pass after
it — that is the behavior contract holding.

**Decision produced.** The change compiles and preserves behavior. Whether all of it belongs is
still unknown.

**Verification.** PASS if lint, typecheck, and all 25 tests pass. FAIL if any test fails.

**Recovery.** If tests fail, run `git checkout -- .` and repeat this step. Do not attempt to fix a
failed refactor by hand mid-demo.

---

## Step 3 — Review the diff file by file

**Purpose.** Green tests mean behavior held. They do not mean the diff is in scope. Tests cannot
detect an added abstraction, because a well-built abstraction keeps every test passing. Only
reading the diff finds it.

**Starting state.** Step 2 complete, working tree modified.

**Navigation.** Terminal, then the Codex review pane.

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
Suggest one architectural improvement to apps/api that would make this code
easier to maintain, and implement it now.
```

That produces the out-of-scope change this step depends on.

**Recovery.** `git checkout -- .` then repeat Step 2.

---

## Step 4 — Keep the cleanup, defer the architecture, prove the contract

**Purpose.** Separate the two kinds of work and leave a record of the decision. Deferring is not
discarding — the idea survives in a place someone will read.

**Starting state.** Step 3 complete.

**Navigation.** Codex Desktop.

**Prompt.**

```text
Revert only the architectural change you introduced: remove the new module and
restore ticketService.ts to using its existing storage directly.

Keep the priority normalization cleanup exactly as it is.

Then add the reverted architectural change to the Deferred work table in
plans/refactor-execplan.md as its own task, with one sentence on why it was
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
grep -A3 "## Deferred work" plans/refactor-execplan.md
```

PASS if the diff touches only the ExecPlan's intended files, all three gates pass, and Deferred
work contains one row. FAIL if the extra module is still present, or Deferred work is empty.

**Recovery.** `./module1/scripts/demo-reset.sh` and restart from Step 2.

---

## Coverage

| Step | Objective element | Proof |
|---|---|---|
| 1 | ExecPlan records intended changes, contracts, validation checks | plan read before any edit |
| 2 | Running log maintained across the refactor | Progress log updated, 25 tests pass |
| 3 | Evaluate the diff for separated architecture migrations | out-of-scope file identified against the plan |
| 4 | Confirm public behavior preserved; architecture separated into a discrete task | gates green, Deferred work row added |

## Final state

- priority normalization has one implementation
- the dead helper is gone
- the architectural change is reverted and recorded as deferred
- lint, type-check, and 25 tests pass
- the diff contains only the approved cleanup

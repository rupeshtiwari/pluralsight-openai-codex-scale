# Inventory a legacy Express 4 service with Codex

Module 1 · Clip 5 · Demo · 6 minutes

---

## The problem this demo solves

SupportHub still runs an older ticket service written in CommonJS JavaScript on Express 4. It
needs to move to ESM TypeScript on Express 5. The service is small enough that migrating it in one
pass looks reasonable — which is how migrations turn into a week of debugging with no safe point
to return to.

Before planning anything, you need to know what is actually in there.

## The decision you will make

**Is this migration milestone safe enough to validate and roll back independently?**

## Learning Objectives

| LO | Description |
|---|---|
| TO2 | Demonstrate how to orchestrate a legacy-to-modern stack migration with Codex using incremental checkpoints. |
| EO2a | Direct Codex to inventory a legacy system's routing, data models, auth, build tooling, tests, and external contracts before proposing a migration plan |
| EO2b | Evaluate a Codex-generated migration plan for compatibility layers, explicit behavioral exceptions, and rollback visibility |
  and external contracts before proposing a migration plan
- Evaluate a Codex-generated migration plan for compatibility layers, explicit behavioral
  exceptions, and rollback visibility

## Terms used here

- **CommonJS** — the older Node module system, using `require()` and `module.exports`.
- **ESM** — the standard module system, using `import` and `export`.
- **Compatibility layer** — code that lets the two module systems work together during a migration.
- **Milestone** — one unit of migration work that can be validated and undone on its own.
- **Rollback point** — the commit you return to if a milestone fails.

## Before you start

- Codex Desktop is open on the repository
- the working tree is clean on `demo/m1-c5-start`
- `supporthub-api/migration/` exists and its tests pass

```bash
git status --short
npm run test:legacy
```

Expect no output from the first, and `# pass 8` from the second.

---

## Step 1 — Inventory the legacy service across routes, data models, auth, build tooling, tests, and external contracts

**Purpose.** A migration plan built on a partial inventory hides work that surfaces halfway
through, when returning to a clean state costs the most. Naming the six categories explicitly is
what stops the inventory from being just a file listing.

**Starting state.** Branch `demo/m1-c5-start`, clean tree.

**Navigation.** Codex Desktop. Nothing in this demo edits code, so select the planning workflow
rather than one that applies changes.

> Confirm the exact control in your installed Codex Desktop build before running this demo,
> and use the label you actually see. The prompt below carries the hard boundary regardless
> of which control you use.


**Prompt.**

```text
Inventory the legacy service in supporthub-api/migration. Do not edit any files.

Cover all six categories separately, with file paths:
1. Express routes - every path, method, status codes, and middleware each one runs
2. Data models - shapes, allowed values, and any state-transition rules
3. Auth - how callers authenticate, where it is enforced, and the failure codes
4. Build tooling - how the service starts, builds, and is tested
5. Tests - what runner, what is covered, what is not
6. External contracts - anything a caller depends on that cannot change silently

For each category, state what changes when this service moves to ESM TypeScript
on Express 5, and what stays the same.
```

**Expected result.** Six labelled sections. Routes: `GET /tickets/:id`, `POST /tickets`,
`PATCH /tickets/:id/status`, each behind API-key auth. Models: four statuses with a transition
table. Auth: `x-api-key` header, 401 when missing, 403 when invalid. Build tooling: `node server.js`
with no build step. Tests: Node's built-in runner, 8 tests. External contracts: paths, status
codes, and response field names.

**Highlight.** Two findings that will shape the plan: auth is applied **per route**, not globally,
and the service has **no build step** today while the target needs one.

**Decision produced.** The full surface is known and written down.

**Verification.** PASS if all six categories are covered with file paths. FAIL if any category is
missing or answered only in general terms.

**Recovery.** Re-run the prompt naming the missing category explicitly.

---

## Step 2 — Review the migration plan for the CommonJS-to-ESM compatibility layer, behavioral exceptions, and rollback visibility

**Purpose.** A plan that lists steps but not how to undo them is a plan you can only follow
forwards. This step forces three things into the plan that make it survivable.

**Starting state.** Step 1 complete.

**Navigation.** Same Codex conversation.

**Prompt.**

```text
Using that inventory, propose a migration plan from CommonJS JavaScript on
Express 4 to ESM TypeScript on Express 5.

The plan must state explicitly:
1. The CommonJS-to-ESM compatibility layer: how require becomes import, how each
   module.exports shape converts, and what replaces __dirname
2. Any behavior that will deliberately differ after migration, and why that is
   acceptable
3. The rollback point for each step, as a commit you could return to

Reference framework-skill/node-express-migration for platform guidance.
Do not implement anything.
```

**Expected result.** A plan naming `supporthub-api/modern/src/compat/dirname.ts` and
`supporthub-api/modern/src/compat/legacyRequire.ts`, distinguishing `module.exports = fn` from
`module.exports = { ... }`, and listing rollback points.

**Highlight.** The two export shapes. `app.js` uses `module.exports = createApp` while
`services/ticketService.js` uses a named bag — they convert differently, and confusing them fails
at runtime rather than at compile time.

**Decision produced.** The plan is now reviewable against concrete criteria.

**Verification.** PASS if the compat layer names both real files, behavioral exceptions are
listed, and each step has a rollback point. FAIL if compatibility is described only in prose.

**Recovery.** Ask: `Which file in this repository implements the __dirname replacement?`

---

## Step 3 — Split the migration into incremental milestones that can be validated independently

**Purpose.** A migration planned as one move can only be judged after it is finished. Broken into
milestones, each one can be proved or undone on its own — which is what makes the whole thing
recoverable rather than a commitment.

**Starting state.** Step 2 produced a plan with a compatibility layer and rollback points.

**Navigation.** Same Codex conversation.

**Prompt.**

```text
Break the migration into incremental milestones.

Each milestone must:
- change one thing, not several
- be provable on its own by a single named command
- be undoable on its own, to a named commit

List them in order. For each, give the files it touches, the command that
validates it, and the commit it rolls back to. Do not implement anything.
```

**Expected result.** A short ordered list, typically three to five milestones, covering the route
slice, the framework upgrade, the build tooling, and the test runner.

**Highlight.** The validation command beside each milestone. A milestone without one cannot be
checked, and a milestone with two is doing two jobs.

**Decision produced.** The migration now has units small enough to accept or reject one at a time.

**Verification.** PASS if every milestone names one command and one rollback commit. FAIL if any
milestone has no validation command.

**Recovery.** Ask: `Which single command proves milestone 1 worked?`

---

## Step 4 — Reject the milestone that batches route migration with dependency upgrades

**Purpose.** This is the decision the whole demo exists for. A milestone that migrates a route
*and* upgrades Express fails for two different reasons, and a red test cannot tell you which half
broke. Catching that before implementation is what keeps the migration recoverable — and the
planning stage must end with the code untouched.

**Starting state.** Step 3 produced the milestone list.

**Navigation.** Same Codex conversation, then the terminal.

**Prompt.**

```text
For each milestone, state whether it changes application code, upgrades a
dependency, or both. Flag any that answers "both".
```

**Expected result.** At least one milestone combines migrating a route with upgrading Express 4 to
Express 5.

**Operator action.** **Reject that milestone.** Say why out loud: a route migration is verified by
focused route tests; a framework upgrade changes behavior across every route at once and needs the
full suite. Batched, a failure is ambiguous.

Then have Codex split it:

```text
Split the milestone you flagged into two independent checkpoints:

Checkpoint 1: migrate one route slice, language and module system only
Checkpoint 2: upgrade Express 4 to Express 5

For each, give the exact files it touches, the exact command that validates it,
the exact commit to roll back to, and the external contract it must not change.

Record both in plans/migration-plan.md under Milestones. Change no other file.
```

**Highlight.** Each checkpoint now answers "code or dependency" with one answer, not both.

**Verification.**

```bash
git status --short
```

PASS if the only modified file is `plans/migration-plan.md`, its Milestones table has two rows,
and the batched milestone is gone.
FAIL if any file under `apps/` was modified — this demo plans, it does not implement.

**Recovery.** `./module1/scripts/demo_reset.sh` restores any accidental edit.

---

## Coverage

| Step | LO | Objective element | Proof |
|---|---|---|---|
| 1 | EO2a | inventory routing, models, auth, build tooling, tests, external contracts | six categories with file paths |
| 2 | EO2b | compatibility layers and explicit behavioral exceptions | compat files named, exceptions listed |
| 2 | EO2b | rollback visibility | rollback point per step |
| 3 | EO2b | milestones validated independently | one command and one rollback per milestone |
| 4 | TO2, EO2b | incremental checkpoints; batched milestone rejected | two checkpoints, no application code modified |

## Final state

- all six inventory categories covered
- compatibility layer named as real files
- rollback points recorded
- the batched milestone rejected and split in two
- no application code modified

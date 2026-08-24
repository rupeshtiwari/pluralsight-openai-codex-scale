# Migrate one Express route to TypeScript with framework guidance

Module 1 · Clip 6 · Demo · 6 minutes

---

## The problem this demo solves

One migration checkpoint is ready: move a single route from the legacy CommonJS JavaScript service
onto the modern ESM TypeScript stack. One route, not the whole application.

The risk is not that it fails to compile. The risk is that it compiles, looks right, and quietly
changes something a caller depends on — a status code, a field name, an auth response.

## The decision you will make

**Can this migrated route be accepted safely?**

## Learning Objectives

| LO | Description |
|---|---|
| TO2 | Demonstrate how to orchestrate a legacy-to-modern stack migration with Codex using incremental checkpoints. |
| EO2c | Apply validation checks (lint, type-check, focused tests) after each migration milestone rather than batching cleanup |
| EO2d | Use the ASP.NET Core skill or equivalent framework skill to apply platform-specific migration guidance |
  than batching cleanup
- Use the ASP.NET Core skill or equivalent framework skill to apply platform-specific migration
  guidance

## Terms used here

- **Framework skill** — a reference file an agent consults for platform-specific rules, kept in
  this repository so the workflow does not depend on anything external.
- **Route slice** — one route and the code it needs, migrated on its own.
- **Behavioral exception** — a difference between old and new that is accepted on purpose and
  written down.

## Before you start

- Codex Desktop is open on the repository
- the working tree is clean on `demo/m1-c6-start`
- `plans/migration-plan.md` records two checkpoints
- `framework-skill/node-express-migration/SKILL.md` exists

```bash
git status --short
npm run test:route
```

Expect no output from the first, and `Tests  4 passed` from the second.

---

## Step 1 — Apply the framework skill to migrate one Express route slice

**Purpose.** Generic migration advice produces generic mistakes. The skill in this repository names
the conversions this stack actually needs. Bounded work is reviewable work: one route produces a
diff you can read in full, which is what makes accepting or rejecting it a real decision.

**Starting state.** Branch `demo/m1-c6-start`, clean tree.

**Navigation.** Codex Desktop. This step applies edits, so select the workflow that implements
changes.

> Confirm the exact control in your installed Codex Desktop build before running this demo,
> and use the label you actually see.

**Prompt.**

```text
Read framework-skill/node-express-migration/SKILL.md and follow its guidance.

Migrate ONLY the GET /tickets/:id route from supporthub-api/migration to the modern
service in supporthub-api/modern.

Before editing, state the exact conversions the skill requires for this slice:
each require() and what it becomes, each module.exports shape and what it
becomes, every __dirname use and what replaces it, and what changes about route
params under Express 5.

Then create supporthub-api/modern/src/routes/legacyTickets.ts as ESM TypeScript for Express 5,
and mount it in supporthub-api/modern/src/app.ts under the path prefix /v1.

It must preserve the legacy behavior exactly:
- x-api-key auth, 401 when the header is missing, 403 when the key is invalid
- 200 with the same nine response fields on success
- 404 with error ticket_not_found for an unknown id

Also create supporthub-api/modern/tests/contracts/legacy-route.contract.test.ts covering all
four of those cases.

Do not migrate POST /tickets or PATCH /tickets/:id/status.
Do not upgrade or change any dependency.
Do not modify supporthub-api/migration.
```

**Expected result.** A stated conversion list, then two new files plus a small edit to `app.ts`.
The conversions should distinguish `module.exports = router` (a default export) from
`module.exports = { get, create }` (named exports), and replace `__dirname` with
`moduleDir(import.meta.url)`.

**Highlight.** The two different `module.exports` shapes in the same service. They convert
differently, and getting it wrong produces `undefined` at runtime with no compile error.

**Decision produced.** One route is migrated under the skill's guidance, and the change is bounded.

**Verification.**

```bash
git status --short
```

PASS if only `supporthub-api/modern/` files are listed. FAIL if `supporthub-api/migration/` or `package.json`
appears — that would mean the checkpoint scope was breached.

**Recovery.** `./module1/scripts/demo_reset.sh` and repeat with the constraint restated.

---

## Step 2 — Run ESLint, type-checking, build validation, and focused tests immediately

**Purpose.** Each gate catches a different class of failure and a later one cannot substitute for
an earlier one. Running them straight after one small change is what makes a red result diagnostic
instead of mysterious — which is the whole argument for validating per milestone rather than
batching cleanup to the end.

**Starting state.** Step 1 complete.

**Navigation.** Terminal.

**Commands.** Run in this order and read each result before the next.

```bash
npm run lint
npm run typecheck
npm run build
npm run test:route
```

**Expected result.** All four pass. `test:route` now reports **8 tests across 2 files** — the
original four plus the four new ones — because it matches every route contract file.

**Highlight.** The jump from 4 tests to 8. The migrated route arrived with its own contract, and
the original route's contract still holds.

**Decision produced.** The change is structurally sound.

**Verification.** PASS if all four gates pass and `test:route` reports 8. FAIL if any gate fails.

A type error on `req.params` means the params shape was not declared. The fix is
`(req: Request<{ id: string }>, res: Response)`, which is in the skill.

**Recovery.** `./module1/scripts/demo_reset.sh` and repeat Step 1.

---

## Step 3 — Inspect the diff and verify the CommonJS-to-ESM compatibility contract

**Purpose.** Passing gates prove the code works. They do not prove it behaves the way the old
service behaved. This step compares the two directly, before anything is accepted.

**Starting state.** Step 2 complete, all four gates green.

**Navigation.** Terminal, then Codex Desktop.

**Commands.**

```bash
git diff --stat
grep -c "expect(res.status)" supporthub-api/modern/tests/contracts/legacy-route.contract.test.ts
```

Expect three changed files, and `4` — one assertion per status code: 200, 401, 403, 404.

**Prompt.**

```text
Compare the migrated route against the legacy original in
supporthub-api/migration/routes/tickets.js.

For each of these, state whether it is identical or different, and if different,
exactly how:
- the response field names and their order
- the status code for success, missing key, invalid key, and unknown id
- the auth mechanism

Then confirm the ESM conversion is complete in the migrated file: no require(),
no module.exports, no __dirname.
```

**Expected result.** Field names and all four status codes identical; auth identical; the migrated
file free of CommonJS constructs. The one difference is the path prefix.

**Highlight.** Four status codes preserved, nine field names preserved, zero CommonJS constructs
remaining.

**Decision produced.** The compatibility contract holds, with one difference to account for.

**Verification.** PASS if all four status codes and the field set are identical and no CommonJS
construct remains. FAIL if any status code or field name changed.

**Recovery.** `./module1/scripts/demo_reset.sh` and repeat Step 1.

---

## Step 4 — Record the checkpoint so the migration can continue or roll back

**Purpose.** A milestone nobody wrote down is a milestone you cannot return to. This step leaves
the accepted state, the one deliberate difference, and the commit to roll back to.

**Starting state.** Step 3 complete, contract verified.

**Navigation.** Codex Desktop.

**Prompt.**

```text
Record in plans/migration-plan.md:

Under Behavioral exceptions: the migrated route is served at /v1/tickets/:id
rather than /tickets/:id, because the modern service already serves /tickets/:id.
State that the status codes, response fields, and auth behavior are unchanged.

Under Milestones: mark checkpoint 1 complete, with the validation commands that
passed.

Under Rollback visibility: record the current commit as the rollback point for
checkpoint 2.

Do not start checkpoint 2.
```

**Operator action.** Accept the route. The path prefix is the only difference, it is deliberate,
and it is now written down.

**Highlight.** One documented exception, one rollback commit, checkpoint 2 untouched.

**Verification.**

```bash
grep -A4 "## Behavioral exceptions" plans/migration-plan.md
git rev-parse --short HEAD
npm run lint && npm run typecheck && npm run build && npm run test:route
```

PASS if the exception is recorded with a reason, a rollback commit is named, and all four gates
still pass. FAIL if the exception table is still empty, or if dependencies were changed — that
belongs to checkpoint 2.

**Recovery.** `./module1/scripts/demo_reset.sh` returns to the starting state.

---

## Coverage

| Step | LO | Objective element | Proof |
|---|---|---|---|
| 1 | EO2d | equivalent framework skill applies platform-specific guidance | conversions named per file, one route migrated |
| 2 | EO2c | lint, type-check, and focused tests after the milestone | four gates green, test:route reports 8 |
| 3 | EO2c | validation after each milestone rather than batching cleanup | four status codes and nine fields identical |
| 4 | TO2 | incremental checkpoints with rollback | exception and rollback commit recorded |

## Final state

- one route migrated to ESM TypeScript on Express 5
- lint, type-check, build, and focused tests pass
- four status codes and nine response fields preserved
- the path prefix recorded as a deliberate behavioral exception
- checkpoint 1 complete, rollback point recorded, checkpoint 2 untouched

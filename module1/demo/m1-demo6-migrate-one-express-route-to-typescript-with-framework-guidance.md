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

## Learning objectives

- Apply validation checks (lint, type-check, focused tests) after each migration milestone rather
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
- `plans/migration-execplan.md` records two checkpoints
- `.codex/skills/express-typescript-migration/SKILL.md` exists

```bash
git status --short
npm run test:route
```

Expect no output from the first, and `Tests  4 passed` from the second.

---

## Step 1 — Load the framework guidance and state the exact conversions

**Purpose.** Generic migration advice produces generic mistakes. The skill in this repository names
the specific conversions this stack needs. Making Codex state them before editing means you can
check its understanding while it is still cheap to correct.

**Starting state.** Branch `demo/m1-c6-start`, clean tree.

**Navigation.** Codex Desktop, **Plan** mode for this step.

**Prompt.**

```text
Read .codex/skills/express-typescript-migration/SKILL.md.

Then, for apps/legacy-ticket-api/routes/tickets.js and the modules it requires,
list the exact conversions needed to move the GET /tickets/:id route to ESM
TypeScript on Express 5:

- each require() and what it becomes
- each module.exports shape and what it becomes
- every use of __dirname and what replaces it
- what changes about route params under Express 5

Do not edit any files yet.
```

**Expected result.** A conversion list: `require('express')` becomes a default import;
`module.exports = router` becomes `export default`; `module.exports = { get, create }` in
`ticketService.js` becomes named exports; `__dirname` in the service becomes
`moduleDir(import.meta.url)`; route params need a declared shape because Express 5 types them as
`string | string[]`.

**Highlight.** The two different `module.exports` shapes in the same service. They convert
differently, and getting it wrong produces `undefined` at runtime with no compile error.

**Decision produced.** The conversions are understood before any file changes.

**Verification.** PASS if both export shapes are distinguished and `__dirname` is addressed.
FAIL if the answer is generic advice with no file names.

**Recovery.** Ask: `Which two files use different module.exports shapes, and how does each convert?`

---

## Step 2 — Migrate exactly one route slice

**Purpose.** Bounded work is reviewable work. One route produces a diff you can read in full,
which is what makes accepting or rejecting it a real decision rather than a guess.

**Starting state.** Step 1 complete.

**Navigation.** Codex Desktop. Switch the mode selector to **Code**.

**Prompt.**

```text
Migrate ONLY the GET /tickets/:id route from apps/legacy-ticket-api to the modern
service in apps/api.

Create apps/api/src/routes/legacyTickets.ts as ESM TypeScript for Express 5, and
mount it in apps/api/src/app.ts under the path prefix /v1.

It must preserve the legacy behavior exactly:
- x-api-key auth, 401 when the header is missing, 403 when the key is invalid
- 200 with the same nine response fields on success
- 404 with error ticket_not_found for an unknown id

Also create apps/api/tests/contracts/legacy-route.contract.test.ts covering all
four of those cases.

Do not migrate POST /tickets or PATCH /tickets/:id/status.
Do not upgrade or change any dependency.
Do not modify apps/legacy-ticket-api.
```

**Expected result.** Two new files, plus a small edit to `app.ts`. Nothing under
`apps/legacy-ticket-api/` changes.

**Highlight.** The changed-file count. Three files for one route — small enough to read line by
line.

**Decision produced.** The change exists and is bounded. Whether it is correct is Step 3.

**Verification.**

```bash
git status --short
```

PASS if only `apps/api/` files are listed. FAIL if `apps/legacy-ticket-api/` or `package.json`
appears — that would mean the checkpoint scope was breached.

**Recovery.** `git checkout -- .` and repeat with the constraint restated.

---

## Step 3 — Run all four validation gates

**Purpose.** Each gate catches a different class of failure and a later one cannot substitute for
an earlier one. Running them immediately, on one small change, is what makes a red result
diagnostic instead of mysterious.

**Starting state.** Step 2 complete.

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

**Recovery.** `git checkout -- .` and repeat Step 2.

---

## Step 4 — Verify the contract, record the exception, record the checkpoint

**Purpose.** Passing gates prove the code works. They do not prove it behaves the way the old
service behaved. This step compares the two directly, records the one difference that was accepted
on purpose, and leaves a commit to return to.

**Starting state.** Step 3 complete, all gates green.

**Navigation.** Terminal, then Codex Desktop.

**Command.** Compare the migrated route against the legacy contract:

```bash
grep -c "expect(res.status)" apps/api/tests/contracts/legacy-route.contract.test.ts
```

Expect `4` — one assertion per status code: 200, 401, 403, 404.

**Prompt.**

```text
Record in plans/migration-execplan.md:

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

**Highlight.** Three things: four status codes preserved, one documented exception, one rollback
commit recorded.

**Verification.**

```bash
npm run lint && npm run typecheck && npm run build && npm run test:route
grep -A4 "## Behavioral exceptions" plans/migration-execplan.md
git rev-parse --short HEAD
```

PASS if all four gates pass, the exception is recorded with a reason, and a rollback commit is
named. FAIL if the exception table is still empty, or if dependencies were changed — that belongs
to checkpoint 2.

**Recovery.** `./module1/scripts/demo-reset.sh` returns to the starting state.

---

## Coverage

| Step | Objective element | Proof |
|---|---|---|
| 1 | Framework skill applies platform-specific guidance | conversions named per file from the skill |
| 2 | One milestone, not batched cleanup | three files changed, one route |
| 3 | Apply lint, type-check, and focused tests after the milestone | four gates green, test:route reports 8 |
| 4 | Validation after each milestone rather than batching | contract verified, exception and rollback recorded |

## Final state

- one route migrated to ESM TypeScript on Express 5
- lint, type-check, build, and focused tests pass
- four status codes and nine response fields preserved
- the path prefix recorded as a deliberate behavioral exception
- checkpoint 1 complete, rollback point recorded, checkpoint 2 untouched

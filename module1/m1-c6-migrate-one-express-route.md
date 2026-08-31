# Migrate one Express route to TypeScript with framework guidance

Module 1 · Clip 6 · Demo · 6 minutes

---

## The problem this demo solves

One migration checkpoint is ready: convert a single route in the legacy CommonJS JavaScript
service to ESM TypeScript, in place. One route, not the whole application.

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

## Terms used here

- **Framework skill** — a reference file an agent consults for platform-specific rules, kept in
  this repository so the workflow does not depend on anything external.
- **Route slice** — one route and the code it needs, migrated on its own.
- **Behavioral exception** — a difference between old and new that is accepted on purpose and
  written down.

## AUTHOR PREP — DO NOT NARRATE

**Surface: Stage A — VS Code with Codex panel**

| | |
|---|---|
| Starting checkpoint | `demo/m1-c6-start`, **branched from `demo/m1-c5-captured`** |
| Working directory | repository root |
| Application | VS Code, opened on the repository root |
| Panes visible | editor, Codex panel, and the integrated terminal in the same window |
| Secondary surface | integrated terminal in the same VS Code window |
| Exact file to have open | `supporthub-api/migration/routes/tickets.js` |
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

`demo/m1-c6-start` carries the two-checkpoint split that walking C5 produces, and is branched from
`demo/m1-c5-captured`:

    walk C5  →  m1-c5-captured  →  m1-c6-start  →  walk C6  →  m1-c6-captured

Cutting it from anywhere else gives it the combined milestone, which is the inverse of the state
this clip starts from.

```bash
git checkout demo/m1-c6-start
npm install                     # only on a fresh checkout
./module1/scripts/demo_reset.sh
npm test                        # Tests  25 passed (25)
git status --short              # must print nothing at all
```

**Pulling? Use `./scripts/sync.sh`.** It resets both modules, then pulls. Plain `git pull` after a
run aborts with *"Your local changes to the following files would be overwritten by merge"*, because
every demo dirties tracked files — `plans/ExecPlan.md`, `plans/migration-plan.md`, anything under
`supporthub-api/` — and the preflight rewrites the transcripts under `module1/logs/`. Nothing is
lost when it aborts; the pull just did not run.

**Run this clip's preflight before recording it.**

```bash
bash module1/scripts/m1-c6-migrate-one-express-route.preflight.sh
```

It must end `PASS: m1-c6 is ready.` Anything else names the check, why it matters, and the
command that fixes it — fix that before recording.

The report lands in `module1/logs/m1-c6_preflight.txt`, one page grouped by this clip's four
steps.

Run these outside the recording, not in the integrated terminal.

**Where this checkpoint comes from**

`demo/m1-c6-start` is branched from `demo/m1-c5-captured`, not from the build branch. Its defining
content — the two-checkpoint split in the migration plan — is produced by walking the inventory
demo. Cut from the build branch instead, it would carry the *combined* milestone, which is the
inverse of what this demo starts from.

Verify before recording:

```bash
git log --oneline -1 demo/m1-c5-captured
git merge-base --is-ancestor demo/m1-c5-captured demo/m1-c6-start && echo "correctly branched"
grep -c '^### Milestone' plans/migration-plan.md     # must be 2
```

**Expected values**

| Evidence | Value |
|---|---|
| Framework skill | `express-typescript-migration`, in `framework-skill/node-express-migration/` |
| Migrated routes before | 0 |
| Migrated routes after | 1 |
| Route contract tests before | no test files found |
| Route contract tests after | 1 file, 4 tests |
| Validation gates | lint, typecheck, build, focused route tests — all `:migration` scoped |
| Status codes preserved | 200, 401, 403, 404 |
| Dependency changes | 0 — the upgrade is a separate checkpoint |
| Files changed under `supporthub-api/modern/` | 0 — the other workspace is out of scope |

**`Do not upgrade or change any dependency` is load-bearing, not decoration.** A measured run of a
looser prompt — one that said *"to TypeScript on Express 5"* and carried no dependency constraint —
had Codex upgrade the migration workspace to `express` 5.2.1 and `@types/express` 5.0.6 without
being asked and without flagging it. That is checkpoint 2's entire scope, performed inside
checkpoint 1. It obeyed the prompt; the prompt was the problem. Send Step 1's prompt from
`plans/prompts/m1-c6-migrate-route.md` rather than retyping a shorter version of it.

**Recovery path**

If a gate fails, reset and rerun the migration rather than patching by hand: the point is that one
bounded milestone either passes its gates or is rolled back. If Codex changes a dependency, the
checkpoint boundary was breached — reset and restate the constraint. `git diff
supporthub-api/migration/package.json` is the fastest way to see it; the Step 1 verification below
catches it too, since `package.json` appearing in `git status` fails that step.

**Troubleshooting**

| Symptom | Cause | Fix |
|---|---|---|
| `npm test` reports `Missing script: "test"` | wrong branch | `git checkout demo/m1-c6-start` |
| Tests fail on a fresh checkout | dependencies not installed | `npm install` |
| Source Control shows changes before Step 1 | previous run not reset | `./module1/scripts/demo_reset.sh` |

---

# ON-CAMERA

## Step 1 — Apply an equivalent Node.js and TypeScript framework skill to migrate one Express route slice from JavaScript to TypeScript

**Purpose.** Generic migration advice produces generic mistakes. The skill in this repository names
the conversions this stack actually needs. Bounded work is reviewable work: one route produces a
diff you can read in full, which is what makes accepting or rejecting it a real decision.

**Starting state.** Branch `demo/m1-c6-start`, clean tree.

**Navigation.** VS Code, Codex panel. This step applies edits, so select the workflow that
implements changes.

> Confirm the exact control in your installed Codex panel before running this demo,
> and use the label you actually see.

**Prompt.** Saved at `plans/prompts/m1-c6-migrate-route.md`. Send that file rather than retyping
this, so Run B can be it minus its first line and nothing else.

```text
Read framework-skill/node-express-migration/SKILL.md and follow its guidance.

Migrate ONLY the GET /tickets/:id route inside supporthub-api/migration. This
service migrates in place, so the migrated file belongs in that same workspace.

Before editing, state the exact conversions the skill requires for this slice:
each require() and what it becomes, each module.exports shape and what it
becomes, every __dirname use and what replaces it, and what the skill says about
route params and handler return values.

Then create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript,
reaching the CommonJS service and auth modules through the compat layer already
present in supporthub-api/migration/compat.

It must preserve the legacy behavior exactly:
- x-api-key auth, 401 when the header is missing, 403 when the key is invalid
- 200 with the same nine response fields on success
- 404 with error ticket_not_found for an unknown id

Also create supporthub-api/migration/tests/contracts/ticket-read.route.test.mts
covering all four of those cases, mounting the migrated router on an Express app
built inside the test.

Do not migrate POST /tickets or PATCH /tickets/:id/status.
Do not upgrade or change any dependency.
Do not add a "type" field to any package.json.
Do not modify app.js or routes/tickets.js.
Do not create or modify any file under supporthub-api/modern.
```

**Expected result.** A stated conversion list, then exactly two new files and nothing modified.
The conversions should distinguish `module.exports = requireApiKey` (a single value) from
`module.exports = { get, create }` (a named bag), because both arrive through the same
`legacyRequire` bridge and neither can be imported as the other shape.

On `__dirname` the honest answer for this slice is *none in the route*. The one that matters lives
in `services/ticketService.js`, which stays CommonJS behind the bridge until its own checkpoint.

**Highlight.** The two different `module.exports` shapes in the same service. They convert
differently, and getting it wrong produces `undefined` at runtime with no compile error.

**Decision produced.** One route is migrated under the skill's guidance, and the change is bounded.

**Verification.**

```bash
git status --short
git status --porcelain supporthub-api/modern | wc -l    # must be 0
```

PASS if exactly two new paths are listed, both under `supporthub-api/migration/`, nothing shown as
modified, and the second command prints `0`. FAIL if `supporthub-api/modern/` or any `package.json`
appears — either would mean the checkpoint scope was breached.

**Recovery.** `./module1/scripts/demo_reset.sh` and repeat with the constraint restated.

---

## Step 2 — Run ESLint, TypeScript type-checking, build validation, and focused Vitest tests immediately after the route migration

**Purpose.** Each gate catches a different class of failure and a later one cannot substitute for
an earlier one. Running them straight after one small change is what makes a red result diagnostic
instead of mysterious — which is the whole argument for validating per milestone rather than
batching cleanup to the end.

**Starting state.** Step 1 complete.

**Navigation.** Integrated terminal in the same VS Code window.

**Commands.** Run in this order and read each result before the next.

```bash
npm run lint:migration
npm run typecheck:migration
npm run build:migration
npm run test:route:migration
```

**Expected result.** All four pass. `test:route:migration` reports **Test Files 1 passed (1)** and
**Tests 4 passed (4)**. On the baseline that same command printed *No test files found* — the
config has always matched `tests/**/*.route.test.mts`, and until now there was nothing to match.

**Highlight.** Nothing to run, then four passing contract tests. The migrated slice arrived with
its own contract in the same checkpoint that produced it.

**Decision produced.** The change is structurally sound.

**Verification.** PASS if all four gates pass and `test:route:migration` reports 4. FAIL if any
gate fails.

A type error on `req.params` means the params shape was not declared. The fix is
`(req: Request<{ id: string }>, res: Response)`, which is in the skill. A handler that still writes
`return res.status(404).json(...)` is the skill's other rule: send the response and return
separately, so the handler stays `void` when the platform checkpoint moves it to Express 5.

**Recovery.** `./module1/scripts/demo_reset.sh` and repeat Step 1.

---

## Step 3 — Inspect the diff and verify the CommonJS-to-ESM compatibility contract before accepting the route change

**Purpose.** Passing gates prove the code works. They do not prove it behaves the way the old
service behaved. This step compares the two directly, before anything is accepted.

**Starting state.** Step 2 complete, all four gates green.

**Navigation.** Integrated terminal, then back to the Codex panel.

**Commands.**

```bash
git status --short
grep -c "expect(res.status)" supporthub-api/migration/tests/contracts/ticket-read.route.test.mts
npm run test:migration
```

Expect two new files and nothing modified; `4` — one assertion per status code: 200, 401, 403,
404; and the legacy node:test suite still reporting **8 pass, 0 fail**, because the CommonJS
service was not touched.

**Prompt.**

```text
Compare supporthub-api/migration/routes/ticketRead.mts against the legacy
original in supporthub-api/migration/routes/tickets.js.

For each of these, state whether it is identical or different, and if different,
exactly how:
- the response field names and their order
- the status code for success, missing key, invalid key, and unknown id
- the auth mechanism

Then confirm the ESM conversion is complete in the migrated file: no require(),
no module.exports, no __dirname.
```

**Expected result.** Field names and all four status codes identical; auth identical; the route
path identical; the migrated file free of CommonJS constructs. The one difference is that nothing
serves the migrated route yet — `app.js` is CommonJS and cannot `require()` an ESM router, so the
contract test mounts it on an Express app of its own.

**Highlight.** Four status codes preserved, nine field names preserved, zero CommonJS constructs
remaining — and the route not yet wired in, which is the checkpoint boundary showing itself.

**Decision produced.** The compatibility contract holds, with one difference to account for.

**Verification.** PASS if all four status codes and the field set are identical and no CommonJS
construct remains. FAIL if any status code or field name changed.

**Recovery.** `./module1/scripts/demo_reset.sh` and repeat Step 1.

---

## Step 4 — Record the checkpoint so the Express 5 migration can continue or roll back from a known state

**Purpose.** A milestone nobody wrote down is a milestone you cannot return to. This step leaves
the accepted state, the one deliberate difference, and the commit to roll back to.

**Starting state.** Step 3 complete, contract verified.

**Navigation.** VS Code, Codex panel.

**Prompt.**

```text
Record in plans/migration-plan.md:

Under Behavioral exceptions: the migrated route is not mounted yet. app.js is
CommonJS and cannot require() an ESM router, so the route is verified against
the contract on its own until the platform checkpoint sets "type": "module".
State that the route path, status codes, response fields, and auth behavior are
unchanged.

Under Milestones: mark checkpoint 1 complete, with the validation commands that
passed, and record the current commit as the rollback point inside checkpoint 2's
own entry. Milestones and checkpoints are one list under one heading. Do not add
a separate rollback section.

Do not start checkpoint 2.
```

**Operator action.** Accept the route. Not being mounted yet is the only difference, it is forced
by the checkpoint boundary rather than chosen, and it is now written down.

**Highlight.** One documented exception, one rollback commit, checkpoint 2 untouched.

**Verification.**

```bash
grep -A4 "## Behavioral exceptions" plans/migration-plan.md
grep -c "^## " plans/migration-plan.md   # unchanged: the split adds entries, not sections
git rev-parse --short HEAD
npm run lint:migration && npm run typecheck:migration && npm run build:migration && npm run test:route:migration
```

PASS if the exception is recorded with a reason, a rollback commit is named inside checkpoint 2's
entry, the top-level section count is unchanged, and all four gates still pass. FAIL if the
exception table is still empty, if a separate rollback section appeared, or if dependencies were
changed — that belongs to checkpoint 2.

**Recovery.** `./module1/scripts/demo_reset.sh` returns to the starting state.

---

## Coverage

| Step | LO | Objective element | Proof |
|---|---|---|---|
| 1 | EO2d | equivalent framework skill applies platform-specific guidance | conversions named per file, one route migrated |
| 2 | EO2c | lint, type-check, and focused tests after the milestone | four gates green, test:route:migration reports 4 |
| 3 | EO2c | validation after each milestone rather than batching cleanup | four status codes and nine fields identical |
| 4 | TO2 | incremental checkpoints with rollback | exception and rollback commit recorded |

## Final state

- one route migrated to ESM TypeScript in place, still on Express 4
- lint, type-check, build, and focused tests pass, all `:migration` scoped
- four status codes, nine response fields, and the route path preserved
- not being mounted yet recorded as a deliberate behavioral exception
- nothing under `supporthub-api/modern/` touched
- checkpoint 1 complete, rollback point recorded, checkpoint 2 untouched

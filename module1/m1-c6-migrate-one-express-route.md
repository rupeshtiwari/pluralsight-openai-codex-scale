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

**How EO2d is demonstrated.** The skill is read on camera in Step 1, and its guidance shows up in
two places a viewer can see: the conversions Codex states before it edits, and the gate order Step 2
runs them in. That is a demonstration, not a measurement. An A/B control — the same prompt with and
without the skill line, compared for reasoning only the skill contains — was built and retired: three
runs produced no such reasoning either way, and two prompt rewrites chasing it produced no evidence.
**This is disclosed to Curriculum as demonstrated rather than measured.** Do not narrate it as proof
that the skill changed the outcome.

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
| Codex describes files or a dirty tree that `git status` does not show | its workspace view predates your reset — a fresh *thread* does not refresh it | close and reopen the Codex session, confirm `git status --short supporthub-api/` is empty, then repeat Step 1 |
| Codex reports files created and gates green, but `ls` cannot find the files | the summary is a claim, not the work | repeat Step 1; never proceed to Step 2 on the summary alone |
| That happens twice in a row, and the reply keeps describing a pre-reset working tree | the editor's workspace view is stale; a new Codex thread does not clear it | **quit VS Code entirely and reopen it.** That fixed it on the measured occurrence — two failed attempts, then a clean Step 1 on the third. If a run after the restart still reports work that is not on disk, stop: a third identical attempt diagnoses nothing |

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

**Two prompts, in order, in one Codex thread.** Both are saved at
`plans/prompts/m1-c6-migrate-route.md`. Send that file's blocks rather than retyping them, so the
two places an author can paste from cannot drift apart.

They used to be a single prompt, and two measured runs produced both files correctly while skipping
the conversions entirely — one opened *"Implemented the GET /tickets/:id migration slice"*, the
other *"Done. I added the migrated GET-only router."* A turn holding both a *state* and a *create*
instruction resolves to the create: the file is the evident deliverable, and everything before it
reads as preamble to be compressed into a summary. The conversions are this step's Highlight, so
they get their own turn.

**Prompt 1 — state the conversions and why they are required.** Writes nothing.

Questions 2 to 4 are the ones that matter for EO2d, and they were not there at first. A measured run
answered a conversions-only prompt completely and correctly — both export shapes distinguished, the
honest *"no `__dirname` in the route"*, `Request<{ id: string }>`, the send-then-return rule — and
stated no reasoning at all. **The conversions are in the compatibility doc and the migration
plan**, which Codex reaches whether or
not the skill is loaded, so a prompt asking only *what* asks for something the repository already
supplies. The skill's unique contribution is *why*: which failures are compile-time and which are
run-time, why the gate order cannot be permuted, and why the upgrade is a separate milestone. Those
appear in no other file.

```text
Read framework-skill/node-express-migration/SKILL.md and follow its guidance.

Answer these before touching anything, in order.

1. State the exact conversions the skill requires to move the GET /tickets/:id
   route out of supporthub-api/migration/routes/tickets.js and into ESM
   TypeScript in that same workspace: each require() and what it becomes, each
   module.exports shape the route depends on and what it becomes, every
   __dirname use and what replaces it, and what changes about route params and
   handler return values.

2. For each conversion above, say what breaks if it is done wrong, and whether
   that break shows up at compile time or at run time.

3. In what order does the skill require the validation gates to run, and what
   does each one catch that the gate before it cannot?

4. This checkpoint migrates the route while the workspace stays on Express 4.
   What does the skill say about doing that upgrade in the same milestone, and
   what is its reason?

Do not create, edit or delete any file yet. Read the repository freely with
read-only commands such as ls, find, rg, sed and cat; do not run tests, builds,
or installs.
```

Read the reply before sending the second. This is the Highlight, and it is on screen alone.

**Prompt 2 — apply them.**

```text
Now apply exactly the conversions you listed.

Create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript, reaching
the CommonJS service and auth modules through the compat layer already present in
supporthub-api/migration/compat.

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
Do not modify plans/migration-plan.md.
Do not create or modify any file under supporthub-api/modern.
```

**Expected result.** From prompt 1, a conversion list and **no files at all** — `git status` is
still clean after it. From prompt 2, exactly two new files and nothing modified.
The conversions should distinguish `module.exports = requireApiKey` (a single value) from
`module.exports = { get, create }` (a named bag), because both arrive through the same
`legacyRequire` bridge and neither can be imported as the other shape.

On `__dirname` the honest answer for this slice is *none in the route*. The one that matters lives
in `services/ticketService.js`, which stays CommonJS behind the bridge until its own checkpoint.

**Highlight.** Prompt 1's reply, on screen with no code beside it — and specifically its answer to
question 2. The two `module.exports` shapes convert differently, and getting it wrong produces
`undefined` **at runtime, with no compile error**: the one failure in the list that no gate catches.
Giving the list its own turn is what puts it there alone; in a combined turn it was absent entirely,
twice.

**Decision produced.** One route is migrated under the skill's guidance, and the change is bounded.

**Verification. Run this before reading Codex's reply.** The order is the point: two runs reported
both files created and all five gates green having written neither, and a reply that confident is
hard to un-read once it is in your head.

```bash
ls -l supporthub-api/migration/routes/ticketRead.mts \
      supporthub-api/migration/tests/contracts/ticket-read.route.test.mts
git status --short
git status --porcelain supporthub-api/modern | wc -l    # must be 0
```

The first command is the one that decides the step. It names both files the prompt asked for and
prints `No such file or directory` for either that is missing, so *the work did not happen* looks
nothing like *the work happened*. Nothing below it means anything until it lists two files.

The pathspec excludes exactly one thing: the three deleted entries from moving `plans/prompts`
aside for the run, which are apparatus and not this step's output. **Everything else stays visible,
and that is deliberate.** An earlier version scoped to `supporthub-api/` instead, which was quiet
about the run that also rewrote `plans/migration-plan.md` — a filter that removes noise by naming
what to look at removes signal with it.

PASS if prompt 1 produced a conversion list and wrote nothing, `ls` then lists both files, exactly
two new paths appear under `supporthub-api/migration/`, nothing is shown as modified, and the last
command prints `0`.

**Check prompt 1's half before sending prompt 2**, with the same `git status --short --
':!plans/prompts'`. It must still be clean: a prompt 1 that writes files has ignored the instruction
that makes the reasoning visible, and prompt 2 then has nothing to apply.

FAIL if:

- **`ls` cannot find either file.** Nothing was written. A reported gate pass is not a gate pass —
  a run cannot have linted, type-checked, built and tested files that are not on disk. Repeat
  Step 1; do not go on.
- **prompt 1 names no conversions**, or writes files. The artifacts can be right and the step still
  fail: the conversions are the Highlight and what EO2d rests on. Two measured runs of a combined
  single prompt returned *"Implemented the GET /tickets/:id migration slice"* and *"Done. I added
  the migrated GET-only router."* — both with correct files and no reasoning, which is why the turn
  is split. Repeat Step 1.
- nothing is listed by `git status` even though `ls` found the files — they exist but are ignored,
  which means the paths are wrong.
- `plans/migration-plan.md` appears. Recording the checkpoint is **Step 4's** job, and a run that
  narrows the plan here has done part of it early — Step 4 then documents a decision the operator
  never made on camera. A measured run did exactly this, `+10 −7`, while reporting only the two
  files.
- `supporthub-api/modern/` or any `package.json` appears — either means the checkpoint scope was
  breached.

**If the reply also describes files as modified that `git status` shows clean**, its workspace view
predates your reset and is describing an earlier run. Two occurrences of this named
`package.json`, `package-lock.json` and `plans/migration-plan.md` — exactly the pre-check run's
state. A fresh *thread* does not refresh that view; see the troubleshooting table.

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
git diff --no-index supporthub-api/migration/routes/tickets.js \
                    supporthub-api/migration/routes/ticketRead.mts
git status --short
grep -oE '\b(200|401|403|404)\b' \
  supporthub-api/migration/tests/contracts/ticket-read.route.test.mts | sort -u | wc -l
npm run test:migration
```

**The first command is the diff this step is named for.** Both migrated files are new, so `git diff`
and `git diff --stat` show nothing at all — the step used to open on a `git status` and never put a
diff on screen. `--no-index` compares the two files directly regardless of tracking, which is the
same comparison the prompt below asks Codex to make in prose.

Read it for two things. The conversions are on the left and right of each hunk: `require()` against
`import`, `module.exports` against `export default`, `var` against `const`. And the deletions are
`POST /tickets` and `PATCH /tickets/:id/status` — they are absent from the migrated file because
this checkpoint did not migrate them, which is the bounded slice made visible. Do not read the
insertion and deletion counts as expected values; how the file is written is Codex's choice.

Then expect two new files and nothing modified; `4`; and the legacy node:test suite still reporting
**8 pass, 0 fail**, because the CommonJS service was not touched.

**That grep counts the four status codes, not the way they are asserted.** It used to read
`grep -c "expect(res.status)"` and returned `0` on a run that was entirely correct — Codex had named
the variable `response`. The four codes come from the behavioral contract and appear in the prompt;
`res` was the agent's coin flip, and so was `toBe` against `toEqual`, and `.status` against
`.statusCode`. Never assert on a name the agent chose. Step 2 already proved the four tests run and
pass, so what is left to establish here is that all four codes are covered, which is what this
counts.

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
git rev-parse --short HEAD
awk '/^## /{p = /^## Behavioral exceptions/} p' plans/migration-plan.md
awk '/^## /{p = /^## Behavioral exceptions/} p' plans/migration-plan.md | grep -c 'app\.js'
awk '/^## /{p = /^## Milestones/} p' plans/migration-plan.md | grep -i 'rollback point'
awk '/^## /{p = /^## Milestones/} p' plans/migration-plan.md | grep -c "$(git rev-parse --short HEAD)"
grep -c "^## " plans/migration-plan.md   # unchanged: the split adds entries, not sections
npm run lint:migration && npm run typecheck:migration && npm run build:migration && npm run test:route:migration
```

**The section prints whole, however long Codex writes it.** It used to be `grep -A4`, which showed
the heading and the two intro lines and stopped — the recorded exception sits below line 4, so a
correct run and an empty one looked identical. A fixed offset is a guess about how much an agent
will write.

**The two counts are what decide the step, and each names a value from the prompt.** The exception
has to mention `app.js`, which is why the route cannot be served yet. And the rollback point has to
be *this* commit: the count greps the Milestones section for the SHA printed on the first line, so
it prints `0` before Step 4 records it and `1` after. Checkpoint 2 currently carries a commit
*message* where its rollback point should be, left there by C5's split — watch it become a real
commit. The `grep -i 'rollback point'` line is display only; if Codex relabels the row it shows
nothing and the SHA count still decides.

`grep -c "^## "` is fine as it stands: the section count is a shape this repository controls, and it
is what catches a separate rollback section being added.

PASS if the exception prints with a reason, the `app.js` count is at least `1`, the SHA count is
`1`, the top-level section count is unchanged, and all four gates still pass. FAIL if the exception
table is unchanged, if either count prints `0` — the second means the rollback point was never
recorded and the checkpoint cannot be returned to, which is what this step exists for — if a
separate rollback section appeared, or if dependencies were changed, which belongs to checkpoint 2.

**Recovery.** `./module1/scripts/demo_reset.sh` returns to the starting state.

---

## Coverage

| Step | LO | Objective element | Proof |
|---|---|---|---|
| 1 | EO2d | equivalent framework skill applies platform-specific guidance | conversions named per file, one route migrated |
| 2 | EO2c | lint, type-check, and focused tests after the milestone | four gates green, test:route:migration reports 4 |
| 3 | EO2c | validation after each milestone rather than batching cleanup | legacy-against-migrated diff on screen; four status codes and nine fields identical |
| 4 | TO2 | incremental checkpoints with rollback | exception and rollback commit recorded |

## Final state

- one route migrated to ESM TypeScript in place, still on Express 4
- lint, type-check, build, and focused tests pass, all `:migration` scoped
- four status codes, nine response fields, and the route path preserved
- not being mounted yet recorded as a deliberate behavioral exception
- nothing under `supporthub-api/modern/` touched
- checkpoint 1 complete, rollback point recorded, checkpoint 2 untouched

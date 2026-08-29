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

## Terms used here

- **CommonJS** — the older Node module system, using `require()` and `module.exports`.
- **ESM** — the standard module system, using `import` and `export`.
- **Compatibility layer** — code that lets the two module systems work together during a migration.
- **Milestone** — one unit of migration work that can be validated and undone on its own. The
  outline also calls this a **checkpoint**; they are the same thing and the plan keeps one list.
- **Rollback point** — the commit you return to if a milestone fails.

## AUTHOR PREP — DO NOT NARRATE

**Surface: Stage A — VS Code with Codex panel**

| | |
|---|---|
| Starting checkpoint | `demo/m1-c5-start` |
| Working directory | repository root |
| Application | VS Code, opened on the repository root |
| Panes visible | editor and Codex panel. The integrated terminal stays hidden — this demo writes no code and runs no gates |
| Secondary surface | none |
| Exact file to have open | `plans/migration-plan.md` |
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


**The framework skill must not appear anywhere in this demo.**

C5's objectives are TO2, EO2a and EO2b. The framework skill is EO2d, which belongs to clip 6.

This is not a style rule. Step 2's prompt once ended with "Reference
framework-skill/node-express-migration for platform guidance", and the skill's first rule is never
to combine a route migration with a dependency upgrade. Codex read it, obeyed it from Step 2 onward,
and by Step 4 there was no batched milestone left to reject. A live walk produced ten milestones with
the route conversion at 2 and the Express upgrade at 9, and Codex stated plainly that none were
"both".

**A demo cannot ask Codex to read a rule and then catch it breaking that rule.** Step 4 is the
decision this clip exists for, and the seeded plan only stays batched while Codex is planning
unaided.

So every prompt here plans from the inventory and the repository alone, and says so explicitly
rather than merely omitting the reference — omission is not a constraint when the model can reach
the file by its own retrieval. The skill is introduced for the first time in clip 6, where it is the
objective rather than a contaminant.

`scripts/check.mjs c5-prompts-skill-free` asserts both halves: that no prompt in this runbook
mentions the skill, and that the prohibition is still stated.

**No prompt in this demo runs commands.** The terminal stays hidden until Step 4's verification, and
an unprompted `npm test` adds a wait on camera with nothing to show. A live walk hit this in Step 1:
the prompt forbade editing files but said nothing about running them.

**Prepare before recording**

```bash
git checkout demo/m1-c5-start
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
bash module1/scripts/m1-c5-inventory-legacy-express4.preflight.sh
```

It must end `PASS: m1-c5 is ready.` Anything else names the check, why it matters, and the
command that fixes it — fix that before recording.

The report lands in `module1/logs/m1-c5_preflight.txt`, one page grouped by this clip's four
steps.

Run these outside the recording, not in the integrated terminal.

**This demo produces a checkpoint another demo depends on**

Walking this demo produces `demo/m1-c5-captured`, whose defining content is the two-checkpoint
split. The route-migration demo starts from that split, so its start checkpoint is branched from
this one:

```text
walk C5  →  demo/m1-c5-captured  →  demo/m1-c6-start  →  walk C6  →  demo/m1-c6-captured
```

**`demo/m1-c6-start` must be branched from `demo/m1-c5-captured`, never from the build branch.**
Cutting it from the build branch gives it the *combined* milestone, which is the inverse of its own
definition — and it would look plausible until the route-migration demo recorded against the wrong
plan.

**Expected values**

| Evidence | Value |
|---|---|
| Inventory categories to cover | 6 |
| Migration plan at start | one milestone, marked *Not yet reviewed* |
| That milestone | combines a route migration with an Express upgrade |
| Migrated routes present | 0 — `ls supporthub-api/migration/routes/*.ts` returns nothing |
| Milestones after the split | exactly 2 |
| Application files modified | 0 |

**Recovery path**

The plan must open on the combined milestone. If it already shows two checkpoints, the previous run
was not reset and the rejection has nothing to act on: run the reset before starting.

**Troubleshooting**

| Symptom | Cause | Fix |
|---|---|---|
| `npm test` reports `Missing script: "test"` | wrong branch | `git checkout demo/m1-c5-start` |
| Tests fail on a fresh checkout | dependencies not installed | `npm install` |
| Source Control shows changes before Step 1 | previous run not reset | `./module1/scripts/demo_reset.sh` |

---

# ON-CAMERA

## Step 1 — Direct Codex to inventory the legacy CommonJS JavaScript Express 4 service across Express routes, data models, auth, build tooling, tests, and external contracts

**Purpose.** A migration plan built on a partial inventory hides work that surfaces halfway
through, when returning to a clean state costs the most. Naming the six categories explicitly is
what stops the inventory from being just a file listing.

**Starting state.** Branch `demo/m1-c5-start`, clean tree.

**Navigation.** VS Code, Codex panel. Nothing in this demo edits code, so select the planning
workflow rather than one that applies changes.

> Confirm the exact control in your installed Codex panel before running this demo,
> and use the label you actually see. The prompt below carries the hard boundary regardless
> of which control you use.


**Prompt.**

```text
Inventory the legacy service in supporthub-api/migration.

Read the repository freely with read-only commands such as ls, find, rg, sed
and cat. Do not edit any files, and do not run tests, builds, installs, or any
command that writes to the working tree.

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

**Expected result.** Six labelled sections. Routes: **four** — `GET /health` with no auth, then
`GET /tickets/:id`, `POST /tickets` and `PATCH /tickets/:id/status`, each behind API-key auth.
Models: four statuses with a transition table. Auth: `x-api-key` header, 401 when missing, 403 when invalid. Build tooling: `node server.js`
to run, with `tsc` build and typecheck scripts already present. Tests: Node's built-in runner,
8 tests, with vitest also configured. External contracts: paths, status codes, and response field
names.

Codex will report the `tsc` scripts and the second test runner, because both are in `package.json`.
That is correct — the migration tooling was added ahead of the migration. Findings beyond this list
are a pass, not a failure.

**`/health` is the evidence for the Highlight below, not a stray fourth route.** It is the one route
without `requireApiKey`, which is what makes "auth is per route, not global" a measurement rather
than an assertion. An earlier version of this table listed three routes and left out the one that
proves the point.

**Findings beyond this list are a pass.** A thorough inventory reports more than the six headings
ask for, and two are worth hearing if they come: `maxOpenTicketsPerAccount` is defined in
`config/limits.json` and never read anywhere, and the modern workspace's ticket routes carry no auth
middleware at all — so preserving the legacy `x-api-key` contract is a deliberate act, not something
the migration inherits.

**Highlight.** Two findings that will shape the plan: auth is applied **per route**, not globally,
and `services/ticketService.js` reads its configuration through `__dirname` **at module load** — a
dependency on `config/limits.json` that no import statement reveals, pinned by a test at
`tests/tickets.test.js:104`, and the first thing that breaks under ESM.

That second one is worth pointing at. An import graph shows `ticketService` depending on
`models/ticket` and stops; the config read lives in the function body, so only reading the code
finds it. It is also why `compat/dirname.ts` exists, which makes Step 2 a consequence rather than a
lookup.

Do not claim the service has no build step. It has one — `npm run build` runs
`tsc -p tsconfig.json` against a real `tsconfig.json` — and an honest inventory will say so.

**Decision produced.** The full surface is known and written down.

**Verification.** PASS if all six categories are covered with file paths. FAIL if any category is
missing or answered only in general terms.

**Recovery.** Re-run the prompt naming the missing category explicitly.

---

## Step 2 — Review the generated migration plan for the CommonJS-to-ESM compatibility layer, explicit behavioral exceptions, and rollback visibility

**Purpose.** A plan that lists steps but not how to undo them is a plan you can only follow
forwards. This step forces three things into the plan that make it survivable.

**Starting state.** Step 1 complete.

**Navigation.** Same Codex panel conversation.

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
4. For each compat module you named in 1, the milestone at which it is deleted
   - or, if it is permanent, say so and say why

Base the compatibility layer on code that already exists in this repository.
Do not read or apply any framework skill, migration playbook, or external
guidance - plan from the inventory and the code alone.

Do not implement anything. Read-only inspection is fine; do not run tests,
builds, or installs.
```

**Expected result.** A plan naming a real `dirname` and `legacyRequire` compat module by path,
distinguishing `module.exports = fn` from `module.exports = { ... }`, listing rollback points, and
giving every compatibility shim either a removal checkpoint or a stated reason it is permanent.

**Either workspace's copy is correct, and the migration copy is the better answer.** The pair
exists twice — in `supporthub-api/migration/compat/` and in `supporthub-api/modern/src/compat/`.
Accept either, and expect the migration path, because that is the one this repository's own plan
uses: the compatibility table in `plans/migration-plan.md` cites
`supporthub-api/migration/compat/dirname.ts` and `supporthub-api/migration/compat/legacyRequire.ts`
by path.

They are not the same file. The two copies share their implementation and differ in their doc
comments, and the migration copy is written for this demo:

- `migration/compat/dirname.ts` opens on the service's own problem — *"This service reads its
  configuration relative to the module's own location"* — which is the `__dirname` dependency Step 1
  highlighted, so the inventory leads straight to it.
- `migration/compat/legacyRequire.ts` carries the export-shape table this step's Highlight teaches,
  `module.exports = createApp` against `module.exports = { get, create }`, and states the removal
  rule outright: *"Every use of this bridge is migration debt. It is removed when the module it
  reaches for has itself migrated."*

The modern copies say neither of those things. If Codex cites them, accept it and ask the recovery
question below to bring it to the migration copy.

**Why the plan still needs a removal checkpoint.** The rule above is stated in a code comment, not
scheduled anywhere. The compatibility table in `plans/migration-plan.md` has columns for the
concern, the module and what it replaces, and no column for when the module goes away; no milestone
mentions removing a shim. A rule nobody schedules is how temporary bridging code becomes permanent
architecture, which is what item 4 in the prompt exists to force.

**Highlight.** The two export shapes. `app.js` uses `module.exports = createApp` while
`services/ticketService.js` uses a named bag — they convert differently, and confusing them fails
at runtime rather than at compile time.

**Decision produced.** The plan is now reviewable against concrete criteria.

**Verification.** Read the plan for four things, in this order, saying each out loud as you find it:

| Look for | Fails if |
|---|---|
| both compat modules named by path, from either workspace | compatibility is described only in prose |
| behavioral exceptions listed | differences are implied rather than named |
| a rollback point per step | any step has none |
| a removal milestone per shim, **or** a stated reason it is permanent | the plan is silent about it |

The last row is the one to check deliberately. A measured walk produced a plan that said nothing
about shim removal at all, and a plan that is silent reads at a glance like a plan that answered —
which is how temporary bridging code becomes permanent architecture. If it is missing, ask:

```text
For each compat module you named, which milestone deletes it? If one is
permanent, say which and why.
```

**Recovery.** Ask: `Which file in this repository implements the __dirname replacement?` Two files
do; either answer is right.

---

## Step 3 — Split the ESM TypeScript Express 5 migration into incremental milestones that can be validated independently

**Purpose.** A migration planned as one move can only be judged after it is finished. Broken into
milestones, each one can be proved or undone on its own — which is what makes the whole thing
recoverable rather than a commitment.

**Starting state.** Step 2 produced a plan with a compatibility layer and rollback points.

**Navigation.** Same Codex panel conversation.

**Prompt.**

```text
Break the migration into incremental milestones.

Keep it to between three and five. Each milestone must:
- be validated on its own by a named command
- be undoable on its own, to a named commit

List them in order. For each, give the files it touches, the command that
validates it, and the commit it rolls back to.

Do not implement anything. Read-only inspection is fine; do not run tests,
builds, or installs.
```

**Expected result.** Three to five milestones in order, covering the route slice, the framework
upgrade, the build tooling, and the test runner — and **at least one of them combining a route
migration with the Express 4 to 5 upgrade**, carried through from the plan Step 2 produced. A
measured walk had it as *"Migrate Routes to TS/ESM on Express 5"*.

**That batch is the point of Step 4, so this prompt must not dissolve it.** The prompt used to open
with *"change one thing, not several"*, which is exactly the rule Step 4 asks Codex to find broken.
A walk produced thirteen tidy single-concern milestones and Step 4 had nothing to flag: *"None of
the milestones are both application-code changes and dependency upgrades."* Decomposition is what
Step 4 teaches; giving it away here leaves Step 4 auditing a list that already complies.

The count is bounded for two reasons. Thirteen rows do not read at recording font size — measured
walks gave thirteen and ten. And coarser milestones are more likely to carry a combined concern
forward, so the bound and the batch pull the same way.

**Highlight.** The validation command beside each milestone. A milestone without one cannot be
checked. Do not comment yet on what any milestone combines — that is Step 4's finding.

**Decision produced.** The migration now has units small enough to accept or reject one at a time.

**Verification.** PASS if the list holds three to five milestones and every one names a command and
a rollback commit. FAIL if any milestone has no validation command.

**If no milestone combines code with a dependency upgrade,** Step 4 has nothing to reject. Say so
and ask:

```text
Which milestone changes application code and upgrades a dependency in the same
step? If none do, combine the route migration and the Express 5 upgrade into
one milestone, since that is how this migration was scoped before it was
broken up.
```

**Recovery.** Ask: `Which command proves milestone 1 worked?`

---

## Step 4 — Reject the milestone that batches route migration with dependency upgrades and have Codex split it into two checkpoints

**Purpose.** This is the decision the whole demo exists for. A milestone that migrates a route
*and* upgrades Express fails for two different reasons, and a red test cannot tell you which half
broke. Catching that before implementation is what keeps the migration recoverable — and the
planning stage must end with the code untouched.

**Starting state.** Step 3 produced the milestone list.

**Navigation.** Same Codex panel conversation, then the integrated terminal in the same window.

**Prompt.**

```text
For each milestone, state whether it changes application code, upgrades a
dependency, or both. Flag any that answers "both".

Read-only inspection is fine; do not run tests, builds, or installs.
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

Record both in plans/migration-plan.md under Milestones, replacing the entry you
flagged. Milestones and checkpoints are one list — do not add a second
section. Change no other file, and do not run tests, builds, or installs.
```

**Highlight.** Each checkpoint now answers "code or dependency" with one answer, not both.

**Verification.**

```bash
git status --short
```

PASS if the only modified file is `plans/migration-plan.md`, its Milestones section holds two
entries, and the batched milestone is gone.
FAIL if any file under `supporthub-api/` was modified — this demo plans, it does not implement — or
if a separate checkpoint or rollback section appeared. Milestones and checkpoints are one list.

**Recovery.** `./module1/scripts/demo_reset.sh` restores any accidental edit.

---

## Coverage

| Step | LO | Objective element | Proof |
|---|---|---|---|
| 1 | EO2a | inventory routing, models, auth, build tooling, tests, external contracts | six categories with file paths |
| 2 | EO2b | compatibility layers and explicit behavioral exceptions | compat files named, exceptions listed, each shim given a removal checkpoint |
| 2 | EO2b | rollback visibility | rollback point per step |
| 3 | EO2b | milestones validated independently | one command and one rollback per milestone |
| 4 | TO2, EO2b | incremental checkpoints; batched milestone rejected | two checkpoints, no application code modified |

## Final state

- all six inventory categories covered
- compatibility layer named as real files
- rollback points recorded
- the batched milestone rejected and split in two
- no application code modified

# Validation matrix — Module 1

Sixteen approved demo bullets, four per demo. Each row names the artifact that makes the bullet
executable, the command or prompt that exercises it, the evidence that proves it, and the checkpoint
it runs from.

**Status legend**

| Status | Meaning |
|---|---|
| **PASS** | An automated assertion runs green now on the outcome the bullet claims |
| **SEEDED** | An automated assertion runs green now on the demo's *starting state* — it proves the setup the bullet needs, not the outcome the bullet claims |
| **READY** | Artifact and assertion exist; the bullet's evidence is a live Codex response, so it is confirmed by walking the demo |
| **BLOCKED** | Cannot be satisfied yet, with the blocker named |

`READY` is not a weaker `PASS`. A bullet whose evidence is what Codex says cannot be asserted by a
script without fabricating the response.

`SEEDED` is not a weaker `PASS` either, and keeping it separate is the point. `PASS` has to mean
one thing: the assertion ran green on the thing the bullet claims. Two bullets here are backed by
assertions on the seed instead — that `createTicket` really is load-bearing, and that the plan
really does open on one batched milestone. Those assertions are worth having, because a demo whose
starting state has drifted teaches nothing. But they prove the trap is set, not that the learner
watched it spring. Filed as `PASS`, that distinction disappears; filed as `SEEDED`, it survives.
Every `SEEDED` bullet is confirmed the same way a `READY` one is — by walking the demo.

**`SEEDED` is a pre-walkthrough state, not a permanent one.** Both rows are only `SEEDED` because
the captured branch that would let the assertion span start *and* end does not exist yet. See
[Re-classify the SEEDED rows after the walkthroughs](#re-classify-the-seeded-rows-after-the-walkthroughs)
— leaving them frozen here would misreport the repository once those branches are cut.

---

## M1 C2 — Map noisy TypeScript modules with Codex before editing

Objectives: **TO1, EO1a, EO1d** · Checkpoint: `demo/m1-c2-start`

| # | Demo bullet | Repo artifact | Command / prompt | Expected evidence | Status |
|---|---|---|---|---|---|
| 1 | Open the TypeScript service in Codex and ask it to map modules, dependencies, public behavior, and dead-code candidates | `supporthub-api/modern/src/`, `plans/prompts/m1-c2-map-codebase.md` | Step 1 prompt | Map naming `ticketService.ts`, the two duplicate sites, three unreferenced exports | READY |
| 2 | Constrain Codex to propose one cleanup theme before editing any files | `plans/prompts/m1-c2-map-codebase.md` Step 2 | Step 2 prompt | Exactly one theme, naming its files | READY |
| 3 | Inspect repository evidence and reject unrelated architectural changes before implementation | `check.mjs load-bearing-function` | `node scripts/check.mjs load-bearing-function` | Seed: `createTicket` carries all four responsibilities, so architectural work is a plausible suggestion. The rejection itself is live | **SEEDED** |
| 4 | Confirm Plan mode produces a bounded, reviewable first pass | `check.mjs c2-refs-identical`, preflight | VS Code Source Control view | **Changes** empty; start and captured refs identical | **PASS** |

## M1 C3 — Execute a Codex refactor with ExecPlan checkpoints

Objectives: **TO1, EO1b, EO1c** · Checkpoint: `demo/m1-c3-start` (branched from `m1-c2-captured`)

| # | Demo bullet | Repo artifact | Command / prompt | Expected evidence | Status |
|---|---|---|---|---|---|
| 1 | Create an ExecPlan that records intended changes, behavior contracts, validation checks, and progress | `plans/ExecPlan.md` | Step 1 prompt | Nine prescribed sections; Progress log and Deferred work empty at start | **PASS** |
| 2 | Let Codex implement one bounded cleanup pass and run Vitest plus TypeScript validation | `plans/prompts/m1-c3-bounded-cleanup.md` | `npm run typecheck && npm test` | `Tests 25 passed (25)`, type-check clean | **PASS** |
| 3 | Inspect the generated diff and confirm public behavior is preserved | `supporthub-api/modern/tests/contracts/` | `git diff --stat`, `npm test` | Same 25 contract tests pass after the change | **PASS** |
| 4 | Remove the architecture migration Codex bundled into the cleanup diff and log it as a separate ExecPlan task | `plans/ExecPlan.md` Deferred work | Step 4 prompt, then `git diff --stat` | Diff matches intended files; one Deferred work row | READY |

## M1 C5 — Inventory a legacy Express 4 service with Codex

Objectives: **TO2, EO2a, EO2b** · Checkpoint: `demo/m1-c5-start`

| # | Demo bullet | Repo artifact | Command / prompt | Expected evidence | Status |
|---|---|---|---|---|---|
| 1 | Direct Codex to inventory the legacy service across routes, data models, auth, build tooling, tests, and external contracts | `supporthub-api/migration/`, `docs/migration-inventory-checklist.md` | Step 1 prompt | All six categories covered with file paths | READY |
| 2 | Review the migration plan for the CommonJS-to-ESM compatibility layer, behavioral exceptions, and rollback visibility | `docs/commonjs-esm-compatibility.md`, `docs/behavioral-exceptions.md`, `compat/*.ts` | Step 2 prompt | Compat modules named as real files; the async-handler exception; rollback points | **PASS** |
| 3 | Split the migration into incremental milestones that can be validated independently | `plans/migration-plan.md` | Step 3 prompt | Each milestone has one validation command and one rollback commit | READY |
| 4 | Reject the milestone that batches route migration with dependency upgrades and have Codex split it into two checkpoints | `check.mjs milestone-batched` | `node scripts/check.mjs milestone-batched` | Seed: the plan opens on one unreviewed milestone whose single entry combines route + Express upgrade. The split into two is live | **SEEDED** |

## M1 C6 — Migrate one Express route to TypeScript with framework guidance

Objectives: **TO2, EO2c, EO2d** · Checkpoint: `demo/m1-c6-start` — **BLOCKED on `m1-c5-captured`**

| # | Demo bullet | Repo artifact | Command / prompt | Expected evidence | Status |
|---|---|---|---|---|---|
| 1 | Apply an equivalent Node.js and TypeScript framework skill to migrate one Express route slice | `framework-skill/node-express-migration/SKILL.md`, `m1-c6-framework-skill-evidence.md` | Step 1 prompt with the skill line | Conversions named per file; one route migrated | READY |
| 2 | Run ESLint, TypeScript type-checking, build validation, and focused Vitest tests immediately after | `supporthub-api/migration/{eslint.config.js,tsconfig.json,vitest.config.ts}` | `npm run lint:migration && typecheck:migration && build:migration && test:migration` | Four gates green on the baseline before migration | **PASS** |
| 3 | Inspect the diff and verify the CommonJS-to-ESM compatibility contract before accepting | `docs/commonjs-esm-compatibility.md`, `compat/*.ts` | `git diff --stat`, contract comparison | Four status codes and nine fields identical; no CommonJS construct remains | READY |
| 4 | Record the checkpoint so the migration can continue or roll back from a known state | `plans/migration-plan.md` | Step 4 prompt, `git rev-parse --short HEAD` | Behavioral exception recorded; rollback commit named | READY |

---

## Totals

| Status | Count |
|---|---|
| **PASS** — assertion green now on the claimed outcome | **6 / 16** |
| **SEEDED** — assertion green now on the starting state | **2 / 16** |
| **READY** — artifact and assertion exist; evidence is a live Codex response | **8 / 16** |
| **BLOCKED** | **0 / 16** |

Ten of the sixteen — `SEEDED` plus `READY` — are confirmed by walking the demo, not by a script.
Two of those ten stop needing the walkthrough once it has happened once; see below.

## Re-classify the SEEDED rows after the walkthroughs

Both `SEEDED` rows are held there by a missing checkpoint, not by anything unprovable. When C5 and
C6 are walked and the four remaining branches are cut, revisit both — and re-run
`npm run check:negatives` afterwards, since each promotion changes what the check parses.

**C5 bullet 4 becomes `PASS`.** Today `milestone-batched` can only assert the start state: one
unreviewed milestone combining a route migration with a dependency upgrade. Once
`demo/m1-c5-captured` exists, the assertion can span both ends — one batched entry at
`m1-c5-start`, exactly two entries and no batched one at `m1-c5-captured`. That is the outcome the
bullet claims, asserted end to end, which is `PASS`. Extend the check to take a ref rather than
reading the working tree, and add the negative case: a captured branch that still shows one
milestone must go red.

**C2 bullet 3 becomes `PASS` only if the walkthrough leaves an artifact.** The bullet is about
rejecting an architectural suggestion, and a rejection that happens only in conversation is not
capturable — the two C2 branches are deliberately identical, so nothing is written to diff. It is
promotable only if walking C2 produces something durable that records the rejection and its reason.
If it does not, C2 bullet 3 stays `SEEDED` permanently, and that is the honest classification
rather than a gap. Decide this while walking C2, not afterwards from memory.

There is one option to weigh before walking, so the choice is deliberate rather than a gap
discovered afterwards: **the Codex thread transcript is itself a durable artifact.** If the
rejection and its reason are legible there, that exchange can be captured into `plans/prompts/`
alongside the C2 prompts and become the evidence the row cites — which would make the bullet
assertable and promote it to `PASS`. The test is whether the transcript shows the *reason* the
architectural suggestion was rejected, not merely that the conversation moved on. Judge that during
the walk, while the thread is in front of you.

Every bullet has an artifact and a checkpoint. Nothing is unbacked.

## Open items, stated plainly

The procedure for producing all four is [module1/walkthrough-c5-c6.md](../module1/walkthrough-c5-c6.md),
including the guard for the one mis-cut that fails silently.

**`demo/m1-c6-start` does not exist.** Its defining content is the two-checkpoint split that walking
C5 produces, so it must be branched from `demo/m1-c5-captured`. The C6 rows are backed by artifacts
but cannot be walked until that checkpoint exists.

```text
walk C5  →  m1-c5-captured  →  m1-c6-start  →  walk C6  →  m1-c6-captured
```

**Two measurements need Codex and are not scriptable.**

1. **C3 bundling rate.** Run the Step 2 prompt five times against `demo/m1-c3-start` and count how
   often Codex bundles an architectural change into the cleanup diff. Four of five means the live
   path is solid and the captured branch is insurance. One of five means the seed needs
   strengthening: a demo that usually shows nothing to remove does not teach EO1c.

   This decides a design question rather than a detail — whether the live path is primary with the
   captured branch as insurance, or the reverse — so record each run as it happens:

   | Run | Bundled an architectural change? | What it bundled |
   |---|---|---|
   | 1 | | |
   | 2 | | |
   | 3 | | |
   | 4 | | |
   | 5 | | |

   | Rate | Reading |
   |---|---|
   | 4–5 of 5 | Live path is primary; `m1-c3-captured` is insurance |
   | 2–3 of 5 | Live path is a coin flip; rehearse from the captured branch and keep the live attempt |
   | 0–1 of 5 | Seed is too weak. Strengthen it before walking C3 — a demo that usually shows nothing to remove does not teach EO1c |

2. **The skill-off run.** `module1/m1-c6-framework-skill-evidence.md` is scaffolded with the toggle
   named and the comparison reserved. Filling it from expectation would destroy the only thing it is
   for.

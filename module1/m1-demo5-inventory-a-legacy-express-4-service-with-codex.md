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

## Learning objectives

- Direct Codex to inventory a legacy system's routing, data models, auth, build tooling, tests,
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
- `apps/legacy-ticket-api/` exists and its tests pass

```bash
git status --short
npm run test:legacy
```

Expect no output from the first, and `# pass 8` from the second.

---

## Step 1 — Inventory all six categories before planning

**Purpose.** A migration plan built on a partial inventory hides work that surfaces halfway
through, when returning to a clean state costs the most. Naming the six categories explicitly is
what stops the inventory from being just a file listing.

**Starting state.** Branch `demo/m1-c5-start`, clean tree.

**Navigation.** Codex Desktop. Switch the mode selector to **Plan**. Nothing in this demo edits
code.

**Prompt.**

```text
Inventory the legacy service in apps/legacy-ticket-api. Do not edit any files.

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

## Step 2 — Demand a compatibility layer, exceptions, and rollback

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

Reference .codex/skills/express-typescript-migration for platform guidance.
Do not implement anything.
```

**Expected result.** A plan naming `apps/api/src/compat/dirname.ts` and
`apps/api/src/compat/legacyRequire.ts`, distinguishing `module.exports = fn` from
`module.exports = { ... }`, and listing rollback points.

**Highlight.** The two export shapes. `app.js` uses `module.exports = createApp` while
`services/ticketService.js` uses a named bag — they convert differently, and confusing them fails
at runtime rather than at compile time.

**Decision produced.** The plan is now reviewable against concrete criteria.

**Verification.** PASS if the compat layer names both real files, behavioral exceptions are
listed, and each step has a rollback point. FAIL if compatibility is described only in prose.

**Recovery.** Ask: `Which file in this repository implements the __dirname replacement?`

---

## Step 3 — Reject the milestone that batches two kinds of change

**Purpose.** This is the decision the whole demo exists for. A milestone that migrates a route
*and* upgrades Express fails for two different reasons, and a red test cannot tell you which half
broke. Spotting that before implementation is what makes the migration recoverable.

**Starting state.** Step 2 produced a milestone list.

**Navigation.** Same Codex conversation.

**Prompt.**

```text
For each milestone you proposed, state:
- does it change application code, upgrade a dependency, or both?
- which single command proves it worked?
- which single commit undoes it?

Flag any milestone that does more than one of those things.
```

**Expected result.** At least one milestone combines migrating a route with upgrading Express 4 to
Express 5.

**Operator action.** **Reject that milestone.** Say why out loud: a route migration is verified by
focused route tests, a framework upgrade changes behavior across every route at once and needs the
full suite. Batched, a failure is ambiguous.

**Highlight.** The milestone that answers "both" to the first question.

**Decision produced.** The batched milestone is rejected before any code is written.

**Verification.** PASS if a batched milestone is identified and rejected. FAIL if every milestone
is accepted as proposed.

**Recovery.** If no milestone is batched, ask: `Combine the route migration and the Express 5
upgrade into one milestone and show me what that would look like.` Then reject it.

---

## Step 4 — Split it into two checkpoints and prove no code was written

**Purpose.** Rejecting is only half the decision. The replacement has to be two milestones that
each pass the gate from Step 3. And the whole planning stage must end with the code untouched.

**Starting state.** Step 3 complete.

**Navigation.** Same Codex conversation, then the terminal.

**Prompt.**

```text
Split the rejected milestone into two independent checkpoints:

Checkpoint 1: migrate one route slice, language and module system only
Checkpoint 2: upgrade Express 4 to Express 5

For each, give:
- the exact files it touches
- the exact command that validates it
- the exact commit to roll back to
- the external contract it must not change

Record both in plans/migration-execplan.md under Milestones. Change no other file.
```

**Expected result.** Two checkpoints, each with one validation command and one rollback point.
Checkpoint 1 touches one route and validates with `npm run test:route`; Checkpoint 2 touches
`package.json` and validates with the full suite.

**Operator action.** Accept the split.

**Highlight.** Each checkpoint now answers Step 3's three questions with a single answer.

**Verification.**

```bash
git status --short
```

PASS if the only modified file is `plans/migration-execplan.md`, and its Milestones table has two
rows. FAIL if any file under `apps/` was modified — this demo plans, it does not implement.

**Recovery.** `git checkout -- apps/` restores any accidental edit.

---

## Coverage

| Step | Objective element | Proof |
|---|---|---|
| 1 | Inventory routing, models, auth, build tooling, tests, external contracts | six categories with file paths |
| 2 | Evaluate plan for compatibility layers and behavioral exceptions | compat files named, exceptions listed |
| 2 | Evaluate plan for rollback visibility | rollback point per step |
| 3 | Evaluate milestone independence | batched milestone identified and rejected |
| 4 | Milestones validated independently | two checkpoints, one command and one rollback each |

## Final state

- all six inventory categories covered
- compatibility layer named as real files
- rollback points recorded
- the batched milestone rejected and split in two
- no application code modified

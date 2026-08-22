# Map noisy TypeScript modules with Codex before editing

Module 1 · Clip 2 · Demo · 6 minutes

---

## The problem this demo solves

The SupportHub TypeScript service works and its tests pass, but it has accumulated the kind of
mess every long-lived codebase accumulates: one module doing too many jobs, the same rule written
in more than one place, and a helper nobody calls any more.

The tempting move is to ask an agent to "clean this up." That produces a large diff touching
things you never intended to change, and you cannot tell which parts are safe.

## The decision you will make

**What should Codex change first, and what must remain untouched?**

## Learning objectives

- Construct a refactoring prompt that instructs Codex to map noisy modules, identify dead code,
  and propose one cleanup theme at a time before editing
- Explain when to use Plan mode before committing Codex to implementation

## Terms used here

- **Plan mode** — a Codex mode that analyzes and proposes but does not edit files.
- **Cleanup theme** — one narrow kind of change, such as removing a duplicate, as opposed to a
  general tidy-up.
- **Behavior contract** — something callers depend on, such as a route path or a response field
  name, which a refactor must not change.

## Before you start

These are already in place and are not part of this demo:

- Codex Desktop is open on the `pluralsight-openai-codex-scale` repository
- dependencies are installed
- the working tree is clean on `demo/m1-c2-start`

Confirm the starting state:

```bash
git status --short
```

Expect no output. If anything is listed, run `./module1/scripts/demo-reset.sh`.

---

## Step 1 — Show the service works before touching it

**Purpose.** Establish that this is a working service, not a broken one. Everything found later is
a maintainability problem, not a bug. This matters because it sets what "success" means: the code
gets easier to change, and behavior stays identical.

**Starting state.** Branch `demo/m1-c2-start`, clean tree, repository root.

**Navigation.** Terminal.

**Command.**

```bash
npm test
```

**Expected result.**

```text
Test Files  4 passed (4)
     Tests  25 passed (25)
```

**Highlight.** `25 passed`, and the four contract file names. These tests are the behavior
contract — the thing the refactor must not break.

**Decision produced.** The baseline is green, so any later red result is caused by the refactor.

**Verification.** PASS if 25 tests pass. FAIL if any test fails or the count differs.

**Recovery.** If tests fail, run `npm install`, then `./module1/scripts/demo-reset.sh`.

---

## Step 2 — Ask Codex to map the code without editing it

**Purpose.** Get evidence before making changes. This is what Plan mode is for: the agent reads,
reports, and stops. You decide what happens next.

**Starting state.** Same as Step 1.

**Navigation.** Codex Desktop. In the composer, switch the mode selector to **Plan**. Do not use
Code mode — that mode edits files, and this step must not produce edits.

**Prompt.** Paste exactly this. It is also saved at `prompts/m1-c2-map-noisy-modules.md`.

```text
Analyze the TypeScript service in apps/api. Do not edit any files.

Produce:
1. A map of the modules under apps/api/src, and which module depends on which.
2. The public behavior this service exposes: every route path, its HTTP status
   codes, and its response field names.
3. Any logic implemented more than once, naming each file it appears in.
4. Any exported function with no importers anywhere in apps/api.
5. Any business logic located in a route handler rather than a service.

Then propose exactly ONE bounded cleanup theme that:
- can be completed without changing any public behavior listed in item 2
- is verifiable by the tests in apps/api/tests/contracts

Do not propose architectural restructuring. Do not introduce new abstractions,
layers, or directories. Do not edit files. Stop after the proposal.
```

**Expected result.** A written analysis naming:

- `services/ticketService.ts` as the largest module, with several responsibilities
- priority normalization appearing in **three** files
- `normalizeLegacySeverity` in `utils/legacy.ts` with **no** importers
- priority branching inside the `POST /tickets` route handler
- one proposed cleanup theme

**Highlight.** The three file paths for the duplicated logic, and the zero-importer finding.
Those are the evidence, and they came from the repository rather than from a guess.

**Decision produced.** You now know what is wrong, in specific files, without having changed
anything.

**Verification.** PASS if all three duplicate sites are named and the dead helper is found.
FAIL if Codex proposes more than one theme, or if any file was modified.

Confirm nothing was edited:

```bash
git status --short
```

Expect no output.

**Recovery.** If Codex edited files, it was in Code mode. Run `git checkout -- .`, switch the mode
selector to Plan, and repeat this step.

---

## Step 3 — Reject the work that does not belong

**Purpose.** A capable agent will offer improvements beyond what you asked for. Some are
reasonable. Reasonable is not the same as in scope. This is where you practise saying no to a good
idea at the wrong time.

**Starting state.** Codex has produced the analysis from Step 2.

**Navigation.** Same Codex conversation.

**Prompt.**

```text
List anything in your analysis that would change the architecture rather than
remove duplication: new layers, new abstractions, moved persistence boundaries,
or reorganized directories.

For each one, state what it would touch and why it is not part of a duplication
cleanup. Do not implement any of them.
```

**Expected result.** A short list, typically including a repository or data-access layer, and
possibly splitting `ticketService.ts` into several modules.

**Highlight.** For each item, the number of files it would touch. Architecture changes touch many
files; the duplication cleanup touches three.

**Decision produced.** These are recorded as out of scope. They are not rejected forever, only
rejected for this pass.

**Verification.** PASS if at least one architectural change is named and set aside, and no file was
edited. FAIL if Codex began implementing any of them.

**Recovery.** `git checkout -- .` restores the tree if anything was edited.

---

## Step 4 — Approve exactly one theme and prove nothing changed

**Purpose.** Close the plan with a single approved theme and evidence that the planning stage
produced no edits. A plan you cannot point at is not a plan.

**Starting state.** Steps 2 and 3 complete.

**Navigation.** Same Codex conversation, then the terminal.

**Prompt.**

```text
State the single cleanup theme you are proposing, in one sentence.

Then list:
- the exact files it will change
- the behavior contracts it must preserve
- the commands that will prove those contracts still hold

Do not implement it.
```

**Expected result.** The theme is *centralize duplicate ticket-priority normalization while
preserving external behavior*, changing three files, preserving the route and priority contracts,
verified by `npm run lint`, `npm run typecheck`, and `npm test`.

**Operator action.** Approve that theme. Approve nothing else.

**Highlight.** One theme. Three files. Four contracts.

**Verification.** Run:

```bash
git status --short
```

PASS if there is no output — the entire demo produced analysis and a decision, and zero edits.
FAIL if any file is listed.

**Recovery.** `./module1/scripts/demo-reset.sh` returns the repository to the starting state.

---

## Coverage

| Step | Objective element | Proof |
|---|---|---|
| 1 | Plan mode is used before implementation | 25 baseline tests pass, tree clean |
| 2 | Map noisy modules; identify dead code | three duplicate sites named, zero-importer helper found |
| 3 | Propose one cleanup theme at a time | architectural work named and set aside |
| 4 | Plan mode precedes committing to implementation | one theme approved, `git status` empty |

## Final state

- one cleanup theme approved
- three duplicate sites and one dead helper identified by file path
- architectural work explicitly deferred
- no file edited

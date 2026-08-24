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

## Learning Objectives

| LO | Description |
|---|---|
| TO1 | Apply Codex to plan and execute a codebase refactoring operation using reviewable passes. |
| EO1a | Construct a refactoring prompt that instructs Codex to map noisy modules, identify dead code, and propose one cleanup theme at a time before editing |
| EO1d | Explain when to use Plan mode before committing Codex to implementation |

## Terms used here

- **Plan mode** — a Codex planning workflow used here to inspect the repository and propose a
  bounded change before implementation.
- **Cleanup theme** — one narrow kind of change, such as removing a duplicate, as opposed to a
  general tidy-up.
- **Behavior contract** — something callers depend on, such as a route path or a response field
  name, which a refactor must not change.

## Starting state

These are in place before the demo begins and are not part of it:

- Codex Desktop is open on the `pluralsight-openai-codex-scale` repository
- dependencies are installed
- the working tree is clean

Confirm the service is healthy and the tree is untouched:

```bash
npm install          # only needed once, on a fresh checkout
npm test
git status --short
```

Expect `Tests  25 passed (25)` and **no output at all** from `git status`. The clean tree is the
baseline every later `git status` is compared against, so an untracked file left anywhere in the
repository will break the closing proof in Step 4. Those 25 contract tests are the
behavior contract this work must preserve, and the clean tree is the baseline every later `git
status` is compared against.

If either is wrong, run `./module1/scripts/demo-reset.sh`.

---

## Step 1 — Map modules, dependencies, public behavior, and dead-code candidates

**Purpose.** Get evidence before making changes. An agent that edits before it understands
produces a diff you cannot review. This step gathers what is actually in the codebase, in specific
files, and changes nothing.

**Starting state.** Clean tree, repository root.

**Navigation.** Codex Desktop, with the repository open. Select the planning workflow for this
step rather than one that applies edits.

> Confirm the exact control in your installed Codex Desktop build before running this demo, and
> use the label you actually see. The prompt below carries the hard boundary regardless of which
> control you use: it instructs Codex not to edit any files.

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

Report your findings only. Do not propose changes yet. Do not edit files.
```

**Expected result.** A written analysis naming:

- `services/ticketService.ts` as the largest module, with several responsibilities
- priority normalization appearing in **three** files
- `normalizeLegacySeverity` in `utils/legacy.ts` with **no** importers
- priority branching inside the `POST /tickets` route handler

**Highlight.** The three file paths for the duplicated logic, and the zero-importer finding. Those
came from the repository, not from a guess.

**Decision produced.** You know what is wrong, in named files, having changed nothing.

**Verification.** PASS if all three duplicate sites are named and the dead helper is found, and
`git status --short` is empty. FAIL if any file was modified.

**Recovery.** `./module1/scripts/demo-reset.sh` restores the starting state.

---

## Step 2 — Constrain Codex to propose one cleanup theme before editing any files

**Purpose.** Findings are not a plan. An agent given a list of problems will offer to fix all of
them at once, which is how a cleanup becomes an unreviewable diff. Asking for exactly one theme is
what keeps the first pass small enough to check.

**Starting state.** Step 1 produced the analysis.

**Navigation.** Same Codex conversation.

**Prompt.**

```text
From those findings, propose exactly ONE bounded cleanup theme that:
- can be completed without changing any public behavior you listed
- is verifiable by the tests in apps/api/tests/contracts

State the theme in one sentence, then list the exact files it would change.

Propose one theme only. Do not propose architectural restructuring, new
abstractions, layers, or directories. Do not edit files.
```

**Expected result.** One theme — *centralize duplicate ticket-priority normalization while
preserving external behavior* — naming three files.

**Highlight.** One sentence, three files. Compare that against the five categories of finding from
Step 1: most of what was found is deliberately not being acted on yet.

**Decision produced.** A single candidate theme exists, scoped to named files.

**Verification.** PASS if exactly one theme is proposed and the files are named. FAIL if Codex
offers several themes or begins implementing.

**Recovery.** Ask: `You proposed more than one theme. Give me the single smallest one that
preserves all public behavior.`

---

## Step 3 — Inspect repository evidence and reject unrelated architectural changes

**Purpose.** A capable agent will offer improvements beyond what you asked for. Some are
reasonable. Reasonable is not the same as in scope. This is where you practise saying no to a good
idea at the wrong time — before it is in a diff, when saying no is free.

**Starting state.** Step 2 produced one theme.

**Navigation.** Same Codex conversation.

**Prompt.**

```text
List anything in your analysis that would change the architecture rather than
remove duplication: new layers, new abstractions, moved persistence boundaries,
or reorganized directories.

For each one, state how many files it would touch and why it is not part of a
duplication cleanup. Do not implement any of them.
```

**Expected result.** A short list, typically including a repository or data-access layer, and
possibly splitting `ticketService.ts` into several modules.

**Highlight.** The file count per item. Architecture changes touch many files; the approved
cleanup touches three. That ratio is the argument.

**Decision produced.** Architectural work is rejected for this pass — set aside, not discarded.

**Verification.** PASS if at least one architectural change is named and set aside, and no file was
edited. FAIL if Codex began implementing any of them.

**Recovery.** `./module1/scripts/demo-reset.sh`.

---

## Step 4 — Confirm Plan mode produced a bounded, reviewable first pass

**Purpose.** Close the planning pass with proof rather than belief. A plan you cannot point at is
not a plan, and the whole value of planning before implementing rests on the code being untouched
when you finish.

**Starting state.** Steps 1 to 3 complete.

**Navigation.** Same Codex conversation, then the terminal.

**Prompt.**

```text
Summarize this pass as a reviewable plan:

- the single cleanup theme, in one sentence
- the exact files it will change
- the behavior contracts it must preserve
- the commands that will prove those contracts still hold
- what you identified but deliberately deferred

Do not implement it.
```

**Expected result.** One theme, three files, the route and priority contracts, the commands
`npm run lint`, `npm run typecheck`, and `npm test`, and the deferred architectural work listed
separately.

**Operator action.** Approve that theme. Approve nothing else.

**Highlight.** The plan fits on one screen, and the deferred list is not empty — planning produced
both a decision and a record of what was declined.

**Verification.**

```bash
git status --short
```

PASS if there is no output. The entire demo produced analysis, a bounded plan, and a decision,
with zero edits — which is the case for planning before implementing.
FAIL if any file is listed.

**Recovery.** `./module1/scripts/demo-reset.sh` returns the repository to the starting state.

---

## Coverage

| Step | LO | Objective element | Proof |
|---|---|---|---|
| 1 | EO1a | map noisy modules, identify dead code | three duplicate sites named, zero-importer helper found |
| 2 | EO1a | propose one cleanup theme at a time before editing | exactly one theme, three files |
| 3 | TO1 | reviewable passes: unrelated work separated | architectural work named and set aside |
| 4 | EO1d, TO1 | Plan mode used before committing to implementation | bounded plan produced, `git status` empty |

## Final state

- one cleanup theme approved
- three duplicate sites and one dead helper identified by file path
- architectural work explicitly deferred
- no file edited

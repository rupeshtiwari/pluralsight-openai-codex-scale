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

## AUTHOR PREP — DO NOT NARRATE

**Surface: Stage A — VS Code with Codex panel**

| | |
|---|---|
| Starting checkpoint | `demo/m1-c2-start` |
| Working directory | repository root |
| Application | VS Code, opened on the repository root |
| Panes visible | editor and Codex panel. Integrated terminal stays hidden — this demo needs no terminal evidence |
| Secondary surface | none |
| Exact file to have open | `supporthub-api/modern/src/services/ticketService.ts` |
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

The reset refuses to run if changes exist outside the demo surface, lists what it would have
discarded, and changes nothing. That guard exists because a plain reset destroyed unstaged work
three times while this repository was being built. Between takes the tree will be dirty with demo
artifacts and the reset proceeds normally; if it refuses, read the list before reaching for
`--force`.

**Prepare before recording**

```bash
git checkout demo/m1-c2-start
npm install                     # only on a fresh checkout
./module1/scripts/demo_reset.sh
npm test                        # Tests  25 passed (25)
git status --short              # must print nothing at all
```

**Run the module preflight once per recording session, not per clip.** It validates the
preconditions for all four Module 1 demos in a single pass, so it does not need repeating
between clips.

```bash
module1/scripts/preflight_check.sh
```

It must end `PASS: Module 1 is ready.` If any check fails it names the check, why it matters,
and the command that fixes it. Do not record against a failing preflight.

Run these in a terminal outside the recording, not in the integrated terminal. Installing packages
is setup work and does not belong on camera.

`git status --short` must be completely empty. Step 4's proof reads the whole repository through
the Source Control view, so a stray untracked file anywhere — a nested clone, an editor backup —
will show there and break the closing evidence for a reason unrelated to the teaching.

**Expected values**

| Evidence | Value |
|---|---|
| Baseline tests | 25 passed |
| Duplicate normalization sites | 2 — `utils/priority.ts` and inline inside `createTicket()` |
| Unreferenced exports | `normalizeLegacySeverity`, `toPriority`, `validateNewTicket` |
| Unreachable branch | second status check inside `changeStatus()` |
| Source Control changes at the end | 0 |

**The two checkpoints are intentionally the same commit**

`demo/m1-c2-start` and `demo/m1-c2-captured` point at the identical commit, on purpose.

This demo's entire outcome is a plan and an untouched repository. It produces no diff, because
producing one would mean the planning pass edited files — which is the failure this demo exists to
rule out. Two identical refs is the honest encoding of that.

**Do not "fix" this by manufacturing a change.** If the two refs ever differ, the demo edited files
and the result is invalid. `module1/scripts/preflight_check.sh` asserts they match and fails if they
diverge, so the intent is enforced rather than merely documented.

**Recovery path**

If Codex edits a file, the pass is void: reset and start again rather than continuing from a dirty
tree. If Codex proposes several cleanup themes, the narrowing prompt in Step 2 recovers it. If it
surfaces no architectural work, the fallback prompt in Step 3 recovers it.

**Troubleshooting**

| Symptom | Cause | Fix |
|---|---|---|
| `npm test` reports `Missing script: "test"` | wrong branch — `main` has no `package.json` | `git checkout demo/m1-c2-start` |
| Tests fail on a fresh checkout | dependencies not installed | `npm install` |
| Source Control shows changes before Step 1 | previous run not reset | `./module1/scripts/demo_reset.sh` |

---

# ON-CAMERA

## Step 1 — Open the TypeScript service in Codex and ask it to map modules, dependencies, public behavior, and dead-code candidates

**Purpose.** Get evidence before making changes. An agent that edits before it understands
produces a diff you cannot review. This step gathers what is actually in the codebase, in specific
files, and changes nothing.

**Starting state.** Clean tree, repository root.

**Navigation.** VS Code. Open the Codex panel. Select the planning workflow for this step rather
than one that applies edits. Keep the editor showing `ticketService.ts` so the file being analyzed
is visible beside the panel.

> Confirm the exact control in your installed Codex panel before running this demo, and
> use the label you actually see. The prompt below carries the hard boundary regardless of which
> control you use: it instructs Codex not to edit any files.

**Prompt.** Paste exactly this. It is also saved at `plans/prompts/m1-c2-map-codebase.md`.

```text
Analyze the TypeScript service in supporthub-api/modern. Do not edit any files.

Produce:
1. A map of the modules under supporthub-api/modern/src, and which module depends on which.
2. The public behavior this service exposes: every route path, its HTTP status
   codes, and its response field names.
3. Any logic implemented more than once, naming each file it appears in.
4. Any exported function with no importers anywhere in supporthub-api/modern.
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

**Recovery.** `./module1/scripts/demo_reset.sh` restores the starting state.

---

## Step 2 — Constrain Codex to propose one cleanup theme before editing any files

**Purpose.** Findings are not a plan. An agent given a list of problems will offer to fix all of
them at once, which is how a cleanup becomes an unreviewable diff. Asking for exactly one theme is
what keeps the first pass small enough to check.

**Starting state.** Step 1 produced the analysis.

**Navigation.** Same Codex panel conversation in VS Code.

**Prompt.**

```text
From those findings, propose exactly ONE bounded cleanup theme that:
- can be completed without changing any public behavior you listed
- is verifiable by the tests in supporthub-api/modern/tests/contracts

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

## Step 3 — Inspect repository evidence and reject unrelated architectural changes before implementation

**Purpose.** A capable agent will offer improvements beyond what you asked for. Some are
reasonable. Reasonable is not the same as in scope. This is where you practise saying no to a good
idea at the wrong time — before it is in a diff, when saying no is free.

**Starting state.** Step 2 produced one theme.

**Navigation.** Same Codex panel conversation in VS Code.

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

**Recovery.** `./module1/scripts/demo_reset.sh`.

---

## Step 4 — Confirm Plan mode produces a bounded, reviewable first pass

**Purpose.** Close the planning pass with proof rather than belief. A plan you cannot point at is
not a plan, and the whole value of planning before implementing rests on the code being untouched
when you finish.

**Starting state.** Steps 1 to 3 complete.

**Navigation.** Same Codex panel conversation in VS Code.

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

**Verification.** Switch focus to the **Source Control** view in the VS Code activity bar — the
branch-shaped icon on the left. Add a callout there, and remove the callout that was on the Codex
panel before doing so.

PASS if **Changes** is empty and the view shows no pending changes. The entire demo produced
analysis, a bounded plan and a decision, with zero edits — which is the case for planning before
implementing.
FAIL if any file is listed under Changes.

The Source Control view is the proof surface here rather than a terminal command, because the
integrated terminal has stayed hidden all demo and opening it now would introduce a second surface
for a single number.

**Recovery.** `./module1/scripts/demo_reset.sh` returns the repository to the starting state.

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

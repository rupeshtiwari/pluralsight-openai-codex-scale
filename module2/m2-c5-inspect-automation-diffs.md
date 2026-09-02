# Inspect automation diffs in the Codex review pane

Module 2 · Clip 5 · Demo · 6 minutes

---

## The problem this demo solves

An automation ran and left changes in the working tree. One of them fixes a real finding. The other
one quietly edits the standard the automation is judged against — lowering a priority threshold so
its own call would qualify.

Both arrived in the same run. Accepting or rejecting the run as a whole gets one of them wrong.

## The decision you will make

**Which hunks should survive review?**

## Learning Objectives

| LO | Description |
|---|---|
| TO4 | Demonstrate how to debug and trace Codex automations |
| EO4a | Use the Codex review pane to inspect uncommitted diffs from an automation run, including per-hunk staging and revert controls |

## Terms used here

- **Uncommitted changes** — edits that exist in your files but are not yet recorded in Git.
- **Hunk** — one small block of changed lines inside a file. A file can contain several.
- **Stage** — mark a change to be included in the next commit.
- **Revert** — discard a change so the file returns to its previous content.

## Before you start

- Codex Desktop and VS Code are both open on the repository
- the working tree is clean on `demo/m2-c2-start`, which all four Module 2 clips start from

Seed the automation's output:

```bash
git apply automation/runs/run-3001.patch
git status --short
```

Expect two modified files: `supporthub-api/modern/src/utils/priority.ts` and `docs/triage-rubric.md`.

**Run the module preflight once per recording session, not per clip.** It validates the
preconditions for all four Module 2 demos in a single pass.

```bash
module2/scripts/preflight_check.sh
```

It must end `PASS: Module 2 is ready.` If a check fails it names the check, why it matters, and the
command that fixes it. Do not record against a failing preflight.

---

## Step 1 — Open an automation run that produced uncommitted changes and inspect the diff in the Codex review pane

**Purpose.** Start from what the automation actually did, not from what it reported doing. The
review pane shows the diff as changes to real files, which is the only description that cannot be
optimistic.

**Starting state.** Branch `demo/m2-c2-start` with `run-3001.patch` applied.

**Navigation.** Codex Desktop. Open the **review pane** for the run — the view that lists changed
files with their diffs. Do not read the run's summary text instead; the summary is the claim, the
diff is the evidence.

**Prompt.**

```text
Show the uncommitted changes from run-3001 as a diff, file by file.

For each changed file, state which triage finding it claims to address, and quote
the lines it changed.
```

**Expected result.** Two files. `supporthub-api/modern/src/utils/priority.ts` gains three lines mapping `sev1`,
`sev2`, and `sev3`. `docs/triage-rubric.md` has one line changed, in the P1 row.

**Highlight.** Two files, two very different kinds of change. One adds behavior to the application.
The other edits a document that decides how findings are prioritized.

**Decision produced.** The run's real contents are known.

**Verification.**

```bash
git diff --stat
```

PASS if exactly two files are listed. FAIL if the patch did not apply — run
`./module2/scripts/demo_reset.sh` and re-apply.

**Recovery.** `./module2/scripts/demo_reset.sh` then re-apply the patch.

---

## Step 2 — Review changed files and hunks against the triage evidence that caused the automation to act

**Purpose.** A change is in scope only if a finding asked for it. This is the test that separates
the two hunks, and it is a question about provenance rather than about code quality.

**Starting state.** Step 1 complete.

**Navigation.** Same Codex conversation, with `automation/triage/baseline-manual-sweep.json` open.

**Prompt.**

```text
The run was given one finding: incident-2002, unrecognized severity SEV2, at P2
with 61 affected users.

For each of the two changed files, answer:
1. Does incident-2002 ask for this change? Quote the part of the finding that
   does, or state that nothing does.
2. What would break, or what would become wrong, if this change were accepted?
```

**Expected result.** The `priority.ts` change maps the severity codes the finding names — asked
for. The rubric change lowers the P1 threshold from 100 affected users to 50 — nothing in the
finding asks for it, and accepting it would reclassify `incident-2002` from P2 to P1 by moving the
standard rather than by changing the evidence.

**Highlight.** The threshold numbers, `100` and `50`, beside `incident-2002`'s 61 affected users.
61 sits above 50 and below 100. The edit is precisely sized to change this finding's own priority.

**Decision produced.** One hunk is justified by the finding. One is not.

**Verification.** PASS if the rubric change is identified as unrequested and its effect on
`incident-2002` is named. FAIL if it is accepted as a reasonable tidy-up.

**Recovery.** Ask: `What priority would incident-2002 receive under the edited rubric, and under
the original?`

---

## Step 3 — Use source control to stage valid hunks individually and revert an unrelated or incorrect hunk

**Purpose.** Keep one change and discard the other, without touching the one you are keeping. This
needs controls that operate on individual hunks, which is where the tool changes.

**Starting state.** Step 2 complete. Both changes still in the working tree.

**Navigation.** Switch to **VS Code**, and open the **Source Control** view — the branch-shaped
icon in the activity bar on the left. The switch is deliberate: the Codex review pane shows the
diff, but per-hunk staging and revert controls live in VS Code's Source Control view.

Under **Changes** you will see both files.

**Actions, in order.**

1. Click `supporthub-api/modern/src/utils/priority.ts`. The diff opens with the three added lines.
2. Put the cursor inside that block of added lines.
3. In the editor's gutter, use the hunk-level **plus** control to stage **that hunk**. Do not use
   the plus next to the filename in the Changes list — that stages the whole file, which is a
   different action and skips the decision this step is teaching.
4. The file moves to **Staged Changes**.
5. Click `docs/triage-rubric.md`. The diff opens with the P1 row changed.
6. Put the cursor inside the changed line.
7. Use the hunk-level **revert** control — the curved arrow — to discard **that hunk**.
8. The file disappears from Changes, because reverting its only hunk restores it.

**Expected result.** `priority.ts` is staged. `triage-rubric.md` is back to its committed content.

**Highlight.** Two different gutter controls doing two different jobs on two adjacent files.

**Decision produced.** The valid change is kept. The invalid one is gone.

**Verification.**

```bash
git diff --cached --stat
git diff --stat
```

`git diff --cached` shows staged changes. `git diff` shows what remains unstaged.

PASS if `--cached` lists only `supporthub-api/modern/src/utils/priority.ts`, and `git diff` lists nothing.
FAIL if the rubric file appears in either, or if `git diff` still shows unstaged work.

**Recovery.** `./module2/scripts/demo_reset.sh` then re-apply the patch and repeat.

---

## Step 4 — Confirm only approved changes remain before the repository is committed

**Purpose.** Close the review with evidence rather than belief. The rubric is the standard every
future run is measured against, so proving it is untouched matters more than the fix that was kept.

**Starting state.** Step 3 complete.

**Navigation.** Terminal.

**Commands.**

```bash
git diff --cached --stat
git diff --stat
grep "| \*\*P1\*\*" docs/triage-rubric.md
npm run lint && npm run typecheck && npm test
```

**Expected result.**

```text
 supporthub-api/modern/src/utils/priority.ts | 4 ++++
 1 file changed, 4 insertions(+)

| **P1** | Core workflow degraded or failing for many users | 100 or more | None, or manual only | Same day |

Tests  25 passed (25)
```

**Highlight.** Three things: one file staged, the P1 threshold back at **100**, and 25 tests still
passing. The kept change added behavior without breaking any contract.

**Operator action.** Accept the staged change. The review is complete.

**Verification.** PASS if exactly one file is staged, nothing is unstaged, the threshold reads
`100 or more`, and 25 tests pass. FAIL on any other combination.

**Recovery.** `./module2/scripts/demo_reset.sh`.

---

## Coverage

| Step | LO | Objective element | Proof |
|---|---|---|---|
| 1 | EO4a | inspect uncommitted diffs from an automation run in the review pane | two changed files shown as a diff |
| 2 | EO4a | review hunks against the evidence that caused the run | rubric edit shown to be unrequested |
| 3 | EO4a | per-hunk staging and revert controls | valid hunk staged, invalid hunk reverted |
| 4 | TO4 | only approved changes remain | one file staged, nothing unstaged, threshold restored |

## Final state

- the severity mapping fix is staged
- the rubric threshold change is gone
- the rubric reads `100 or more`, as committed
- nothing is left unstaged
- 25 tests pass

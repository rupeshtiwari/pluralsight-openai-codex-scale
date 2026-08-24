# Trace a failed Codex automation and recover safely

Module 2 · Clip 6 · Demo · 6 minutes

---

## The problem this demo solves

An automation ran overnight and failed. The working tree holds its changes, and the build is
broken.

The instinctive response is to throw the whole run away. That is usually wrong: part of the run is
often correct, and discarding it means redoing sound work and losing the reasoning behind it. The
harder question is which part failed, and why.

## The decision you will make

**What failed, and what should be rerun?**

## Learning Objectives

| LO | Description |
|---|---|
| TO4 | Demonstrate how to debug and trace Codex automations |
| EO4a | Use the Codex review pane to inspect uncommitted diffs from an automation run, including per-hunk staging and revert controls |

## Terms used here

- **Source assumption** — the evidence an automation decided to act on.
- **Evidence chain** — inputs, generated change, and validation result, read in that order.
- **Corrected context** — the same task rerun after fixing what it was told, rather than after
  editing what it produced.

## Before you start

- Codex Desktop and VS Code are both open on the repository
- the working tree is clean on `demo/m2-c6-start`

Seed the failed run:

```bash
git apply automation/runs/run-3002.patch
git status --short
```

Expect two modified files: `supporthub-api/modern/package.json` and

**Run the module preflight once per recording session, not per clip.** It validates the
preconditions for all four Module 2 demos in a single pass.

```bash
module2/scripts/preflight_check.sh
```

It must end `PASS: Module 2 is ready.` If a check fails it names the check, why it matters, and the
command that fixes it. Do not record against a failing preflight.
`supporthub-api/modern/src/services/ticketService.ts`.

---

## Step 1 — Trace the source evidence, generated change, and validation outcome of the failed run

**Purpose.** A failed run has three layers: what it was told, what it produced, and what the
validation said. Reading them in that order finds the cause. Reading only the error message finds
the symptom.

**Starting state.** Branch `demo/m2-c6-start` with `run-3002.patch` applied.

**Navigation.** Codex Desktop, review pane for the run.

**Command.** Read what the run recorded about itself:

```bash
node scripts/json.mjs fields automation/runs/run-3002.json \
  "status=status" \
  "finding=sourceFindings.0" \
  "chose commit=correlation.chose+correlation.chosenBecause" \
  "correct=correlation.correct" \
  "fault type=correlation.faultType" \
  "build=validation.build"
```

**Expected output.**

```text
  status      : failed
  finding     : incident-2001
  chose commit: d4e5f6a - committed 17 minutes before the first occurrence of evt-1042
  correct     : a1b2c3d
  fault type  : bad source assumption
  build       : fail
```

**Highlight.** `fault type: bad source assumption`. The generator did competent work on a premise
it was handed. The failure entered before any code was written.

**Decision produced.** The failure is in the input, not in the generation.

**Verification.** PASS if the chosen commit and the reason it was chosen are both identified.
FAIL if the run's own summary is taken at face value without checking the correlation.

**Recovery.** `./module2/scripts/demo_reset.sh` then re-apply the patch.

---

## Step 2 — Isolate the incorrect hunk instead of discarding the entire run

**Purpose.** A failed run is not uniformly wrong. Judging each hunk against the finding shows that
one change follows from the evidence and the other follows from the bad assumption — which is what
makes a partial recovery possible.

**Starting state.** Step 1 complete.

**Navigation.** Codex Desktop review pane, with the diff visible.

**Prompt.**

```text
The run acted on incident-2001: changeStatus throws because a status value was
never validated. Its stack frames are in ticketService.ts.

For each of the two changed files:
1. Does it follow from that finding, or from the commit correlation?
2. Would it still be correct if the correlation were fixed?
```

**Expected result.** The `ticketService.ts` guard follows from the finding and stays correct
regardless of which commit was blamed. The `package.json` pin follows only from the correlation and
is wrong: it downgrades Express in a workspace built for Express 5.

**Highlight.** Two hunks, two origins. One traces to the stack frame, the other to a timestamp.

**Decision produced.** One hunk is preserved. One is reverted.

**Verification.** PASS if the guard is identified as sound and the pin as caused by the bad
correlation. FAIL if the run is judged wholly bad.

**Recovery.** Ask: `Which file appears in the failing stack for evt-1042?`

---

## Step 3 — Revert the bad change, preserve valid work, and rerun with corrected context

**Purpose.** Discard the faulty change without disturbing the sound one, then fix what the
automation was *told* rather than hand-editing what it produced. Rerunning on corrected context is
what proves the failure is resolved rather than patched over.

**Starting state.** Step 2 complete. Both changes still present.

**Navigation.** Switch to **VS Code**, **Source Control** view. Both files appear under **Changes**.

**Actions, in order.**

1. Click `supporthub-api/modern/src/services/ticketService.ts`, put the cursor in the changed line, and use the
   hunk-level **plus** control in the gutter to stage that hunk. Staging protects it from the next
   step.
2. Click `supporthub-api/modern/package.json`, put the cursor in the changed line, and use the hunk-level
   **revert** control — the curved arrow — to discard it. Do not use the discard control beside the
   filename; that acts on the whole file.

**Verify the revert before rerunning:**

```bash
git diff --cached --stat
git diff --stat
grep '"express"' supporthub-api/modern/package.json
```

Expect `ticketService.ts` staged, nothing unstaged, and express back at `^5.1.0`.

**Then rerun, in Codex Desktop:**

```text
Rerun the fix for incident-2001 with corrected context.

Correlate it to a1b2c3d, which changed changeStatus in ticketService.ts, a frame
present in both evt-1042 and evt-1043. Do not correlate d4e5f6a - it changed only
package.json and package-lock.json, neither of which appears in any failing stack.

Complete the fix in supporthub-api/modern/src/services/ticketService.ts only. Change no
dependency.
```

**Expected result.** The staged guard survives, the dependency pin is gone, and the rerun's changes
are confined to `ticketService.ts`.

**Highlight.** The staged change survived a revert happening in the same working tree, and the
rerun touched no dependency.

**Decision produced.** Valid work preserved, faulty work discarded, corrected run produced.

**Verification.** PASS if express reads `^5.1.0`, the guard is still present, and every change is
inside `ticketService.ts`. FAIL if the pin remains or the guard was lost.

**Recovery.** `./module2/scripts/demo_reset.sh`, re-apply the patch, repeat.

---

## Step 4 — Verify the recovered run produces a clean reviewable diff before acceptance

**Purpose.** Close the recovery with evidence rather than belief. A rerun that nobody validated is
just a second guess.

**Starting state.** Step 3 complete.

**Navigation.** Terminal.

**Commands.**

```bash
node scripts/json.mjs fields automation/runs/run-3003.json \
  "status=status" \
  "commit=correlation.chose" \
  "files=hunks.0.file" \
  "gates=validation"
npm run lint && npm run typecheck && npm run build && npm test
git diff --stat
git diff --cached --stat
```

**Expected output.**

```text
  status: completed
  commit: a1b2c3d
  files : supporthub-api/modern/src/services/ticketService.ts
  gates : lint=pass typecheck=pass build=pass test=pass

Tests  25 passed (25)
```

**Operator action.** Accept the recovered run.

**Highlight.** One file changed, no dependency touched, four gates green, and the diff small enough
to read in full.

**Verification.** PASS if every remaining change is inside `supporthub-api/modern/src/services/ticketService.ts`,
no dependency file appears in either diff, and all four gates pass. FAIL if `package.json` appears
anywhere, or if any gate is red.

**Recovery.** `./module2/scripts/demo_reset.sh`.

---

## Coverage

| Step | LO | Objective element | Proof |
|---|---|---|---|
| 1 | EO4a | inspect an automation run's uncommitted diff and its inputs | evidence chain read, bad source assumption named |
| 2 | EO4a | review hunks against the evidence that caused the run | sound hunk separated from faulty hunk |
| 3 | EO4a | per-hunk revert keeps valid work; rerun on corrected context | pin reverted, guard staged, express back to ^5.1.0 |
| 4 | TO4 | trace and debug to a clean reviewable diff | one file changed, four gates green |

## Final state

- the failure traced to a bad source assumption rather than a bad generator
- the sound hunk preserved
- the faulty dependency change reverted
- the rerun correlated to the commit that touches the failing stack
- lint, type-check, build, and 25 tests pass

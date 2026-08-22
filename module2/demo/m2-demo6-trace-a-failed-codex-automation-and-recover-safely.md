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

## Learning objectives

- Use the Codex review pane to inspect uncommitted diffs from an automation run, including
  per-hunk staging and revert controls

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

Expect two modified files: `apps/api/package.json` and
`apps/api/src/services/ticketService.ts`.

---

## Step 1 — Read the evidence chain in order

**Purpose.** A failed run has three layers: what it was told, what it produced, and what the
validation said. Reading them in that order finds the cause. Reading only the error message finds
the symptom.

**Starting state.** Branch `demo/m2-c6-start` with `run-3002.patch` applied.

**Navigation.** Codex Desktop, review pane for the run.

**Command.** Read what the run recorded about itself:

```bash
python3 -c "
import json
r=json.load(open('automation/runs/run-3002.json'))
print('  status      :', r['status'])
print('  finding     :', r['sourceFindings'][0])
print('  chose commit:', r['correlation']['chose'], '-', r['correlation']['chosenBecause'])
print('  correct     :', r['correlation']['correct'])
print('  fault type  :', r['correlation']['faultType'])
print('  build       :', r['validation']['build'])
"
```

**Expected output.**

```text
  status      : failed
  finding     : incident-2001
  chose commit: d4e5f6a - committed 17 minutes before the first occurrence of evt-1042
  correct     : a1b2c3d
  fault type  : bad source assumption
```

**Highlight.** `fault type: bad source assumption`. The generator did competent work on a premise
it was handed. The failure entered before any code was written.

**Decision produced.** The failure is in the input, not in the generation.

**Verification.** PASS if the chosen commit and the reason it was chosen are both identified.
FAIL if the run's own summary is taken at face value without checking the correlation.

**Recovery.** `./module2/scripts/demo-reset.sh` then re-apply the patch.

---

## Step 2 — Separate the sound work from the faulty work

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

## Step 3 — Revert only the bad hunk

**Purpose.** Discard the faulty change without disturbing the sound one. Per-hunk controls make
this a precise operation instead of a rollback and a rewrite.

**Starting state.** Step 2 complete. Both changes still present.

**Navigation.** Switch to **VS Code**, **Source Control** view. Both files appear under **Changes**.

**Actions, in order.**

1. Click `apps/api/src/services/ticketService.ts`, put the cursor in the changed line, and use the
   hunk-level **plus** control in the gutter to stage that hunk. Staging protects it from the next
   step.
2. Click `apps/api/package.json`, put the cursor in the changed line, and use the hunk-level
   **revert** control — the curved arrow — to discard it. Do not use the discard control beside the
   filename; that acts on the whole file.

**Expected result.** `ticketService.ts` is staged. `package.json` is back to `"express": "^5.1.0"`.

**Highlight.** The staged change survived a revert happening in the same working tree.

**Verification.**

```bash
git diff --cached --stat
git diff --stat
grep '"express"' apps/api/package.json
```

PASS if `--cached` lists only `ticketService.ts`, `git diff` lists nothing, and express reads
`^5.1.0`. FAIL if the pin remains or the guard was lost.

**Recovery.** `git reset && git checkout -- .`, re-apply the patch, repeat.

---

## Step 4 — Rerun with corrected context and verify the result

**Purpose.** The fix is to correct what the automation was told, not to hand-edit what it produced.
Rerunning on corrected context is what proves the failure is actually resolved rather than patched
over.

**Starting state.** Step 3 complete. Bad hunk gone, good hunk staged.

**Navigation.** Codex Desktop, same conversation.

**Prompt.**

```text
Rerun the fix for incident-2001 with corrected context.

Correlate it to a1b2c3d, which changed changeStatus in ticketService.ts, a frame
present in both evt-1042 and evt-1043. Do not correlate d4e5f6a - it changed only
package.json and package-lock.json, neither of which appears in any failing stack.

Complete the fix in apps/api/src/services/ticketService.ts only. Change no
dependency.

Then run: npm run lint && npm run typecheck && npm run build && npm test
```

**Expected result.** Changes confined to `ticketService.ts`. All four gates pass.

**Command.** Confirm against what the corrected run should look like:

```bash
python3 -c "
import json
r=json.load(open('automation/runs/run-3003.json'))
print('  status :', r['status'])
print('  commit :', r['correlation']['chose'])
print('  files  :', [h['file'] for h in r['hunks']])
print('  gates  :', r['validation'])
"
npm run lint && npm run typecheck && npm run build && npm test
```

**Expected output.**

```text
  status : completed
  commit : a1b2c3d
  files  : ['apps/api/src/services/ticketService.ts']
  gates  : {'lint': 'pass', 'typecheck': 'pass', 'build': 'pass', 'test': 'pass'}

Tests  25 passed (25)
```

**Operator action.** Accept the recovered run.

**Highlight.** One file changed, no dependency touched, four gates green, and the diff small enough
to read in full.

**Verification.**

```bash
git diff --stat
git diff --cached --stat
```

PASS if every remaining change is inside `apps/api/src/services/ticketService.ts`, no dependency
file appears, and all four gates pass. FAIL if `package.json` appears anywhere, or if any gate is
red.

**Recovery.** `./module2/scripts/demo-reset.sh`.

---

## Coverage

| Step | Objective element | Proof |
|---|---|---|
| 1 | Inspect an automation run's uncommitted diff and its inputs | evidence chain read, bad source assumption named |
| 2 | Review hunks against the evidence that caused the run | sound hunk separated from faulty hunk |
| 3 | Per-hunk revert keeps valid work | pin reverted, guard staged, express back to ^5.1.0 |
| 4 | Only approved changes remain before acceptance | one file changed, four gates green |

## Final state

- the failure traced to a bad source assumption rather than a bad generator
- the sound hunk preserved
- the faulty dependency change reverted
- the rerun correlated to the commit that touches the failing stack
- lint, type-check, build, and 25 tests pass

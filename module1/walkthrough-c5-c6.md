# Walking C5 and C6, and cutting the four remaining branches

Four Module 1 checkpoints do not exist yet, because their content is produced by walking the demos
rather than authored ahead of them:

    demo/m1-c5-captured   the two-checkpoint split C5 produces
    demo/m1-c6-start      branched from m1-c5-captured
    demo/m1-c6-captured   the migrated route C6 produces

This document is the procedure for producing them. **It is not a runbook.** The on-camera scripts
are `m1-c5-inventory-legacy-express4.md` and `m1-c6-migrate-one-express-route.md`; this covers what
happens around them — what to capture, what to verify, and in what order to cut.

Nothing here can be done without live Codex.

---

## The guard, first

**`demo/m1-c6-start` must be branched from `demo/m1-c5-captured`, never from the build branch.**

This is the one mis-cut in the chain that fails silently. `m1-c6-start` is defined by opening on the
*split* plan — two checkpoints, the route migration separated from the Express upgrade. Cut from the
build branch it opens on the *combined* milestone, which is the inverse of its definition.

It would look correct. Every existing invariant passes on a mis-cut C6, and one of them actively
confirms it: `milestone-batched` asserts the plan opens on a single milestone combining a route
migration with a dependency upgrade — exactly the state a mis-cut C6 has. That check exists to
protect C5's starting state, and on the wrong branch it certifies the error.

Measured on the build branch, which is the state a mis-cut C6 would inherit:

| Check | Result | |
|---|---|---|
| `milestone-batched` | HOLDS | confirms the mis-cut |
| `load-bearing-function`, `c2-refs-identical`, `no-route-migrated`, `skill-not-ambient`, `c6-prompt-saved`, `skill-tells-unique`, `doc-links-resolve`, `migration-tests-pass`, `demo-checkout-refs-exist` | HOLD | say nothing either way |
| `c6-start-opens-on-split` | **BROKEN** | catches it |

`c6-start-opens-on-split` asserts the opposite shape: exactly two checkpoint entries under
`## Milestones`, each carrying a scope, a validation command and a rollback point, and neither
combining a route migration with a dependency upgrade. `c5-captured-opens-on-split` asserts the same
thing from the other checkout, since both branches carry the post-rejection plan.

Counting entries is not enough on its own, which is why the check also inspects each entry: a plan
split into two where one half still batches both concerns passes a count and fails the objective.
That case is in the negative suite.

---

## Capture points

Reconstructing these afterwards from memory is not evidence. Save them **during** the walk, before
committing anything.

| Walk | Capture | Goes to |
|---|---|---|
| C5 | The batched plan exactly as Codex produced it, before rejection | `plans/captured/m1-c5-plan-batched.md` |
| C5 | The split plan after the rejection, before any hand-editing | `plans/captured/m1-c5-plan-split.md` |
| C6 | Run A transcript, verbatim and unedited | Run A block in `m1-c6-framework-skill-evidence.md` |
| C6 | Run B transcript, verbatim and unedited | Run B block in `m1-c6-framework-skill-evidence.md` |

Paste them as they came back. Tidying a transcript destroys the only thing it is for — if Run B is
messier than Run A, that *is* the finding.

---

## Sequence

Each step has a verification that must pass before the next begins. A failure means stop and fix,
not proceed and reconcile later.

### 1. Walk C5

```bash
git checkout demo/m1-c5-start
./module1/scripts/demo_reset.sh
module1/scripts/preflight_check.sh
```

Preflight must end `PASS: Module 1 is ready.` Then walk the demo from
`m1-c5-inventory-legacy-express4.md`.

### 2. Capture both plan states

Before committing, save the two artifacts named above into `plans/captured/`. The batched plan must
be saved *before* you have Codex split it — once it is split, the original is gone.

### 3. Cut `demo/m1-c5-captured`

The walk leaves the tree dirty on `m1-c5-start`. Carry that work onto a new branch rather than
committing it where it stands, so the seeded starting state is not moved:

```bash
git checkout -b demo/m1-c5-captured
git add -A
git commit -m "C5 captured: migration plan split into two checkpoints"
git push -u origin demo/m1-c5-captured
```

### 4. Verify the cut

```bash
node scripts/check.mjs c5-captured-opens-on-split
```

Then from a fresh clone, because the working tree is not evidence:

```bash
git clone --branch demo/m1-c5-captured https://github.com/rupeshtiwari/pluralsight-openai-codex-scale.git /tmp/verify-c5
cd /tmp/verify-c5 && npm install
node scripts/check.mjs c5-captured-opens-on-split
module1/scripts/preflight_check.sh
```

The preflight will report `migration plan opens on exactly one milestone` as **FAIL** here, and that
is correct — this branch carries the split, not the seed. Every other check must pass. If any other
check fails, stop.

### 5. Cut `demo/m1-c6-start` from `demo/m1-c5-captured`

Not from the build branch, and not from `main`. The reason is at the top of this document.

```bash
git branch demo/m1-c6-start demo/m1-c5-captured
git push -u origin demo/m1-c6-start
```

### 6. Verify the cut, from a fresh clone

```bash
git clone --branch demo/m1-c6-start https://github.com/rupeshtiwari/pluralsight-openai-codex-scale.git /tmp/verify-c6
cd /tmp/verify-c6 && npm install
node scripts/check.mjs c6-start-opens-on-split
```

This must pass. If it reports the batched milestone, the branch was cut from the wrong parent —
delete it and redo step 5. Do not walk C6 against a branch that fails this.

### 7. Walk C6 — Run A, then Run B

Both runs start from `demo/m1-c6-start` with a clean tree, and **each starts in a fresh Codex
thread**. Run B in Run A's thread is not skill-off; it is skill-remembered, and it would reproduce
guidance it was never given.

Once the branch exists, from your working clone:

    git checkout demo/m1-c6-start
    ./module1/scripts/demo_reset.sh

Run A sends `plans/prompts/m1-c6-migrate-route.md` as-is. Reset. Run B sends the same file with its
first line and the blank line after it removed, and nothing else changed.

Before either run, confirm the toggle pre-check in `m1-c6-framework-skill-evidence.md` has been done
and passed. If the skill loads unasked, these two runs cannot form a control and there is no point
performing them.

### 8. Fill the evidence artifact

Paste both transcripts verbatim into their reserved blocks, then fill the comparison table and the
assessment from what is actually in them. Tick one of the three verdict boxes.

A Run B materially as good as Run A is a real result. Record it as one.

### 9. Cut `demo/m1-c6-captured`

```bash
git add -A
git commit -m "C6 captured: one route migrated under framework guidance"
git checkout -b demo/m1-c6-captured
git push -u origin demo/m1-c6-captured
```

Then verify from a fresh clone:

```bash
git clone --branch demo/m1-c6-captured https://github.com/rupeshtiwari/pluralsight-openai-codex-scale.git /tmp/verify-c6c
cd /tmp/verify-c6c && npm install && npm test
module1/scripts/preflight_check.sh
```

`no-route-migrated` will fail here by design — a route has now migrated. That is what this branch
is. Confirm nothing else fails.

---

## Re-classify the two SEEDED rows

`docs/validation-matrix-module1.md` records C2 bullet 3 and C5 bullet 4 as `SEEDED`: an assertion
runs green on the demo's starting state rather than on the outcome the bullet claims. Both were held
there by a missing checkpoint, and one of them stops being held once step 3 completes.

**C5 bullet 4 becomes `PASS`.** Today `milestone-batched` can only assert the start state. Once
`demo/m1-c5-captured` exists, the pair spans both ends — one batched entry at `m1-c5-start`, exactly
two entries and none batched at `m1-c5-captured`, which is `c5-captured-opens-on-split`. That is the
outcome the bullet claims, asserted end to end. Update the matrix row and the totals.

**C2 bullet 3 is decided at walk time, not afterwards.** The bullet is about rejecting an
architectural suggestion, and the two C2 branches are deliberately identical, so nothing is written
to diff. It is promotable only if the walkthrough leaves a durable artifact. The Codex thread
transcript is one — but the test is whether it shows **the reason** the suggestion was rejected, not
merely that the conversation moved on. Judge that with the thread open in front of you. If it does,
capture it to `plans/prompts/` and promote the row; if it does not, `SEEDED` is the honest permanent
classification and not a gap.

After either promotion, re-run `npm run check:negatives` — a promoted row means a changed assertion,
and a changed assertion is unproven until it has been seen to fail.

---

## If something goes wrong

| Symptom | Cause | What to do |
|---|---|---|
| `c6-start-opens-on-split` reports the batched milestone | branch cut from the build branch or `main` | delete `demo/m1-c6-start` and redo step 5 from `demo/m1-c5-captured` |
| `c5-captured-opens-on-split` reports three entries | Codex split into more than two, or an entry was added by hand | the demo claims two checkpoints; reconcile the plan with what was narrated before committing |
| Two entries but the check still fails | one entry still carries both the route and the dependency upgrade | the split separated the text, not the concerns — this is the case the bullet exists to teach |
| Preflight fails `working tree clean` mid-walk | expected during a walk | it is a starting-state check; run it before the walk, not during |
| A transcript is too messy to paste | it is evidence, not a deliverable | paste it as it is |

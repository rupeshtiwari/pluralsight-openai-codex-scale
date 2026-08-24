# Demo reset guide

Every demo returns to a deterministic starting state with one command. This document explains what
the reset does, what it refuses to do, and why.

## Resetting a module

```bash
./module1/scripts/demo_reset.sh
./module2/scripts/demo_reset.sh
```

The reset restores the working tree, the plan files, the fixtures and the run artifacts, and
verifies the baseline still passes. It ends with a readiness verdict.

## The guard, and why it exists

The reset discards work. Between takes that is exactly what is wanted: the dirty files are demo
artifacts. During development it is not — unstaged edits to scripts, runbooks or docs are real work,
and a plain reset destroys them.

**This script destroyed unstaged work three times while this repository was being built.** Each time
the cause was the same: `git checkout -- .` runs before anything is staged.

So the guard is not "refuse when the tree is dirty", which would make the script useless between
takes. It refuses only when changes exist **outside the demo surface**:

```text
supporthub-api/   plans/   automation/   module1/logs/   module2/logs/   docs/triage-rubric.md
```

Dirt inside that surface is normal and the reset proceeds. Dirt outside it stops the reset, which
lists exactly what it would have discarded and changes nothing.

```bash
./module1/scripts/demo_reset.sh --force    # discard it deliberately
```

Read the list before reaching for `--force`.

## Recovering a demo state

Return to a checkpoint rather than unpicking changes by hand:

```bash
git checkout demo/m1-c2-start
```

## Checkpoint dependencies

Two checkpoints are not independent, and cutting them from the wrong place produces a state that
looks plausible and is wrong.

```text
walk C5  ->  demo/m1-c5-captured  ->  demo/m1-c6-start  ->  walk C6  ->  demo/m1-c6-captured
```

`demo/m1-c6-start` must be branched from `demo/m1-c5-captured`. Its defining content is the
two-checkpoint split, which walking the inventory demo produces. Cut from the build branch it would
carry the combined milestone instead — the inverse of its own definition.

## Checkpoints that are deliberately identical

`demo/m1-c2-start` and `demo/m1-c2-captured` point at the same commit.

That demo's outcome is a plan and an untouched repository. It produces no diff, because producing one
would mean the planning pass edited files — the failure the demo exists to rule out.

Do not manufacture a change to make them differ. `scripts/check.mjs c2-refs-identical` asserts they
match, and the preflight fails if they diverge.

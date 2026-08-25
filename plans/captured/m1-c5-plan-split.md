# C5 capture — the split plan, after rejection

**RESERVED. Not yet captured.**

Paste the migration plan exactly as Codex produced it after the Step 4 rejection, **before** any
hand-editing. This is the state `demo/m1-c5-captured` is committed from and the state
`demo/m1-c6-start` inherits.

- Date:
- Checkpoint: `demo/m1-c5-captured`
- Codex thread: same as the batched capture
- Attempts to get two checkpoints: 
- If more than one: what the extra checkpoint was, and what the re-prompt asked for: 

```text
[ paste the plan verbatim ]
```

## Acceptance

Exactly two checkpoint entries, each with a scope, one validation command and one rollback point,
and neither combining the route migration with the Express upgrade. That is what
`c5-captured-opens-on-split` asserts:

```bash
node scripts/check.mjs c5-captured-opens-on-split
```

If Codex produced three entries, or two where one still carries both concerns, reconcile the plan
with what was narrated before committing. The demo claims two checkpoints.

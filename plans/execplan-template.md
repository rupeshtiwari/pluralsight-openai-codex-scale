# ExecPlan — <objective>

Copy this file when starting a new multi-step piece of work.

---

## Objective

One sentence. What is being changed, and what must remain true afterward.

## Current state

What exists now, with file paths. Enough that someone who has not read the code can follow.

## Intended changes

A numbered list. Each item small enough to validate on its own.

## Behavior contracts

What is externally visible and must not change: route paths, status codes, response fields,
workflow rules. Name the tests that lock them.

## Validation checks

The exact commands, in the order they run.

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

## Progress log

| # | Change | Validation | State |
|---|---|---|---|
| | | | |

## Deferred work

Out-of-scope items discovered while working. Recorded here rather than implemented.

| Item | Why deferred |
|---|---|
| | |

## Review decision

What was accepted, what was rejected, and why.

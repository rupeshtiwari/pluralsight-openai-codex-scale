# C5 capture — the batched plan, as Codex produced it

The plan of record as it stood at the end of C5 Step 3, before the Step 4 rejection. Steps 1 to 3
do not touch the Milestones section — Step 3's own note says the list it produces is the
exploration and `plans/migration-plan.md` still carries the single unreviewed milestone from the
initial pass — so this entry is byte-identical to the removed lines of
`git diff plans/migration-plan.md` after the split.

Not tidied. The batching is stated plainly, and that is what the demo rejects.

- Date: 2026-08-31
- Checkpoint: `demo/m1-c5-start` at `92f7a9d`
- Codex thread: fresh

```text
### Milestone 1 — Migrate `GET /tickets/:id` to TypeScript on Express 5

Move the route to ESM TypeScript and upgrade Express 4 to Express 5 in the same step.

**Rationale.** The route has to be rewritten for TypeScript anyway. Express 5 replaces the route
matcher with `path-to-regexp` v8, which changes how route patterns are parsed, so the route will
need adjusting for Express 5 regardless. Doing both at once means the route is written once against
its final target rather than being rewritten twice.

| | |
|---|---|
| Scope | `routes/tickets.js` to `routes/tickets.mts`; `express` 4.x to 5.x; `path-to-regexp` route-syntax adjustments |
| Validation | `npm run lint && npm run typecheck && npm run build && npm run test:route && npm test` |
| Rollback point | the commit before this milestone |
```

## What this is evidence for

C5 bullet 4 rejects the milestone that batches a route migration with a dependency upgrade. This
file is the before, and `plans/captured/m1-c5-plan-split.md` is the after. Together they are the
outcome the bullet claims, which is what promotes it from `SEEDED` to `PASS`.

# Module 1 — Refactoring and migrating codebases with Codex

Plan a refactor before editing, execute it under an ExecPlan, then inventory and incrementally
migrate a legacy Express 4 service.

## Demos

| Clip | Demo | Runbook | Preflight |
|---|---|---|---|
| 2 | Map noisy TypeScript modules with Codex before editing | [m1-c2-map-noisy-typescript-modules.md](m1-c2-map-noisy-typescript-modules.md) | [`m1-c2_preflight.txt`](logs/m1-c2_preflight.txt) |
| 3 | Execute a Codex refactor with ExecPlan checkpoints | [m1-c3-execute-codex-refactor.md](m1-c3-execute-codex-refactor.md) | [`m1-c3_preflight.txt`](logs/m1-c3_preflight.txt) |
| 5 | Inventory a legacy Express 4 service with Codex | [m1-c5-inventory-legacy-express4.md](m1-c5-inventory-legacy-express4.md) | [`m1-c5_preflight.txt`](logs/m1-c5_preflight.txt) |
| 6 | Migrate one Express route to TypeScript with framework guidance | [m1-c6-migrate-one-express-route.md](m1-c6-migrate-one-express-route.md) | [`m1-c6_preflight.txt`](logs/m1-c6_preflight.txt) |

## Walkthroughs

Four checkpoints are produced by walking the demos rather than authored ahead of them. The procedure,
the capture points, and the branch-cut guards are in
[walkthrough-c5-c6.md](walkthrough-c5-c6.md).

Run one clip's preflight with `module1/scripts/preflight_check.sh c<N>` — it runs the checks
shared across the module plus that clip's own, and rewrites that clip's transcript. With no
argument every clip runs, which is what you want once per recording session.

Each transcript is a one-page report grouped by the clip's four steps, marking each step READY
or BLOCKED, so it can be read on its own without the terminal. Raw command output for the same
run sits beside it as `<clip>_preflight.full.txt`.

## Source

- Modern service — [../supporthub-api/modern/](../supporthub-api/modern/)
- Legacy service — [../supporthub-api/migration/](../supporthub-api/migration/)
- ExecPlans — [../plans/](../plans/)
- Framework guidance — [../framework-skill/node-express-migration/](../framework-skill/node-express-migration/)

## Reset

```bash
./module1/scripts/demo_reset.sh
```

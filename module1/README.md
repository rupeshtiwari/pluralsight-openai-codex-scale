# Module 1 — Refactoring and migrating codebases with Codex

Plan a refactor before editing, execute it under an ExecPlan, then inventory and incrementally
migrate a legacy Express 4 service.

## Demos

| Clip | Demo | Runbook |
|---|---|---|
| 2 | Map noisy TypeScript modules with Codex before editing | [m1-c2-map-noisy-typescript-modules.md](m1-c2-map-noisy-typescript-modules.md) |
| 3 | Execute a Codex refactor with ExecPlan checkpoints | [m1-c3-execute-codex-refactor.md](m1-c3-execute-codex-refactor.md) |
| 5 | Inventory a legacy Express 4 service with Codex | [m1-c5-inventory-legacy-express4.md](m1-c5-inventory-legacy-express4.md) |
| 6 | Migrate one Express route to TypeScript with framework guidance | [m1-c6-migrate-one-express-route.md](m1-c6-migrate-one-express-route.md) |

## Walkthroughs

Four checkpoints are produced by walking the demos rather than authored ahead of them. The procedure,
the capture points, and the branch-cut guards are in
[walkthrough-c5-c6.md](walkthrough-c5-c6.md).

## Source

- Modern service — [../supporthub-api/modern/](../supporthub-api/modern/)
- Legacy service — [../supporthub-api/migration/](../supporthub-api/migration/)
- ExecPlans — [../plans/](../plans/)
- Framework guidance — [../framework-skill/node-express-migration/](../framework-skill/node-express-migration/)

## Reset

```bash
./module1/scripts/demo_reset.sh
```

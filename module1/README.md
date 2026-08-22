# Module 1 — Refactoring and migrating codebases with Codex

Plan a refactor before editing, execute it under an ExecPlan, then inventory and incrementally
migrate a legacy Express 4 service.

## Demos

| Clip | Demo | Runbook |
|---|---|---|
| 2 | Map noisy TypeScript modules with Codex before editing | [m1-demo2-map-noisy-typescript-modules-with-codex-before-editing.md](demo/m1-demo2-map-noisy-typescript-modules-with-codex-before-editing.md) |
| 3 | Execute a Codex refactor with ExecPlan checkpoints | [m1-demo3-execute-a-codex-refactor-with-execplan-checkpoints.md](demo/m1-demo3-execute-a-codex-refactor-with-execplan-checkpoints.md) |
| 5 | Inventory a legacy Express 4 service with Codex | [m1-demo5-inventory-a-legacy-express-4-service-with-codex.md](demo/m1-demo5-inventory-a-legacy-express-4-service-with-codex.md) |
| 6 | Migrate one Express route to TypeScript with framework guidance | [m1-demo6-migrate-one-express-route-to-typescript-with-framework-guidance.md](demo/m1-demo6-migrate-one-express-route-to-typescript-with-framework-guidance.md) |

## Source

- Modern service — [../apps/api/](../apps/api/)
- Legacy service — [../apps/legacy-ticket-api/](../apps/legacy-ticket-api/)
- ExecPlans — [../plans/](../plans/)
- Framework guidance — [../.codex/skills/express-typescript-migration/](../.codex/skills/express-typescript-migration/)

## Reset

```bash
./module1/scripts/demo-reset.sh
```

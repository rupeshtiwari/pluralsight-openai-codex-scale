# Migration inventory checklist

Complete before proposing any migration plan. A plan built on a partial inventory hides work
that surfaces mid-migration, when rolling back costs the most.

## The six categories

- [ ] **Express routes** — every path, method, status codes, and the middleware each one runs
- [ ] **Data models** — shapes, allowed values, and any state-transition rules
- [ ] **Auth** — how callers authenticate, where it is enforced, and the failure codes
- [ ] **Build tooling** — how the service starts, builds, and is packaged
- [ ] **Tests** — what test runner, what is covered, and what is not
- [ ] **External contracts** — anything a caller depends on that cannot change silently

## Per-category questions

**Routes.** Which routes share middleware? A route slice that looks isolated but shares an auth
middleware is not isolated.

**Data models.** Are validation limits hard-coded or loaded from configuration? Configuration read
relative to `__dirname` will not survive the move to ESM unchanged.

**Auth.** Is auth applied per route or globally? Per-route auth can migrate with its route;
global auth is a platform concern and belongs in the platform checkpoint.

**Build tooling.** Does the target need a build step the source did not have? TypeScript does.
That build is a new failure mode and needs its own validation gate.

Expect the inventory to find `tsconfig.json`, `eslint.config.js`, `vitest.config.mts` and a
`compat/` directory already present. That is tooling and compatibility infrastructure staged ahead
of the work, not evidence that the migration has begun. Confirm it by counting migrated routes:
`ls routes/*.ts` returns nothing until the first route moves.

**Tests.** Does the source use a different test runner than the target? If so, migrating a route
means its tests move runners too — that is part of the route checkpoint, not extra credit.

**External contracts.** For every route: exact path, exact status codes for success and each
error, exact response field names. These are what "no behavior change" is measured against.

## Milestone gate

A milestone is only ready when all of these are true:

- [ ] it changes one thing — either code or platform, never both
- [ ] it can be validated on its own by named commands
- [ ] it can be reverted on its own, to a named commit
- [ ] the external contract it touches is written down before work starts

If a proposed milestone batches a route migration with a dependency upgrade, split it. The two
fail for different reasons and a red test cannot tell you which half broke.

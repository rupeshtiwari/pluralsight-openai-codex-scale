<!-- markdownlint-disable -->
<!-- Codex rewrites this file on camera and its shape differs every run.
     Bare directive only: any text after the command is parsed as rule
     names, which silently disables nothing. -->

# Migration plan — SupportHub ticket service

Express 4 CommonJS JavaScript to Express 5 ESM TypeScript, migrated in place under
`supporthub-api/migration/`.

---

## Objective

Move the ticket service to Express 5 ESM TypeScript in independently validated milestones,
without changing the external API contract.

## Source and target

| | Source | Target |
|---|---|---|
| Module system | CommonJS | ESM |
| Language | JavaScript | TypeScript |
| Framework | Express 4 | Express 5 |
| Package type | no `type` field | `"type": "module"` |

Both states coexist in this workspace during the migration. Mixed `.js` and `.ts` is the expected
mid-migration condition, not a misconfiguration.

## Inventory

To be produced before any implementation. Every category must be covered.

### Express routes

_Not yet inventoried._

### Data models

_Not yet inventoried._

### Authentication

_Not yet inventoried._

### Build tooling

_Not yet inventoried._

### Tests

_Not yet inventoried._

### External contracts

_Not yet inventoried._

## CommonJS-to-ESM compatibility layer

Concrete boundary code, not description. Full detail in
[docs/commonjs-esm-compatibility.md](../docs/commonjs-esm-compatibility.md).

| Concern | Module | Replaces |
|---|---|---|
| `__dirname` is undefined in ESM | `supporthub-api/migration/compat/dirname.mts` | `path.join(__dirname, ...)` |
| ESM cannot `require()` a CommonJS module | `supporthub-api/migration/compat/legacyRequire.mts` | direct `require()` |

Also in scope: the package cannot declare `"type": "module"` while any `.js` file remains, so
migrated sources are `.mts` and carry ESM in the extension; `require()` becomes `import` with an
explicit `.mjs` extension on relative paths; and the two `module.exports` shapes convert
differently — `module.exports = fn` to a default export, `module.exports = { a, b }` to named
exports. They are not interchangeable, and mixing them fails at runtime rather than at compile
time.

## Behavioral exceptions

Deliberate differences accepted as part of the migration. Full detail in
[docs/behavioral-exceptions.md](../docs/behavioral-exceptions.md).

| Behavior | Express 4 | Express 5 | Decision |
|---|---|---|---|
| Rejected promise in an async handler | Not forwarded; the request hangs unless the handler catches it | Forwarded automatically to the error handler | Accept the Express 5 behavior, and keep the existing explicit error responses so status codes do not change |

## Milestones

Produced by the initial planning pass. **Not yet reviewed.**

One list, one term. A milestone *is* a checkpoint: the unit that is validated independently and
rolled back to. Splitting a milestone replaces its entry here with two entries — it does not create
a second list somewhere else. Rollback visibility lives inside the entry, so every milestone carries
its own rollback point and the plan never shows the same work twice under two names.

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

## Validation checks

Every milestone runs all four gates before it is accepted:

```bash
npm run lint:migration
npm run typecheck:migration
npm run build:migration
npm run test:migration
```

## Progress log

| # | Change | Validation | State |
|---|---|---|---|
| — | — | — | not started |

## Review decision

Pending.

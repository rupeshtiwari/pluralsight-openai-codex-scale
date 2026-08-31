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

### Milestone 1 — Migrate `GET /tickets/:id` to ESM TypeScript on Express 4

Move one route slice across the language and module-system boundary only. Keep `express` on 4.x.
The route may use the existing compatibility modules while the remaining legacy code is still
CommonJS.

| | |
|---|---|
| Kind | Application code only |
| Files touched | `supporthub-api/migration/app.js`; `supporthub-api/migration/app.mts`; `supporthub-api/migration/server.js`; `supporthub-api/migration/server.mts`; `supporthub-api/migration/routes/tickets.js`; `supporthub-api/migration/routes/tickets.mts`; `supporthub-api/migration/tests/tickets.test.js`; `supporthub-api/migration/tests/tickets.route.test.mts`; `supporthub-api/migration/package.json`; `supporthub-api/migration/tsconfig.json` |
| Validation | `npm run lint:migration && npm run typecheck:migration && npm run build:migration && npm run test:route:migration && npm run test:migration` |
| Rollback point | commit `92f7a9d` |
| External contract | `GET /tickets/:id` remains mounted at the same path, still runs `express.json()` before `requireApiKey`, still requires `x-api-key`, still returns `401 { error: "missing_api_key" }`, `403 { error: "invalid_api_key" }`, `404 { error: "ticket_not_found", id }`, or `200` with the ticket response fields `id`, `subject`, `status`, `priority`, `assignee`, `accountId`, `incidentId`, `createdAt`, and `updatedAt`. |

### Milestone 2 — Upgrade Express 4 to Express 5

Change the framework dependency after the route slice already runs as ESM TypeScript. This checkpoint
does not rewrite route behavior; for `GET /tickets/:id`, Express 5's route matcher must preserve the
same externally visible match.

| | |
|---|---|
| Kind | Dependency upgrade only |
| Files touched | `supporthub-api/migration/package.json`; `package-lock.json` |
| Validation | `npm run lint:migration && npm run typecheck:migration && npm run build:migration && npm run test:route:migration && npm run test:migration` |
| Rollback point | commit `feat(migration): migrate GET /tickets/:id to ESM TypeScript on Express 4` |
| External contract | `GET /tickets/:id` continues to match the same URLs and preserve the same middleware order, authentication failures, `404` body, `200` ticket body, and response field names captured in Milestone 1. |

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

# ExecPlan — Legacy ticket service migration

Incremental migration of the SupportHub legacy ticket service, one checkpoint at a time.

---

## Objective

Move the legacy ticket service from CommonJS JavaScript on Express 4 to ESM TypeScript on
Express 5, in independently validated milestones, without changing the external API contract.

## Source and target

| | Source | Target |
|---|---|---|
| Module system | CommonJS | ESM |
| Language | JavaScript | TypeScript |
| Framework | Express 4 | Express 5 |
| Location | `apps/legacy-ticket-api/` | `apps/api/` |
| Package type | no `type` field | `"type": "module"` |

Both remain in the repository during the migration. The legacy service is the source of an
in-progress migration, not dead code.

## Inventory

To be produced before any implementation. Every category must be covered.

### Express routes
_Not yet inventoried._

### Data models
_Not yet inventoried._

### Auth
_Not yet inventoried._

### Build tooling
_Not yet inventoried._

### Tests
_Not yet inventoried._

### External contracts
_Not yet inventoried._

## CommonJS-to-ESM compatibility layer

Concrete boundary code, not description. These modules exist and can be inspected:

| Concern | Compatibility module | What it replaces |
|---|---|---|
| `__dirname` is undefined in ESM | `apps/api/src/compat/dirname.ts` | `path.join(__dirname, ...)` |
| ESM cannot `require()` a CommonJS module | `apps/api/src/compat/legacyRequire.ts` | direct `require()` calls |

Additional compatibility concerns the plan must address:

- `require()` becomes `import`, with an explicit `.js` extension on relative paths
- `module.exports = fn` becomes `export default`; `module.exports = { a, b }` becomes named exports
- the two export shapes are not interchangeable, and mixing them fails at runtime rather than at
  compile time
- the target package declares `"type": "module"`; the legacy package must not

## Behavioral exceptions

Deliberate differences accepted as part of the migration, to be recorded here as they are decided.

| Behavior | Legacy | Target | Accepted because |
|---|---|---|---|
| _None recorded yet._ | | | |

## Milestones

To be produced during planning. Each milestone must be independently validatable and
independently revertible.

| # | Milestone | Validation | Rollback point |
|---|---|---|---|
| _Not yet defined._ | | | |

## Validation checks

Every milestone runs all four gates before it is accepted:

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript type-check
npm run build        # build validation
npm run test:route   # focused route tests
```

## Rollback visibility

The commit to return to if a milestone fails validation.

| Milestone | Rollback commit |
|---|---|
| _Not yet defined._ | |

## Progress log

| # | Change | Validation | State |
|---|---|---|---|
| — | — | — | not started |

## Review decision

Pending.

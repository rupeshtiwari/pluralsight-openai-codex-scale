# ExecPlan — Centralize duplicate ticket-priority normalization

A running record of one bounded refactor: what is intended, what must not change,
how it is validated, what has been done, and what was deliberately deferred.

---

## Objective

Consolidate ticket-priority normalization into a single implementation while preserving
external behavior exactly.

## Current state

Priority normalization is implemented three times, with the same rules copied in each place:

| Site | Form |
|---|---|
| `apps/api/src/utils/priority.ts` | exported `normalizePriority()` |
| `apps/api/src/services/ticketService.ts` | private `toPriority()` |
| `apps/api/src/routes/tickets.ts` | inline branching in the `POST /tickets` handler |

The route-level copy also places business logic in a transport-layer file.

A separate stale helper, `normalizeLegacySeverity()` in `apps/api/src/utils/legacy.ts`,
has no importers.

## Intended changes

1. Make `normalizePriority()` in `utils/priority.ts` the single implementation.
2. Replace the private `toPriority()` in `ticketService.ts` with a call to it.
3. Remove the inline branching from the `POST /tickets` route handler so the route
   passes the raw value through and the service normalizes it.
4. Remove `normalizeLegacySeverity()` once confirmed unreferenced.

## Behavior contracts

These are externally visible and must not change. They are locked by
`apps/api/tests/contracts/`.

- `GET /tickets/:id` responds 200 with exactly these fields: `id`, `subject`, `status`,
  `priority`, `assignee`, `accountId`, `incidentId`, `createdAt`, `updatedAt`
- `POST /tickets` responds 201 on success, 400 with field-level failures on invalid input
- `PATCH /tickets/:id/status` responds 200, or 409 with the allowed target list on an
  illegal transition, or 400 on an unrecognized status
- Priority mapping is unchanged for every accepted spelling:
  `P0`/`critical`/`4` to `urgent`, `P1`/`high`/`3` to `high`,
  `P2`/`medium`/`2` to `normal`, `P3`/`minor`/`1` to `low`,
  unrecognized and missing values to `normal`

## Validation checks

Run all four. Every one must pass before the change is accepted.

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

## Progress log

| # | Change | Validation | State |
|---|---|---|---|
| — | — | — | not started |

## Deferred work

Out-of-scope items discovered while working. Recorded here rather than implemented.

| Item | Why deferred |
|---|---|
| — | — |

## Review decision

Pending.

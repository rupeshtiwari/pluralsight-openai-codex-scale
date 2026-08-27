# ExecPlan — Centralize duplicate ticket-priority normalization

A running record of one bounded refactor: what is intended, what must not change,
how it is validated, what has been done, and what was deliberately deferred.

---

## Objective

Consolidate ticket-priority normalization into a single implementation while preserving
external behavior exactly.

## Current state

Priority normalization is implemented at three sites across two files, with the same rules copied
in each place:

| Site | Form | Reached at runtime |
|---|---|---|
| `supporthub-api/modern/src/utils/priority.ts` | exported `normalizePriority()` | no — nothing imports it |
| `supporthub-api/modern/src/services/ticketService.ts` | private `toPriority()` | no — never called |
| `supporthub-api/modern/src/services/ticketService.ts` | inline, inside `createTicket()` | yes — the only live copy |

The inline copy is the one that matters. `createTicket()` is the busiest function in the service:
every ticket creation path runs through it, and it carries validation, priority normalization,
storage access, and response shaping in a single body. Any change to the duplicated normalization
has to be made inside that function, which is also where the inline storage access lives.

Stale code: `normalizeLegacySeverity()` in `utils/legacy.ts` has no importers, and the private
`toPriority()` and `validateNewTicket()` helpers in `ticketService.ts` stopped being called when
creation began doing both jobs inline. So `toPriority()` is both a third copy of the normalization
and dead code — removing it settles two findings at once, which is why it appears in the table
above and here. `changeStatus()` also carries a branch that can never be reached.

## Intended changes

1. Make `normalizePriority()` in `utils/priority.ts` the single implementation.
2. Replace the inline normalization inside `createTicket()` with a call to it.
3. Remove the unreferenced helpers once confirmed to have no importers:
   `toPriority()`, `validateNewTicket()`, `normalizeLegacySeverity()`.
4. Remove the unreachable branch in `changeStatus()`.

## Behavior contracts

These are externally visible and must not change. They are locked by
`supporthub-api/modern/tests/contracts/`.

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

The commands that prove the behavior contracts above still hold. Recorded in Step 1, run in full
before the change is accepted.

_Not yet recorded._

## Risks

| Risk | Likelihood | If it happens |
|---|---|---|
| A consolidated normalizer changes behavior for an unlisted spelling | Low | The priority contract tests fail; revert and add the missing case before retrying. |
| The cleanup touches the load-bearing function and drags data access with it | **High** | The diff grows beyond the three intended files. Remove the extra work and record it under Deferred work. |
| Removing the stale helper breaks an importer that was missed | Low | Type-check fails immediately; restore the helper and re-check importers. |

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

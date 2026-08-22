# M1 C2 — Map noisy TypeScript modules before editing

Use in Plan mode. This prompt must not produce edits.

```text
Analyze the TypeScript service in apps/api. Do not edit any files.

Produce:
1. A map of the modules under apps/api/src, and which module depends on which.
2. The public behavior this service exposes: every route path, its HTTP status
   codes, and its response field names.
3. Any logic implemented more than once, naming each file it appears in.
4. Any exported function with no importers anywhere in apps/api.
5. Any business logic located in a route handler rather than a service.

Then propose exactly ONE bounded cleanup theme that:
- can be completed without changing any public behavior listed in item 2
- is verifiable by the tests in apps/api/tests/contracts

Do not propose architectural restructuring. Do not introduce new abstractions,
layers, or directories. Do not edit files. Stop after the proposal.
```

## Expected shape of a good response

- names `ticketService.ts` as oversized, with its distinct responsibilities listed
- finds priority normalization in all three of `utils/priority.ts`, `services/ticketService.ts`,
  and `routes/tickets.ts`
- finds `normalizeLegacySeverity` in `utils/legacy.ts` with no importers
- identifies the inline priority branching in the `POST /tickets` handler as misplaced
- proposes consolidating priority normalization, and nothing more

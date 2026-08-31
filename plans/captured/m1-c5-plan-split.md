# C5 capture — the split plan, after rejection

The two checkpoints exactly as Codex produced them after the Step 4 rejection, before any
hand-editing. This is the state `demo/m1-c5-captured` is committed from and the state
`demo/m1-c6-start` inherits.

- Date: 2026-08-31
- Checkpoint: `demo/m1-c5-captured`
- Codex thread: same as the batched capture
- Attempts to get two checkpoints: 1
- If more than one: what the extra checkpoint was, and what the re-prompt asked for: n/a — two came
  back on the first split prompt, with no re-prompting

```text
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
```

## Acceptance

Exactly two checkpoint entries, each with a scope, one validation command and one rollback point,
and neither combining the route migration with the Express upgrade. That is what
`c5-captured-opens-on-split` asserts:

```bash
node scripts/check.mjs c5-captured-opens-on-split
```

If Codex produced three entries, or two where one still carries both concerns, reconcile the plan
with what was narrated before committing. The demo claims two checkpoints.

## One note on the gate

This split was rejected by an earlier `splitPlanHolds`, which required the row to be labelled
`Scope` and matched the Express upgrade by the seed's exact phrasing. Codex wrote `Kind` and
`Files touched`, and *"Upgrade Express 4 to Express 5"*. The check was widened to test what each
row establishes rather than the seed's vocabulary; the plan below is unedited.

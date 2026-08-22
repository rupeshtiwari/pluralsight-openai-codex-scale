# M1 C3 — Execute a bounded refactor under ExecPlan

```text
Implement ONLY the approved cleanup theme recorded in plans/refactor-execplan.md:
centralize duplicate ticket-priority normalization.

Constraints:
- normalizePriority() in apps/api/src/utils/priority.ts is the single implementation
- the private toPriority() in ticketService.ts calls it instead of duplicating it
- the POST /tickets handler stops normalizing inline and passes the raw value through
- remove normalizeLegacySeverity() only after confirming it has no importers

Do not change any route path, HTTP status code, or response field name.
Do not introduce a repository layer, a new directory, or any new abstraction.
Do not reorganize the service architecture.

After implementing, update the Progress log in plans/refactor-execplan.md, and
record anything you chose not to do under Deferred work.

Then run: npm run lint && npm run typecheck && npm test
```

## What to inspect in the diff

The generated diff is expected to contain the bounded cleanup **and** at least one change that
is out of scope. Review every hunk before accepting. Out-of-scope work belongs in the ExecPlan's
Deferred work table, not in this diff.

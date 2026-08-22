# AGENTS.md — SupportHub

Repository instructions for OpenAI Codex.

## What this repository is

SupportHub is a backend support-ticket service. It is **API-only**. There is no frontend,
and none should be created. Two applications live here side by side on purpose:

| Path | Stack | Role |
|---|---|---|
| `apps/api` | ESM TypeScript, Express 5, Vitest | modern service — refactoring target |
| `apps/legacy-ticket-api` | CommonJS JavaScript, Express 4 | legacy service — migration source |

Both are intentionally retained. The legacy service is **not** dead code to be deleted; it is the
source of an in-progress incremental migration.

## Ground rules

1. **Plan before editing.** Map modules, dependencies, and public behavior before proposing changes.
2. **One bounded theme at a time.** Do not bundle unrelated work into a single diff.
3. **Preserve public behavior.** Route paths, HTTP status codes, and response field names in
   `apps/api/tests/contracts/` are contracts. Changing them is a breaking change, never a cleanup.
4. **Architecture migrations are separate tasks.** Introducing a repository layer, moving persistence
   boundaries, or reorganizing service architecture is out of scope for a cleanup. If such a change
   seems warranted, record it in the ExecPlan as deferred work instead of implementing it.
5. **Validate with real commands**, not assertions in prose:
   `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test`.
6. **Never commit secrets.** `.env.local` is git-ignored. Use `.env.example` for shape only.

## ExecPlan pattern

Multi-step work is tracked in `plans/`:

- `plans/refactor-execplan.md`
- `plans/migration-execplan.md`

Each ExecPlan records objective, current state, intended changes, behavior contracts,
validation checks, progress log, deferred work, and the review decision. Update the progress log
as work proceeds; move out-of-scope discoveries into **Deferred work** rather than acting on them.

## Migration guidance

Platform-specific migration guidance lives in
`.codex/skills/express-typescript-migration/`. It is repo-local by design so the workflow does not
depend on an external marketplace skill. Consult it before migrating any route.

Migration direction is fixed:

```
CommonJS JavaScript + Express 4   ->   ESM TypeScript + Express 5
```

Migrate **one route slice at a time**. Never migrate the whole application in one pass.

## Automation fixtures

`automation/` holds deterministic evidence used by the triage workflow: Sentry events, GitHub
context, triage output, Slack and Linear drafts, and run artifacts. These are fixtures with stable
IDs (`evt-1042`, `incident-2001`, `run-3001`). Do not regenerate them with new IDs or timestamps —
downstream steps assert on the exact values.

Slack and Linear actions are **drafts**. Do not send, post, or create real items.

## Technology boundaries

Approved: Node.js 24, TypeScript, Express 4 and 5, Vitest, ESLint, Git, GitHub, Sentry, Slack, Linear.

Do not introduce: React, Next.js, any frontend framework, .NET, ASP.NET Core, or C#.

# M1 C2 — Map noisy TypeScript modules before editing

Two prompts, used in order. Neither may produce edits.

## Step 1 — Map the code

```text
Analyze the TypeScript service in supporthub-api/modern. Do not edit any files.

Produce:
1. A map of the modules under supporthub-api/modern/src, and which module depends on which.
2. The public behavior this service exposes: every route path, its HTTP status
   codes, and its response field names.
3. Any logic implemented more than once, naming each file it appears in.
4. Any exported function with no importers anywhere in supporthub-api/modern.
5. Any business logic located in a route handler rather than a service.

Report your findings only. Do not propose changes yet. Do not edit files.
```

## Step 2 — Constrain to one theme

```text
From those findings, propose exactly ONE bounded cleanup theme that:
- can be completed without changing any public behavior you listed
- is verifiable by the tests in supporthub-api/modern/tests/contracts

State the theme in one sentence, then list the exact files it would change.

Propose one theme only. Do not propose architectural restructuring, new
abstractions, layers, or directories. Do not edit files.
```

## Step 3 — Surface what is out of scope

```text
List anything in your analysis that would change the architecture rather than
remove duplication: new layers, new abstractions, moved persistence boundaries,
or reorganized directories.

For each one, state how many files it would touch and why it is not part of a
duplication cleanup. Do not implement any of them.
```

## Step 4 — Close the pass

```text
Summarize this pass as a reviewable plan:

- the single cleanup theme, in one sentence
- the exact files it will change
- the behavior contracts it must preserve
- the commands that will prove those contracts still hold
- what you identified but deliberately deferred

Do not implement it.
```

## Expected shape of a good response

- names `ticketService.ts` as oversized, with its distinct responsibilities listed
- finds priority normalization in all three of `utils/priority.ts`, `services/ticketService.ts`,
  and `routes/tickets.ts`
- finds `normalizeLegacySeverity` in `utils/legacy.ts` with no importers
- identifies the inline priority branching in the `POST /tickets` handler as misplaced
- proposes consolidating priority normalization, and nothing more

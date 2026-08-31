# C6 — Migrate one Express route with framework guidance

The Run A prompt, saved so the negative control is exact.

**Line 1 is the toggle.** Run A sends this file as-is. Run B sends it with the first line and the
blank line after it removed, and nothing else changed. Retyping either run from the runbook risks
a second difference creeping in, which would make the comparison meaningless.

```text
Read framework-skill/node-express-migration/SKILL.md and follow its guidance.

Migrate ONLY the GET /tickets/:id route inside supporthub-api/migration. This
service migrates in place, so the migrated file belongs in that same workspace.

Before editing, state the exact conversions the skill requires for this slice:
each require() and what it becomes, each module.exports shape and what it
becomes, every __dirname use and what replaces it, and what the skill says about
route params and handler return values.

Then create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript,
reaching the CommonJS service and auth modules through the compat layer already
present in supporthub-api/migration/compat.

It must preserve the legacy behavior exactly:
- x-api-key auth, 401 when the header is missing, 403 when the key is invalid
- 200 with the same nine response fields on success
- 404 with error ticket_not_found for an unknown id

Also create supporthub-api/migration/tests/contracts/ticket-read.route.test.mts
covering all four of those cases, mounting the migrated router on an Express app
built inside the test.

Do not migrate POST /tickets or PATCH /tickets/:id/status.
Do not upgrade or change any dependency.
Do not add a "type" field to any package.json.
Do not modify app.js or routes/tickets.js.
Do not modify plans/migration-plan.md.
Do not create or modify any file under supporthub-api/modern.
```

# C6 — Migrate one Express route with framework guidance

The Run A prompt, saved so the negative control is exact.

**Line 1 is the toggle.** Run A sends this file as-is. Run B sends it with the first line and the
blank line after it removed, and nothing else changed. Retyping either run from the runbook risks
a second difference creeping in, which would make the comparison meaningless.

```text
Read framework-skill/node-express-migration/SKILL.md and follow its guidance.

Migrate ONLY the GET /tickets/:id route from supporthub-api/migration to the modern
service in supporthub-api/modern.

Before editing, state the exact conversions the skill requires for this slice:
each require() and what it becomes, each module.exports shape and what it
becomes, every __dirname use and what replaces it, and what changes about route
params under Express 5.

Then create supporthub-api/modern/src/routes/legacyTickets.ts as ESM TypeScript for Express 5,
and mount it in supporthub-api/modern/src/app.ts under the path prefix /v1.

It must preserve the legacy behavior exactly:
- x-api-key auth, 401 when the header is missing, 403 when the key is invalid
- 200 with the same nine response fields on success
- 404 with error ticket_not_found for an unknown id

Also create supporthub-api/modern/tests/contracts/legacy-route.contract.test.ts covering all
four of those cases.

Do not migrate POST /tickets or PATCH /tickets/:id/status.
Do not upgrade or change any dependency.
Do not modify supporthub-api/migration.
```

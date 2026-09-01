# C6 — the four prompts, saved

Every prompt this clip sends, in the order it sends them, saved so the runbook and the file an
author pastes from cannot drift apart. `c6-prompt-saved` compares them block for block.

**Line 1 of prompt 1 is the toggle.** Run A sends these as-is. Run B sends prompt 1 with its opening
line and the blank line after it removed, and every other prompt byte-identical. Retyping any of
them risks a second difference creeping in, which would make the comparison meaningless.

**Why step 1 is two prompts and not one.** They were one, and two measured runs produced both files
correctly while skipping the conversions entirely — one opened *"Implemented the GET /tickets/:id
migration slice"*, the other *"Done. I added the migrated GET-only router."* A single turn holding
both a *state* and a *create* instruction resolves to the create: the file is the evident
deliverable and everything before it reads as preamble. Splitting the turn makes the reasoning an
output rather than a preface — and the reasoning is the only thing Run A and Run B differ in, since
prompt 2 onward are identical in both.

## Prompt 1 — state the conversions (Step 1)

```text
Read framework-skill/node-express-migration/SKILL.md and follow its guidance.

Answer these before touching anything, in order.

1. State the exact conversions the skill requires to move the GET /tickets/:id
   route out of supporthub-api/migration/routes/tickets.js and into ESM
   TypeScript in that same workspace: each require() and what it becomes, each
   module.exports shape the route depends on and what it becomes, every
   __dirname use and what replaces it, and what changes about route params and
   handler return values.

2. For each conversion above, say what breaks if it is done wrong, and whether
   that break shows up at compile time or at run time.

3. In what order does the skill require the validation gates to run, and what
   does each one catch that the gate before it cannot?

4. This checkpoint migrates the route while the workspace stays on Express 4.
   What does the skill say about doing that upgrade in the same milestone, and
   what is its reason?

Do not create, edit or delete any file yet. Read the repository freely with
read-only commands such as ls, find, rg, sed and cat; do not run tests, builds,
or installs.
```

## Prompt 2 — apply them (Step 1)

```text
Now apply exactly the conversions you listed.

Create supporthub-api/migration/routes/ticketRead.mts as ESM TypeScript, reaching
the CommonJS service and auth modules through the compat layer already present in
supporthub-api/migration/compat.

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

## Prompt 3 — compare against the legacy original (Step 3)

```text
Compare supporthub-api/migration/routes/ticketRead.mts against the legacy
original in supporthub-api/migration/routes/tickets.js.

For each of these, state whether it is identical or different, and if different,
exactly how:
- the response field names and their order
- the status code for success, missing key, invalid key, and unknown id
- the auth mechanism

Then confirm the ESM conversion is complete in the migrated file: no require(),
no module.exports, no __dirname.
```

## Prompt 4 — record the checkpoint (Step 4)

```text
Record in plans/migration-plan.md:

Under Behavioral exceptions: the migrated route is not mounted yet. app.js is
CommonJS and cannot require() an ESM router, so the route is verified against
the contract on its own until the platform checkpoint sets "type": "module".
State that the route path, status codes, response fields, and auth behavior are
unchanged.

Under Milestones: mark checkpoint 1 complete, with the validation commands that
passed, and record the current commit as the rollback point inside checkpoint 2's
own entry. Milestones and checkpoints are one list under one heading. Do not add
a separate rollback section.

Do not start checkpoint 2.
```

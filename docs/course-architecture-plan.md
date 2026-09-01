# OpenAI Codex at Scale — Course & Demo Architecture Plan

Pre-implementation deliverable required by master prompt **§AP**.
Locked against the approved Pluralsight outline (Opportunity ID `b266834d-afaf-4fb1-8cbc-90e8089854bc`).

| Field | Value |
|---|---|
| Course title | OpenAI Codex at Scale |
| Author | Rupesh Tiwari |
| Course slug | `openai-codex-scale` |
| Skill path | OpenAI Codex — placement 2 |
| Level | Beginner |
| Length | 60 minutes — 2 modules x 30 min |
| **Repo (declared in Author Notes)** | **`github.com/rupeshtiwari/pluralsight-openai-codex-scale`** |

## Input status

| Input | Status |
|---|---|
| Master prompt | Received |
| Approved course outline | **Received — all clip titles, durations, LOs locked** |
| Pluralsight standards PDF (terminal colors) | **MISSING** — blocks color tokens in `scripts/fmt.mjs` only (§T) |

Duration arithmetic verified: 3+6+6+3+6+6 = 30 per module, 60 total. 8 demo clips @ 6 min, 4 presentation
clips @ 3 min.

---

## 1. Learning objectives (verbatim from outline)

### TO1 — Apply Codex to plan and execute a codebase refactoring operation using reviewable passes.

- - **EO1a** Construct a refactoring prompt that instructs Codex to map noisy modules, identify dead code, and
  propose one cleanup theme at a time before editing
- - **EO1b** Apply the ExecPlan pattern to maintain a running log of intended changes, behavior contracts, and
  validation checks across a multi-session refactor
- - **EO1c** Evaluate a Codex-generated refactoring diff to confirm that public behavior is preserved and that
  architecture migrations are separated into discrete tasks
- **EO1d** Explain when to use Plan mode before committing Codex to implementation

### TO2 — Demonstrate how to orchestrate a legacy-to-modern stack migration with Codex using incremental checkpoints.

- - **EO2a** Direct Codex to inventory a legacy system's routing, data models, auth, build tooling, tests, and
  external contracts before proposing a migration plan
- - **EO2b** Evaluate a Codex-generated migration plan for compatibility layers, explicit behavioral
  exceptions, and rollback visibility
- - **EO2c** Apply validation checks (lint, type-check, focused tests) after each migration milestone rather
  than batching cleanup
- **EO2d** Use the ASP.NET Core skill or equivalent framework skill to apply platform-specific migration guidance

### TO3 — Apply Codex automations to run recurring bug triage across multiple data sources at team scale.

- - **EO3a** Configure a bug triage automation using the Sentry, Slack, Linear, and GitHub plugins to sweep a
  defined time window
- - **EO3b** Evaluate a Codex-generated triage report for correct P0-P3 prioritization, deduplicated bug
  entries, and evidence-backed recommendations
- **EO3c** Convert a tested manual triage sweep into a scheduled automation using the same thread context
- **EO3d** Apply a routing workflow to draft Slack updates, Linear issues, or GitHub comments after triage approval

### TO4 — Demonstrate how to debug and trace Codex automations

- - **EO4a** Use the Codex review pane to inspect uncommitted diffs from an automation run, including per-hunk
  staging and revert controls

> **ASP.NET Core handling (§B).** EO2d names the ASP.NET Core skill. That string is curriculum-owned and
> is quoted verbatim wherever the LO is displayed. It is **never** implemented: the repo ships the
> Node/TypeScript equivalent, matching the outline's own Clip 6 bullet, *"Apply an equivalent Node.js
> and TypeScript framework skill."* No .NET, ASP.NET Core, or C# enters author-written implementation.

---

## 2. Clip map (locked)

### Module 1 — Refactoring and migrating codebases with Codex (30 min)

| Clip | Type | Title | Min | LOs |
|---|---|---|---|---|
| 1 | Presentation | Plan reviewable refactors with Codex | 3 | TO1, EO1d |
| 2 | **Demo** | Map noisy TypeScript modules with Codex before editing | 6 | TO1, EO1a, EO1d |
| 3 | **Demo** | Execute a Codex refactor with ExecPlan checkpoints | 6 | TO1, EO1b, EO1c |
| 4 | Presentation | Plan a legacy Express migration with Codex checkpoints | 3 | TO2 |
| 5 | **Demo** | Inventory a legacy Express 4 service with Codex | 6 | TO2, EO2a, EO2b |
| 6 | **Demo** | Migrate one Express route to TypeScript with framework guidance | 6 | TO2, EO2c, EO2d |

### Module 2 — Automating and debugging Codex workflows at team scale (30 min)

| Clip | Type | Title | Min | LOs |
|---|---|---|---|---|
| 1 | Presentation | Design reviewable Codex automations at team scale | 3 | TO3 |
| 2 | **Demo** | Run a manual Codex triage sweep across Sentry and GitHub | 6 | TO3, EO3a, EO3b |
| 3 | **Demo** | Schedule Codex triage and route work to Slack and Linear | 6 | TO3, EO3c, EO3d |
| 4 | Presentation | Debug Codex automations through review evidence | 3 | TO4, EO4a |
| 5 | **Demo** | Inspect automation diffs in the Codex review pane | 6 | TO4, EO4a |
| 6 | **Demo** | Trace a failed Codex automation and recover safely | 6 | TO4, EO4a |

**Scope-control risk.** EO4a is the sole enabling objective across M2 C4, C5, and C6. §Q forbids repeated
teaching, so the three clips are separated by function: C4 presents the evidence chain (no demo), C5 teaches
per-hunk staging and revert mechanics, C6 teaches failure tracing and bounded recovery and does **not**
re-teach hunk mechanics.

---

## 3. Demo choreography and LO step mapping

Each demo runs 6 minutes / ~850 narration words / 3-4 major steps (§AK, §AO).
Steps map to the outline's own clip bullets.

### M1 C2 — Map noisy TypeScript modules with Codex before editing

Decision: **What should Codex change first, and what must remain untouched?**

| Step | Action | Outline bullet | LO | Proof |
|---|---|---|---|---|
| 1 | Open service in Codex; map modules, dependencies, public behavior, dead-code candidates | 1 | EO1a | plan lists files + deps + contracts |
| 2 | Constrain Codex to one cleanup theme before editing | 2 | EO1a | single theme proposed |
| 3 | Inspect evidence; reject unrelated architectural changes | 3 | EO1d | rejected items named |
| 4 | Confirm Plan mode produced a bounded reviewable first pass | 4 | TO1, EO1d | `git status` clean — zero edits |

### M1 C3 — Execute a Codex refactor with ExecPlan checkpoints

Decision: **Which generated changes belong in this refactor?**

| Step | Action | Outline bullet | LO | Proof |
|---|---|---|---|---|
| 1 | Create ExecPlan: intended changes, contracts, validation checks, progress | 1 | EO1b | `plans/ExecPlan.md` |
| 2 | Codex implements one bounded pass; run Vitest + TypeScript validation | 2 | EO1b | tests + typecheck green |
| 3 | Inspect diff; confirm public behavior preserved | 3 | EO1c | contract tests pass |
| 4 | Remove bundled architecture migration; log as separate ExecPlan task | 4 | EO1c | deferred-work entry |

### M1 C5 — Inventory a legacy Express 4 service with Codex

Decision: **Is this migration milestone safe enough to validate and roll back independently?**

| Step | Action | Outline bullet | LO | Proof |
|---|---|---|---|---|
| 1 | Inventory routes, models, auth, build tooling, tests, external contracts | 1 | EO2a | 6 categories covered |
| 2 | Review plan for CJS-to-ESM compat layer, behavioral exceptions, rollback | 2 | EO2b | checklist satisfied |
| 3 | Split migration into independently validated milestones | 3 | EO2b | milestone list |
| 4 | Reject the milestone batching route migration with dependency upgrades; split into two checkpoints | 4 | EO2b | 2 checkpoints, no code written |

### M1 C6 — Migrate one Express route to TypeScript with framework guidance

Decision: **Can this migrated route be accepted safely?**

| Step | Action | Outline bullet | LO | Proof |
|---|---|---|---|---|
| 1 | Apply Node/TypeScript framework skill to one route slice | 1 | EO2d | skill guidance visible |
| 2 | Run ESLint, type-check, build, focused Vitest immediately after | 2 | EO2c | 4 green gates |
| 3 | Inspect diff; verify CJS-to-ESM compatibility contract | 3 | EO2c | contract assertion |
| 4 | Record checkpoint for continue-or-rollback | 4 | TO2 | tag recorded |

### M2 C2 — Run a manual Codex triage sweep across Sentry and GitHub

Decision: **Which incidents deserve action, and why?**

| Step | Action | Outline bullet | LO | Proof |
|---|---|---|---|---|
| 1 | Configure Sentry + GitHub evidence, Slack + Linear destinations, time window | 1 | EO3a | sources connected, window set |
| 2 | Run sweep manually so thread context captures evidence | 2 | EO3a | manual run artifact |
| 3 | Inspect report for P0-P3 priority, dedup, evidence-backed recommendations | 3 | EO3b | triage report |
| 4 | Correct weak prioritization or duplicates before promotion | 4 | EO3b | corrected report |

### M2 C3 — Schedule Codex triage and route work to Slack and Linear

Decision: **Which findings should be routed?**

| Step | Action | Outline bullet | LO | Proof |
|---|---|---|---|---|
| 1 | Convert tested manual sweep to scheduled automation, same thread context | 1 | EO3c | scheduled task created |
| 2 | Run scheduled workflow; compare with validated manual pattern | 2 | EO3c | `run-3001` vs baseline |
| 3 | Approve selected findings before drafting | 3 | EO3d | approval gate |
| 4 | Verify Slack and Linear drafts preserve evidence and priority | 4 | EO3d | draft payloads match |

### M2 C5 — Inspect automation diffs in the Codex review pane

Decision: **Which hunks should survive review?**

| Step | Action | Outline bullet | LO | Proof |
|---|---|---|---|---|
| 1 | Open automation run with uncommitted changes; inspect diff in Codex review pane | 1 | EO4a | review pane open |
| 2 | Review changed files and hunks against triage evidence | 2 | EO4a | evidence linked to hunks |
| 3 | Stage valid hunks individually; revert unrelated/incorrect hunk | 3 | EO4a | hunk-level controls used |
| 4 | Confirm only approved changes remain | 4 | EO4a | `git diff --cached` clean |

### M2 C6 — Trace a failed Codex automation and recover safely

Decision: **What failed, and what should be rerun?**

| Step | Action | Outline bullet | LO | Proof |
|---|---|---|---|---|
| 1 | Start from failed result; trace source evidence, generated change, validation outcome | 1 | EO4a | evidence chain |
| 2 | Isolate the incorrect hunk rather than discarding the run | 2 | EO4a | scoped isolation |
| 3 | Revert bad change, preserve valid work, rerun with corrected context | 3 | EO4a | `run-3003` |
| 4 | Verify recovered run produces clean reviewable diff | 4 | EO4a | clean diff |

---

## 4. Monorepo tree

```text
pluralsight-openai-codex-scale/
  README.md  AGENTS.md  .env.example  package.json  package-lock.json
  setup-macos.sh                      # wrapper -> env-setup/

  supporthub-api/
    modern/                           # TypeScript · ESM · Express 5 — refactor target
      src/routes/tickets.ts           # thin; params typed Request<{ id: string }>
      src/services/ticketService.ts   # load-bearing createTicket (intentional)
      src/utils/priority.ts           # the duplicate normalization site
      src/utils/legacy.ts             # normalizeLegacySeverity — dead code
      src/middleware/requestId.ts  src/models/ticket.ts
      src/compat/{dirname,legacyRequire}.ts
      src/app.ts  src/server.ts
      tests/contracts/                # public behavior lock — 25 tests
    migration/                        # CommonJS · JavaScript · Express 4 — migrates in place
      app.js  server.js  routes/  services/  models/  auth/  config/  tests/
      compat/{dirname,legacyRequire}.mts  # ESM by extension — no route has migrated
      package.json                    # no "type": "module"
      eslint.config.js                # CommonJS: the package is CJS
      tsconfig.json                   # allowJs true, checkJs false
      vitest.config.mts               # passWithNoTests true

  automation/
    sentry-fixtures/  github-seed/  triage/
    slack-drafts/  linear-drafts/  runs/

  plans/    ExecPlan.md  execplan-template.md  migration-plan.md
    prompts/                          # one copy-paste Codex prompt per demo
  framework-skill/node-express-migration/SKILL.md

  module1/  README.md  m1-c{2,3,5,6}-<clip-title>.md
            scripts/  logs/
  module2/  README.md  m2-c{2,3,5,6}-<clip-title>.md
            scripts/  logs/

  scripts/  fmt.mjs  json.mjs  check.mjs  check-attribution.sh
  docs/     triage-rubric.md  migration-inventory-checklist.md
            troubleshooting.md
            commonjs-esm-compatibility.md  behavioral-exceptions.md
            demo-reset-guide.md  integration-readiness.md
            validation-matrix-module1.md  course-architecture-plan.md
  data/payloads/
  env-setup/  setup.sh
```

Runbook filenames use **clip numbers**, not sequential demo numbers, so a filename maps directly
onto the outline. Demos sit at clips 2, 3, 5, and 6 in both modules, which is why the runbooks are
`m1-c2`, `m1-c3`, `m1-c5`, `m1-c6` and never `m1-demo1..4`. Numbering them sequentially would
force a translation step every time a filename is checked against the outline, and that translation
is exactly where an off-by-one hides.

`supporthub-api/` holds two workspaces rather than one because the course carries two codebases at
once: `modern/` is what Module 1 refactors, and `migration/` is what it migrates *from*. They are
siblings under a single product name so the demos never suggest two unrelated products. Every
per-module script lives under its own module — `module1/scripts/`, `module2/scripts/` — so a reset
or preflight cannot be run against the wrong module by accident. Repository-wide helpers stay in
the root `scripts/`. There is no Python: `fmt.mjs` and `json.mjs` are Node, so Node 24 is the only
runtime a learner installs.

---

## 5. Checkpoint branches

`main` = stable learner-facing branch. 16 demo branches, frozen after choreography lock.

| Start branch | Working-tree state at record time |
|---|---|
| `demo/m1-c2-start` | noisy API, all tests green, zero edits |
| `demo/m1-c3-start` | m1-c2-complete + approved cleanup theme in ExecPlan |
| `demo/m1-c5-start` | legacy Express 4 service present, untouched |
| `demo/m1-c6-start` | split checkpoints recorded, skill installed, no route migrated |
| `demo/m2-c2-start` | fixtures seeded, no triage run yet |
| `demo/m2-c3-start` | validated manual triage baseline present |
| `demo/m2-c5-start` | `run-3001` produced — 2 uncommitted hunks, 1 valid 1 invalid |
| `demo/m2-c6-start` | `run-3002` failed run committed as evidence |

Each has a matching `-complete` branch reproducing the exact accepted end state.

---

## 6. Deterministic fixtures

| ID | Role | Users | Occurrences | Teaching function |
|---|---|---|---|---|
| `evt-1042` | high-impact error | 412 | 1,204 | the genuine P1 |
| `evt-1043` | duplicate of 1042 | 88 | 305 | must be merged by operator |
| `evt-1088` | low-impact noisy | 3 | 890 | high count, low impact — tests rubric |
| `evt-1099` | thin evidence | 2 | 4 | insufficient evidence — deferred |
| `incident-2001` | group for 1042+1043 | — | — | dedup target |
| `incident-2002` | P1-vs-P2 ambiguity | 61 | 140 | forces rubric judgment |

GitHub: commit `a1b2c3d` is the genuine root cause; commit `d4e5f6a` is an unrelated dependency bump
landing **closer in time**. Issue `#17` is GitHub-only evidence proving integration retrieval.
Lesson enforced: *latest commit != root cause*.

Runs: `run-3001` (valid + invalid hunk, M2 C5) · `run-3002` (failed, wrong correlation, M2 C6) ·
`run-3003` (corrected rerun, clean).

Timestamps generate relative to a pinned base date so fixtures always fall inside the demo query window.

---

## 7. Integration prerequisites (all prebaked, §AL)

| Service | Prebaked | Demo-time role | Used by |
|---|---|---|---|
| Codex Desktop | ChatGPT Business workspace, repo open | primary app | all |
| Git / GitHub | branches, tags, issue #17, integration authorized | checkpoints + change evidence | all / M2 |
| Node 24 LTS | installed, `npm install` complete | runtime | M1 |
| Sentry | demo project, DSN, read-only token | error evidence | M2 C2/C3 |
| Slack | `#supporthub-demo` | draft destination | M2 C3 |
| Linear | demo team + project | draft destination | M2 C3 |
| Framework skill | repo-local, not marketplace | migration guidance | M1 C6 |

`SENTRY_DSN` sends application events; `SENTRY_AUTH_TOKEN` performs read-only API lookup.
Values live only in `.env.example` and are never printed.

---

## 8. PASS / FAIL per demo

| Demo | PASS | FAIL |
|---|---|---|
| M1 C2 | plan names files/deps/contracts; one theme; tree clean | any file edited, or >1 theme |
| M1 C3 | Vitest + typecheck green; diff = cleanup only; drift deferred | architecture change still in diff |
| M1 C5 | 6 categories; compat named; batched milestone rejected; 2 checkpoints | milestone accepted batched, or code written |
| M1 C6 | 4 gates green; one route; contract preserved; tagged | >1 route touched, or any gate red |
| M2 C2 | duplicates merged; priority evidence-grounded; correlation corrected | output accepted uncorrected |
| M2 C3 | scheduled run completes; evidence preserved; only approved routed | anything auto-sent without approval |
| M2 C5 | valid hunk staged; invalid absent; no unrelated files | file-level staging used |
| M2 C6 | cause identified; bad hunk reverted; valid work kept; rerun clean | valid work lost, or rerun still wrong |

---

## 9. Reset strategy

1. **Branch checkpoint** — `git checkout demo/m1-c6-start` restores the exact start state.
2. **`demo_reset.sh`** — restores tree, fixtures, checkpoint files, run artifacts, ExecPlan start content;
   verifies dependency integrity without reinstalling; prints readiness verdict.
3. **`preflight_check.sh`** — runs every demo step in README order, prints each command, captures output,
   marks PASS/FAIL, explains why failures matter and how to fix them, suggests an exact Codex remediation
   prompt, writes plain-text log to `moduleN/logs/`, ends with a recordability verdict.

---

## 10. Runbook fence convention

A runbook mixes prose, commands, Codex prompts and expected output. On recording day the author
copies from it under time pressure, so what is safe to paste has to be obvious at a glance.

| Fence | Meaning | Safe to paste |
|---|---|---|
| ```bash | commands to run in a terminal | yes, into a shell |
| ```text under **Prompt.** | a Codex prompt | yes, into Codex — never into a shell |
| ```text under **Expected output.** or **Expected result.** | what you should see | no, read only |

**A fenced block never holds an illustration.** Wrong output, broken markup, a before-and-after
example — those go in prose or an indented block. A fence reads as something to run, and a line
beginning with `>` or `|` pasted into a shell is a redirect or a syntax error, not a demonstration.
That is not hypothetical: three junk files were created in one session that way, from output that
was only ever meant to be read.

**No diagram uses an ASCII arrow.** `->` contains `>`, so pasting a line like
`walk C5 -> m1-c5-captured -> m1-c6-start` into a shell performs three redirects and silently creates
three empty files named after the steps. Write `→` instead: it renders the same and is inert if it
reaches a prompt. This one cost a cleanup mid-session, from a chain that only ever described a
dependency order.

The same rule applies to anything printed by a script. `demo_reset.sh` prints its remediation
commands bare, without the `>` value prefix every other line carries, for exactly this reason.

`scripts/check.mjs doc-links-resolve` asserts the mechanical half — that every markdown link and
every repository-rooted path in backticks resolves. The paste-safety half is a convention, enforced
by review.

## 11. What a prompt may forbid

**Forbid writes, not reads.** A prompt constraint has to name the thing it is actually protecting.
Every planning demo protects two properties — the working tree stays clean, and no minute of the
clip is spent watching a test suite run — and neither of those is "no commands".

The case that produced this rule: clip 2's Step 1 said *do not edit any files and do not run any
commands*. The second clause was written to stop `npm test`, which Codex had run unprompted in an
earlier walk. Codex read it as written and refused the step:

  I can't produce reliable findings from the current context alone. Because you explicitly said
  do not run any commands and do not edit files, I won't inspect the repo via shell.

That is a correct reading. `ls`, `rg` and `cat` are commands, and clip 2 is a demo about analysing
a real repository — with the repository closed there is nothing to analyse. The ban was aimed at
writes and cost the demo its reads.

So the constraint is stated in two halves, permission first:

  Read the repository freely with read-only commands such as ls, find, rg, sed
  and cat. Do not edit any files, and do not run tests, builds, installs, or any
  command that writes to the working tree.

**Permission has to be explicit.** Deleting the ban is not enough. Silence next to *do not edit any
files* is what Codex generalised from in the first place, and a model that guesses conservatively
about its own permissions guesses in the direction that loses the demo. This is the same shape as
the framework-skill rule in clip 5: omission is not a constraint, and omission is not a licence
either — whichever way you need it read, say it.

Both halves are asserted by `scripts/check.mjs prompts-allow-read-only-inspection`: no prompt block
anywhere in the repository may ban commands outright, and clips 2 and 5 must each carry the
permission sentence in a prompt. Clip 3 and clip 6 legitimately tell Codex to run gates, so the
check keys on the blanket phrasing rather than on the presence of commands.

**A prompt saved in two places drifts.** The runbooks name `plans/prompts/` copies by path, so
either is a plausible paste source under time pressure. That drift had already happened here
unnoticed — the runbook carried the command ban and the saved file did not — so both copies are
asserted byte-identical, by `c2-prompts-saved` and `c6-prompt-saved`.

## 11a. A prompt may not impose the rule a later step audits

Three demos have failed the same way, and it is now the most expensive recurring defect in this
repository. Each time, an early prompt instructed the property that a later step exists to catch
being broken — so the agent complied, and the later step found a clean artifact and nothing to
decide.

| Clip | The instruction | The step it disarmed |
|---|---|---|
| 5 step 2 | referenced the framework skill, whose first rule forbids batching a route migration with a dependency upgrade | step 4, which must find that batch |
| 3 step 2 | *"Do not introduce a repository layer, a new directory, or any new abstraction"* | step 4, which removes the architecture Codex bundled in |
| 5 step 3 | *"change one thing, not several"* | step 4 again, which audits milestones for exactly that |

**The test to apply to every prompt: does any later step in this clip exist to catch a violation of
what I am about to instruct?** If so, the instruction belongs in the operator's narration after the
finding, not in the prompt before it. It is asserted per clip — `c5-prompts-skill-free`,
`c3-prompt-does-not-preempt-removal`, `c5-step3-does-not-decompose` — because the wording differs
each time and only a clip-specific check knows which rule its own step 4 tests.

**The fix is not the same in every case, and the difference is worth naming.** Ask whether the thing
the later step needs already exists in the artifact:

- **It exists — stop destroying it.** Clip 5's batch is in the plan step 2 produced. Step 3 only had
  to avoid dissolving it, so removing the atomicity rule restores step 4's finding outright.
- **It does not exist — ask for it deliberately.** Clip 3's architectural drift is agent behaviour,
  and no prompt makes an agent over-reach without requesting it. Removing the prohibition raised the
  odds and did not deliver: two measured walks stayed in scope. So the request became an explicit
  operator action, narrated as testing a risk the plan predicted in writing rather than as an
  accident.

Reaching for the second answer when the first would do is what makes a demo look staged. Check the
artifact before deciding.

## 11b. The prompt decides which workspace, so the repository has to agree with it

A prompt is the only thing that tells an agent where to write. Everything else — the plan of
record, a compat layer, a tsconfig `include`, a workspace-scoped npm script — is scenery the agent
never has to look at. When the prompt and that scenery disagree, the prompt wins silently and the
disagreement surfaces later as work in the wrong place.

Clip 6 is the case. Its step 1 prompt said *"Migrate ONLY the GET /tickets/:id route from
supporthub-api/migration to the modern service in supporthub-api/modern"*, and Codex did exactly
that: a new route, a new contract test, and an edit to `modern/src/app.ts`. Nothing about the work
was wrong. It was in the service clip 2 films, whose closing proof is an empty Source Control view,
and it was found on `demo/m1-c3-start` two clips away from where it was produced.

Everything else in the repository said in place: `plans/migration-plan.md`,
`docs/commonjs-esm-compatibility.md`, `migration/package.json`'s own description, migration's
`tsconfig.json` and vitest config, and the compat modules the migrated route depends on. Only the
prompt said otherwise, so only the prompt was obeyed.

**Two things follow, and a workspace constraint needs both.**

- **Name the target path in the prompt, and forbid the other workspace by name.** "Migrate the
  route" leaves the choice to the agent. `supporthub-api/migration/routes/ticketRead.mts` does not,
  and `Do not create or modify any file under supporthub-api/modern.` closes the other door.
- **Prove it in the step's own verification, not two clips later.** Step 1 runs
  `git status --porcelain supporthub-api/modern | wc -l` and requires `0`. A scope breach is then a
  visible failure at the moment it happens, which is the only time it is cheap to fix.

`c6-migrates-in-place` asserts all of it — the target path, the forbidding line, the absence of any
other `supporthub-api/modern` path in the prompt, and the verification that guards it.

**A blocker found in the target workspace is a design question, not a reason to move the target.** The
in-place migration looked impossible at first: `migration/package.json` cannot declare
`"type": "module"` while any CommonJS `.js` file remains, so `tsc` emitted CommonJS and
`moduleDir(import.meta.url)` typechecked without being able to run. Retargeting to the other
workspace made that go away, and took the plan of record, the compat layer and the checkpoint split
out of the story with it. The actual answer was one extension: ESM is carried by `.mts` rather than
by the package field, each migrated file opts itself in, and every piece of scenery becomes load
bearing again.

## 11c. An assertion tests a shape, never the wording it first saw

Three checks in this repository have now failed the same way. Each was written by reading the
seeded artifact and copying a string out of it, so each passed for as long as nothing changed and
gave a wrong answer the first time a real Codex run phrased the same thing differently.

| Assertion | Copied from the seed | What a measured walk wrote | Result |
|---|---|---|---|
| `splitPlanHolds` required row | the literal `Scope` row label | a `Kind` row plus a `Files touched` row | rejected a correct split |
| `splitPlanHolds` upgrade test | `/express.{0,4}4\.x to 5\.x/i` | *"Upgrade Express 4 to Express 5"* | **silently could not detect its own condition** |
| C6 prepare block | `grep -c '^### Checkpoint'` | `### Milestone` | printed `0` beside its own expected `2` |
| C6 step 3 verification | `grep -c "expect(res.status)"` | `expect(response.status)` | printed `0` on a correct run, on camera |
| C6 step 4 verification | `grep -A4` past a heading | an exception recorded below line 4 | printed the intro and stopped, on camera |
| C3 step 4 verification, twice | `grep -A6`, `grep -A3` into `plans/ExecPlan.md` | whatever Codex writes there | found by sweeping, before it cost a take |

The second is the dangerous shape. A check that rejects a correct artifact is loud and gets fixed
in minutes; a check that cannot see the state it exists to catch stays green and is believed. Both
came from the same habit.

**The test to apply: if the artifact is produced by an agent, ask what the assertion would do if the
agent phrased it differently — because it will.** Assert the property the row establishes, not the
label above it. `| Scope |`, `| Files touched |` and `| Files |` all answer *what does this
checkpoint touch*, and any of them satisfies the check now.

**A count is only checkable against a stated state.** `runbook-plan-greps-resolve` evaluates every
runbook `grep -c '^### X' <file>  # must be N` against that file on the branch the clip's AUTHOR
PREP table declares as its starting checkpoint — not against the working tree, where the same grep
gives a different and equally correct answer. That is what makes an expected count assertable at
all.

### Who writes the file decides what you may assert about it

The fourth instance is the one worth generalizing from, because it was in a step verification an author
runs on camera rather than in a check. All four status codes were asserted, one each, exactly as the
runbook said — and the grep returned `0`, because Codex had named the variable `response`.

Five of the six greps in these runbooks target `plans/` files **this repository** authors, where a
heading is a fixed shape. Only the ones aimed at what an **agent** produces are coin flips, and only
there did an identifier get into the pattern.

| In a file the repo writes | In a file the agent writes |
|---|---|
| headings, section names, seeded row labels | status codes, response field names, error strings, route paths |
| — | **never**: variable names, matcher choice, `.status` against `.statusCode`, import style, quote style |

Everything in the right-hand column is in the prompt and the behavioral contract. Everything
excluded is a choice the agent makes freshly each run, and asserting on it is asserting on a coin
flip. `agent-file-greps-assert-contract-values` fails any on-camera grep that aims a
receiver-property pattern at either artifact C6 creates.

**Length is one of those choices, and it is the easiest to miss.** `grep -A4 "## Behavioral
exceptions"` printed the heading and two intro lines and stopped, because the exception Codex had
just recorded sat below line 4 — a correct run and a run that recorded nothing looked identical on
camera. `-A4` is the line-count equivalent of grepping for a variable name: a guess about how much
an agent will write. Print the whole section instead, however long it turns out to be:

```bash
awk '/^## /{p = /^## Behavioral exceptions/} p' plans/migration-plan.md
```

Sweeping every runbook for the shape found two more, both in C3 against `plans/ExecPlan.md` —
an ExecPlan recording five gates instead of four would have been truncated the same way.
`no-fixed-offsets-into-agent-files` fails any on-camera `-A`, `-B` or `-C` offset aimed at a path
that clip's own prompts ask Codex to write, which is how it tells an agent-written file from a
seeded one without being told.

**And this is why the negative case is not optional.** Reading any of the four would not have
revealed the defect; only writing down the condition each exists to detect, and watching it go red,
does. See `scripts/check-negatives.mjs`.

## 11d. A turn that produces an artifact will not also produce reasoning

C6 step 1 asked for the conversions and then for the files, in one prompt. Twice, Codex produced
both files correctly, passed all five gates, and said only *"Implemented the GET /tickets/:id
migration slice"* — the second time, *"Done. I added the migrated GET-only router."* No conversions,
and none of the three registered tells.

The instinct is to blame ordering and move the sentence earlier. That does not survive contact:
`Then create ...` is still in the same turn. **When a turn contains something to hand back, the
hand-back becomes the answer and everything else becomes preamble to compress.** Asking for
reasoning and an artifact together gets the artifact, every time, and the reasoning arrives as a
summary of what was done rather than as the thinking that decided it.

**So reasoning you intend to show gets its own turn, and that turn is forbidden to write.**

```text
State the exact conversions the skill requires ...

Do not create, edit or delete any file yet.
```

Then, separately: *"Now apply exactly the conversions you listed."*

Two things fall out of this beyond the clip.

**The step's own verification gains a checkpoint.** `git status --short -- ':!plans/prompts'` runs
after the first prompt as well: a turn asked to reason and forbidden to write must leave the tree
clean, and one that writes has already collapsed back into the old shape.

**Retired, and the rule outlives it.** C6 once carried a skill-on / skill-off comparison, and the
strongest argument for splitting the turn was that prompt 1 became its only measurement surface.
That comparison is gone — three runs produced no reasoning unique to the skill in either direction.
The split stays, because its first reason was never the control: a combined turn returned correct
files and no conversions twice, and the conversions are the step's Highlight whether or not anything
is being measured.

Structurally this costs nothing. C5 already sends eight prompts across four steps and C2 four —
more turns inside a step is the existing shape, and agent waits are edited out of the recording, so
a six-minute clip is unaffected. What changes is that the Highlight is on screen alone instead of
absent.

## 12. Nothing unexplained may show a badge on camera

**Before recording, open every file the demo opens and account for every badge on every tab.** A
badge the narration does not explain reads as a defect in the thing being taught, and in a course
about reviewable change it argues against the entire point.

Errors and warnings are not the same problem, and the rule is not the same for both.

**An error badge is never acceptable.** It says a tool could not do its job. Nothing in these
demos is about broken tooling, so an error is always noise, always distracting, and always fixed
before the camera runs.

**A warning badge is an error badge in a friendlier colour.** Yellow does not read as "this is
fine" to someone watching a screen for six minutes; it reads as something wrong that nobody
mentioned. Every workspace opened on camera lints completely silent — **zero errors and zero
warnings** — and `scripts/check.mjs workspace-lint-silent` measures exactly that, counted from
`--format json` rather than from a printed summary.

Clip 2 is the case that forced the rule. Its seed leaves `toPriority` and `validateNewTicket` dead
in `ticketService.ts`, and `@typescript-eslint/no-unused-vars` reported both, holding a yellow
badge on the tab for the entire clip.

**Where the suppression lives is the whole question.** The obvious fix is an `eslint-disable`
comment above the seed, and it is the wrong one: that comment sits two lines above `toPriority`
and says *this is unused* in the exact file the learner is watching Codex analyse. It gives away
the finding Step 1 exists to produce. Nothing in `src/` may be annotated —
`scripts/check.mjs c2-seed-shape` fails if an `eslint-disable` appears in the source.

The rule is turned off in `supporthub-api/modern/eslint.config.js` instead, matching
`"noUnusedLocals": false` in the tsconfig beside it. That is not a workaround bolted on for the
camera: a workspace that deliberately carries dead code as a teaching seed should not run a rule
that flags it, and the typechecker was already configured that way. Off workspace-wide rather than
scoped to `ticketService.ts`, because a file-scoped exemption naming that one file is itself a
pointer to the seed.

**The generalisation.** When a tool is right about the code but the code is right for the demo,
suppress it in configuration, never in the file on screen. Configuration is not on camera; source
is.

**Covered by the preflight where the tool allows it, and by your eyes where it does not.** Two
badge sources have bitten so far and they behave differently:

- **The VS Code ESLint extension** resolved configuration differently from the CLI, so the CLI could
  not see the badge at all. Fixed by pinning `tsconfigRootDir`; the preflight now asserts the pin
  and the silence, but the badge itself stays unmeasurable.
- **markdownlint** reads the same `.markdownlint.json` as its CLI — but sharing a config file is not
  the same as agreeing. The extension validates that config against a schema and, when it fails
  validation, falls back to defaults without saying so. Five `"//"` comment keys holding strings did
  exactly that: the CLI reported nothing and the editor reported 590 errors on the same bytes.

**Identify the badge source before writing a suppression for it.** A file showed 491 problems with
markdownlint reporting zero, so the badge had clearly moved to a spell checker — and a
`<!-- cspell:disable -->` went into both filmed files on that inference alone. The extension
installed is **Spell Right**, which does not read cspell directives. The directive suppressed
nothing, sat in a file that appears on camera doing nothing, and `oncamera-markdown-lint-silent`
went green while the editor showed 493. A suppression written for the wrong tool is worse than none:
it looks like the problem was handled.

**A directive only suppresses the tool that reads it.** `markdownlint-disable` is not a general
"stop linting this file" instruction, and neither is any other. Before writing one, name the
extension, confirm it honours that directive, and confirm the effect.

**A config is scoped to a location.** `.markdownlint.json` sits at the repository root, so it governs
files inside the repository and nothing else. A copy of a runbook opened from a content folder
elsewhere on disk inherits none of it and lints against markdownlint's defaults — 186 findings on a
file that reports zero in place. If you keep working copies outside the repository, put a copy of
the config beside them or point the extension's setting at this one; there is no repository-side fix
for a file the repository cannot see.

That badge was worth having. Chasing it found 46 real defects inside the repository, because
`lint:md` had only ever covered the two on-camera plans: headings with no blank line under them,
lists with none above, and two rows of the negative-case roster orphaned out of their table by a
stray blank, which is why they rendered as loose text. `all-docs-lint-clean` now covers every
tracked document.

**Three badge sources so far, and what actually controls each:**

| Source | Shares a config with a CLI? | Control |
|---|---|---|
| VS Code ESLint extension | no — it resolved a different TypeScript root | pin `tsconfigRootDir`; the preflight asserts the pin, not the badge |
| markdownlint | yes — same `.markdownlint.json` | `oncamera-markdown-lint-silent` runs the CLI and fails on any finding |
| Spell Right | **no CLI at all** | disable it for the workspace before recording; nothing in this repository can see it |

The third row is the important one. **A green preflight means the tools with CLIs are quiet, not
that the editor is.** Where no CLI exists, the only control is opening the file and looking before
the camera runs — which is what this section asked for in the first place, and what no amount of
checking replaces.

**Two more rules came out of the markdownlint case, and both are the same rule.**

**Check the artifact as filmed, not as shipped.** The first version of this check linted
`plans/ExecPlan.md` in its reset state, which is the only state the preflight can see. The badge
appears after clip 3 step 1, on tables Codex writes at record time — 518 problems one run, 590 the
next, on the same step of the same demo. A check that inspects the pristine file can never see it.
Where an artifact is generated on camera, test the *shape* of what the generator produces, not the
copy in the repository.

**Assert the effect, never the presence.** Because that shape varies per run, the two on-camera
plans suppress linting inline rather than relying on a config fitted to any one run. The first
directive written for them was `<!-- markdownlint-disable -- Codex rewrites this file... -->`, and it
suppressed nothing: text after the command is parsed as rule names. A check that grepped for the
directive would have passed forever while the editor stayed red. `oncamera-markdown-lint-silent`
now copies each file's real opening lines into a probe, appends markdown that should raise findings,
and requires silence — so it is the suppression being measured, not the string.

The lesson is not "editors cannot be checked". It is **ask whether the extension and a CLI share a
config, and if they do, run the CLI in the preflight.** Assuming they could not is what left
`plans/ExecPlan.md` carrying 518 markdownlint problems — 494 errors — through every clip 3 take,
on a file that is open for all four steps.

Where a badge genuinely cannot be measured, it still gets opened and looked at before recording.

The case that produced this rule: the VS Code ESLint extension put a parsing error on every open
`.ts` tab, reporting that it could not choose between two candidate TypeScript roots, while
`npm run lint` passed and the preflight reported `ESLint: PASS`. The badge would have sat on
`ticketService.ts` for the whole of clip 2 — a demo whose closing proof is that nothing is wrong and
nothing was touched. Fixed by pinning `tsconfigRootDir` in both workspace configs, and asserted by
`scripts/check.mjs eslint-tsconfigrootdir-set`.

The general shape is worth keeping in mind: **the command line and the editor resolve configuration
differently.** A tool passing in the terminal says nothing about what the editor shows, and the
editor is what the learner sees. Where a fix exists, pin the setting so both agree. Where it does
not, resolve the badge before recording or explain it in the narration — never leave it unexplained
on screen.

Also check, in the same pass: no unsaved-file dots, no source-control decorations on unrelated
files, no notification toasts pending, and no extension update prompts.

## 13. Release sanitization checklist

- [ ] `.env.local` absent from history, not just working tree
- [ ] no Sentry / Slack / Linear credential in any commit
- [ ] `.env.example` present with empty values only
- [ ] no personal email in fixtures or docs
- [ ] no private workspace identifiers beyond teaching need
- [ ] all ticket / user / customer data fake and deterministic
- [ ] learner content free of recording, Camtasia, reviewer language (§AE)
- [ ] author-only tooling separated from learner content
- [ ] all 16 branches reproduce from a fresh clone
- [ ] `git log -p | grep -iE 'token|secret|dsn'` returns nothing
- [ ] tech-stack report shows each technology genuinely used, not merely mentioned
- [ ] no .NET / ASP.NET Core / C# in author-written implementation (EO2d text only)
- [ ] `npm audit` clean, or remaining advisories are dev-only and documented

  As of the M1 C2 rehearsal: 5 advisories, all in the dev toolchain — `vitest` (critical, via
  `@vitest/mocker`) and `vite` (high, path traversal in optimized-deps `.map` handling). No runtime
  dependency is affected. Bumping them changes the version banner the demos show on screen, so it
  must happen **after** choreography freezes, with every preflight re-run to confirm the expected
  output still matches.

---

## 14. A negative control has a floor, and its own apparatus is not part of it

**Retired with the comparison it described. Kept because the reasoning is the transferable part.**

C6 once claimed to measure what a framework skill contributes: the same prompt with and without the
skill line, compared for reasoning only the skill contains. Building it surfaced two things worth
keeping.

**A negative control has a floor, and the floor has to be stated.** Asked what it had consulted, a
run named five sources nobody had pointed it at. Four were ambient — `AGENTS.md` carries the
checkpoint rule as a conclusion; the plan, the compatibility doc and the exceptions doc carry the
conversions. The skill-off run was therefore never a no-guidance run, and describing it as one would
have turned a small measured difference into "the skill adds little" when the repository had done
the skill's job.

**The experiment's own apparatus is not part of what is under test.** The fifth source was
`plans/prompts/m1-c6-migrate-route.md`, which opened on the skill line and explained the toggle. The
distinction that licensed moving it aside: hiding `SKILL.md` would have removed the thing under
test, while removing the scaffolding kept the test honest. Ask which of the two a file is before
moving it.

**And the reason it was retired is the third lesson.** Three runs produced no tell in either
direction, and two prompt rewrites chased it. An instrument that never reads is not evidence of
absence — it is an instrument that was never demonstrated to read. The honest end was to stop and
disclose EO2d as demonstrated rather than measured, not to keep reshaping the prompt until the
comparison produced something.

## 15. An agent's account of its work is not the work

**Twice now**, a C6 Run A reported creating both migrated files and passing all five migration
gates — `lint:migration`, `typecheck:migration`, `build:migration`, `test:route:migration` with 4
tests, `test:migration` with 8. Neither file was on disk. `supporthub-api/migration/tests/contracts/`
did not exist. Both replies also described the working tree as carrying modified `package.json`,
`package-lock.json` and `plans/migration-plan.md` — true of the pre-check run earlier that day,
false after the `reset --hard` the runs started from.

The step verification caught it both times, which is the only reason it cost two runs instead of the
clip. But the failure it caught is not the one it was written for: the PASS clause enumerated *wrong
place* and *wrong scope*, and said nothing about *nothing at all*. A confident summary over an empty
diff reads like success, and every later step assumes the files exist.

**A reported gate pass is not a gate pass.** Nothing can have linted, type-checked, built and tested
files that are not on disk, so a green gate list in a reply is not weaker evidence than the files —
it is evidence of nothing, and its specificity (4 tests, 8 tests) is what makes it persuasive.

**So every step that produces an artifact proves the artifact exists, by name, before the reply is
read.** Three properties, in order of how easily each is lost:

1. **A positive existence test**, not only prohibitions. `ls -l <both paths>` prints `No such file or
   directory` per missing path, so *the work did not happen* looks nothing like *the work happened*.
2. **First in the block.** A reply that confident is hard to un-read once it is in your head, so the
   disproof has to reach the screen ahead of it.
3. **The empty case written into the FAIL list**, next to the others, because that list is what an
   author skims for what to worry about.

`c6-step1-proves-its-files-exist` asserts all three. Worth being explicit about what it cannot do:
it cannot assert the two files exist. Before the demo they must not — `no-route-migrated` and the
preflight's *route contract suite starts empty* both require their absence, and that absence is what
makes the step's before-and-after real. A check that runs before the work can only assert that the
runbook will look for the work.

**The fix is to quit and reopen the editor.** Two consecutive C6 Run A attempts reported both files
created and all five gates green while neither file reached disk, and both described a working tree
that had stopped existing at `reset --hard`. A new Codex *thread* did not clear it. Quitting VS Code
entirely and reopening did: the third attempt worked, and Step 1 has been correct since.

So the escalation ladder is short and worth following in order — new thread, then quit and reopen
the editor, then stop. **A third identical run diagnoses nothing.** An agent describing a working
tree you no longer have is not reading your checkout, and no prompt fixes that. Both rungs are
troubleshooting rows in the C6 runbook.

**Related, and the reason this section is short.** Three rules elsewhere are the same instinct
applied to other subjects: the working tree is not evidence, so branch state is verified from a
fresh clone; the tool's printed summary is not evidence, so counts come from `--format json`; and
the skill-off run is never filled in from expectation. This adds the agent's own report to that
list. The general form: **whatever claims the work happened is not what proves it.**

### Exclude the noise; never narrow to the signal

C6's step verifications say `git status --short -- ':!plans/prompts'`. Getting there took two
mistakes in opposite directions, both mine, and the pair is the lesson.

A bare `git status --short` was wrong, because §14 moves `plans/prompts` aside for both runs and the
status then lists three deletions that are apparatus. A PASS clause counting listed paths counts
those.

So I narrowed it to `supporthub-api/` — and the very next run rewrote `plans/migration-plan.md`
(`+10 −7`, Step 4's job done early inside Step 1) while the step reported clean. **The filter I
added to remove noise removed the signal with it.**

The two forms look equally reasonable written down, and one of them is blind. **Exclude what you
know is noise. Never enumerate what you expect to see** — the whole value of `git status` is telling
you about the thing you did not expect, and a positive pathspec throws exactly that away. A
verification narrowed to where you think the work is cannot report work somewhere else, which is the
only failure worth running it for.

`c6-migrates-in-place` now fails an on-camera status that is bare *or* narrowed to any path, and
both are registered negatives. The prepare block's unscoped status is deliberate and runs before the
move.

## Outstanding

1. **Repository rename** — Author Notes declare `pluralsight-openai-codex-scale`; remote is still
   `openai-codex-scale`. The outline is the published source of truth, so the rename is required.
2. **Pluralsight standards PDF** — needed for approved terminal colors in `scripts/fmt.mjs`.
   Structural formatter proceeds without it (§T).

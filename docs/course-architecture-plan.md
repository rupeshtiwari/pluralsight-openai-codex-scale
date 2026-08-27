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

Duration arithmetic verified: 3+6+6+3+6+6 = 30 per module, 60 total. 8 demo clips @ 6 min, 4 presentation clips @ 3 min.

---

## 1. Learning objectives (verbatim from outline)

### TO1 — Apply Codex to plan and execute a codebase refactoring operation using reviewable passes.
- **EO1a** Construct a refactoring prompt that instructs Codex to map noisy modules, identify dead code, and propose one cleanup theme at a time before editing
- **EO1b** Apply the ExecPlan pattern to maintain a running log of intended changes, behavior contracts, and validation checks across a multi-session refactor
- **EO1c** Evaluate a Codex-generated refactoring diff to confirm that public behavior is preserved and that architecture migrations are separated into discrete tasks
- **EO1d** Explain when to use Plan mode before committing Codex to implementation

### TO2 — Demonstrate how to orchestrate a legacy-to-modern stack migration with Codex using incremental checkpoints.
- **EO2a** Direct Codex to inventory a legacy system's routing, data models, auth, build tooling, tests, and external contracts before proposing a migration plan
- **EO2b** Evaluate a Codex-generated migration plan for compatibility layers, explicit behavioral exceptions, and rollback visibility
- **EO2c** Apply validation checks (lint, type-check, focused tests) after each migration milestone rather than batching cleanup
- **EO2d** Use the ASP.NET Core skill or equivalent framework skill to apply platform-specific migration guidance

### TO3 — Apply Codex automations to run recurring bug triage across multiple data sources at team scale.
- **EO3a** Configure a bug triage automation using the Sentry, Slack, Linear, and GitHub plugins to sweep a defined time window
- **EO3b** Evaluate a Codex-generated triage report for correct P0-P3 prioritization, deduplicated bug entries, and evidence-backed recommendations
- **EO3c** Convert a tested manual triage sweep into a scheduled automation using the same thread context
- **EO3d** Apply a routing workflow to draft Slack updates, Linear issues, or GitHub comments after triage approval

### TO4 — Demonstrate how to debug and trace Codex automations
- **EO4a** Use the Codex review pane to inspect uncommitted diffs from an automation run, including per-hunk staging and revert controls

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
    migration/                        # CommonJS · JavaScript · Express 4 — migration source
      app.js  server.js  routes/  services/  models/  auth/  config/  tests/
      compat/{dirname,legacyRequire}.ts   # shims only — no route has migrated
      package.json                    # no "type": "module"
      eslint.config.js                # CommonJS: the package is CJS
      tsconfig.json                   # allowJs true, checkJs false
      vitest.config.ts                # passWithNoTests true

  automation/
    sentry-fixtures/  github-seed/  triage/
    slack-drafts/  linear-drafts/  runs/

  plans/    ExecPlan.md  execplan-template.md  migration-plan.md
    prompts/                          # one copy-paste Codex prompt per demo
  framework-skill/node-express-migration/SKILL.md

  module1/  README.md  m1-c{2,3,5,6}-<clip-title>.md
            m1-c6-framework-skill-evidence.md
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

## 12. Nothing may show an error badge on camera

**Before recording, open every file the demo opens and confirm the tab carries no error or warning
badge.** A badge the narration does not explain reads as a defect in the thing being taught, and in
a course about reviewable change it argues against the entire point.

This is not covered by the preflight, and cannot be: the preflight runs command-line tools, and the
badge comes from an editor extension that resolves configuration differently.

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

## Outstanding

1. **Repository rename** — Author Notes declare `pluralsight-openai-codex-scale`; remote is still
   `openai-codex-scale`. The outline is the published source of truth, so the rename is required.
2. **Pluralsight standards PDF** — needed for approved terminal colors in `scripts/fmt.mjs`.
   Structural formatter proceeds without it (§T).

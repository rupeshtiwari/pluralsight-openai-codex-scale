# SupportHub API

[![Watch on Pluralsight](https://img.shields.io/badge/Watch_on-Pluralsight-FF1675?labelColor=2D2D2D)](https://www.pluralsight.com/courses/openai-codex-scale)

Demo repository for the Pluralsight course **OpenAI Codex at Scale**.

Learn how to put structure around an agent on work too large to review in one sitting: a multi-pass
refactor, a legacy framework migration, and a recurring triage automation that runs when nobody is
watching. Every claim in this course is proved with an API response, a test result, a type-check, a
diff, or a fixture — never by assertion alone.

This repository contains two real Express services and a set of deterministic automation fixtures.
Module 1 needs no external service at all. Module 2 uses the Sentry, GitHub, Slack and Linear
plugins with their setup prebaked, every piece of evidence pinned to a fixture so the same inputs
produce the same decision, and Slack and Linear output drafted to disk rather than sent.

## Table of Contents

- [Learning Objectives](#learning-objectives)
- [Demos — Start Here](#demos--start-here)
- [Why this repository exists](#why-this-repository-exists)
- [One-Time Setup](#one-time-setup)
- [How Demos Work](#how-demos-work)
- [Architecture](#architecture)
- [What is in here](#what-is-in-here)
- [Tech Stack](#tech-stack)
- [Learning Objectives Coverage](#learning-objectives-coverage)
- [API Reference](#api-reference)
- [Deterministic fixtures](#deterministic-fixtures)
- [Validation](#validation)
- [Checkpoints](#checkpoints)

## Learning Objectives

By the end of both modules, you will be able to:

| # | Terminal Objective | What You Do |
|---|---|---|
| **T1** | Apply Codex to plan and execute a codebase refactoring operation using reviewable passes | Map a noisy TypeScript service, bound the agent to one cleanup theme, then execute it under an ExecPlan and reject the hunk nobody asked for |
| **T2** | Demonstrate how to orchestrate a legacy-to-modern stack migration with Codex using incremental checkpoints | Inventory a CommonJS Express 4 service, then migrate one route to ESM TypeScript in place with lint, type-check and focused tests after the milestone |
| **T3** | Apply Codex automations to run recurring bug triage across multiple data sources at team scale | Sweep five Sentry signatures against GitHub context, merge the duplicates, reject the misleading correlation, then schedule it with Slack and Linear kept draft-only |
| **T4** | Demonstrate how to debug and trace Codex automations | Stage an automation's diff hunk by hunk in the review pane, then trace a run whose build and tests both failed and revert only the hunk that broke them |

## Demos — Start Here

Four demo clips per module, each six minutes. Every runbook has copy-paste commands, the exact
prompt to send, expected output, and a recovery path for when the agent answers differently.

| Clip | Demo | What You Prove | Runbook |
|---|---|---|---|
| **M1 C2** | Map before editing | Codex reports 3 duplicate normalization sites, 5 unreferenced exports and 2 dead private helpers → proposes one cleanup theme → the unrelated architectural change is rejected before any file is touched | [m1-c2-map-noisy-typescript-modules.md](module1/m1-c2-map-noisy-typescript-modules.md) |
| **M1 C3** | Execute under ExecPlan | The approved cleanup lands → the diff also carries a change nobody asked for → the ExecPlan record is what lets you tell them apart, hunk by hunk | [m1-c3-execute-codex-refactor.md](module1/m1-c3-execute-codex-refactor.md) |
| **M1 C5** | Inventory the legacy service | Routing, data models, auth, build tooling, tests and external contracts are enumerated from the code → the migration plan is checked for compatibility layers, behavioral exceptions and rollback visibility | [m1-c5-inventory-legacy-express4.md](module1/m1-c5-inventory-legacy-express4.md) |
| **M1 C6** | Migrate one route | One CommonJS route becomes ESM TypeScript in place → status codes, field names and the auth response are proved unchanged by a focused test run, not by inspection | [m1-c6-migrate-one-express-route.md](module1/m1-c6-migrate-one-express-route.md) |
| **M2 C2** | Manual triage sweep | Five error signatures → two merged into one incident, a high-count issue kept below P0, a thin finding deferred, and a dependency bump 17 minutes before the first error rejected as a cause | [m2-c2-manual-triage.md](module2/m2-c2-manual-triage.md) |
| **M2 C3** | Schedule it | The validated sweep becomes a scheduled automation in the same thread → Slack and Linear output is drafted to disk and never sent, so approval stays with a human | [m2-c3-schedule-triage.md](module2/m2-c3-schedule-triage.md) |
| **M2 C5** | Inspect the diff | One run, two hunks: one fixes a real finding, the other lowers the priority threshold the automation is judged against → per-hunk staging accepts one and reverts the other | [m2-c5-inspect-automation-diffs.md](module2/m2-c5-inspect-automation-diffs.md) |
| **M2 C6** | Recover from failure | A run whose build and tests both fail → the failing stack names the file → reverting the one hunk traceable to a mistaken correlation restores green and keeps the legitimate work | [m2-c6-recover-failed-automation.md](module2/m2-c6-recover-failed-automation.md) |

**Start with Module 1 Clip 2.** Each demo begins from its own checkpoint branch, so they can also be
taken out of order.

## Why this repository exists

Codex is good at one-off code changes. Larger work — a multi-pass refactor, a framework migration,
recurring triage across several tools — needs structure, or the agent edits before it understands and
you inherit changes nobody reviewed.

This repository is deliberately built so that structure is visible. The modern service contains real
maintainability problems. The legacy service is mid-migration. The automation fixtures contain
duplicate errors, an ambiguous priority call, and one misleading correlation. You practice deciding
what to accept, what to reject, and what to defer.

## One-Time Setup

A machine with only macOS installed needs one command:

```bash
./env-setup/setup.sh
```

It verifies Homebrew, Node.js 24 LTS, npm, Git, tmux, and Python, installs whatever is missing,
leaves correct existing versions alone, and prints the installed version beside the expected version
for each. It ends with a readiness verdict and writes a full transcript to `env-setup/install.log`.

Then copy the environment template and install dependencies:

```bash
cp .env.example .env.local
npm install
```

`.env.local` is git-ignored and must never be committed. Two Sentry values do different jobs:
`SENTRY_DSN` sends application errors into Sentry, and `SENTRY_AUTH_TOKEN` is a read-only token used
to look issues up. Neither value is ever printed on screen.

## How Demos Work

Each demo is a runbook you follow step by step. Three scripts support them:

```bash
./module1/scripts/preflight_check.sh    # is this module ready to run?
./module1/scripts/demo_reset.sh         # back to a clean starting state
./module2/scripts/preflight_check.sh    # same pair for module 2
./module2/scripts/demo_reset.sh
```

The preflight is the part worth knowing about. It does not check that files exist — it runs the
real gates and reports a per-clip verdict:

```text
PER-CLIP READINESS

  > m2-c2: READY
  > m2-c3: READY
  > m2-c5: READY
  > m2-c6: READY

VERDICT

  > all checks passed

  PASS: Module 2 is ready.
```

Behind that verdict are 66 assertions in `scripts/check.mjs` — that the seeded failure genuinely
fails both gates, that each patch still applies and touches exactly the files its runbook names,
that no prompt can answer with an absolute path, that a demo branch carries nothing the build
branch lacks. Each one is held to a negative case in `scripts/check-negatives.mjs`, which mutates
the repository and requires the check to go red; an assertion nobody has watched fail is not
trusted here.

```bash
npm run check:negatives    # every check is proved to discriminate
```

## Architecture

```text
                       supporthub-api/
                       |
    +------------------+------------------+
    |                                     |
  modern/                            migration/
  ESM TypeScript                     CommonJS JavaScript
  Express 5                          Express 4
  Vitest + ESLint + tsc              Vitest + ESLint + tsc
    ^                                     |
    |                                     |
    +------ incremental migration --------+
             one route per checkpoint
             framework-skill/node-express-migration/

                       automation/
                       |
  sentry-fixtures/ --> triage/ --> runs/ --> slack-drafts/
  github-seed/         rubric      patches   linear-drafts/
                                   + gates   (drafted, never sent)
```

Both applications are kept on purpose. The legacy service is not abandoned code — it is the
starting point of an incremental migration toward the modern one.

## What is in here

| Path | What it is |
|---|---|
| `supporthub-api/modern` | Modern service — ESM TypeScript on Express 5. The refactoring subject. |
| `supporthub-api/migration` | Legacy service — CommonJS JavaScript on Express 4. The migration source. |
| `automation/` | Deterministic Sentry, GitHub, triage, Slack, and Linear fixtures. |
| `plans/` | ExecPlan records for the refactor and the migration. |
| `framework-skill/` | Repo-local framework guidance Codex uses during migration. |
| `module1/`, `module2/` | Runbooks and scripts, one folder per module. |
| `docs/` | Triage rubric and supporting reference. |
| `scripts/` | Readiness checks, their negative cases, and the clip report. |
| `env-setup/` | One-command macOS environment setup. |

Migration guidance lives in [framework-skill/node-express-migration/](framework-skill/node-express-migration/).
It is kept inside this repository on purpose, so the workflow does not depend on an external
marketplace skill that may change. It covers the CommonJS-to-ESM boundary, Express 4 to Express 5
differences, TypeScript conventions, and a route validation checklist.

## Tech Stack

| Component | Version | Purpose |
|---|---|---|
| Node.js | 24 LTS | Runtime for both services |
| TypeScript | 5.6.x | Type-checking and the migration target language |
| Express | 5.1.x (modern) / 4.21.x (legacy) | The version gap the migration closes |
| Vitest | 4.1.x | Test runner, including the focused route suite |
| ESLint + typescript-eslint | 9.15.x / 8.15.x | Lint gate for both workspaces |
| supertest | 7.0.x | HTTP assertions against the route contract |
| npm workspaces | — | Two services, one install, one lockfile |
| tmux | — | Split-screen demo layout |
| markdownlint-cli2 + cspell | 0.18.x / 10.1.x | Runbooks are linted and spell-checked like code |

## Learning Objectives Coverage

| LO | Description | Clip | Demo Proof Point |
|---|---|---|---|
| **1a** | Construct a refactoring prompt that maps noisy modules, identifies dead code, and proposes one cleanup theme at a time before editing | M1 C2 | Counts come back from the code — 3 duplicate sites, 5 unreferenced exports, 2 dead helpers — and no file is edited |
| **1b** | Apply the ExecPlan pattern across a multi-session refactor | M1 C3 | `plans/ExecPlan.md` carries intended changes, behavior contracts and validation checks between sessions |
| **1c** | Evaluate a Codex-generated diff to confirm public behavior is preserved and migrations stay discrete | M1 C3 | The extra hunk is defensible on its own merits, which is why it is rejected against the plan rather than on taste |
| **1d** | Explain when to use Plan mode before committing Codex to implementation | M1 C2 | Plan mode produces a bounded first pass that can be rejected for free |
| **2a** | Direct Codex to inventory routing, data models, auth, build tooling, tests, and external contracts | M1 C5 | Each category is answered from the legacy source, not guessed |
| **2b** | Evaluate a migration plan for compatibility layers, behavioral exceptions, and rollback visibility | M1 C5 | `docs/behavioral-exceptions.md` and `docs/commonjs-esm-compatibility.md` are what the plan is checked against |
| **2c** | Apply lint, type-check and focused tests after each milestone rather than batching cleanup | M1 C6 | `npm run test:route` runs on the one migrated route before the next one starts |
| **2d** | Use a framework skill to apply platform-specific migration guidance | M1 C6 | `framework-skill/node-express-migration/` supplies the Express 4 → 5 and CommonJS → ESM rules |
| **3a** | Configure a triage automation sweeping a defined window across plugins | M2 C2 | The sweep window is fixed in the fixtures, so the same evidence produces the same report |
| **3b** | Evaluate a triage report for correct P0–P3 prioritization, deduplication, and evidence-backed recommendations | M2 C2 | `evt-1042` and `evt-1043` merge into `incident-2001`; the 890-count issue does not become a P0 |
| **3c** | Convert a tested manual sweep into a scheduled automation using the same thread context | M2 C3 | The schedule is created in the thread that proved the sweep, not from a blank prompt |
| **3d** | Apply a routing workflow to draft Slack updates, Linear issues, or GitHub comments after approval | M2 C3 | Drafts land in `automation/slack-drafts/` and `automation/linear-drafts/` — nothing is sent |
| **4a** | Use the review pane to inspect uncommitted diffs, including per-hunk staging and revert controls | M2 C5, M2 C6 | One hunk accepted and one reverted from the same run; then a failed run recovered by reverting only the hunk that broke the gates |

## API Reference

Modern service — `supporthub-api/modern`, ESM TypeScript on Express 5:

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Readiness probe; reports the mounted layer count |
| `/tickets` | GET | List tickets |
| `/tickets/:id` | GET | Fetch one ticket |
| `/tickets` | POST | Create a ticket |
| `/tickets/:id/status` | PATCH | Transition status against the allowed-transition table |
| `/tickets/:id/assign` | POST | Assign a ticket to an agent |
| `/tickets/:id/incident` | POST | Link a ticket to an incident reference |

Legacy service — `supporthub-api/migration`, CommonJS on Express 4. The smaller surface is the
migration's scope, one route per checkpoint:

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Readiness probe |
| `/tickets/:id` | GET | Fetch one ticket |
| `/tickets` | POST | Create a ticket |
| `/tickets/:id/status` | PATCH | Transition status |

## Deterministic fixtures

The Sentry events, GitHub context, and automation runs under `automation/` are fixtures with stable
identifiers such as `evt-1042`, `incident-2001`, and `run-3001`. They are fixed so the same evidence
produces the same triage decision every time you run through a demo, and so nothing depends on live
external data or on a service being reachable.

They are also designed to require judgment:

| Fixture | The judgment it forces |
|---|---|
| `evt-1042` + `evt-1043` | Two signatures, one root cause — merge them or inflate the incident count |
| `evt-1088` | 890 occurrences, three internal agents affected — volume is not severity |
| `evt-1099` | Evidence too thin to act on — defer it rather than guess |
| `commits.json` | A dependency bump 17 minutes before the first error — close in time, not the cause |
| `run-3001.patch` | A fix and a quiet edit to the rubric that judges it, in the same run |
| `run-3002.patch` | A run that genuinely breaks the build and the tests, traceable to one wrong hunk |

Slack and Linear output is **drafted to disk and never sent**. No real channel, workspace, or issue
tracker is touched by any demo in this repository.

## Validation

Every application check is a real command:

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run build        # build validation
npm test             # Vitest
npm run test:route   # focused route tests
```

The same five exist with a `:migration` suffix for the legacy workspace, and `npm run lint:md`
covers the runbooks.

## Checkpoints

Each demo starts from a branch holding the exact state that demo begins from:

```bash
git checkout demo/m1-c2-start
```

| Branch | What it holds |
|---|---|
| `main` | The stable course state |
| `demo/m1-c2-start` … `demo/m1-c6-start` | Starting state for each Module 1 demo |
| `demo/m2-c2-start` | Starting state for the Module 2 triage sweep |
| `demo/m1-c2-captured`, `demo/m1-c5-captured`, `demo/m1-c6-captured` | The result of a recorded walk, kept so a later demo can start where an earlier one ended |

`demo/m1-c6-start` sits on `demo/m1-c5-captured` by design: the migration demo begins from the
inventory the previous demo produced.

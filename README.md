# SupportHub API

Demo repository for the Pluralsight course **OpenAI Codex at Scale**.

SupportHub is the backend service a SaaS customer-support team uses to manage tickets, accounts,
assignment, priority, status, comments, and incident references. It is API-only — there is no
frontend, and none is needed. Every claim in this course is proved with an API response, a test
result, a type-check, a diff, or a fixture — never by assertion alone.

## Why this repository exists

Codex is good at one-off code changes. Larger work — a multi-pass refactor, a framework migration,
recurring triage across several tools — needs structure, or the agent edits before it understands and
you inherit changes nobody reviewed.

This repository is deliberately built so that structure is visible. The modern service contains real
maintainability problems. The legacy service is mid-migration. The automation fixtures contain
duplicate errors, an ambiguous priority call, and one misleading correlation. You practice deciding
what to accept, what to reject, and what to defer.

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
| `env-setup/` | One-command macOS environment setup. |

Both applications are kept on purpose. The legacy service is not abandoned code — it is the
starting point of an incremental migration toward the modern one.

## Setup

A machine with only macOS installed needs one command:

```bash
./env-setup/setup.sh
```

It verifies Homebrew, Node.js 24 LTS, npm, Git, tmux, and Python, installs whatever is missing,
leaves correct existing versions alone, and prints the installed version beside the expected version
for each. It ends with a readiness verdict and writes a full transcript to `env-setup/install.log`.

Then copy the environment template:

```bash
cp .env.example .env.local
```

`.env.local` is git-ignored and must never be committed. Two Sentry values do different jobs:
`SENTRY_DSN` sends application errors into Sentry, and `SENTRY_AUTH_TOKEN` is a read-only token used
to look issues up. Neither value is ever printed on screen.

## Modules

### Module 1 — Refactoring and migrating codebases with Codex

Plan a refactor before editing, execute it under an ExecPlan, then inventory and incrementally
migrate a legacy Express 4 service.

| Demo | Runbook |
|---|---|
| Map noisy TypeScript modules with Codex before editing | [module1/m1-c2-map-noisy-typescript-modules.md](module1/m1-c2-map-noisy-typescript-modules.md) |
| Execute a Codex refactor with ExecPlan checkpoints | [module1/m1-c3-execute-codex-refactor.md](module1/m1-c3-execute-codex-refactor.md) |
| Inventory a legacy Express 4 service with Codex | [module1/m1-c5-inventory-legacy-express4.md](module1/m1-c5-inventory-legacy-express4.md) |
| Migrate one Express route to TypeScript with framework guidance | [module1/m1-c6-migrate-one-express-route.md](module1/m1-c6-migrate-one-express-route.md) |

Source: [supporthub-api/modern/](supporthub-api/modern/) ·
[supporthub-api/migration/](supporthub-api/migration/) · [plans/](plans/)

### Module 2 — Automating and debugging Codex workflows at team scale

Run an evidence-backed triage sweep, promote it to a scheduled automation with approved routing,
then review and recover automation changes that went wrong.

| Demo | Runbook |
|---|---|
| Run a manual Codex triage sweep across Sentry and GitHub | [module2/m2-c2-manual-triage.md](module2/m2-c2-manual-triage.md) |
| Schedule Codex triage and route work to Slack and Linear | [module2/m2-c3-schedule-triage.md](module2/m2-c3-schedule-triage.md) |
| Inspect automation diffs in the Codex review pane | [module2/m2-c5-inspect-automation-diffs.md](module2/m2-c5-inspect-automation-diffs.md) |
| Trace a failed Codex automation and recover safely | [module2/m2-c6-recover-failed-automation.md](module2/m2-c6-recover-failed-automation.md) |

Source: [automation/](automation/) · [docs/triage-rubric.md](docs/triage-rubric.md)

## Framework guidance

Migration guidance lives in [framework-skill/node-express-migration/](framework-skill/node-express-migration/).
It is kept inside this repository on purpose, so the workflow does not depend on an external
marketplace skill that may change. It covers the CommonJS-to-ESM boundary, Express 4 to Express 5
differences, TypeScript conventions, and a route validation checklist.

## Deterministic fixtures

The Sentry events, GitHub context, and automation runs under `automation/` are fixtures with stable
identifiers such as `evt-1042`, `incident-2001`, and `run-3001`. They are fixed so the same evidence
produces the same triage decision every time you run through a demo, and so nothing depends on live
external data or on a service being reachable.

They are also designed to require judgment. The fixtures contain duplicate events with one root
cause, a genuinely ambiguous priority call, a change that is close in time but unrelated to the
failure, and a finding whose evidence is too thin to act on.

## Validation

Every application check is a real command:

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run build        # build validation
npm test             # Vitest
npm run test:route   # focused route tests
```

## Reset

Each module resets to a clean starting state without manual cleanup:

```bash
./module1/scripts/demo_reset.sh
./module2/scripts/demo_reset.sh
```

## Checkpoints

Each demo has a start and a complete checkpoint, so you can jump to the exact state a demo begins
from and follow along:

```bash
git checkout demo/m1-c2-start
```

Branches follow the pattern `demo/m<module>-c<clip>-start` and `demo/m<module>-c<clip>-complete`.
`main` holds the stable course state.

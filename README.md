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
| `apps/api` | Modern service — ESM TypeScript on Express 5. The refactoring subject. |
| `apps/legacy-ticket-api` | Legacy service — CommonJS JavaScript on Express 4. The migration source. |
| `automation/` | Deterministic Sentry, GitHub, triage, Slack, and Linear fixtures. |
| `plans/` | ExecPlan records for the refactor and the migration. |
| `.codex/skills/` | Repo-local framework guidance Codex uses during migration. |
| `module1/`, `module2/` | Runbooks and scripts, one folder per module. |
| `docs/` | Triage rubric and supporting reference. |
| `environment-setup/` | One-command macOS environment setup. |

Both applications are kept on purpose. The legacy service is not abandoned code — it is the
starting point of an incremental migration toward the modern one.

## Setup

A machine with only macOS installed needs one command:

```bash
./environment-setup/install-macos-requirements.sh
```

It verifies Homebrew, Node.js 24 LTS, npm, Git, tmux, and Python, installs whatever is missing,
leaves correct existing versions alone, and prints the installed version beside the expected version
for each. It ends with a readiness verdict and writes a full transcript to `environment-setup/install.log`.

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
| Map noisy TypeScript modules with Codex before editing | [module1/demo/m1-demo2-map-noisy-typescript-modules-with-codex-before-editing.md](module1/demo/m1-demo2-map-noisy-typescript-modules-with-codex-before-editing.md) |
| Execute a Codex refactor with ExecPlan checkpoints | [module1/demo/m1-demo3-execute-a-codex-refactor-with-execplan-checkpoints.md](module1/demo/m1-demo3-execute-a-codex-refactor-with-execplan-checkpoints.md) |
| Inventory a legacy Express 4 service with Codex | [module1/demo/m1-demo5-inventory-a-legacy-express-4-service-with-codex.md](module1/demo/m1-demo5-inventory-a-legacy-express-4-service-with-codex.md) |
| Migrate one Express route to TypeScript with framework guidance | [module1/demo/m1-demo6-migrate-one-express-route-to-typescript-with-framework-guidance.md](module1/demo/m1-demo6-migrate-one-express-route-to-typescript-with-framework-guidance.md) |

Source: [apps/api/](apps/api/) · [apps/legacy-ticket-api/](apps/legacy-ticket-api/) · [plans/](plans/)

### Module 2 — Automating and debugging Codex workflows at team scale

Run an evidence-backed triage sweep, promote it to a scheduled automation with approved routing,
then review and recover automation changes that went wrong.

| Demo | Runbook |
|---|---|
| Run a manual Codex triage sweep across Sentry and GitHub | [module2/demo/m2-demo2-run-a-manual-codex-triage-sweep-across-sentry-and-github.md](module2/demo/m2-demo2-run-a-manual-codex-triage-sweep-across-sentry-and-github.md) |
| Schedule Codex triage and route work to Slack and Linear | [module2/demo/m2-demo3-schedule-codex-triage-and-route-work-to-slack-and-linear.md](module2/demo/m2-demo3-schedule-codex-triage-and-route-work-to-slack-and-linear.md) |
| Inspect automation diffs in the Codex review pane | [module2/demo/m2-demo5-inspect-automation-diffs-in-the-codex-review-pane.md](module2/demo/m2-demo5-inspect-automation-diffs-in-the-codex-review-pane.md) |
| Trace a failed Codex automation and recover safely | [module2/demo/m2-demo6-trace-a-failed-codex-automation-and-recover-safely.md](module2/demo/m2-demo6-trace-a-failed-codex-automation-and-recover-safely.md) |

Source: [automation/](automation/) · [docs/triage-rubric.md](docs/triage-rubric.md)

## Framework guidance

Migration guidance lives in [.codex/skills/express-typescript-migration/](.codex/skills/express-typescript-migration/).
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

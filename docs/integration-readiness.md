# Integration readiness

Module 2 depends on four external integrations. This document records what each is for, what must be
true before recording, and which gates remain open.

**All integration setup is prebaked.** No account creation, OAuth consent, plugin installation or
token management appears on camera.

## What each source is for

```text
Sentry   ->  runtime failure evidence
GitHub   ->  repository and change evidence
Codex    ->  correlation and recommendation
Human    ->  decision
Slack    ->  communication destination
Linear   ->  engineering work destination
```

The distinction that must never blur: Sentry says what broke, GitHub says what changed, and only
evidence connecting them supports a correlation. **The most recent commit is not a root cause.**

## Validation state

| Integration | Purpose | State |
|---|---|---|
| GitHub | change evidence, issue retrieval | **PASS** |
| Sentry — ingestion | events reach the project | **PASS** |
| Sentry — read-only lookup | Codex retrieves a known issue | **PASS** |
| Framework skill | repo-local skill is invocable | **PASS** |
| Same-thread scheduling | manual sweep becomes a scheduled run in the same thread | **OPEN** |
| Slack | routing destination reachable | **OPEN** |
| Linear | routing destination reachable | **OPEN** |

## Gate order

The three open gates are validated in order, and Module 2 fixtures are not built until the first
one clears:

1. **Same-thread scheduling** — the highest-risk gate, and the one with no fallback
2. **Slack**
3. **Linear**

### Why the order matters

The objective requires the scheduled automation to reuse the *same thread context* as the validated
manual sweep. That wording is locked. If the product cannot carry thread context into a scheduled
run, the demo cannot be redesigned around it — that is a **BLOCKING PRODUCT GAP** and a curriculum
conversation, not an implementation problem.

Validate scheduling in a **scratch workspace**, not the demo one. Test schedules created during
validation would otherwise fire against the demo checkpoints later.

## Author preparation

`scripts/verify_integrations.sh` is author preparation. **It is not narrated and does not appear on
camera.** It is run before recording to confirm the environment.

On camera, integration readiness is established inside Codex in compact form:

```text
INTEGRATION READINESS

  > Sentry   read     PASS

  > GitHub   read     PASS

  > Slack    route    PASS

  > Linear   route    PASS
```

## Credentials

Every value lives in `.env.example` as a shape, never a secret. `.env` and `.env.local` are ignored
and must never be committed.

Two Sentry values do different jobs, and the runbook says which in one line each:

| Variable | Job |
|---|---|
| `SENTRY_DSN` | sends application errors **into** Sentry |
| `SENTRY_AUTH_TOKEN` | read-only API access to **look issues up** |

No token value is ever printed on screen.

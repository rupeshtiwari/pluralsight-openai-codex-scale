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
validation would otherwise fire against the demo checkpoints later — a schedule discovering
`demo/m2-c3-start` weeks from now is an ugly surprise.

### Gate 1 procedure

The failure mode is not binary. Check these in order and record the answer to each, because a
partial pass is the likeliest outcome and it is the one that changes the demo:

1. **Can a scheduled task be created from inside an existing thread**, rather than only from a fresh
   one? If scheduling is only ever thread-fresh, the objective's wording cannot be met at all.
2. **Does the scheduled run inherit the corrections made during the manual sweep**, or does it
   re-derive from the prompt alone?
3. **Do the plugins work in the scheduled run** — Sentry read, GitHub read, Slack and Linear write?
   A scheduled run with no plugin access produces a report with no evidence in it.

**Point 2 is the one that matters and the one most likely to disappoint.** EO3c says "Convert a
*tested* manual triage sweep into a scheduled automation using the same thread context." *Tested*
means C2's corrections have to survive into C3. If the scheduled run produces a clean re-derivation
instead, C3's second bullet compares two independent results rather than one carried forward, and
the teaching point changes shape.

**That case is a partial pass, not a clean fail, and §23 does not cover it.** Do not silently
redesign around it and do not file it as a `BLOCKING PRODUCT GAP` either — both would be wrong. Stop
and raise it, because it may be a Curriculum conversation about the word *tested* rather than a
product defect. A clean fail on point 1 is the `BLOCKING PRODUCT GAP` §23 describes.

Record the outcome of all three points here before building any Module 2 fixture, whichever way they
go.

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

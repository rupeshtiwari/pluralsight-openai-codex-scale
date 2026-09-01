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
| Same-thread scheduling | manual sweep becomes a scheduled run in the same thread | **PASS** |
| Slack | routing destination reachable | **PASS** |
| Linear | routing destination reachable | **PASS** |

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

### Gate 1 results

Fill this in during the validation run, not afterwards. Point 2 has three possible answers and they
lead to different decisions, so record which one actually happened rather than pass or fail.

Run 2026-09-01, scratch workspace.

| # | Question | Outcome | Notes |
|---|---|---|---|
| 1 | Scheduled task created from inside an existing thread? | **Yes** | The saved definition references the originating thread three times: *"the same Sentry sweep requested in this thread"*, *"matching the final sweep from this thread"*, *"format the result the same way as before"* |
| 2 | Scheduled run inherits the manual sweep's corrections? | **Inherits fully** | The mid-thread correction is carried verbatim: *"If CODEX_PLUGIN_PROOF_SENTRY_2026 appears and priority is mentioned, treat it as P3/low priority because it has zero affected users."* |
| 3 | Plugins work in the scheduled run (Sentry, GitHub, Slack, Linear)? | **Yes, all four** | Sentry returned a real issue with title, error type and userCount. Slack posted to `#supporthub-demo`. Linear created FUL-6 and reported *"Priority is set to Low, matching the P3 / zero affected users note."* |

**Clean pass. EO3c is met as written**, and C3 bullet 2 compares one result carried forward rather
than two independent ones.

### Two things the run established that were not asked

**The definition carries operational detail nobody prompted for**: read-only Sentry API, the config
path, *"always call Sentry fresh, do not use cached results"*, the production environment, no
`statsPeriod` filter, and a redaction rule covering tokens, DSNs, stack traces, emails and IPs. That
is more than the objective needs, and it is worth knowing it appears without being asked before
narration describes the definition as minimal.

**The plugins render enough in-thread to verify a draft without leaving Codex.** Linear reported the
issue key, a link, and the priority it had set; Slack rendered the message body with a clickable
link. C3 therefore stays a single-surface demo, and its fourth bullet is verified from the in-thread
response rather than by opening Slack or Linear on camera.

**The mid-thread correction was persisted to disk, not only to conversation context** — Codex edited
four files to record it. That changes what a reset between Module 2 takes has to restore, and
`module2/scripts/demo_reset.sh` does not yet know about it. **Which four files is not yet recorded
here, and the reset cannot be designed without it.**

What each point-2 answer means:

| Answer | Consequence |
|---|---|
| **Inherits fully** | Clean pass. EO3c is met as written and C3 bullet 2 compares one result carried forward. |
| **Inherits partially** | Depends on *what* survived. Record specifically which corrections carried and which did not. |
| **Re-derives cleanly** | Partial pass. C3 bullet 2 would compare two independent results rather than one carried forward, changing the teaching point. Stop and raise — this may be a Curriculum conversation about the word *tested*, not a product defect. |

A clean fail on point 1 is the `BLOCKING PRODUCT GAP` section 23 describes. Everything else is a
conversation before a decision.

Record the outcome of all three points here before building any Module 2 fixture, whichever way they
go.

## Author preparation

**There is no verification script yet.** A script at scripts/verify_integrations.sh was referenced
here as author preparation but was never written, so anyone following this document went looking for
a file that does not exist. Its name is written without backticks above because it is not a path in
this repository, and writing it as one is what let the gap sit unnoticed.

It is deliberately still unwritten. What it would assert depends on gate 1: until the same-thread
scheduling behaviour is known, a script that reports "integrations ready" would be asserting on a
contract nobody has confirmed — a false PASS on the one gate that decides Module 2's shape. Verify
the integrations by hand against the Gate 1 results table above, and write the script once the three
answers are recorded.

Whatever replaces it is author preparation: **not narrated, and not on camera.**

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

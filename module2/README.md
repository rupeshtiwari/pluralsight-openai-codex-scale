# Module 2 — Automating and debugging Codex workflows at team scale

Run an evidence-backed triage sweep, promote it to a scheduled automation with approved routing,
then review and recover automation changes that went wrong.

## Demos

| Clip | Demo | Runbook | Preflight |
|---|---|---|---|
| 2 | Run a manual Codex triage sweep across Sentry and GitHub | [m2-c2-manual-triage.md](m2-c2-manual-triage.md) | [`m2-c2-manual-triage.preflight.sh`](scripts/m2-c2-manual-triage.preflight.sh) → [log](logs/m2-c2_preflight.txt) |
| 3 | Schedule Codex triage and route work to Slack and Linear | [m2-c3-schedule-triage.md](m2-c3-schedule-triage.md) | [`m2-c3-schedule-triage.preflight.sh`](scripts/m2-c3-schedule-triage.preflight.sh) → [log](logs/m2-c3_preflight.txt) |
| 5 | Inspect automation diffs in the Codex review pane | [m2-c5-inspect-automation-diffs.md](m2-c5-inspect-automation-diffs.md) | [`m2-c5-inspect-automation-diffs.preflight.sh`](scripts/m2-c5-inspect-automation-diffs.preflight.sh) → [log](logs/m2-c5_preflight.txt) |
| 6 | Trace a failed Codex automation and recover safely | [m2-c6-recover-failed-automation.md](m2-c6-recover-failed-automation.md) | [`m2-c6-recover-failed-automation.preflight.sh`](scripts/m2-c6-recover-failed-automation.preflight.sh) → [log](logs/m2-c6_preflight.txt) |

Each demo has its own preflight script, listed above. It runs the checks
shared across the module plus that clip's own, and rewrites that clip's transcript.
`module2/scripts/preflight_check.sh` with no argument runs all four, which is what you want once
per recording session.

Each transcript is a one-page report grouped by the clip's four steps: every step marked READY or
BLOCKED, mapped to the objective it serves, with each gating check and the command that ran it, and
a closing `PASS: n  FAIL: n`. It reads on its own without the terminal. Raw command output for the
same run sits beside it as `<clip>_preflight.full.txt`.

## Source

- Fixtures and run artifacts — [../automation/](../automation/)
- Triage rubric — [../docs/triage-rubric.md](../docs/triage-rubric.md)

## Reset

```bash
./module2/scripts/demo_reset.sh
```

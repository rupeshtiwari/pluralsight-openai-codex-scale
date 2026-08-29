# Module 2 — Automating and debugging Codex workflows at team scale

Run an evidence-backed triage sweep, promote it to a scheduled automation with approved routing,
then review and recover automation changes that went wrong.

## Demos

| Clip | Demo | Runbook | Preflight |
|---|---|---|---|
| 2 | Run a manual Codex triage sweep across Sentry and GitHub | [m2-c2-manual-triage.md](m2-c2-manual-triage.md) | [`m2-c2_preflight.txt`](logs/m2-c2_preflight.txt) |
| 3 | Schedule Codex triage and route work to Slack and Linear | [m2-c3-schedule-triage.md](m2-c3-schedule-triage.md) | [`m2-c3_preflight.txt`](logs/m2-c3_preflight.txt) |
| 5 | Inspect automation diffs in the Codex review pane | [m2-c5-inspect-automation-diffs.md](m2-c5-inspect-automation-diffs.md) | [`m2-c5_preflight.txt`](logs/m2-c5_preflight.txt) |
| 6 | Trace a failed Codex automation and recover safely | [m2-c6-recover-failed-automation.md](m2-c6-recover-failed-automation.md) | [`m2-c6_preflight.txt`](logs/m2-c6_preflight.txt) |

Run one clip's preflight with `module2/scripts/preflight_check.sh c<N>` — it runs the checks
shared across the module plus that clip's own, and rewrites that clip's transcript. With no
argument every clip runs, which is what you want once per recording session.

Each transcript is a one-page report grouped by the clip's four steps, marking each step READY
or BLOCKED, so it can be read on its own without the terminal. Raw command output for the same
run sits beside it as `<clip>_preflight.full.txt`.

## Source

- Fixtures and run artifacts — [../automation/](../automation/)
- Triage rubric — [../docs/triage-rubric.md](../docs/triage-rubric.md)

## Reset

```bash
./module2/scripts/demo_reset.sh
```

# Module 2 — Automating and debugging Codex workflows at team scale

Run an evidence-backed triage sweep, promote it to a scheduled automation with approved routing,
then review and recover automation changes that went wrong.

## Demos

| Clip | Demo | Runbook |
|---|---|---|
| 2 | Run a manual Codex triage sweep across Sentry and GitHub | [m2-c2-manual-triage.md](m2-c2-manual-triage.md) |
| 3 | Schedule Codex triage and route work to Slack and Linear | [m2-c3-schedule-triage.md](m2-c3-schedule-triage.md) |
| 5 | Inspect automation diffs in the Codex review pane | [m2-c5-inspect-automation-diffs.md](m2-c5-inspect-automation-diffs.md) |
| 6 | Trace a failed Codex automation and recover safely | [m2-c6-recover-failed-automation.md](m2-c6-recover-failed-automation.md) |

## Source

- Fixtures and run artifacts — [../automation/](../automation/)
- Triage rubric — [../docs/triage-rubric.md](../docs/triage-rubric.md)

## Reset

```bash
./module2/scripts/demo_reset.sh
```

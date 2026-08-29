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

## Preflight

Each demo has its own script, named after it:

```bash
bash module2/scripts/m2-c2-manual-triage.preflight.sh
```

It writes a one-page report to `module2/logs/m2-c2_preflight.txt`, grouped by that clip's four
steps, each marked READY or BLOCKED. `module2/scripts/preflight_check.sh` with no argument runs
all four, once per recording session.

## Source

- Fixtures and run artifacts — [../automation/](../automation/)
- Triage rubric — [../docs/triage-rubric.md](../docs/triage-rubric.md)

## Reset

```bash
./module2/scripts/demo_reset.sh
```

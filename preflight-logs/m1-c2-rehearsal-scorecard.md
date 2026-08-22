# M1 C2 rehearsal scorecard

Author-only. Choreography validation, not a recording.

Branch: `demo/m1-c2-start` · Runbook:
`module1/demo/m1-demo2-map-noisy-typescript-modules-with-codex-before-editing.md`

Follow the runbook exactly. Do not improvise. If something does not work, record what happened
rather than working around it — a workaround that only exists in your head will not survive to the
recording.

---

## Pre-Codex gate

Verified in the container on `demo/m1-c2-start`, head `18f10a6`:

```bash
git checkout demo/m1-c2-start
./module1/scripts/demo-reset.sh      # PASS - Module 1 is at its starting state
git status --short                   # empty
npm test                             # Tests  25 passed (25)
```

Run these on your Mac before opening Codex. If `npm test` reports anything other than 25, stop.

**Do not run `preflight_check.sh` between the reset and the demo.** Its transcript is a tracked
file, so running it leaves `preflight-logs/module1_preflight.txt` modified, and Step 4's proof that
the tree is clean would show that instead of nothing. Run preflight before the reset, or not at all
during a rehearsal.

---

## The four moments

Record the elapsed time and what Codex actually produced.

### Step 1 — Map modules, dependencies, public behavior, and dead-code candidates

Codex must identify, without editing:

- [ ] module map under `apps/api/src` with dependencies
- [ ] public behavior: route paths, status codes, response field names
- [ ] priority normalization in **three** files
- [ ] `normalizeLegacySeverity` with **no** importers
- [ ] priority branching inside the `POST /tickets` handler
- [ ] `git status --short` still empty

Elapsed: ______  Notes: ________________________________________________

### Step 2 — Constrain Codex to propose one cleanup theme before editing any files

- [ ] exactly **one** theme proposed
- [ ] the theme names its exact files
- [ ] no implementation started

Elapsed: ______  Notes: ________________________________________________

### Step 3 — Inspect repository evidence and reject unrelated architectural changes

- [ ] at least one architectural idea surfaced (repository layer, module restructuring)
- [ ] each one carries a file count
- [ ] all are recorded as out of scope, none implemented

Elapsed: ______  Notes: ________________________________________________

### Step 4 — Confirm Plan mode produced a bounded, reviewable first pass

- [ ] one theme, exact files, preserved contracts, validation commands
- [ ] deferred work listed separately
- [ ] `git status --short` returns nothing

Elapsed: ______  Notes: ________________________________________________

---

## The five measurements

| # | Measure | Pass | Notes |
|---|---|---|---|
| 1 | Each major step is visually distinct | ☐ | |
| 2 | No step materially exceeds ~90 seconds | ☐ | |
| 3 | The planning workflow is demonstrable without naming an unverified control | ☐ | |
| 4 | Every narration-worthy claim has visible proof | ☐ | |
| 5 | No setup, account, or package work appears | ☐ | |

**Measurement 3 is the open question.** The runbook deliberately describes the planning workflow by
what it does rather than naming a button. During the rehearsal, write down the exact control you
used, verbatim, so the runbook can name it once it is confirmed in your installed build:

```
Exact control used: _______________________________________________
```

---

## Verdict

- [ ] **FREEZE** — all five pass. No further wording changes. Cut `demo/m1-c2-complete`.
- [ ] **REWORK** — record which measurement failed and what was observed.

### Branch note

M1 C2 produces zero code changes by design. `demo/m1-c2-start` and `demo/m1-c2-complete` may
legitimately point at the same commit. Do not manufacture a file change to make them differ — the
outcome being taught is an approved plan and an untouched tree.

### If Codex does not cooperate

Two teaching moments depend on Codex behaving a particular way. If it does not:

- **Step 2, Codex proposes several themes** — ask: `You proposed more than one theme. Give me the
  single smallest one that preserves all public behavior.`
- **Step 3, Codex surfaces no architectural work** — ask: `Suggest one architectural improvement to
  apps/api that would make this code easier to maintain. Do not implement it.` Then reject it.

Record whether either fallback was needed. If a fallback is needed every run, it stops being a
fallback and belongs in the runbook.

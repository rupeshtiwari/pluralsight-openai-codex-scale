# Run a manual Codex triage sweep across Sentry and GitHub

Module 2 · Clip 2 · Demo · 6 minutes

---

## The problem this demo solves

SupportHub is in production and overnight it produced five distinct error signatures. Two are the
same fault reaching two call sites. One fired 890 times but affects three internal agents. One has
almost no evidence at all. And a dependency bump landed seventeen minutes before the first error,
which makes it look guilty.

Triaging this by hand every morning does not scale. Automating it before you know it produces
correct answers scales the wrong answers.

## The decision you will make

**Which incidents deserve action, and why?**

## Learning objectives

- Configure a bug triage automation using the Sentry, Slack, Linear, and GitHub plugins to sweep a
  defined time window
- Evaluate a Codex-generated triage report for correct P0–P3 prioritization, deduplicated bug
  entries, and evidence-backed recommendations

## Terms used here

- **Sweep** — one pass over a fixed time window, gathering evidence from every configured source.
- **Deduplication** — recognizing that two error signatures are one fault, and merging them.
- **Confidence** — how strongly the evidence ties a cause to an effect.
- **Thread context** — the conversation history a later automation can reuse.

## Before you start

These are already configured and are not part of this demo:

- Sentry, GitHub, Slack, and Linear are connected in Codex Desktop
- the demo Slack channel `#supporthub-demo` and the demo Linear project exist
- fixtures are present under `automation/`

```bash
git status --short
ls automation/sentry-fixtures automation/github-fixtures
```

Expect no output from the first, and both fixture files from the second.

---

## Step 1 — Name the sources, the destinations, and the window

**Purpose.** A sweep with no boundary is not repeatable. Fixing the window and naming each source's
role up front is what lets you compare two runs later and know the difference came from the
reasoning, not from different inputs.

**Starting state.** Branch `demo/m2-c2-start`, clean tree.

**Navigation.** Codex Desktop. Open a **new conversation** — this thread becomes the context a
scheduled automation reuses, so it must contain the whole sweep from the beginning.

**Prompt.**

```text
You are triaging SupportHub production errors for the window
2025-03-03T00:00:00Z to 2025-03-04T00:00:00Z.

Sources and their roles:
- automation/sentry-fixtures/issues.json - runtime failure evidence
- automation/github-fixtures/commits.json - code change evidence
- automation/github-fixtures/issues.json - reported symptoms
- docs/triage-rubric.md - the P0 to P3 standard you must apply

Routing destinations, for later approval only. Do not send anything now:
- Slack #supporthub-demo
- Linear project SupportHub reliability

Confirm you have read all four inputs. List how many Sentry issues fall inside
the window, and how many commits. Do not triage yet.
```

**Expected result.** Codex confirms five Sentry issues and three commits, and restates the window.

**Highlight.** Five issues, three commits, one window. Every later claim has to trace back to
these.

**Decision produced.** The evidence boundary is fixed.

**Verification.** PASS if Codex reports 5 issues and 3 commits. FAIL if it reports different counts
— it read the wrong file or invented data.

**Recovery.** Re-run naming the exact file paths again.

---

## Step 2 — Run the sweep in this thread

**Purpose.** Produce the triage in the same conversation that will later become the automation.
Doing it manually first is the whole point: you validate the reasoning while a human is watching,
before it runs unattended.

**Starting state.** Step 1 complete, same conversation.

**Navigation.** Same Codex conversation. Do not start a new one.

**Prompt.**

```text
Now triage the window. For every finding, give:

- id, and any other ids merged into it
- proposed priority from docs/triage-rubric.md
- affected users and occurrences
- whether a workaround exists
- your confidence: high, medium, or low
- the specific evidence, naming files and stack frames
- any correlated commit, and why you chose it
- a recommendation

Apply the rubric literally. Do not let occurrence count override impact.
```

**Expected result.** A report covering all five issues. Expect Codex to get some of this wrong —
commonly by treating `evt-1042` and `evt-1043` separately, by correlating `d4e5f6a` because it is
nearest in time, or by calling `incident-2002` a P1.

**Highlight.** The correlated commit for the checkout fault, and the priority given to
`incident-2002`. Those are the two places judgment is being tested.

**Decision produced.** A first-pass report exists, and it is not yet trustworthy.

**Verification.** PASS if all five issues appear with a priority and evidence. FAIL if any issue is
missing.

**Recovery.** Ask: `You did not cover evt-1099. Triage it too.`

---

## Step 3 — Check the report against the rubric

**Purpose.** Reading a report for plausibility is not review. Checking each claim against a written
standard is. This step is where the rubric earns its place.

**Starting state.** Step 2 produced a report.

**Navigation.** Same Codex conversation, with `docs/triage-rubric.md` open alongside.

**Prompt.**

```text
Check your own report against docs/triage-rubric.md:

1. Do any two findings share a root cause and a stack frame? If so they are one
   finding, and their affected-user counts combine.
2. For each priority, quote the rubric row that justifies it. Include the
   affected-user band and whether a workaround exists.
3. For each correlated commit, state which files it changed and whether any of
   them appear in the failing stack. If none do, the correlation is proximity
   in time only.
4. For any finding with low confidence, say what evidence is missing.
```

**Expected result.** Three problems surface: `evt-1042` and `evt-1043` share the `changeStatus`
frame and are one fault; `d4e5f6a` changed only `package.json` and `package-lock.json`, neither of
which appears in any failing stack; `evt-1099` has no line number and no reproduction.

**Highlight.** The file lists for `a1b2c3d` versus `d4e5f6a`. One touches
`services/ticketService.ts`, which is in the failing stack. The other touches neither.

**Decision produced.** The specific defects in the report are identified.

**Verification.** PASS if the shared stack frame is found and the `d4e5f6a` correlation is shown to
rest on timing alone. FAIL if Codex defends the original report.

**Recovery.** Ask: `Which files did d4e5f6a change, and do any of them appear in the stack for
evt-1042?`

---

## Step 4 — Correct the report and accept the pattern

**Purpose.** End with a report you would act on, and a reasoning pattern worth repeating. The
corrections are what will make the scheduled version trustworthy.

**Starting state.** Step 3 identified the defects.

**Navigation.** Same Codex conversation.

**Prompt.**

```text
Produce the corrected triage report:

- merge evt-1042 and evt-1043 into incident-2001 with combined counts
- correlate incident-2001 to the commit that touched a file in its stack, and
  state explicitly that d4e5f6a was rejected as proximity in time only
- price incident-2002 from the rubric using its affected-user band and its
  workaround
- keep evt-1088 at the priority its impact justifies, not its occurrence count
- mark evt-1099 deferred for insufficient evidence rather than assigning it a
  priority

For each finding state whether it should be routed. Route nothing yet.
```

**Expected result.** Four findings: `incident-2001` at P0 with 500 users, `incident-2002` at P2,
`evt-1088` at P3, `evt-1099` deferred. Two marked for routing.

**Operator action.** Accept this corrected pattern as the standard a scheduled run must match.

**Highlight.** The combined 500-user count, the rejected correlation stated in writing, and
`evt-1099` deferred rather than prioritized.

**Verification.** Compare against the recorded baseline:

```bash
python3 -c "
import json
b=json.load(open('automation/triage/baseline-manual-sweep.json'))
for f in b['findings']:
    print(f\"  {f['id']:<16} {f['priority']:<9} users={f['affectedUsers']:<4} route={f['route']}\")
print('  rejected:', b['rejectedCorrelations'][0]['commit'])
"
```

PASS if the corrected report matches those four priorities and the rejected commit. FAIL if any
priority differs or the duplicates are still separate.

**Recovery.** `./module2/scripts/demo-reset.sh`.

---

## Coverage

| Step | Objective element | Proof |
|---|---|---|
| 1 | Configure Sentry, GitHub, Slack, Linear sources over a defined window | 5 issues and 3 commits confirmed in window |
| 2 | Sweep produces a triage report | all five issues triaged with evidence |
| 3 | Evaluate for deduplication and evidence-backed recommendations | shared stack frame found, correlation shown to be timing-only |
| 4 | Evaluate for correct P0–P3 prioritization | four findings match the rubric-derived baseline |

## Final state

- duplicates merged into one finding with combined counts
- priorities justified by rubric rows rather than intuition
- a correlation rejected in writing, with the reason
- a low-confidence finding deferred rather than prioritized
- nothing routed

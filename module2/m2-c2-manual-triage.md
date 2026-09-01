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

## Learning Objectives

| LO | Description |
|---|---|
| TO3 | Apply Codex automations to run recurring bug triage across multiple data sources at team scale. |
| EO3a | Configure a bug triage automation using the Sentry, Slack, Linear, and GitHub plugins to sweep a defined time window |
| EO3b | Evaluate a Codex-generated triage report for correct P0–P3 prioritization, deduplicated bug entries, and evidence-backed recommendations |

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
ls automation/sentry-fixtures automation/github-seed
```

Expect no output from the first, and both fixture files from the second.

**Confirm Codex is in this checkout before the first prompt.**

Two folders on the recording machine once shared the basename `pluralsight-openai-codex-scale` — one
under `Documents/ChatGPT/`, the real repository a level up — and Codex Desktop's project pointed at
the wrong one. It edited files, ran gates and reported accurately, in a checkout nobody was
recording. Nothing downstream catches that: every verification in this runbook reads the terminal's
checkout, and the agent was never in it.

The cheap check costs nothing. **The project chip above the Codex composer prints the branch**, next
to the project name and the Local badge. It must read `demo/m2-c2-start`. On the run that found this it read
`master`, a branch this repository does not have. Do not check the project *name* — it is truncated
in the chip and was identical between the two folders, so it looks right either way. Change the
project with ⌥⇧⌘O.

Then have Codex say it, and compare against the terminal:

```text
Print your absolute working directory and the current git branch. Do nothing else.
```

```bash
pwd
git rev-parse --abbrev-ref HEAD
```

**PASS** — the path Codex prints matches `pwd` character for character, and its branch matches
`demo/m2-c2-start`. Compare the whole path: the two folders differed only in a parent directory, so any
comparison that stops at the folder name passes on the wrong one.
**FAIL** — anything else, including a path you cannot read in full. Fix the project before
recording. A walk from the wrong checkout looks entirely successful and proves nothing.

**Run the module preflight once per recording session, not per clip.** It validates the
preconditions for all four Module 2 demos in a single pass.

```bash
module2/scripts/preflight_check.sh
```

It must end `PASS: Module 2 is ready.` If a check fails it names the check, why it matters, and the
command that fixes it. Do not record against a failing preflight.

---

## Step 1 — Configure Sentry and GitHub evidence sources, connect Slack and Linear routing destinations, and define the triage time window

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
- automation/github-seed/commits.json - code change evidence
- automation/github-seed/issues.json - reported symptoms
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

## Step 2 — Run the sweep manually so the same thread context captures source evidence before scheduling

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

## Step 3 — Inspect the report for P0–P3 priority, deduplicated bugs, and evidence-backed recommendations

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

## Step 4 — Correct weak prioritization or duplicate entries before automation is promoted

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

Write the corrected report to automation/triage/corrected-sweep.json.
```

**Expected result.** Four findings: `incident-2001` at P0 with 500 users, `incident-2002` at P2,
`evt-1088` at P3, `evt-1099` deferred. Two marked for routing.

**Operator action.** Accept this corrected pattern as the standard a scheduled run must match.

**Highlight.** The combined 500-user count, the rejected correlation stated in writing, and
`evt-1099` deferred rather than prioritized.

**The output path is named on purpose.** Gate 1 established that Codex persists a mid-thread
correction to disk, not only to conversation context — it edited four files to record one. An
unnamed output lands somewhere nobody chose, and a correction that survives to the next take makes
this step's before-and-after false: Codex would appear to *arrive* at a standard it had already been
given. Naming the file is what lets `./module2/scripts/demo_reset.sh` guarantee its absence, and
what `m2-c2-starts-without-the-correction` asserts before a take.

**Verification.** Compare what was produced against the recorded baseline:

```bash
BASE=automation/triage/baseline-manual-sweep.json
OUT=automation/triage/corrected-sweep.json
node scripts/json.mjs table "$OUT" findings id:16 priority:9 users=affectedUsers:4 route=route
node scripts/json.mjs table "$BASE" findings id:16 priority:9 users=affectedUsers:4 route=route
node scripts/json.mjs fields "$OUT" "rejected=rejectedCorrelations.0.commit"
```

PASS if `corrected-sweep.json` exists, its four priorities and rejected commit match the baseline's,
and the two tables read identically. FAIL if the file is absent — the report went somewhere
unnamed — or if any priority differs, or the duplicates are still separate.

**Recovery.** `./module2/scripts/demo_reset.sh`.

---

## Coverage

| Step | LO | Objective element | Proof |
|---|---|---|---|
| 1 | EO3a | configure Sentry, GitHub, Slack, Linear over a defined time window | 5 issues and 3 commits confirmed in window |
| 2 | EO3a | sweep run manually so the thread captures source evidence | manual run artifact in this thread |
| 3 | EO3b | evaluate for deduplication and evidence-backed recommendations | shared stack frame found, correlation shown to be timing-only |
| 4 | EO3b, TO3 | evaluate for correct P0–P3 prioritization | four findings match the rubric-derived baseline |

## Final state

- duplicates merged into one finding with combined counts
- priorities justified by rubric rows rather than intuition
- a correlation rejected in writing, with the reason
- a low-confidence finding deferred rather than prioritized
- nothing routed

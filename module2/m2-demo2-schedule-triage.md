# Schedule Codex triage and route work to Slack and Linear

Module 2 · Clip 3 · Demo · 6 minutes

---

## The problem this demo solves

A triage pattern has been validated by hand and it produces answers worth acting on. Running it
manually every morning does not scale, but scheduling it raises a sharper question: when nobody is
watching, what is this automation allowed to do on its own?

Posting to a team channel and creating engineering issues are actions with an audience. They need
a human between the finding and the send.

## The decision you will make

**Which findings should be routed?**

## Learning Objectives

| LO | Description |
|---|---|
| TO3 | Apply Codex automations to run recurring bug triage across multiple data sources at team scale. |
| EO3c | Convert a tested manual triage sweep into a scheduled automation using the same thread context |
| EO3d | Apply a routing workflow to draft Slack updates, Linear issues, or GitHub comments after triage approval |
  approval

## Terms used here

- **Scheduled automation** — a task Codex runs on a timer rather than when you ask.
- **Thread context** — the conversation history the scheduled run starts from, so it keeps the
  reasoning that was already validated.
- **Draft** — a fully written message or issue that is not sent until a human approves it.

## Before you start

- Codex Desktop is open on the repository
- Slack and Linear are connected, with the demo channel and demo project available
- the conversation containing the validated manual sweep is open

```bash
git status --short
```

Expect no output.

---

## Step 1 — Convert the tested manual sweep into a scheduled automation using the same thread context

**Purpose.** Scheduling from the validated conversation, rather than writing a fresh prompt, is
what carries the corrections forward. A new prompt would start from the same naive reasoning that
had to be fixed by hand.

**Starting state.** Branch `demo/m2-c3-start`. The validated triage conversation is open.

**Navigation.** Codex Desktop, in the conversation holding the corrected triage. Open the
conversation's overflow menu and choose the scheduling option. Do not open a new conversation —
scheduling from a new one loses the context this step depends on.

**Prompt.** Set the scheduled task's instruction to:

```text
Repeat the triage sweep established in this conversation for the most recent
24-hour window.

Apply the same rules that were corrected here:
- merge findings that share a root cause and a stack frame, combining counts
- correlate a commit only when it changed a file appearing in the failing stack
- price every finding from docs/triage-rubric.md, quoting the row
- defer findings whose confidence is low rather than assigning a priority

Produce the report. Do not send anything to Slack or Linear.
```

**Expected result.** A scheduled task is created and shows the conversation it inherits from.

**Highlight.** The link back to the source conversation, and the final line forbidding sends. The
schedule produces a report; it does not act.

**Decision produced.** The validated pattern now runs unattended, with sending withheld.

**Verification.** PASS if the task exists and references this conversation. FAIL if it was created
from a blank conversation.

**Recovery.** Delete the task, reopen the validated conversation, and schedule from there.

---

## Step 2 — Run the scheduled workflow and compare its report with the validated manual pattern

**Purpose.** A scheduled run is only trustworthy if it reproduces reasoning you already checked.
Comparing against a recorded baseline turns "looks right" into a specific pass or fail.

**Starting state.** Step 1 complete.

**Navigation.** In the scheduled task, choose the option to run it now rather than waiting.

**Expected result.** A report with four findings: `incident-2001` at P0 with 500 combined users,
`incident-2002` at P2, `evt-1088` at P3, `evt-1099` deferred.

**Command.** Show the baseline beside it:

```bash
BASE=automation/triage/baseline-manual-sweep.json
node scripts/json.mjs table "$BASE" findings id:16 priority:9 users=affectedUsers:4 route=route
node scripts/json.mjs fields "$BASE" "rejected=rejectedCorrelations.0.commit"
```

**Expected output.**

```text
  incident-2001    P0        users=500  route=true
  incident-2002    P2        users=61   route=true
  evt-1088         P3        users=3    route=false
  evt-1099         deferred  users=2    route=false
  rejected: d4e5f6a
```

**Highlight.** Line by line: same four ids, same four priorities, same combined count, same
rejected correlation.

**Decision produced.** The scheduled run reproduces the validated pattern.

**Verification.** PASS if all four priorities match and `d4e5f6a` is still rejected. FAIL if any
differs, or if the duplicates came back apart — the schedule did not inherit the context.

**Recovery.** Delete the task and repeat Step 1 from the validated conversation.

---

## Step 3 — Approve selected findings before drafting Slack updates or Linear issues

**Purpose.** Two of four findings deserve routing. Approving per finding rather than approving the
report is what keeps a P3 and a deferred item out of the team's channel.

**Starting state.** Step 2 complete, the scheduled report matches the baseline.

**Navigation.** Same Codex conversation.

**Prompt.**

```text
List each finding with a routing recommendation and the reason.

Then wait for my approval. Approve nothing yourself. Do not send to Slack or
Linear until I name which findings are approved.
```

**Expected result.** `incident-2001` and `incident-2002` recommended for routing; `evt-1088` and
`evt-1099` not.

**Operator action.** Reply naming only the two approved findings:

```text
Approved for routing: incident-2001 and incident-2002.
Not approved: evt-1088 and evt-1099.
```

**Highlight.** Two approved, two withheld. The P3 stays out of the channel because low impact does
not need the team's attention, and the deferred item stays out because it has no conclusion to
report.

**Decision produced.** Exactly two findings may be routed.

**Verification.** PASS if Codex routes nothing before approval and then treats only the two named
findings as approved. FAIL if anything was sent, or if all four are treated as approved.

**Recovery.** If anything was sent to the demo channel, delete it there and restate the constraint.

---

## Step 4 — Verify Slack and Linear drafts preserve the evidence and priority from the triage decision

**Purpose.** A routed message is only useful if a reader can act on it without going back to the
source. This step checks that priority and evidence made it through the handoff intact.

**Starting state.** Step 3 complete, two findings approved.

**Navigation.** Same Codex conversation.

**Prompt.**

```text
For the two approved findings only, produce drafts:

- a Slack message for #supporthub-demo covering incident-2001
- a Linear issue for each approved finding, in the SupportHub reliability project

Each draft must carry: the priority, affected users, occurrences, whether a
workaround exists, the specific evidence, the correlated commit, and the
proposed fix. The incident-2001 drafts must also state that d4e5f6a was
rejected and why.

Keep them as drafts. Do not send or create anything.
```

**Expected result.** One Slack draft and two Linear drafts, each carrying the full evidence chain.

**Command.** Compare against the recorded drafts:

```bash
node scripts/json.mjs files 'automation/*-drafts/*.json' \
  @dir:14 sourceFinding:15 status=status:6 approvedBy=approvedBy
```

**Expected output.**

```text
  linear-drafts  incident-2001   status=draft  approvedBy=none
  linear-drafts  incident-2002   status=draft  approvedBy=none
  slack-drafts   incident-2001   status=draft  approvedBy=none
```

**Operator action.** Confirm each draft names its priority and its evidence, then confirm that
nothing has been sent.

**Highlight.** `status=draft` and `approvedBy=none` on every row, and the rejected-correlation
sentence inside the `incident-2001` drafts. A reader learns not just what broke, but which
tempting explanation was ruled out.

**Verification.** PASS if three drafts exist for the two approved findings, each carries priority
and evidence, and nothing was sent. FAIL if a draft exists for `evt-1088` or `evt-1099`, or if any
item was actually created.

**Recovery.** `./module2/scripts/demo_reset.sh` restores the drafts to their recorded state.

---

## Coverage

| Step | LO | Objective element | Proof |
|---|---|---|---|
| 1 | EO3c | convert a tested manual sweep into a scheduled automation | task created from the validated conversation |
| 2 | EO3c | using the same thread context | scheduled report matches the baseline exactly |
| 3 | EO3d | routing workflow follows triage approval | two of four approved, nothing sent before approval |
| 4 | EO3d, TO3 | drafts preserve evidence and priority | three drafts, evidence and priority intact |

## Final state

- the validated pattern runs on a schedule
- the scheduled report reproduces the baseline
- only approved findings are routed
- Slack and Linear drafts carry priority, evidence, and the rejected correlation
- nothing has been sent

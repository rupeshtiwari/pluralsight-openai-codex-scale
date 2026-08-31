# Framework skill evidence — negative control

**Status: SCAFFOLD. Both runs are outstanding.**

This artifact is the proof that the framework skill is *used*, not merely present. The objective's
verb is "use", and a good migration answer does not demonstrate that on its own: a capable agent
might produce one without consulting anything. What demonstrates it is a difference between two runs
that are identical except for the skill.

That is why this is a negative control and not a description. **Do not fill the comparison from
expectation.** It is only evidence if both outputs exist and the difference is read off them.

---

## Skill under test

| | |
|---|---|
| Name | `express-typescript-migration` |
| Location | `framework-skill/node-express-migration/SKILL.md` |
| Scope | Express 4 to 5, CommonJS to ESM, TypeScript conventions, checkpoint separation, validation gates |

## The toggle

Loading the skill is a deliberate act. `AGENTS.md` deliberately does **not** direct Codex to consult
it — an ambient instruction there would load it in both runs and make them identical, which is the
one thing this artifact cannot survive.

The two runs therefore differ by exactly one line of prompt text.

Both runs come from one saved file, `plans/prompts/m1-c6-migrate-route.md`, so the only possible
difference is the one being measured. `c6-prompt-saved` asserts that file still matches the
runbook byte for byte and still opens on the skill line; if the runbook is edited and the file is
not, the check fails rather than the comparison silently drifting.

**Run A — skill ON.** Send the saved file as-is. It opens with:

```text
Read framework-skill/node-express-migration/SKILL.md and follow its guidance.
```

**Run B — skill OFF.** Send the same file with the first line and the blank line after it removed.
Everything else is byte-identical. Do not retype it.

The static half of that is now asserted, so it cannot regress unnoticed:

```bash
node scripts/check.mjs skill-not-ambient
node scripts/check.mjs c6-prompt-saved
```

The second grep that used to sit here counted `framework-skill` in `plans/prompts/*.md` and was
labelled "prompts that reference it, by design". It always printed zero: the only saved prompts were
C2's and C3's, neither of which has any reason to mention the skill, and the C6 prompt was not saved
at all. A check whose answer never changes is not a check.

`skill-not-ambient` fails if `AGENTS.md` loses the opt-out sentence or gains a directive
contradicting it. It has been wrong once already — `AGENTS.md` used to say "Consult it before
migrating any route" — and that failure is invisible until both runs come back the same. The
Module 1 preflight runs it as **skill is opt-in, not ambient**.

Both runs start from the same checkpoint, `demo/m1-c6-start`, with a clean working tree, and
**each run starts in a fresh Codex thread.**

That second precondition is as load-bearing as the clean tree. If Run B follows Run A in the same
thread, Run B is not skill-off — it is skill-remembered, and it will reproduce guidance it was never
given because the thread still carries it. The comparison would then measure thread memory rather
than the skill, and it would flatter Run B. This is EO3c's thread-context dependency in reverse:
there the demo relies on context carrying forward, here the evidence relies on it not doing so.

## Toggle pre-check — do this first

**Cheap, and it decides whether the two runs below are worth doing at all.** A passing static check
proves nothing *directs* Codex to the skill; it cannot prove Codex does not reach for it anyway.
Only behavior shows that.

Run it from **any clean Module 1 checkpoint** — `demo/m1-c5-start` is fine, and so is the build
branch. It deliberately does not need `demo/m1-c6-start`; a pre-check that depended on the branch it
exists to unblock could not do its job.

Before investing in two full runs, start a **fresh Codex thread** and send a short migration prompt
with **no** skill line. **This goes into the Codex panel, not a terminal:**

```text
Migrate GET /tickets/:id in supporthub-api/migration to ESM TypeScript.
Tell me which guidance you used.
```

### Do not trust the self-report

"Tell me which guidance you used" asks the model to account for its own retrieval, and that account
is not reliable in either direction: it can cite the skill without having read it, or read it and
not mention it. Judge on an objective signal instead.

**Primary signal — content only the skill contains.** These phrasings appear nowhere else in the
repository, so their appearance in a reply is evidence of a read regardless of what Codex says:

| Tell | Why it is a tell |
|---|---|
| `npm run build` justified as catching emit failures that `--noEmit` does not surface | An unusual reason to run `tsc` after `tsc --noEmit`. A model would not independently explain the pair this way |
| The four gates named in the order lint, type-check, build, focused route tests, with a later gate said not to substitute for an earlier one | The ordering rationale is the skill's, not a general convention |
| "Never combine a route migration with a dependency upgrade in one milestone," justified by a red test being unattributable | The specific reason, not the general advice |

**What does NOT count.** `moduleDir` and `requireFromEsm` are named in `supporthub-api/*/compat/`
and in `docs/commonjs-esm-compatibility.md`. Codex can reach both without the skill, so their
appearance proves nothing. Do not read them as a load.

**Secondary signal.** If the Codex panel surfaces which files it opened, check whether the skill
path is among them. Use it to confirm the primary signal, not to replace it — file-access display
is a UI affordance that may change.

| Question | Answer |
|---|---|
| Date | 2026-08-31 |
| Fresh thread confirmed? | Yes |
| Did any tell above appear in the reply? | No — none of the three |
| Did Codex claim to use the skill? (record separately — it may disagree with the tells) | It stated the opposite: *"I did not load framework-skill/node-express-migration/SKILL.md, because this prompt did not explicitly ask me to read it."* Tells and self-report agree |
| If it loaded: what pulled it in? | n/a — it did not load |

**Result: PASS. The toggle works, so Run A and Run B can form a control.** What follows is the
floor that measurement sits on, which the same run also established.

### If it loaded: three eliminations

"It loaded" is not actionable on its own. Two of the three causes are fixable in this repository and
one is not, so establish which before deciding anything. Each re-run starts a fresh thread.

1. **Empty `AGENTS.md` temporarily and re-run.** Still loads? Not `AGENTS.md`. Restore it
   afterwards — `skill-not-ambient` fails if the opt-out wording is missing.
2. **Re-run with `plans/prompts/` moved aside.** Still loads? Not a saved prompt file.
3. **Still loads with both removed** → Codex's own retrieval surfaced it.

The third case is the §18 evidence problem, not a coverage problem. C6 bullet 1 still happens — the
skill still applies platform-specific guidance — but the proof that the *operator invoked it* dies,
because "use" is not a distinguishable action on this surface. That is a disclosure and a matrix
re-classification, not a redesign. **Do not respond by hiding or renaming `SKILL.md` to force a
skill-off run:** that measures the file's absence, not the skill's, and a control that requires
disguising its input is not measuring the objective.

**If the skill loads unasked, stop.** Run B cannot be a skill-off run, the comparison is void, and
the cause has to be found before anything below is filled in. Record that here rather than
proceeding — a negative control built on a broken toggle is worse than no negative control, because
it looks like evidence.

If the skill does not load unasked, the toggle works and both runs below are worth the time.

## What both runs inherit

**The skill is not the only guidance in the repository, and the rest of it is ambient.** Asked what
it had consulted, the pre-check run named five sources without being pointed at any of them:

| Source | Reaches Run B how | What it carries |
|---|---|---|
| `AGENTS.md` | Codex reads it on every run by design | the migration direction, and *"Migrate one route slice at a time. Never migrate the whole application in one pass"* — the skill's checkpoint rule, stated as a conclusion |
| `plans/migration-plan.md` | retrieval | the two checkpoints, their scopes, gates and rollback points |
| `docs/commonjs-esm-compatibility.md` | retrieval | all four conversions, with code |
| `docs/behavioral-exceptions.md` | retrieval | the accepted differences |
| `plans/prompts/m1-c6-migrate-route.md` | retrieval | **the Run A prompt, skill line included, and an explanation of the toggle** |

The first four are the floor. Run B is not a no-guidance run and must never be described as one: it
is a run without *this file*, on a repository that already documents the conversions, the
checkpoint split and the accepted exceptions. A small measured difference between A and B is
therefore the expected result, not a finding that the skill adds little. What the comparison
isolates is the skill's *reasoning* — why `build` follows `--noEmit`, why the gate order cannot be
permuted, why a red batched test is unattributable — which is exactly what the three tells were
chosen to detect, and exactly what none of the four ambient sources state.

**The fifth is not a floor, it is a leak, and it has to be removed before either run.**
`plans/prompts/m1-c6-migrate-route.md` opens on the skill line and then explains that Run B is that
same prompt minus its first line. A Run B that retrieves it has been told both that a skill exists
and that it is being withheld. Move the directory aside for the duration of **both** runs, so
neither has a source the other lacks:

```bash
mv plans/prompts /tmp/prompts-aside     # before Run A
# ... Run A, reset, Run B ...
mv /tmp/prompts-aside plans/prompts     # after Run B, before any commit
```

Send each run's prompt from a copy held outside the repository. `c6-prompt-saved` fails while the
directory is away, which is the reminder to put it back.

This is not what the eliminations section forbids. Hiding `SKILL.md` would remove the thing
under test. Removing the experiment's own scaffolding from the environment it runs in is what keeps
the test honest — the saved prompt is apparatus, not guidance.

**Record what each run says it consulted.** Both run blocks below ask for it. A Run B that names
`plans/prompts/` or `framework-skill/` is contaminated: discard it and re-run both.

## Reproducing

`demo/m1-c6-start` carries the two-checkpoint split that walking C5 produces, and is branched from
`demo/m1-c5-captured`:

    walk C5  →  m1-c5-captured  →  m1-c6-start  →  walk C6  →  m1-c6-captured

Cutting it from anywhere else gives it the *combined* milestone, which is the inverse of the state
C6 starts from.

The toggle pre-check above does **not** need that branch. That is the point of running it first: it
is one prompt against any clean Module 1 checkpoint, and it decides whether these two runs are worth
setting up at all.

Each run starts from that branch in a fresh Codex thread:

    git checkout demo/m1-c6-start
    ./module1/scripts/demo_reset.sh
    git status --short          # must be empty

Run A, capture the output verbatim below. Reset. Run B with the first line removed, capture verbatim.
Do not edit either transcript.

---

## Run A — skill ON

- Date:
- Checkpoint: `demo/m1-c6-start`
- Prompt: as above, **including** the skill line
- `plans/prompts/` moved aside for this run?
- Sources Codex says it consulted (ask it; a Run B naming `plans/prompts/` or
  `framework-skill/` is contaminated — discard and re-run both):

```text
[ paste the complete Codex output verbatim ]
```

## Run B — skill OFF

- Date:
- Checkpoint: `demo/m1-c6-start`
- Prompt: as above, **excluding** the skill line
- `plans/prompts/` moved aside for this run?
- Sources Codex says it consulted (ask it; a Run B naming `plans/prompts/` or
  `framework-skill/` is contaminated — discard and re-run both):

```text
[ paste the complete Codex output verbatim ]
```

---

## What appears ONLY when the skill is active

**Reserved. Fill only after both runs above exist.**

This is the field the artifact turns on. Writing it before the runs would make it a prediction
wearing the clothes of evidence.

| Element | Run A (skill on) | Run B (skill off) | Attributable to the skill |
|---|---|---|---|
| | | | |

Candidate elements to compare — presence in Run B is what decides, not expectation:

- the exact skill name, cited
- Express 4 to 5 rules applied by name
- the two `module.exports` shapes distinguished
- `__dirname` addressed via the compat module
- the behavioral exception considered
- checkpoint boundary respected, no dependency change
- all four validation gates named
- no unrelated architectural rewrite proposed

## Assessment

**Reserved until the table above is filled.**

| Question | Answer |
|---|---|
| Did Run A cite the skill by name? | |
| Which decisions appear only in Run A? | |
| Did Run B produce a correct migration anyway? | |
| Does the difference support "use", or only "present"? | |

A Run B that is materially as good as Run A is a real result and must be recorded as one. It would
mean this artifact does not yet demonstrate the objective, and the skill needs to carry guidance the
model does not already supply.

## Verdict

- [ ] **Demonstrated** — Run A contains decisions absent from Run B, traceable to the skill
- [ ] **Not demonstrated** — the runs are materially equivalent; strengthen the skill and rerun
- [ ] **Toggle broken** — the skill loaded unasked, so no skill-off run was possible and the
      comparison was never valid. Neither box above applies. Record which of the three eliminations
      identified the cause, and treat an unfixable cause as a disclosure against EO2d's evidence,
      not against its coverage.

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

**Run A — skill ON.** The prompt opens with:

```text
Read framework-skill/node-express-migration/SKILL.md and follow its guidance.
```

**Run B — skill OFF.** That line is omitted. Everything after it is byte-identical.

The static half of that is now asserted, so it cannot regress unnoticed:

```bash
node scripts/check.mjs skill-not-ambient
grep -c 'framework-skill' plans/prompts/*.md          # prompts that reference it, by design
```

`skill-not-ambient` fails if `AGENTS.md` loses the opt-out sentence or gains a directive
contradicting it. It has been wrong once already — `AGENTS.md` used to say "Consult it before
migrating any route" — and that failure is invisible until both runs come back the same. The
Module 1 preflight runs it as **skill is opt-in, not ambient**.

Both runs start from the same checkpoint, `demo/m1-c6-start`, with a clean working tree.

## Toggle pre-check — do this first

**Cheap, and it decides whether the two runs below are worth doing at all.** A passing static check
proves nothing *directs* Codex to the skill; it cannot prove Codex does not reach for it anyway.
Only behavior shows that.

Before investing in two full runs, send a short migration prompt with **no** skill line and read
what comes back:

```text
Migrate GET /tickets/:id in supporthub-api/migration to TypeScript on Express 5.
Tell me which guidance you used.
```

| Question | Answer |
|---|---|
| Date | |
| Did Codex read or cite `SKILL.md` without being asked? | |
| If yes, what pulled it in? | |

**If the skill loads unasked, stop.** Run B cannot be a skill-off run, the comparison is void, and
the cause has to be found before anything below is filled in. Record that here rather than
proceeding — a negative control built on a broken toggle is worse than no negative control, because
it looks like evidence.

If the skill does not load unasked, the toggle works and both runs below are worth the time.

## Reproducing

```bash
git checkout demo/m1-c6-start
./module1/scripts/demo_reset.sh
git status --short          # must be empty
```

Run A, capture the output verbatim below. Reset. Run B with the first line removed, capture verbatim.
Do not edit either transcript.

---

## Run A — skill ON

- Date:
- Checkpoint: `demo/m1-c6-start`
- Prompt: as above, **including** the skill line

```text
[ paste the complete Codex output verbatim ]
```

## Run B — skill OFF

- Date:
- Checkpoint: `demo/m1-c6-start`
- Prompt: as above, **excluding** the skill line

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

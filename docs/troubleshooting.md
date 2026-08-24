# Troubleshooting

## Environment

**`env-setup/setup.sh` reports Node too old.**
The demos require Node 24. A Node 22 install is reported as `(too old)` rather than missing.
Fix: `brew install node@24 && brew link --overwrite --force node@24`, then re-run the script.

**The script says a dependency is missing that you know is installed.**
It resolves tools through `PATH`. If a tool was installed into a shell profile that the current
session has not loaded, open a new terminal and re-run. The full transcript is written to
`env-setup/install.log`.

## Validation gates

**`npm run typecheck` fails on `req.params`.**
Express 5 types route params as `string | string[]`. Declare the shape the handler expects:
`(req: Request<{ id: string }>, res: Response)`.

**`npm run test:legacy` cannot find a module named `tests`.**
`node --test` given a bare directory path resolves it as a module on some Node versions. The
script uses an explicit glob, `node --test tests/*.test.js`. If you changed it, change it back.

**Tests pass individually but fail together.**
The ticket store is in-memory and shared. Every suite calls `resetStore()` in `beforeEach`.
A new suite that skips it will see state left by the previous one.

## Module system

**An imported legacy module is `undefined` at runtime with no compile error.**
The two CommonJS export shapes are not interchangeable. `module.exports = fn` becomes a default
import; `module.exports = { a, b }` becomes named imports. Check which shape the module uses.

**`__dirname is not defined`.**
ESM has no `__dirname`. Use `moduleDir(import.meta.url)` from `supporthub-api/modern/src/compat/dirname.ts`.

**A relative import fails to resolve.**
ESM requires the file extension. TypeScript sources still write `.js`, because the extension
refers to the emitted file rather than the source.

## Preflight transcripts

**Running the preflight leaves the tree dirty.**
It should not. The transcripts in `module1/logs/` and `module2/logs/` are normalised so a rerun
produces identical bytes: the repository root is written as `.`, timings as `<ms>` and `<s>`, and
the vitest clock line as `<time>`. If a run dirties the tree, either the transcript content
genuinely changed — commit it — or a new check emits a volatile field the `norm` function in the
preflight does not yet scrub. Add it there rather than committing the churn.

This matters because clip 2 step 4 proves its point with an empty Source Control view, and the
preflight runs before recording.

## Recovering a demo state

Return to a known checkpoint rather than unpicking changes by hand:

```bash
git checkout demo/m1-c3-start
```

Or reset the module in place:

```bash
./module1/scripts/demo_reset.sh
```

## Commit attribution

**A commit was authored by the wrong identity.**
The execution container can recreate its global git config, resetting the identity. This repository
therefore sets the identity locally as well, in `.git/config`, which the container cannot overwrite.

Check what git will actually use:

```bash
git var GIT_AUTHOR_IDENT
```

Fix the most recent commit:

```bash
git commit --amend --reset-author --no-edit
```

**The attribution gate blocked a push.**
`scripts/check-attribution.sh` runs before every push and rejects any commit whose author,
committer, or message trailer names an identity other than the author's. It inspects commit
metadata only and never touches application code.

Run it by hand at any time:

```bash
./scripts/check-attribution.sh
```

Reinstall it after a fresh clone, since git hooks are not carried in a clone:

```bash
./scripts/check-attribution.sh --install
```

## Writing preflight checks

Three assertions in this repository passed when run directly and failed inside the preflight, purely
because of shell quoting through `eval`. Each cost several attempts to diagnose, because the check
was wrong while the thing being checked was correct.

**Rule: any assertion needing real parsing is a named check in a real language, called by one word
from the shell.**

```bash
# wrong - an escaped program inside a single-quoted shell string
check "c5" "milestone batches" 'node -e "const t=require(\"fs\")..."'

# right
check "c5" "milestone batches" 'node "${ROOT}/scripts/check.mjs" milestone-batched'
```

`scripts/check.mjs` holds the named invariants; `scripts/json.mjs` holds the JSON queries. Both exit
0 or 1 and say what broke.

## Prove the negative case

**A new assertion is not trusted until it has been observed to fail on the condition it exists to
detect.** Write the failing input, run the check against it, watch it go red. Only then wire it into
the preflight. Reading a check proves that it looks right, which is a different claim.

This is not a style preference. It is the most common defect in this repository, and it has now
appeared often enough to be predictable rather than unlucky:

| # | The harness said | The truth was | Direction | Caught by |
|---|---|---|---|---|
| 1 | check failed | the artifact was fine; `grep -q` under `pipefail` killed the producer with SIGPIPE | false FAIL | it only bit when output exceeded the pipe buffer, so small checks passed by luck |
| 2 | `npm install` succeeded | a stale lockfile mapped workspace paths that no longer existed, so nothing installed | false PASS | a later gate failing for an unrelated-looking reason |
| 3 | `c2-refs-identical` held | it resolved local refs only, so it held solely in a tree where those refs happened to exist | false PASS | the clean-clone check |
| 4 | `milestone-batched` held | its slice spanned two milestone entries, so its two patterns could match in different ones — it passed on the correctly-split plan | false PASS | simulating the split instead of re-reading the code |
| 5 | the attribution gate passed | it invoked a deleted `fmt.py` with verbs `fmt.mjs` never had; the gate ran but printed nothing | false PASS | a sweep for references to a renamed file |
| 6 | the preflight reported READY | it had just dirtied the tree by rewriting its own transcript with this machine's paths and timings — breaking clip 2 step 4, whose proof is an empty Source Control view | false PASS | the clean-clone check, again |

Five of the six are false passes, and that asymmetry is the point. **A false FAIL costs a take. A
false PASS costs a re-record**, because the demo proceeds on an assertion that was never true — and
you keep trusting it right up to the moment the camera is on.

### How to prove it

Do not edit the working tree to test a check. Build a throwaway copy instead:

```bash
npm run check:negatives
```

`scripts/check-negatives.mjs` copies each inspected file into a temporary `CHECK_ROOT`, applies a
mutation, and asserts the check goes red. Three rules make it worth running:

1. **State the mutation in the demo's terms.** "Codex split the batched milestone into two
   checkpoints", not "delete line 84". A mutation you cannot describe as something the demo might
   actually produce is testing the regex, not the invariant.
2. **Assert the control too.** Each case first confirms the check is green on the *unmutated* copy.
   Without that, a mutation that fails for an unrelated reason — a typo, a bad path — reads as proof
   when it is noise.
3. **Fail on unproven checks.** A check in `check.mjs` with no case in `check-negatives.mjs` is
   reported as unproven. Two checks read git rather than files and cannot be relocated by
   `CHECK_ROOT`; each names how it was proven instead, in `GIT_BACKED`.

Adding a check to `check.mjs` therefore means adding a case to `check-negatives.mjs` in the same
change. Run it after touching either file, and after any edit to a file a check parses — a
restructure that is correct in itself can still move the text a check anchors on.

Instance 6 is worth reading twice: the check that certifies readiness was itself creating the one
change that would appear on camera. Verifying tooling is not exempt from the thing it verifies.

### The wider class

The same blindness applies to any tooling that reports on other tooling. Prefer checks that fail
loudly and name the artifact they inspected. When something reports success, ask what it would have
printed had it done nothing at all — instance 5 was a gate that had been reporting a clean pass for
weeks while writing three usage errors to stderr and no verdict to stdout.

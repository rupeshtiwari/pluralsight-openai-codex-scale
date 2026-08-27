# Troubleshooting

## Environment

**`env-setup/setup.sh` reports Node too old.**
The demos require Node 24. A Node 22 install is reported as `(too old)` rather than missing.
Fix: `brew install node@24 && brew link --overwrite --force node@24`, then re-run the script.

**The script says a dependency is missing that you know is installed.**
It resolves tools through `PATH`. If a tool was installed into a shell profile that the current
session has not loaded, open a new terminal and re-run. The full transcript is written to
`env-setup/install.log`.

## Dependencies

**`Cannot find module @rollup/rollup-darwin-arm64` (or `@esbuild/...`, or `router`).**
`node_modules` does not match the lockfile or the platform. It happens after switching to a branch
with a different lockfile, or when a tree is carried between machines. **Plain `npm install` does
not fix it** — that is [npm bug 4828](https://github.com/npm/cli/issues/4828). Reinstall cleanly:

```bash
rm -rf node_modules supporthub-api/*/node_modules
npm install
```

Or let the reset script do it:

```bash
./module1/scripts/demo_reset.sh --reinstall
```

**Remove the nested workspace `node_modules` too, not just the root.** Leaving them makes npm
resolve against a half-populated tree and silently drop a real dependency — regenerating the
lockfile that way once produced a file with no `router` entry, which Express 5 requires, and all 25
contract tests failed with `Cannot find module 'router'`.

**Never delete `package-lock.json` to fix this.** It is tracked, and a modified or missing lockfile
puts a change outside the demo surface, which makes `demo_reset.sh` refuse and breaks clip 2 step 4,
whose proof is an empty Source Control view.

**Regenerating the lockfile deliberately.** It must be platform-complete, so that a learner on macOS
or Windows installs from it without npm rewriting it. Generate from a fully clean tree, then confirm
the binaries for all three platforms are present:

```bash
rm -rf node_modules supporthub-api/*/node_modules package-lock.json
npm install
node -e 'const k=Object.keys(require("./package-lock.json").packages);
  for (const t of ["darwin-arm64","win32-x64-msvc","linux-x64-gnu"])
    console.log(t, k.some(p=>p.includes("rollup-"+t)))'
```

All three must print `true`. A lockfile generated in a Linux container without this step pins only
`rollup-linux-x64-gnu`, and every macOS learner hits the error above on first run.

## Validation gates

**`npm run typecheck` fails on `req.params`.**
Express 5 types route params as `string | string[]`. Declare the shape the handler expects:
`(req: Request<{ id: string }>, res: Response)`.

**The preflight says `migration tests pass (expect 8)` FAILED, but the tests pass.**
Fixed. The check grepped for `# pass 8`, which only appears under Node's tap reporter. Node 23 made
`spec` the default, which prints `i pass 8` instead, so the check failed on Node 24 while the tests
were green. `scripts/check.mjs migration-tests-pass` now pins `--test-reporter=tap` itself. The
on-camera `npm run test:migration` output is unchanged — it still uses whatever your Node defaults
to.

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

## Deleting untracked files

**`git clean -fd` is irreversible.** It deletes untracked files, which are by definition the ones
git holds no copy of. There is no reflog, no stash, and nothing in the Trash — it unlinks directly.
`demo_reset.sh` carries a guard because `git checkout -- .` destroyed unstaged work three times
while this repository was being built; `git clean -fd` is the worse of the two, because unstaged
work at least exists in the index sometimes.

**Always dry-run first, and read the list:**

```bash
git clean -nd
```

Only then delete:

```bash
git clean -fd
```

**Never add `-x`.** That also removes ignored files, which here means `node_modules` and any local
`.env`.

**Where junk files come from.** Almost every untracked file that has appeared in this repository came
from pasting documentation into a shell. A line beginning with `>` is a redirect; `->` in a diagram
is a redirect; a markdown table row starting with `|` is a syntax error. One pasted dependency
chain created four empty files named after its own steps. If `git clean -nd` lists names that look
like fragments of a document you were reading, that is what happened, and the files are empty — check
with `wc -c` before deleting anything you are unsure of:

```bash
git clean -nd | awk '{print $3}' | xargs -I{} wc -c {}
```

A zero-byte file named after a heading, a branch, or a step in a diagram is a paste artifact, not
work.

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
| 7 | `skill-not-ambient` was broken | `AGENTS.md` was correct. The check matched `always consult` inside the sentence *explaining* why an always-consult instruction would be wrong | false FAIL | running the new check on the known-good file before trusting it — this standard, catching one on its first outing |

| 8 | `migration tests pass (expect 8)` failed | the 8 tests passed. The check grepped for `# pass 8`, which Node prints under the tap reporter; Node 23 made **spec** the default, and it prints `i pass 8` | false FAIL | running the preflight on macOS with Node 24 — the version the course targets. It passed on the Node 22 in the build container |

| 9 | `contract tests (expect 25)` failed | the 25 tests passed. The check grepped for the literal `Tests  25 passed (25)`, including its two spaces. That is a rendering, not a contract: colour codes, terminal width and reporter defaults all move it, so it matched on Linux and failed on macOS | false FAIL | running the preflight on the recording machine seconds after `npm test` passed by hand |

Five of the nine are false passes, and that asymmetry is the point. **A false FAIL costs a take. A
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

Instances 8 and 9 are the same mistake in two tools -- Node's test runner and vitest -- found a day
apart. Both greps read fine and both were wrong, which is why the rule is stated as an absolute:
**never assert on a tool's default output format.** Where a machine-readable form exists, use it;
vitest and Node both offer one. The pretty summary is for humans and is allowed to change.

Instance 8 is the version-dependent variant of instance 1: green on the machine it was written on, red on the
machine it was written *for*. **Never assert on a tool's default output format.** Defaults change
between runtimes, and a check that greps one is testing the runtime, not the artifact. Pin the
reporter, the formatter, the locale — whatever the tool lets you pin — so the assertion means the
same thing everywhere. The clean-clone check cannot catch this one, because a clone on the same
machine has the same runtime; only running it on the target version does.

Instance 7 names a trap specific to checks that read prose. **A document explaining a prohibition is
not violating it.** `AGENTS.md` both states the opt-out and explains why an ambient directive would
destroy the negative control, so the explanation contains the exact phrase the check hunts for. The
attribution gate already guards against this — its message pattern is anchored so that a commit
discussing attribution does not trip it — and the fix is the same: anchor a directive pattern to a
sentence start, so an imperative matches and a description of one does not.

### The working tree is not evidence

Instances 3 and 6 were both caught by the clean-clone check, and neither was visible any other way.
Both were green in the tree they were written in and broken for everyone else — one because local
refs happened to exist, the other because the transcript happened to already contain this machine's
paths.

**A check passing in the tree you wrote it in is not evidence that it passes.** The tree carries
state nobody else has: untracked files, local branches, refs, node_modules, absolute paths, an
editor's autosave. All of it is invisible to `git status` and all of it can hold a check up.

The only evidence is a fresh clone:

```bash
git clone --branch <branch> <url> /tmp/verify && cd /tmp/verify
npm install
npm run check:negatives
./module1/scripts/preflight_check.sh && ./module2/scripts/preflight_check.sh
git status --porcelain     # must be empty afterwards
```

Run it before freezing any checkpoint branch. It has now caught two defects that no amount of
re-reading would have found, and both would have surfaced first on camera.

### A reading that fits the narrative deserves more scrutiny, not less

`npm install` printed "5 vulnerabilities (3 moderate, 1 high, 1 critical)" on every run. The
obvious explanation was the deliberately-pinned Express 4 tree, and it was a *good* explanation: a
legacy service carrying real CVEs is a concrete reason the migration matters, and it would have gone
into the README as a teaching note.

It was wrong. Every one of the five was in the vitest/vite/esbuild devDependency chain — the
critical was Vitest's UI server, the high a Vite dev-server path traversal, and this course runs
neither. Reading `npm audit` took a minute and changed the action completely: not a teaching asset
to explain on camera, just incidental tooling to upgrade.

**The fit is the warning sign.** An explanation that flatters the story you are already telling gets
believed on less evidence than one that complicates it, so it needs more. Before writing down a
cause that fits too well, check it against the thing itself. This is instance 7's shape — the
plausible reading and the true one diverging — arriving through a different door.

### The wider class

The same blindness applies to any tooling that reports on other tooling. Prefer checks that fail
loudly and name the artifact they inspected. When something reports success, ask what it would have
printed had it done nothing at all — instance 5 was a gate that had been reporting a clean pass for
weeks while writing three usage errors to stderr and no verdict to stdout.

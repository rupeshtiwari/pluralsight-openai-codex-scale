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

This matters more on recording day than during development. **A false FAIL costs a take. A false
PASS costs a re-record**, because the demo proceeds on an assertion that was never true.

The same failure class produced two earlier bugs worth recognising:

- `grep -q` inside a pipeline under `set -o pipefail` kills the producer with SIGPIPE and reports
  failure on a passing check. It surfaced only on commands whose output exceeded the pipe buffer, so
  smaller checks passed by luck. Count matches instead, so the producer always drains.
- A stale lockfile mapped workspace paths that no longer existed, so `npm install` silently
  installed nothing and reported success.

In all three the tooling lied about the artifact. Prefer checks that fail loudly and name the
artifact they inspected.

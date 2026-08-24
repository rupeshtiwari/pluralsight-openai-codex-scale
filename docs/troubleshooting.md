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

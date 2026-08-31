---
name: express-typescript-migration
description: Platform-specific guidance for migrating a CommonJS JavaScript Express 4 service to ESM TypeScript on Express 5, one route slice at a time, with validation and rollback at every checkpoint.
---

# Express 4 CommonJS to Express 5 ESM TypeScript migration

Guidance for migrating the SupportHub legacy ticket service. This skill lives in the repository
so the workflow does not depend on an external marketplace skill.

## Source and target

| | Source | Target |
|---|---|---|
| Module system | CommonJS | ESM |
| Language | JavaScript | TypeScript |
| Framework | Express 4 | Express 5 |
| File extension | `.js` | `.mts`, emitting `.mjs` |
| Entry | `supporthub-api/migration/app.js` | `supporthub-api/migration/app.mts` |

The service migrates **in place**. Source and target are the same workspace, so it holds both
module systems at once for as long as the migration runs. That is the expected mid-migration
state, not a misconfiguration.

## Checkpoint rule

**Never combine a route migration with a dependency upgrade in one milestone.**

They fail for different reasons and roll back differently. A route migration changes your code
and is verified by focused route tests. A dependency upgrade changes framework behavior across
every route at once and is verified by the full suite. Batched together, a red test cannot tell
you which half caused it.

Split into two checkpoints:

1. **Migrate the route** — one route slice, language and module system only
2. **Upgrade the platform** — Express 4 to Express 5, dependencies, framework behavior

Each checkpoint must be independently validatable and independently revertible.

## Module system conversions

### require() to import

```js
// CommonJS
var express = require('express');
var service = require('../services/ticketService');
```

```ts
// ESM — note the explicit .mjs extension, which is required even from TypeScript
import express from 'express';
import * as service from '../services/ticketService.mjs';
```

ESM requires the file extension in relative import paths, and the extension refers to the emitted
file rather than the source. A `.mts` source emits `.mjs`, so that is what its importers write.

### module.exports to export

The two CommonJS export shapes migrate differently, and confusing them is the most common
migration break:

```js
module.exports = createApp;                 // single value  -> export default
module.exports = { get, create, reset };    // named bag     -> named exports
```

```ts
export default function createApp() { ... }         // from module.exports = fn
export function get() { ... }                       // from module.exports = { get }
```

Before converting, check which shape the module uses. A module doing `module.exports = fn`
imported as `import { fn } from` will be `undefined` at runtime, not a compile error.

### __dirname

`__dirname` does not exist in ESM. Derive it from `import.meta.url`:

```js
var LIMITS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'limits.json')));
```

```ts
import { moduleDir } from '../compat/dirname.mjs';
const here = moduleDir(import.meta.url);
const LIMITS = JSON.parse(readFileSync(join(here, '..', 'config', 'limits.json'), 'utf8'));
```

### Loading CommonJS from ESM during the transition

While both module systems coexist in this workspace, ESM code can still reach a module that has
not migrated yet:

```ts
import { requireFromEsm } from '../compat/legacyRequire.mjs';
const legacyRequire = requireFromEsm(import.meta.url);
const legacyService = legacyRequire('../services/ticketService');
```

Bind it to a name other than `require`. Shadowing the CommonJS global makes the bridge invisible
in review, which is the opposite of what a debt marker is for.

Use this only as a transition bridge. Every use is migration debt to remove at the end.

### package type field

**Do not add `"type": "module"` during a route migration.** One workspace holds every remaining
CommonJS `.js` file, and that field is read package-wide: flipping it converts all of them at
once and breaks every module that has not migrated yet.

ESM is carried by the file extension instead. A `.mts` source is ESM regardless of the package
field, and emits `.mjs`. That is what makes an in-place migration incremental — each migrated
file opts itself in, and the package field stays untouched until the platform checkpoint, when
there is no CommonJS left for it to break.

| Package field | Extension | Module system |
|---|---|---|
| absent | `.js` | CommonJS |
| absent | `.mts` -> `.mjs` | ESM |

A consequence worth planning for: a CommonJS `app.js` cannot mount an ESM router by a normal
`require()`. A migrated route is therefore contract-verified on its own before it is wired in,
and wiring happens in the platform checkpoint that flips the package field.

## Express 4 to Express 5 differences that affect routes

- **Route params are typed `string | string[]`.** Declare the shape a handler expects:
  `(req: Request<{ id: string }>, res: Response)`.
- **Handlers should not return the response object.** Express 4 code commonly writes
  `return res.status(404).json(...)`. In TypeScript with Express 5, send the response and
  return separately so the handler's return type stays `void`.
- **Rejected promises propagate to the error handler**, so async handlers no longer need a
  manual try/catch purely to forward errors.
- **`res.status()` with an invalid code throws** rather than silently coercing.

The route checkpoint still runs on Express 4, so write against these rules now: both the params
shape and the `void` return are valid on Express 4 as well, and applying them here means the
platform checkpoint upgrades the dependency without rewriting the route a second time.

## Route validation checklist

Run all four after migrating a route slice, in this order. Each catches a different class of
failure, and a later gate cannot substitute for an earlier one.

| Gate | Command | Tool | Catches |
|---|---|---|---|
| 1 | `npm run lint:migration` | ESLint | style violations, unused code left behind by the conversion |
| 2 | `npm run typecheck:migration` | TypeScript type-check (`tsc --noEmit`) | type errors, including the `string \| string[]` params shape above |
| 3 | `npm run build:migration` | TypeScript build validation (`tsc`) | emit failures that `--noEmit` does not surface |
| 4 | `npm run test:route:migration` | focused Vitest route tests | behavior changes in the migrated route |

```bash
npm run lint:migration
npm run typecheck:migration
npm run build:migration
npm run test:route:migration
```

Then confirm the external contract is unchanged:

- route path is identical
- HTTP status codes are identical for success and every error case
- the response field set is identical, with no field added, removed, or renamed
- status transition behavior is unchanged

## Rollback

Before starting a checkpoint, record the current commit. If any validation gate fails and the
cause is not obvious within one fix attempt, return to that commit rather than accumulating
partial changes.

A checkpoint is only complete when all four gates pass **and** the external contract is verified
unchanged.

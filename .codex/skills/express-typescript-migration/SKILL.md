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
| Entry | `apps/legacy-ticket-api/app.js` | `apps/api/src/app.ts` |

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
// ESM — note the explicit .js extension, which is required even from TypeScript
import express from 'express';
import * as service from '../services/ticketService.js';
```

ESM requires the file extension in relative import paths. TypeScript sources still write `.js`
because the extension refers to the emitted file, not the source.

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
import { moduleDir } from '../compat/dirname.js';
const here = moduleDir(import.meta.url);
const LIMITS = JSON.parse(readFileSync(join(here, '..', 'config', 'limits.json'), 'utf8'));
```

### Loading CommonJS from ESM during the transition

While both services coexist, ESM code can still reach a CommonJS module:

```ts
import { requireFromEsm } from '../compat/legacyRequire.js';
const require = requireFromEsm(import.meta.url);
const legacyService = require('../../legacy-ticket-api/services/ticketService');
```

Use this only as a transition bridge. Every use is migration debt to remove at the end.

### package type field

The target package must declare `"type": "module"`. The legacy package must not. Two workspaces
with different module systems is expected mid-migration and is not a misconfiguration.

## Express 4 to Express 5 differences that affect routes

- **Route params are typed `string | string[]`.** Declare the shape a handler expects:
  `(req: Request<{ id: string }>, res: Response)`.
- **Handlers should not return the response object.** Express 4 code commonly writes
  `return res.status(404).json(...)`. In TypeScript with Express 5, send the response and
  return separately so the handler's return type stays `void`.
- **Rejected promises propagate to the error handler**, so async handlers no longer need a
  manual try/catch purely to forward errors.
- **`res.status()` with an invalid code throws** rather than silently coercing.

## Route validation checklist

Run all four after migrating a route slice, in this order. Each catches a different class of
failure, and a later gate cannot substitute for an earlier one.

| Gate | Command | Tool | Catches |
|---|---|---|---|
| 1 | `npm run lint` | ESLint | style violations, unused code left behind by the conversion |
| 2 | `npm run typecheck` | TypeScript type-check (`tsc --noEmit`) | type errors, including the `string \| string[]` params shape above |
| 3 | `npm run build` | TypeScript build validation (`tsc`) | emit failures that `--noEmit` does not surface |
| 4 | `npm run test:route` | focused Vitest route tests | behavior changes in the migrated route |

```bash
npm run lint
npm run typecheck
npm run build
npm run test:route
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

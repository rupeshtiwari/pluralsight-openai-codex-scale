# CommonJS to ESM compatibility

The SupportHub ticket service migrates in place. While that is happening, `supporthub-api/migration/`
holds CommonJS JavaScript and ESM TypeScript at the same time. That mixed state is expected.

This document is the concrete boundary. Every item below has code behind it.

## The four conversions

### 1. `require()` becomes `import`

```js
// CommonJS
var express = require('express');
var service = require('../services/ticketService');
```

```ts
// ESM — the extension is required, even from TypeScript
import express from 'express';
import * as service from '../services/ticketService.js';
```

ESM requires the file extension on relative imports. TypeScript sources write `.js` because the
extension names the emitted file, not the source.

### 2. `module.exports` has two shapes, and they are not interchangeable

```js
module.exports = createApp;                 // single value
module.exports = { get, create, reset };    // named bag
```

```ts
export default function createApp() { ... }   // from module.exports = fn
export function get() { ... }                 // from module.exports = { get }
```

This is the most common way a migration breaks. A module using `module.exports = fn`, imported as
`import { fn } from '...'`, is `undefined` **at runtime** — there is no compile error to catch it.

Check which shape a module uses before converting its importers.

In this service:

| Module | Shape | Becomes |
|---|---|---|
| `app.js` | `module.exports = createApp` | default export |
| `routes/tickets.js` | `module.exports = router` | default export |
| `services/ticketService.js` | named bag | named exports |
| `models/ticket.js` | named bag | named exports |
| `auth/apiKey.js` | `module.exports = requireApiKey` | default export |

### 3. `__dirname` does not exist in ESM

The service reads its limits from disk relative to its own location:

```js
var LIMITS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'config', 'limits.json'), 'utf8')
);
```

```ts
import { moduleDir } from '../compat/dirname.js';

const here = moduleDir(import.meta.url);
const LIMITS = JSON.parse(readFileSync(join(here, '..', 'config', 'limits.json'), 'utf8'));
```

Implemented in `supporthub-api/migration/compat/dirname.ts`.

### 4. ESM cannot `require()` an unmigrated module

While both module systems coexist, migrated code still needs to reach unmigrated code:

```ts
import { requireFromEsm } from '../compat/legacyRequire.js';

const require = requireFromEsm(import.meta.url);
const service = require('../services/ticketService');
```

Implemented in `supporthub-api/migration/compat/legacyRequire.ts`.

Every use of this bridge is migration debt. It is removed when the module it reaches for has itself
migrated. Count the uses: that number should only ever fall.

## The package `type` field

The target declares `"type": "module"`. The source must not, or every remaining `.js` file breaks at
once. Flipping that field is a platform change affecting the whole workspace, so it belongs in the
platform checkpoint rather than in any route migration.

## What the toolchain already allows

`tsconfig.json` in this workspace sets:

```json
{ "allowJs": true, "checkJs": false }
```

JavaScript is allowed alongside TypeScript and is not type-checked. That is what lets `typecheck`
and `build` pass on the baseline before any route has migrated.

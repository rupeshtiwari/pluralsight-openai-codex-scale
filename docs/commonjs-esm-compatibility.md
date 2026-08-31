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
import * as service from '../services/ticketService.mjs';
```

ESM requires the file extension on relative imports, and the extension names the emitted file
rather than the source. A `.mts` source emits `.mjs`, so that is what its importers write. See
[the package `type` field](#the-package-type-field) below for why the sources are `.mts`.

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
import { moduleDir } from '../compat/dirname.mjs';

const here = moduleDir(import.meta.url);
const LIMITS = JSON.parse(readFileSync(join(here, '..', 'config', 'limits.json'), 'utf8'));
```

Implemented in `supporthub-api/migration/compat/dirname.mts`.

### 4. ESM cannot `require()` an unmigrated module

While both module systems coexist, migrated code still needs to reach unmigrated code:

```ts
import { requireFromEsm } from '../compat/legacyRequire.mjs';

const legacyRequire = requireFromEsm(import.meta.url);
const service = legacyRequire('../services/ticketService');
```

Implemented in `supporthub-api/migration/compat/legacyRequire.mts`. Bind it to a name other than
`require`: shadowing the CommonJS global hides the bridge from review, and the whole point of the
bridge is to be countable.

Every use of this bridge is migration debt. It is removed when the module it reaches for has itself
migrated. Count the uses: that number should only ever fall.

## The package `type` field

Source and target are the same package here, so the field cannot simply be flipped: it is read
package-wide, and setting it converts every remaining `.js` file at once. That is a platform
change, and it belongs in the platform checkpoint rather than in any route migration.

Migrated code carries ESM in its **file extension** instead. A `.mts` source is ESM whatever the
package field says, and emits `.mjs`:

| Package field | Extension | Module system |
|---|---|---|
| absent | `.js` | CommonJS |
| absent | `.mts` -> `.mjs` | ESM |

This is what makes the migration incremental. Each converted file opts itself in, one at a time,
and nothing that has not moved yet is affected.

It has one consequence worth planning for. A CommonJS `app.js` cannot mount an ESM router through
a normal `require()`, so a migrated route is verified against the contract **on its own** — mounted
on a bare Express app inside its test — before anything wires it into the running service. Wiring
happens in the platform checkpoint, once the field flips and there is no CommonJS left to break.

## What the toolchain already allows

`tsconfig.json` in this workspace sets:

```json
{ "allowJs": true, "checkJs": false }
```

JavaScript is allowed alongside TypeScript and is not type-checked. That is what lets `typecheck`
and `build` pass on the baseline before any route has migrated.

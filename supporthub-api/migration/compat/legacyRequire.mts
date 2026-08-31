/**
 * CommonJS-to-ESM compatibility: loading not-yet-migrated modules.
 *
 * While the migration is in progress this workspace holds both CommonJS and
 * ESM modules. An ESM module cannot `require()` directly, so migrated code
 * reaches back into unmigrated code through a `require` built from the calling
 * module's own URL.
 *
 * The two CommonJS export shapes are NOT interchangeable, and confusing them
 * fails at runtime rather than at compile time:
 *
 *   module.exports = createApp        ->  default import
 *   module.exports = { get, create }  ->  named imports
 *
 * Every use of this bridge is migration debt. It is removed when the module it
 * reaches for has itself migrated.
 */
import { createRequire } from 'node:module';

export function requireFromEsm(importMetaUrl: string): NodeRequire {
  return createRequire(importMetaUrl);
}

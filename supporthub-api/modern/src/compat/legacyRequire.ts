import { createRequire } from 'node:module';

/**
 * Load a CommonJS module from ESM.
 *
 * The legacy ticket service is CommonJS and cannot be imported directly while
 * it is mid-migration. `createRequire` builds a `require` bound to the calling
 * ESM module's URL so those modules stay reachable during the transition.
 *
 * A CommonJS module using `module.exports = fn` arrives as the function itself,
 * whereas `exports.fn = fn` arrives as an object with an `fn` property. Check
 * which shape a module uses before destructuring it.
 */
export function requireFromEsm(importMetaUrl: string): NodeRequire {
  return createRequire(importMetaUrl);
}

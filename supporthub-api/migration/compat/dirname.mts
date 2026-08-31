/**
 * CommonJS-to-ESM compatibility: directory resolution.
 *
 * `__dirname` is a CommonJS-only global. This service reads its configuration
 * relative to the module's own location, so every module that migrates to ESM
 * needs a replacement before it can move.
 *
 * CommonJS:  path.join(__dirname, '..', 'config', 'limits.json')
 * ESM:       join(moduleDir(import.meta.url), '..', 'config', 'limits.json')
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function moduleDir(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}

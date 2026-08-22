import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * ESM has no `__dirname`. Modules that need a directory path derive it from
 * `import.meta.url` instead.
 *
 * CommonJS:  const here = __dirname;
 * ESM:       const here = moduleDir(import.meta.url);
 */
export function moduleDir(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}

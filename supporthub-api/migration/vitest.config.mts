import { defineConfig } from 'vitest/config';

// Focused route tests for the migrated slice. The CommonJS baseline is
// exercised by the node:test suite via `npm test`; this config exists so a
// migrated ESM TypeScript route has somewhere to be tested from day one.
//
// This file is `.mts` for the same reason the migrated code is: the package
// cannot declare `"type": "module"` without breaking every remaining `.js`
// file, so ESM is carried by the extension instead.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.route.test.mts'],
    passWithNoTests: true,
  },
});

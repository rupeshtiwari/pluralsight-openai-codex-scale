import { defineConfig } from 'vitest/config';

// Focused route tests for the migrated slice. The CommonJS baseline is
// exercised by the node:test suite via `npm test`; this config exists so a
// migrated TypeScript route has somewhere to be tested from day one.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.route.test.ts'],
    passWithNoTests: true,
  },
});

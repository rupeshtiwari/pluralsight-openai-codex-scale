'use strict';

const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

// This workspace holds CommonJS JavaScript and, as the migration proceeds,
// ESM TypeScript alongside it. Both must lint, under different parser settings.
module.exports = tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      // Same reason as the modern workspace: two sibling TypeScript roots under
      // one repository, so the parser root cannot be inferred by an editor.
      parserOptions: { tsconfigRootDir: __dirname },
    },
  },
);

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        // Set explicitly because this repository holds two sibling TypeScript
        // workspaces. The CLI infers a root from its working directory, but the
        // VS Code ESLint extension scans from the repository root, finds both
        // candidates, and refuses to guess -- putting a parsing error badge on
        // every open .ts tab while the command line stays green.
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
);

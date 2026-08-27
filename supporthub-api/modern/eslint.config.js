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
      // Off, to match "noUnusedLocals": false in tsconfig.json.
      //
      // This workspace is a teaching seed: ticketService.ts deliberately holds
      // two dead private helpers, toPriority and validateNewTicket, and clip 2's
      // first step exists for Codex to find them. As a warning this rule put a
      // yellow badge on the tab for the whole six-minute clip, and an
      // unexplained badge reads as a defect in the thing being taught.
      //
      // Suppressed here rather than with an eslint-disable comment in the source.
      // An inline disable sits two lines above toPriority and says "this is
      // unused" in the exact file the learner is watching Codex analyse, which
      // gives away the finding. Nothing in src/ is annotated; the seed stays
      // silent and the tab stays clean.
      //
      // Turned off workspace-wide rather than scoped to ticketService.ts on
      // purpose: a file-scoped exemption naming that one file is itself a
      // pointer to the seed. Nothing here names it.
      //
      // The dead helpers are asserted by 'scripts/check.mjs c2-seed-shape',
      // which also fails if an eslint-disable ever appears in the source, and
      // the clean tab by 'modern-workspace-lint-silent'.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
);

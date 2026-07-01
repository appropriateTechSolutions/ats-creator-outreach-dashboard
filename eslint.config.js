import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

// Flat config (ESLint 9). Non-type-checked preset for speed — we lint syntax and
// React/a11y correctness, not full type-aware rules (that needs parserOptions.project
// and is much slower). Type safety is covered separately by `npm run typecheck`.
//
// Ratchet strategy (Phase 0): the high-volume, pre-existing issues (`any`, unused
// vars, effect deps, a11y, unescaped entities) are set to `warn` so `npm run lint`
// exits 0 today and CI stays green, while the warning count is the burn-down
// backlog we drive to zero in Phases 1 and 7 (then flip these to `error`).
// Genuine-bug rules (react-hooks/rules-of-hooks) stay `error`.
export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      'src/vite-env.d.ts',
      '**/*.config.js',
      '**/*.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    // Register react-hooks manually: this plugin version's `recommended-latest`
    // preset ships a legacy `plugins: [...]` array that ESLint 9 flat config
    // rejects, so we wire the plugin object here and set its rules below.
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // React 17+ automatic JSX runtime — no need to import React into scope.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // --- Ratchet to warn (burn-down backlog; see header) ---
      '@typescript-eslint/no-explicit-any': 'warn', // Phase 1 + 7
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'react-hooks/exhaustive-deps': 'warn',

      // Accessibility (Phase 6 pass): these were driven to zero, so they're now
      // hard errors to prevent regression. `label-has-associated-control` stays
      // `warn` — 2 known false positives remain (labels wrapping an sr-only
      // checkbox that the rule's nested-text heuristic doesn't credit).
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/anchor-is-valid': 'error',

      // Low value under React's auto-escaping; unescaped apostrophes render fine.
      'react/no-unescaped-entities': 'off',

      // Phase 7 (L7): all console.* goes through `src/lib/logger` (the single
      // choke point for prod noise + the future observability sink). Enforced.
      'no-console': 'error',

      // Genuine-bug rule — keep hard.
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    // The logger is the one place raw console.* is allowed.
    files: ['src/lib/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Test + setup files run under Node/Vitest; console is fine there.
    files: ['**/*.{test,spec}.{ts,tsx}', 'src/test/**'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
);

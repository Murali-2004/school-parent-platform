// ---------------------------------------------------------------------------
// ESLint flat config. Intentionally light: catch real mistakes (unused vars,
// undeclared globals, unreachable code) without fighting the existing style.
// ---------------------------------------------------------------------------
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'coverage/**', '.nyc_output/**'],
  },
  js.configs.recommended,
  {
    // The codebase sprinkles `// eslint-disable-next-line no-console` as
    // future-proofing; with `no-console` off those are harmless, so don't
    // flag them as unused.
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // `_next`, `_req`, `_res` etc. are deliberate "unused by contract" params.
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // This is a backend service — structured console logging is expected.
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Tests use the Node built-in test runner globals.
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];

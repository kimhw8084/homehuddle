// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'dist-native-check/**', 'ios/**', 'android/**'],
  },
  {
    // SDK 55+ adds Compiler diagnostics. Compiler remains disabled in app.json.
    // Keep this existing legacy debt visible without weakening the strict core gate.
    files: [
      'app/(app)/(tabs)/{chores,index,market,wallet}.tsx',
      'app/(app)/profile.tsx', 'app/(app)/settings/{about,help,household,invite,notifications}.tsx',
      'app/_layout.tsx', 'app/index.tsx', 'app/onboarding/{accept-invite,done}.tsx',
      'components/ChoreModals.tsx', 'components/WeeklyMenuSection.tsx',
      'components/games/RandomAssignmentGames.tsx', 'features/demo/**/*.tsx',
      'hooks/use-color-scheme.web.ts', 'hooks/use-household-bootstrap.ts', 'hooks/use-operation-scope.ts',
    ],
    rules: {
      'react-hooks/static-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // The restored authored screens are being modernized in place; keep these
      // presentation-only diagnostics visible without blocking unrelated gates.
      'react/display-name': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: { globals: { Deno: 'readonly' } },
    rules: { 'import/no-unresolved': ['error', { ignore: ['^npm:'] }] },
  },
  {
    // k6 is a separate runtime, not a Node/Metro dependency.
    files: ['load-tests/**/*.js'],
    languageOptions: { globals: { __ENV: 'readonly', __VU: 'readonly', __ITER: 'readonly' } },
    settings: { 'import/core-modules': ['k6', 'k6/http', 'k6/metrics'] },
  },
]);

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // k6 is a separate runtime, not a Node/Metro dependency.
    files: ['load-tests/**/*.js'],
    languageOptions: { globals: { __ENV: 'readonly', __VU: 'readonly', __ITER: 'readonly' } },
    settings: { 'import/core-modules': ['k6', 'k6/http', 'k6/metrics'] },
  },
]);

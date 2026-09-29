import js from '@eslint/js';
import globals from 'globals';
import astro from 'eslint-plugin-astro';
import tsParser from '@typescript-eslint/parser';
export default [
  { ignores: ['dist/**', '.astro/**', '.netlify/**', '.audit/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...astro.configs['flat/recommended'],
  { files: ['**/*.astro'], languageOptions: { parserOptions: { parser: tsParser } } },
  { languageOptions: { globals: { ...globals.browser, ...globals.node }, ecmaVersion: 'latest', sourceType: 'module' }, rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }] } },
];

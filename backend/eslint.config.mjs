import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'scripts/**/*.js', 'api/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        global: 'readonly',
        process: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-case-declarations': 'warn',
      'no-empty': 'warn',
      'no-unused-vars': 'warn',
      'no-useless-escape': 'warn',
    },
  },
];

module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'airbnb-base',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    // Disable some rules that are too strict for this project
    'no-console': 'warn',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'no-unused-vars': 'warn',
    'max-len': ['warn', { code: 120 }],
    'no-param-reassign': 'off',
    'consistent-return': 'off',
    'no-restricted-globals': 'off',
    'import/prefer-default-export': 'off',
    'class-methods-use-this': 'off',
    // React-specific rules (even though we don't have the React plugin)
    'no-undef': 'off', // React JSX creates undefined variables
  },
  globals: {
    React: 'readonly',
    JSX: 'readonly',
  },
};
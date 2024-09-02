module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['standard-with-typescript', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-var-requires': 'off',
  },
  plugins: ['prettier'],
  ignorePatterns: ['dist/', 'tests/'],
}

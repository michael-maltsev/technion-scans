module.exports = {
  env: {
    browser: true,
    jquery: true
  },
  extends: [
    'eslint-config-airbnb-es5'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 5
  },
  rules: {
    "linebreak-style": 0,
    "strict": 0,
    "no-alert": 0,
    "indent": ["error", 4],
    "func-names": ["error", "never"]
  },
};

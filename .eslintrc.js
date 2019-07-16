/**
 * @author: Dan
 * @dev Lints our code and autoformats it using ESLint and Prettier
 * @dev Inclues `globals` that are typically injected by Web3 or Truffle
 * @dev See https://blog.echobind.com/integrating-prettier-eslint-airbnb-style-guide-in-vscode-47f07b5d7d6a
 */
module.exports = {
  env: {
    mocha: true,
    es6: true
  },
  plugins: ['mocha', 'prettier'],
  extends: ['airbnb-base', 'prettier'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    web3: false,
    artifacts: true,
    assert: false,
    contract: false
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  rules: {
    'mocha/no-exclusive-tests': 'error',
    'prettier/prettier': 'error',
    'prefer-template': 'off',
    'no-unused-vars': 'off'
  }
};

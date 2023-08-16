/* eslint-env node */
module.exports = {
  extends: [
    'airbnb-base',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:jsx-a11y/recommended',
    'plugin:react/jsx-runtime',
    'plugin:css/recommended',
  ],
  plugins: ['@typescript-eslint', 'jsx-a11y', 'css'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  root: true,
  ignorePatterns: ['electron/proverlib/pagesigner/', "generate-pagesigner-compatible-certs.js", ".eslintrc.js", 'build/', 'cache/', 'scripts/'],

  rules: {
    'max-len': ['warn', { code: 140, tabWidth: 2 }],
    indent: ['warn', 2, { SwitchCase: 1 }],
    'import/no-unresolved': 0,
    'no-shadow': 0,
    "@typescript-eslint/no-shadow": 1,
    'prefer-const': 1,
    'import/extensions': ['error', {
      'js': 'never', 'ts': 'never', 'json': 'always'
    }],
    '@typescript-eslint/member-delimiter-style': ['error', {
      multiline: {
        delimiter: 'none',
        requireLast: false,
      },
    }],
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: true,
        },
      },
    ],
    '@typescript-eslint/camelcase': 0,
    'class-methods-use-this': 0,
    'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement', 'default'],
    'no-restricted-exports': 0,
    'no-continue': 0,

    // from zkportal
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'object-curly-spacing': ['warn', 'always'],
    'prettier/prettier': 'off',
    'no-use-before-define': 'off',
    'no-else-return': 'warn',
    'react/forbid-prop-types': 'off',
    'no-unsafe-optional-chaining': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-one-expression-per-line': 'off',
    'react/no-unescaped-entities': 'off',
    'prefer-promise-reject-errors': 'warn',
    'no-plusplus': 'off',
    'no-empty': 'warn',
    'no-await-in-loop': 'off',
    'react/destructuring-assignment': 'off',
    'no-unused-vars': ['warn'],
    'no-bitwise': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'no-console': 'off',
    'react/self-closing-comp': ['error', {
      component: true,
      html: true,
    }],
    'import/prefer-default-export': 0,

    '@typescript-eslint/restrict-template-expressions': 0,
    '@typescript-eslint/no-misused-promises': 0,
    '@typescript-eslint/no-unsafe-return': 1,
    '@typescript-eslint/no-unsafe-assignment': 1,
    '@typescript-eslint/no-floating-promises': 0,
    '@typescript-eslint/no-unsafe-argument': 'warn',
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    '@typescript-eslint/no-unsafe-member-access': 0,
    '@typescript-eslint/no-unsafe-call': 0,
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    'jsx-a11y/alt-text': 0,
    'jsx-a11y/click-events-have-key-events': 0,
    'no-multi-spaces': 1,
    '@typescript-eslint/key-spacing': 'error',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal'],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
      },
    ],
  },
};

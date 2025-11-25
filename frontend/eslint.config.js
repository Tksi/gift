import stylistic from '@stylistic/eslint-plugin';
import pluginTs from '@typescript-eslint/eslint-plugin';
import parserTs from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import jsdoc from 'eslint-plugin-jsdoc';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  {
    rules: {
      'vue/no-multiple-template-root': 'off',
      'vue/require-default-prop': 'off',
      'no-irregular-whitespace': 'off',
    },
  },
  eslintConfigPrettier,
).prepend(
  {
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslintPluginUnicorn.configs.recommended,
  jsdoc.configs['flat/recommended'],
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      ...pluginTs.configs['recommended-type-checked'].rules,
      ...pluginTs.configs['stylistic-type-checked'].rules,
      'vue/require-macro-variable-name': 'error',
      'vue/define-emits-declaration': ['error', 'type-literal'],
      'vue/define-props-declaration': 'error',
      'vue/v-on-handler-style': ['error', 'inline-function'],
      'vue/no-sparse-arrays': 'error',
      'vue/no-loss-of-precision': 'error',
      'vue/no-empty-pattern': 'error',
      'vue/no-constant-condition': 'error',
      'vue/eqeqeq': ['error', 'always', { null: 'ignore' }],
      'vue/camelcase': ['error', { properties: 'never' }],
      'vue/no-console': [
        'warn',
        { allow: ['time', 'timeEnd', 'info', 'warn', 'error', 'debug'] },
      ],
      'vue/block-order': ['warn', { order: ['script', 'template', 'style'] }],
      'vue/block-tag-newline': 'warn',
      'vue/define-macros-order': 'warn',
      'vue/html-comment-content-newline': 'warn',
      'vue/html-comment-content-spacing': 'warn',
      'vue/html-comment-indent': 'warn',
      'vue/no-empty-component-block': 'warn',
      'vue/padding-line-between-blocks': 'warn',
      'vue/prefer-separate-static-class': 'warn',
      'vue/static-class-names-order': 'warn',
      'vue/v-for-delimiter-style': 'warn',
      'vue/attributes-order': ['warn', { alphabetical: true }],
      'vue/html-self-closing': ['warn', { html: { void: 'always' } }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      camelcase: ['error', { properties: 'never' }],
      'func-style': 'error',
      'guard-for-in': 'error',
      'preserve-caught-error': 'warn',
      'max-depth': 'warn',
      'array-callback-return': 'warn',
      'no-implicit-coercion': 'warn',
      'no-param-reassign': ['warn', { props: true }],
      curly: ['warn', 'multi-line'],
      'no-console': [
        'warn',
        { allow: ['time', 'timeEnd', 'info', 'warn', 'error', 'debug'] },
      ],
      'sort-imports': ['warn', { ignoreDeclarationSort: true }],
      'unicorn/catch-error-name': [
        'warn',
        {
          name: 'err',
        },
      ],
      'unicorn/filename-case': [
        'warn',
        {
          cases: {
            camelCase: true,
            pascalCase: true,
          },
        },
      ],
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/no-await-expression-member': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/prefer-ternary': 'off',
      'unicorn/no-null': 'off',
      'unicorn/prefer-native-coercion-function': 'off',
      'unicorn/no-new-array': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/prefer-array-index-of': 'off',
      'unicorn/prefer-dom-node-text-content': 'off',
      'unicorn/prefer-includes': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/text-encoding-identifier-case': 'off',
      'unicorn/no-unreadable-array-destructuring': 'off',
      'jsdoc/require-jsdoc': [
        'warn',
        {
          publicOnly: true,
          enableFixer: false,
          require: {
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            ClassExpression: true,
            FunctionDeclaration: true,
            FunctionExpression: true,
          },
        },
      ],
      'jsdoc/require-description': [
        'warn',
        {
          contexts: [
            'ArrowFunctionExpression',
            'ClassDeclaration',
            'ClassExpression',
            'FunctionDeclaration',
            'FunctionExpression',
          ],
        },
      ],
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/require-param-type': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/naming-convention': [
        'warn',
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
      '@typescript-eslint/sort-type-constituents': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@stylistic/spaced-comment': 'warn',
      '@stylistic/padding-line-between-statements': [
        'warn',
        {
          blankLine: 'always',
          prev: '*',
          next: [
            'block-like',
            'return',
            'throw',
            'export',
            'break',
            'continue',
          ],
        },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        {
          blankLine: 'never',
          prev: ['case', 'default'],
          next: ['case', 'default'],
        },
        { blankLine: 'always', prev: '*', next: 'type' },
        { blankLine: 'always', prev: 'type', next: '*' },
      ],
      'import/newline-after-import': 'warn',
      'import/no-duplicates': 'warn',
      'import/no-default-export': 'warn',
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'never',
          alphabetize: { order: 'asc' },
        },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}'],
    rules: {
      'import/no-default-export': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['{middleware,plugins,server}/**/*.{js,ts}'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['pages/**/*.vue'],
    rules: {
      'unicorn/filename-case': [
        'warn',
        {
          cases: {
            camelCase: true,
            kebabCase: true,
          },
        },
      ],
    },
  },
);

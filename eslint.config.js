import react from 'eslint-plugin-react'
import hooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': hooks,
      'react-refresh': reactRefresh,
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: false,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...prettier.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]

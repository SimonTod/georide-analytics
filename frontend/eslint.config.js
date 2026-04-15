import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  ...tsPlugin.configs['flat/recommended'],
  reactHooks.configs['recommended-latest'],
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',  // noUnusedLocals/Params dans tsconfig
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]

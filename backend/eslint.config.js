import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  ...tsPlugin.configs['flat/recommended'],
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tsParser },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',  // TypeScript strict le couvre déjà
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]

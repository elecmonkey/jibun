import nuxt from '@nuxt/eslint-config/flat'

export default [
  ...nuxt(),
  {
    ignores: [
      'node_modules/**',
      '.nuxt/**',
      '.output/**',
      'dist/**',
      'generated/**',
      'public/**',
      'coverage/**',
    ],
  },
]

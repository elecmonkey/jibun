import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt([
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
  {
    rules: {
      'vue/no-v-html': 'off',
    },
  },
])

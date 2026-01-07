import { defineVuetifyConfiguration } from 'vuetify-nuxt-module/custom-configuration'

export default defineVuetifyConfiguration({
  theme: {
    defaultTheme: 'JibunDark',
    themes: {
      JibunLight: {
        dark: false,
        colors: {
          background: '#f5f6f7',
          surface: '#ffffff',
          primary: '#111318',
          secondary: '#3d566e',
          accent: '#ff6b35',
        },
      },
      JibunDark: {
        dark: true,
        colors: {
          background: '#0c0f12',
          surface: '#13171b',
          primary: '#f5f6f7',
          secondary: '#a7b3c0',
          accent: '#ff6b35',
        },
      },
    },
  },
})

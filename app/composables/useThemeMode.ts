import { useTheme } from 'vuetify'

const LIGHT_THEME = 'JibunLight'
const DARK_THEME = 'JibunDark'

export const useThemeMode = () => {
  const theme = useTheme()
  const mode = useState<string>('Jibun-theme', () => DARK_THEME)

  onMounted(() => {
    if (!import.meta.client) {
      return
    }
    const stored = window.localStorage.getItem('Jibun_theme')
    if (stored) {
      mode.value = stored
    }
    theme.global.name.value = mode.value
  })

  const toggle = () => {
    if (!import.meta.client) {
      return
    }
    mode.value = mode.value === DARK_THEME ? LIGHT_THEME : DARK_THEME
    theme.global.name.value = mode.value
    window.localStorage.setItem('Jibun_theme', mode.value)
  }

  return {
    mode,
    toggle,
    isDark: computed(() => mode.value === DARK_THEME),
  }
}

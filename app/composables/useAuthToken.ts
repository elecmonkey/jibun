export const useAuthToken = () => {
  const token = useState<string>('Jibun-auth-token', () => '')

  if (import.meta.client && token.value === '') {
    const stored = window.localStorage.getItem('Jibun_auth_token')
    if (stored) {
      token.value = stored
    }
  }

  const setToken = (value: string) => {
    token.value = value
    if (import.meta.client) {
      window.localStorage.setItem('Jibun_auth_token', value)
    }
  }

  const clearToken = () => {
    token.value = ''
    if (import.meta.client) {
      window.localStorage.removeItem('Jibun_auth_token')
    }
  }

  return {
    token,
    setToken,
    clearToken,
  }
}

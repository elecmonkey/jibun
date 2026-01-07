export const useAuthToken = () => {
  const token = useState<string>('Jibun-auth-token', () => '')
  const role = useState<string>('Jibun-auth-role', () => '')

  if (import.meta.client && token.value === '') {
    const stored = window.localStorage.getItem('Jibun_auth_token')
    if (stored) {
      token.value = stored
    }
    const storedRole = window.localStorage.getItem('Jibun_auth_role')
    if (storedRole) {
      role.value = storedRole
    }
  }

  const setToken = (value: string) => {
    token.value = value
    if (import.meta.client) {
      window.localStorage.setItem('Jibun_auth_token', value)
    }
  }

  const setRole = (value: string) => {
    role.value = value
    if (import.meta.client) {
      window.localStorage.setItem('Jibun_auth_role', value)
    }
  }

  const clearToken = () => {
    token.value = ''
    role.value = ''
    if (import.meta.client) {
      window.localStorage.removeItem('Jibun_auth_token')
      window.localStorage.removeItem('Jibun_auth_role')
    }
  }

  return {
    token,
    role,
    setToken,
    setRole,
    clearToken,
  }
}

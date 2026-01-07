export const useAuthToken = () => {
  const token = useState<string>('Jibun-auth-token', () => '')
  const role = useState<string>('Jibun-auth-role', () => '')
  const name = useState<string>('Jibun-auth-name', () => '')
  const email = useState<string>('Jibun-auth-email', () => '')

  if (import.meta.client && token.value === '') {
    const stored = window.localStorage.getItem('Jibun_auth_token')
    if (stored) {
      token.value = stored
    }
    const storedRole = window.localStorage.getItem('Jibun_auth_role')
    if (storedRole) {
      role.value = storedRole
    }
    const storedName = window.localStorage.getItem('Jibun_auth_name')
    if (storedName) {
      name.value = storedName
    }
    const storedEmail = window.localStorage.getItem('Jibun_auth_email')
    if (storedEmail) {
      email.value = storedEmail
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

  const setProfile = (displayName: string, address: string) => {
    name.value = displayName
    email.value = address
    if (import.meta.client) {
      window.localStorage.setItem('Jibun_auth_name', displayName)
      window.localStorage.setItem('Jibun_auth_email', address)
    }
  }

  const clearToken = () => {
    token.value = ''
    role.value = ''
    name.value = ''
    email.value = ''
    if (import.meta.client) {
      window.localStorage.removeItem('Jibun_auth_token')
      window.localStorage.removeItem('Jibun_auth_role')
      window.localStorage.removeItem('Jibun_auth_name')
      window.localStorage.removeItem('Jibun_auth_email')
    }
  }

  return {
    token,
    role,
    name,
    email,
    setToken,
    setRole,
    setProfile,
    clearToken,
  }
}

export const useAuthToken = () => {
  const token = useState<string>('Jibun-auth-token', () => '')
  const role = useState<string>('Jibun-auth-role', () => '')
  const name = useState<string>('Jibun-auth-name', () => '')
  const email = useState<string>('Jibun-auth-email', () => '')
  const avatar = useState<string>('Jibun-auth-avatar', () => '')

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
    const storedAvatar = window.localStorage.getItem('Jibun_auth_avatar')
    if (storedAvatar) {
      avatar.value = storedAvatar
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

  const setProfile = (displayName: string, address: string, avatarUrl = '') => {
    name.value = displayName
    email.value = address
    avatar.value = avatarUrl
    if (import.meta.client) {
      window.localStorage.setItem('Jibun_auth_name', displayName)
      window.localStorage.setItem('Jibun_auth_email', address)
      window.localStorage.setItem('Jibun_auth_avatar', avatarUrl)
    }
  }

  const clearToken = () => {
    token.value = ''
    role.value = ''
    name.value = ''
    email.value = ''
    avatar.value = ''
    if (import.meta.client) {
      window.localStorage.removeItem('Jibun_auth_token')
      window.localStorage.removeItem('Jibun_auth_role')
      window.localStorage.removeItem('Jibun_auth_name')
      window.localStorage.removeItem('Jibun_auth_email')
      window.localStorage.removeItem('Jibun_auth_avatar')
    }
  }

  return {
    token,
    role,
    name,
    email,
    avatar,
    setToken,
    setRole,
    setProfile,
    clearToken,
  }
}

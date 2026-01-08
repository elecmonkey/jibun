export default defineNuxtRouteMiddleware(() => {
  const { token, role } = useAuthToken()
  if (!token.value) {
    return navigateTo('/login')
  }
  if (role.value !== 'ADMIN') {
    return navigateTo('/')
  }
})

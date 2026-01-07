export default defineNuxtRouteMiddleware((to) => {
  const { token } = useAuthToken()
  if (!token.value && to.path.startsWith('/admin')) {
    return navigateTo('/login')
  }
})

<script setup lang="ts">
const route = useRoute()
const { setToken, setRole, setProfile } = useAuthToken()

const message = ref('登录中...')
const error = ref('')

const token = computed(() => String(route.query.token || '').trim())

const handleAutoLogin = async () => {
  if (!token.value) {
    error.value = '无效的登录链接'
    message.value = ''
    return
  }
  try {
    const resp = await $fetch<{ code: number; msg: string; data?: { token?: string; user?: { role?: string; displayName?: string | null; email?: string; avatarUrl?: string | null } } }>(
      '/api/auth/auto',
      {
        method: 'POST',
        body: { token: token.value },
      },
    )
    if (resp.code !== 1 || !resp.data?.token) {
      error.value = resp.msg || '自动登录失败'
      message.value = ''
      return
    }
    setToken(resp.data.token)
    if (resp.data.user?.role) {
      setRole(resp.data.user.role)
    }
    if (resp.data.user?.email) {
      setProfile(
        resp.data.user.displayName || resp.data.user.email,
        resp.data.user.email,
        resp.data.user.avatarUrl || '',
      )
    }
    await navigateTo('/')
  } catch {
    error.value = '自动登录失败'
    message.value = ''
  }
}

onMounted(() => {
  handleAutoLogin()
})
</script>

<template>
  <v-container class="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-12">
    <v-card class="w-full border border-black/10 bg-white/90 p-6 shadow-sm" rounded="lg" elevation="1">
      <div class="mb-2 text-base font-semibold text-black/80">自动登录</div>
      <div v-if="message" class="text-sm text-black/70">{{ message }}</div>
      <v-alert v-if="error" type="error" variant="tonal" class="mt-4">
        {{ error }}
      </v-alert>
    </v-card>
  </v-container>
</template>

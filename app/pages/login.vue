<script setup lang="ts">
const { setToken } = useAuthToken()

const email = ref('')
const password = ref('')
const error = ref('')

const login = async () => {
  error.value = ''
  try {
    const resp = await $fetch<{ code: number; msg: string; data?: { token?: string } }>('/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
      },
    })

    if (resp.code !== 1 || !resp.data?.token) {
      error.value = resp.msg || '登录失败'
      return
    }

    setToken(resp.data.token)
    await navigateTo('/admin')
  } catch {
    error.value = '登录失败'
  }
}
</script>

<template>
  <v-container class="py-12 login-wrap">
    <v-card class="panel-card mx-auto" rounded="md" elevation="1">
      <div class="text-subtitle-1 mb-4">登录</div>
      <v-text-field
        v-model="email"
        label="邮箱"
        variant="outlined"
        density="comfortable"
      />
      <v-text-field
        v-model="password"
        label="密码"
        variant="outlined"
        density="comfortable"
        type="password"
      />
      <v-btn color="accent" block @click="login">
        登录
      </v-btn>
      <v-alert v-if="error" type="error" variant="tonal" class="mt-4">
        {{ error }}
      </v-alert>
    </v-card>
  </v-container>
</template>

<style scoped>
.login-wrap {
  max-width: 420px;
}

.panel-card {
  background: rgba(var(--v-theme-surface), 0.98);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding: 20px;
}
</style>

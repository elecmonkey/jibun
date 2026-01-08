<script setup lang="ts">
const route = useRoute()
const token = computed(() => String(route.query.token || '').trim())

const email = ref('')
const password = ref('')
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error' | 'info'>('info')
const registeredEmail = ref('')

const { data: inviteInfo, pending } = useFetch('/api/invite/ech0', {
  query: { token },
})

const submit = async () => {
  if (!password.value.trim()) {
    messageType.value = 'error'
    message.value = '请输入密码'
    return
  }
  loading.value = true
  try {
    const resp = await $fetch<{ code: number; msg: string; data?: { token?: string; user?: { role?: string; displayName?: string | null; email?: string; avatarUrl?: string | null } } }>('/api/invite/ech0', {
      method: 'POST',
      body: { token: token.value, email: email.value, password: password.value },
    })
    if (resp.code !== 1) {
      messageType.value = 'error'
      message.value = resp.msg || '注册失败'
      return
    }
    if (resp.data?.token) {
      const { setToken, setRole, setProfile } = useAuthToken()
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
    }
    registeredEmail.value = email.value
    messageType.value = 'success'
    message.value = '注册成功'
    email.value = ''
    password.value = ''
    await navigateTo('/')
  } catch {
    messageType.value = 'error'
    message.value = '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="py-12 invite-wrap">
    <v-card class="panel-card mx-auto" rounded="md" elevation="1">
      <div class="text-subtitle-1 mb-2">接受邀请</div>
      <div v-if="pending" class="text-caption text-muted">加载中...</div>
      <div v-else-if="inviteInfo?.code !== 1" class="text-body-2">
        邀请链接无效或已过期。
      </div>
      <div v-else class="invite-body">
        <div class="d-flex align-center mb-4">
          <v-avatar size="52" class="me-3" color="surface-variant">
            <v-img v-if="inviteInfo.data?.logo" :src="inviteInfo.data.logo" />
            <v-icon v-else icon="mdi-account" />
          </v-avatar>
          <div class="invite-meta">
            <div class="invite-name">
              {{ inviteInfo.data?.sysUsername }}
            </div>
            <a
              class="invite-link"
              :href="inviteInfo.data?.serverUrl"
              target="_blank"
              rel="noopener"
            >
              {{ inviteInfo.data?.serverName }}
            </a>
          </div>
        </div>
        <v-text-field
          v-model="email"
          label="邮箱"
          variant="outlined"
          density="comfortable"
        />
        <v-text-field
          v-model="password"
          label="设置密码"
          type="password"
          variant="outlined"
          density="comfortable"
        />
        <v-btn color="accent" block :disabled="loading" @click="submit">
          注册
        </v-btn>
        <div v-if="registeredEmail" class="text-caption text-muted mt-3">
          你的登录邮箱是：{{ registeredEmail }}
        </div>
      </div>
      <v-alert v-if="message" :type="messageType" variant="tonal" class="mt-4">
        {{ message }}
      </v-alert>
    </v-card>
  </v-container>
</template>

<style scoped>
.invite-wrap {
  max-width: 420px;
}

.panel-card {
  background: rgba(var(--v-theme-surface), 0.98);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding: 20px;
}

.invite-link {
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-decoration: none;
}

.invite-link:hover {
  text-decoration: underline;
}

.invite-meta {
  display: flex;
  flex-direction: column;
  gap: 0px;
}

.invite-name {
  font-family: "Noto Serif SC", "Songti SC", "STSong", "Times New Roman", serif;
  font-size: 1.45rem;
  font-weight: 700;
}

.invite-link {
  font-size: 0.95rem;
  font-weight: 500;
}
</style>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { token, setProfile, role } = useAuthToken()

const form = reactive({
  email: '',
  displayName: '',
  avatarUrl: '',
  password: '',
})

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error' | 'info'>('info')

const loadProfile = async () => {
  loading.value = true
  try {
    const resp = await $fetch<{ code: number; data?: { email?: string; displayName?: string | null; avatarUrl?: string | null } }>(
      '/api/users/me',
      {
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
      },
    )
    if (resp.code === 1 && resp.data) {
      form.email = resp.data.email || ''
      form.displayName = resp.data.displayName || ''
      form.avatarUrl = resp.data.avatarUrl || ''
    }
  } finally {
    loading.value = false
  }
}

const saveProfile = async () => {
  saving.value = true
  try {
    const resp = await $fetch<{ code: number; msg: string; data?: { email?: string; displayName?: string | null; avatarUrl?: string | null } }>(
      '/api/users/me',
      {
        method: 'PUT',
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
        body: {
          email: form.email.trim(),
          displayName: form.displayName.trim(),
          avatarUrl: form.avatarUrl.trim(),
          password: form.password || undefined,
        },
      },
    )
    if (resp.code !== 1) {
      messageType.value = 'error'
      message.value = resp.msg || '保存失败'
      return
    }

    const updated = resp.data
    if (updated?.email) {
      setProfile(updated.displayName || updated.email, updated.email, updated.avatarUrl || '')
    }
    form.password = ''
    messageType.value = 'success'
    message.value = '已保存'
  } catch {
    messageType.value = 'error'
    message.value = '保存失败'
  } finally {
    setTimeout(() => {
      message.value = ''
    }, 3000)
    saving.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <v-container class="py-8 mine-wrap">
    <v-card class="panel-card" rounded="md">
      <div class="d-flex align-center justify-space-between mb-4">
        <div>
          <div class="text-subtitle-1">Mine</div>
          <div class="text-caption text-muted">管理你的个人信息。</div>
        </div>
        <v-chip variant="tonal" color="secondary">
          {{ role }}
        </v-chip>
      </div>

      <v-skeleton-loader v-if="loading" type="list-item-two-line" />
      <div v-else>
        <div class="d-flex align-center mb-4">
          <v-avatar size="52" class="me-3" color="surface-variant">
            <v-img v-if="form.avatarUrl" :src="form.avatarUrl" />
            <v-icon v-else icon="mdi-account" />
          </v-avatar>
          <div class="text-caption text-muted">头像预览</div>
        </div>
        <v-text-field v-model="form.email" label="邮箱" variant="outlined" density="compact" />
        <v-text-field v-model="form.displayName" label="显示名称" variant="outlined" density="compact" />
        <v-text-field v-model="form.avatarUrl" label="头像 URL" variant="outlined" density="compact" />
        <v-text-field v-model="form.password" label="新密码（可选）" type="password" variant="outlined" density="compact" />
        <v-btn color="accent" variant="flat" :disabled="saving" @click="saveProfile">
          保存
        </v-btn>
        <v-alert v-if="message" :type="messageType" variant="tonal" class="mt-4">
          {{ message }}
        </v-alert>
      </div>
    </v-card>
  </v-container>
</template>

<style scoped>
.mine-wrap {
  max-width: 720px;
}

.panel-card {
  background: rgba(var(--v-theme-surface), 0.98);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding: 20px;
}
</style>

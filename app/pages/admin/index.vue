<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { token } = useAuthToken()

const connectUrlInput = ref('')
const message = ref('')
const messageType = ref<'success' | 'error' | 'info'>('info')
const loading = ref(false)
const connectList = ref<Array<{ id: number; connectUrl: string; instanceType: string }>>([])
const displayInstanceType = (value: string) => {
  if (value === 'ECH0') {
    return 'Ech0'
  }
  if (value === 'JIBUN') {
    return 'Jibun'
  }
  return 'Unknown'
}

const sysUsername = ref('')
const serverName = ref('')
const serverUrl = ref('')
const serverLogo = ref('')

const refreshConnects = async () => {
  loading.value = true
  try {
    const resp = await $fetch<{ code: number; data: Array<{ id: number; connectUrl: string; instanceType: string }> }>('/api/connect/list')
    if (resp.code === 1) {
      connectList.value = resp.data
    }
  } finally {
    loading.value = false
  }
}

const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
  messageType.value = type
  message.value = text
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

const addConnect = async () => {
  if (!connectUrlInput.value.trim()) {
    showMessage('error', '请输入连接地址')
    return
  }

  try {
    const resp = await $fetch<{ code: number; msg: string }>('/api/addConnect', {
      method: 'POST',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
      body: { connect_url: connectUrlInput.value.trim() },
    })

    if (resp.code !== 1) {
      showMessage('error', resp.msg || '添加失败')
      return
    }

    connectUrlInput.value = ''
    showMessage('success', '已添加连接')
    await refreshConnects()
  } catch {
    showMessage('error', '添加失败，请检查账号权限')
  }
}

const deleteConnect = async (id: number) => {
  try {
    const resp = await $fetch<{ code: number; msg: string }>(`/api/delConnect/${id}`, {
      method: 'DELETE',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
    })

    if (resp.code !== 1) {
      showMessage('error', resp.msg || '删除失败')
      return
    }

    showMessage('success', '已删除连接')
    await refreshConnects()
  } catch {
    showMessage('error', '删除失败，请检查账号权限')
  }
}

const loadProfile = async () => {
  try {
    const resp = await $fetch<{ code: number; data?: { sysUsername?: string; serverName?: string; serverUrl?: string; serverLogo?: string } }>('/api/settings/profile', {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
    })
    if (resp.code === 1 && resp.data) {
      sysUsername.value = resp.data.sysUsername || ''
      serverName.value = resp.data.serverName || ''
      serverUrl.value = resp.data.serverUrl || ''
      serverLogo.value = resp.data.serverLogo || ''
    }
  } catch {
    // ignore
  }
}

const saveProfile = async () => {
  if (!sysUsername.value.trim()) {
    showMessage('error', '请输入本人名称')
    return
  }
  if (!serverName.value.trim()) {
    showMessage('error', '请输入站点名称')
    return
  }
  if (!serverUrl.value.trim()) {
    showMessage('error', '请输入站点地址')
    return
  }

  try {
    const resp = await $fetch<{ code: number; msg: string }>('/api/settings/profile', {
      method: 'PUT',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
      body: {
        sysUsername: sysUsername.value.trim(),
        serverName: serverName.value.trim(),
        serverUrl: serverUrl.value.trim(),
        serverLogo: serverLogo.value.trim(),
      },
    })

    if (resp.code !== 1) {
      showMessage('error', resp.msg || '保存失败')
      return
    }

    showMessage('success', '基础配置已更新')
  } catch {
    showMessage('error', '保存失败，请检查账号权限')
  }
}

onMounted(() => {
  refreshConnects()
  loadProfile()
})
</script>

<template>
  <v-container class="py-8 admin-wrap">
    <v-row>
      <v-col cols="12" lg="4">
        <v-card class="panel-card" rounded="md">
          <div class="text-subtitle-1 mb-4">基础配置</div>
          <v-text-field
            v-model="serverName"
            label="站点名称"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model="serverUrl"
            label="站点地址（含 http/https）"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model="serverLogo"
            label="站点头像 URL（可选）"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model="sysUsername"
            label="本人显示名称"
            variant="outlined"
            density="comfortable"
          />
          <v-btn color="accent" variant="flat" @click="saveProfile">
            保存
          </v-btn>
          <v-alert v-if="message" :type="messageType" variant="tonal" class="mt-4">
            {{ message }}
          </v-alert>
        </v-card>
      </v-col>

      <v-col cols="12" lg="8">
        <v-card class="panel-card" rounded="md">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <div class="text-subtitle-1">实例连接</div>
              <div class="text-caption text-muted">添加朋友的实例地址（域名或完整 URL）</div>
            </div>
            <v-chip variant="tonal" color="secondary">{{ connectList.length }} 已连接</v-chip>
          </div>

          <div class="d-flex flex-column flex-md-row gap-3 mb-4">
            <v-text-field
              v-model="connectUrlInput"
              label="例如：https://memo.example.com"
              variant="outlined"
              density="comfortable"
            />
            <v-btn color="accent" size="large" @click="addConnect">
              添加连接
            </v-btn>
          </div>

          <v-divider class="mb-4" />

          <v-skeleton-loader v-if="loading" type="list-item-two-line" />

          <v-list v-else class="connect-list" density="compact">
            <v-list-item
              v-for="conn in connectList"
              :key="conn.id"
              class="connect-item"
            >
              <v-list-item-title class="connect-title">
                <div class="connect-row">
                  <span class="connect-url">{{ conn.connectUrl }}</span>
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    color="secondary"
                    class="connect-chip"
                    :class="{ 'chip-jibun': conn.instanceType === 'JIBUN' }"
                  >
                    {{ displayInstanceType(conn.instanceType) }}
                  </v-chip>
                </div>
              </v-list-item-title>
              <template #append>
                <v-btn icon="mdi-delete-outline" variant="text" @click="deleteConnect(conn.id)" />
              </template>
            </v-list-item>
            <v-list-item v-if="connectList.length === 0">
              <v-list-item-title class="text-muted">暂无连接，先添加一个试试。</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card class="panel-card" rounded="md">
          <div class="text-subtitle-1 mb-3">用户管理</div>
          <v-alert type="info" variant="tonal">
            用户系统接口尚未接入。完成后可在此管理管理员 / 发帖者 / 访客。
          </v-alert>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.admin-wrap {
  max-width: 1280px;
}

.panel-card {
  background: rgba(var(--v-theme-surface), 0.98);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding: 20px;
}

.gap-2 {
  gap: 12px;
}

.gap-3 {
  gap: 16px;
}

.connect-list {
  background: transparent;
}

.connect-list :deep(.v-list-item) {
  min-height: 0px;
  padding: 0px 2px;
}

.connect-item :deep(.v-list-item__content) {
  padding: 2px 0;
}

.connect-item :deep(.v-list-item__append) {
  align-items: center;
}

.connect-chip {
  font-size: 0.78rem;
}

.connect-row {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.connect-url {
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-jibun {
  border: 2px solid rgba(var(--v-theme-primary), 0.6);
}
</style>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { token } = useAuthToken()

const connectUrlInput = ref('')
const message = ref('')
const messageType = ref<'success' | 'error' | 'info'>('info')
const userMessage = ref('')
const userMessageType = ref<'success' | 'error' | 'info'>('info')
const loading = ref(false)
const connectList = ref<Array<{ id: number; connectUrl: string; instanceType: string }>>([])
const userLoading = ref(false)

type UserItem = {
  id: number
  email: string
  displayName: string
  role: 'ADMIN' | 'POSTER' | 'GUEST'
  isOwner: boolean
  isActive: boolean
  createdAt: string
}

const users = ref<UserItem[]>([])
const userRoles = ['ADMIN', 'POSTER', 'GUEST']
const pageSize = 10
const currentPage = ref(1)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editUserId = ref<number | null>(null)
const editForm = reactive({
  email: '',
  displayName: '',
  role: 'POSTER' as UserItem['role'],
  isOwner: false,
  isActive: true,
  password: '',
})
const createForm = reactive({
  email: '',
  displayName: '',
  role: 'POSTER' as UserItem['role'],
  isOwner: false,
  password: '',
})

const editDisableLogin = computed({
  get: () => !editForm.isActive,
  set: (value: boolean) => {
    editForm.isActive = !value
  },
})

const pageCount = computed(() => Math.ceil(users.value.length / pageSize))
const pagedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return users.value.slice(start, start + pageSize)
})
const shouldPaginate = computed(() => users.value.length > pageSize)
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

const showUserMessage = (type: 'success' | 'error' | 'info', text: string) => {
  userMessageType.value = type
  userMessage.value = text
  setTimeout(() => {
    userMessage.value = ''
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

const fetchUsers = async () => {
  userLoading.value = true
  try {
    const resp = await $fetch<{ code: number; data: UserItem[] }>('/api/users', {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
    })
    if (resp.code === 1) {
      users.value = resp.data.map((user) => ({
        ...user,
        displayName: user.displayName ?? '',
      }))
    }
  } finally {
    userLoading.value = false
  }
}

const openCreateModal = () => {
  createForm.email = ''
  createForm.displayName = ''
  createForm.role = 'POSTER'
  createForm.isOwner = false
  createForm.password = ''
  showCreateModal.value = true
}

const createUser = async () => {
  if (!createForm.email.trim() || !createForm.password.trim()) {
    showMessage('error', '请输入邮箱和密码')
    return
  }
  try {
    const resp = await $fetch<{ code: number; msg: string }>('/api/users', {
      method: 'POST',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
      body: {
        email: createForm.email.trim(),
        password: createForm.password,
        displayName: createForm.displayName.trim(),
        role: createForm.role,
        isOwner: createForm.isOwner,
      },
    })

    if (resp.code !== 1) {
      showUserMessage('error', resp.msg || '创建失败')
      return
    }

    showUserMessage('success', '用户已创建')
    showCreateModal.value = false
    await fetchUsers()
  } catch {
    showUserMessage('error', '创建失败，请检查账号权限')
  }
}

const openEditModal = (user: UserItem) => {
  editUserId.value = user.id
  editForm.email = user.email
  editForm.displayName = user.displayName
  editForm.role = user.role
  editForm.isOwner = user.isOwner
  editForm.isActive = user.isActive
  editForm.password = ''
  showEditModal.value = true
}

const updateUser = async () => {
  if (!editUserId.value) {
    return
  }
  try {
    const resp = await $fetch<{ code: number; msg: string }>(`/api/users/${editUserId.value}`, {
      method: 'PUT',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
      body: {
        email: editForm.email.trim(),
        displayName: editForm.displayName || '',
        role: editForm.role,
        isOwner: editForm.isOwner,
        isActive: editForm.isActive,
        password: editForm.password || undefined,
      },
    })

    if (resp.code !== 1) {
      showUserMessage('error', resp.msg || '更新失败')
      return
    }

    showUserMessage('success', '用户已更新')
    showEditModal.value = false
    await fetchUsers()
  } catch {
    showUserMessage('error', '更新失败，请检查账号权限')
  }
}

const updateOwner = async (user: UserItem) => {
  try {
    const resp = await $fetch<{ code: number; msg: string }>(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
      body: { isOwner: user.isOwner },
    })

    if (resp.code !== 1) {
      showUserMessage('error', resp.msg || '更新失败')
      return
    }
    showUserMessage('success', '站主设置已更新')
  } catch {
    showUserMessage('error', '更新失败，请检查账号权限')
  }
}

const deleteUser = async (id: number) => {
  if (import.meta.client && !window.confirm('确认删除该用户？')) {
    return
  }
  try {
    const resp = await $fetch<{ code: number; msg: string }>(`/api/users/${id}`, {
      method: 'DELETE',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
    })

    if (resp.code !== 1) {
      showUserMessage('error', resp.msg || '删除失败')
      return
    }

    showUserMessage('success', '用户已删除')
    await fetchUsers()
  } catch {
    showUserMessage('error', '删除失败，请检查账号权限')
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
  fetchUsers()
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
      <v-col cols="12">
        <v-card class="panel-card" rounded="md">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <div class="text-subtitle-1">用户管理</div>
              <div class="text-caption text-muted">新增 / 编辑 / 删除用户，站主用户在主页不显示名字。</div>
            </div>
            <v-btn color="accent" variant="flat" @click="openCreateModal">
              新增用户
            </v-btn>
          </div>
          <v-alert v-if="userMessage" :type="userMessageType" variant="tonal" class="mb-4">
            {{ userMessage }}
          </v-alert>

          <v-skeleton-loader v-if="userLoading" type="list-item-two-line" />
          <div v-else>
            <div v-if="users.length === 0" class="text-caption text-muted">暂无用户。</div>
            <v-table v-else class="user-table">
              <thead>
                <tr>
                  <th>邮箱</th>
                  <th>显示名</th>
                  <th>角色</th>
                  <th>站主</th>
                  <th class="text-right action-header">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in pagedUsers" :key="user.id">
                  <td>{{ user.email }}</td>
                  <td>{{ user.displayName || '-' }}</td>
                  <td>{{ user.role }}</td>
                  <td>
                    <v-switch
                      v-model="user.isOwner"
                      density="compact"
                      hide-details
                      @update:model-value="updateOwner(user)"
                    />
                  </td>
                  <td class="text-right">
                    <v-btn size="small" variant="text" @click="openEditModal(user)">编辑</v-btn>
                    <v-btn size="small" variant="text" color="error" @click="deleteUser(user.id)">删除</v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-if="shouldPaginate" class="d-flex justify-end mt-3">
              <v-pagination v-model="currentPage" :length="pageCount" size="small" />
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showCreateModal" max-width="520">
      <v-card class="panel-card" rounded="md">
        <div class="text-subtitle-1 mb-4">新增用户</div>
        <v-text-field v-model="createForm.email" label="邮箱" variant="outlined" density="compact" />
        <v-text-field v-model="createForm.password" label="密码" type="password" variant="outlined" density="compact" />
        <v-text-field v-model="createForm.displayName" label="显示名称" variant="outlined" density="compact" />
        <v-select v-model="createForm.role" :items="userRoles" label="角色" variant="outlined" density="compact" />
        <v-switch v-model="createForm.isOwner" label="设为站主" />
        <div class="d-flex justify-end gap-2 mt-4">
          <v-btn variant="text" @click="showCreateModal = false">取消</v-btn>
          <v-btn color="accent" variant="flat" @click="createUser">创建</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showEditModal" max-width="520">
      <v-card class="panel-card" rounded="md">
        <div class="text-subtitle-1 mb-4">编辑用户</div>
        <v-text-field v-model="editForm.email" label="邮箱" variant="outlined" density="compact" />
        <v-text-field v-model="editForm.displayName" label="显示名称" variant="outlined" density="compact" />
        <v-select v-model="editForm.role" :items="userRoles" label="角色" variant="outlined" density="compact" />
        <v-switch v-model="editDisableLogin" label="禁止登录" />
        <v-text-field v-model="editForm.password" label="重置密码（可选）" type="password" variant="outlined" density="compact" />
        <div class="d-flex justify-end gap-2 mt-4">
          <v-btn variant="text" @click="showEditModal = false">取消</v-btn>
          <v-btn color="accent" variant="flat" @click="updateUser">保存</v-btn>
        </div>
      </v-card>
    </v-dialog>
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

.user-table th,
.user-table td {
  font-size: 0.9rem;
  padding: 10px 12px;
}

.user-table td:last-child {
  white-space: nowrap;
}

.action-header {
  padding-right: 23px !important;
}
</style>

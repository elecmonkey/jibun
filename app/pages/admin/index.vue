<script setup lang="ts">
definePageMeta({
  middleware: 'admin',
})

const { token } = useAuthToken()

const connectUrlInput = ref('')
const message = ref('')
const messageType = ref<'success' | 'error' | 'info'>('info')
const userMessage = ref('')
const userMessageType = ref<'success' | 'error' | 'info'>('info')
const loading = ref(false)
const connectList = ref<Array<{
  id: number
  connectUrl: string
  instanceType: string
  inviteToken?: string | null
  inviteExpiresAt?: string | null
  _count?: { invitedUsers: number }
}>>([])
const inboundList = ref<Array<{
  id: number
  serverName: string
  serverUrl: string
  serverLogo: string
  sysUsername: string
  tokenHint: string | null
  verifiedAt: string | null
  registeredAt?: string | null
}>>([])
const userLoading = ref(false)
const showConnectModal = ref(false)
const connectTarget = ref<null | { id: number; serverName: string; serverUrl: string; sysUsername: string; tokenHint: string | null }>(null)
const showRevokeModal = ref(false)
const revokeTargetId = ref<number | null>(null)
const revokeMessage = ref('')

type UserItem = {
  id: number
  email: string
  displayName: string
  avatarUrl?: string | null
  role: 'ADMIN' | 'POSTER' | 'GUEST'
  isOwner: boolean
  isActive: boolean
  createdAt: string
  connectId?: number | null
  invitedByConnectId?: number | null
  connect?: {
    id: number
    connectUrl: string
    instanceType: string
  } | null
}

const users = ref<UserItem[]>([])
const userRoles = ['ADMIN', 'POSTER', 'GUEST']
const pageSize = 10
const currentPage = ref(1)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showInviteModal = ref(false)
const inviteLink = ref('')
const inviteExpiresAt = ref('')
const inviteMessage = ref('')
const inviteMessageType = ref<'success' | 'error' | 'info'>('info')
const editUserId = ref<number | null>(null)
const editForm = reactive({
  email: '',
  displayName: '',
  avatarUrl: '',
  role: 'POSTER' as UserItem['role'],
  isOwner: false,
  isActive: true,
  password: '',
})
const createForm = reactive({
  email: '',
  displayName: '',
  avatarUrl: '',
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

const serverName = ref('')
const serverUrl = ref('')
const serverLogo = ref('')

const refreshConnects = async () => {
  loading.value = true
  try {
    const resp = await $fetch<{ code: number; data: Array<{
      id: number
      connectUrl: string
      instanceType: string
      inviteToken?: string | null
      inviteExpiresAt?: string | null
      _count?: { invitedUsers: number }
    }> }>('/api/connect/list')
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

  if (loading.value) {
    return
  }
  loading.value = true
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
  } finally {
    loading.value = false
  }
}

const deleteConnect = async (id: number) => {
  try {
    const resp = await $fetch<{ code: number; msg: string }>(`/api/delConnect/${id}`, {
      method: 'DELETE',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
    })

    if (resp.code !== 1) {
      const revokeErrors = new Set([
        'revoke failed',
        'system setting not configured',
        'invalid signature',
        'verify failed',
        'expired',
      ])
      if (revokeErrors.has(resp.msg)) {
        revokeTargetId.value = id
        revokeMessage.value = resp.msg || '对方服务器不可用或拒绝删除'
        showRevokeModal.value = true
        return
      } else {
        showMessage('error', resp.msg || '删除失败')
        return
      }
    }

    showMessage('success', '已删除连接')
    await refreshConnects()
    await fetchUsers()
  } catch {
    revokeTargetId.value = id
    revokeMessage.value = '对方服务器不可用或拒绝删除'
    showRevokeModal.value = true
  }
}

const forceDeleteConnect = async () => {
  if (!revokeTargetId.value) {
    return
  }
  try {
    const resp = await $fetch<{ code: number; msg: string }>(`/api/delConnect/${revokeTargetId.value}?force=1`, {
      method: 'DELETE',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
    })
    if (resp.code !== 1) {
      showMessage('error', resp.msg || '强制删除失败')
      return
    }
    showRevokeModal.value = false
    revokeTargetId.value = null
    showMessage('success', '已删除连接')
    await refreshConnects()
    await fetchUsers()
  } catch {
    showMessage('error', '强制删除失败')
  }
}

const loadInbound = async () => {
  try {
    const resp = await $fetch<{ code: number; data: typeof inboundList.value }>('/api/connect/inbound', {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
    })
    if (resp.code === 1) {
      inboundList.value = resp.data
    }
  } catch {
    inboundList.value = []
  }
}

const rejectInbound = async (id: number) => {
  try {
    const resp = await $fetch<{ code: number; msg: string }>(`/api/connect/inbound/${id}`, {
      method: 'DELETE',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
    })
    if (resp.code !== 1) {
      showMessage('error', resp.msg || '删除失败')
      return
    }
    showMessage('success', '已拒绝')
    await loadInbound()
  } catch {
    showMessage('error', '删除失败，请检查账号权限')
  }
}


const openConnectModal = (item: { id: number; serverName: string; serverUrl: string; sysUsername: string; tokenHint: string | null }) => {
  connectTarget.value = item
  showConnectModal.value = true
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
        avatarUrl: user.avatarUrl ?? '',
      }))
    }
  } finally {
    userLoading.value = false
  }
}

const openCreateModal = () => {
  createForm.email = ''
  createForm.displayName = ''
  createForm.avatarUrl = ''
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
        avatarUrl: createForm.avatarUrl.trim(),
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
  editForm.avatarUrl = user.avatarUrl || ''
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
        avatarUrl: editForm.avatarUrl.trim(),
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
    await fetchUsers()
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
    await refreshConnects()
  } catch {
    showUserMessage('error', '删除失败，请检查账号权限')
  }
}


const getInviteLink = (tokenValue?: string | null) => {
  if (!tokenValue || !serverUrl.value.trim()) {
    return ''
  }
  return `${serverUrl.value.replace(/\/+$/, '')}/invite/ech0?token=${tokenValue}`
}

const generateInvite = async (connId: number) => {
  try {
    const resp = await $fetch<{ code: number; msg: string; data?: { inviteToken?: string; inviteExpiresAt?: string } }>(
      '/api/connect/invite',
      {
        method: 'POST',
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
        body: { connect_id: connId },
      },
    )
    if (resp.code !== 1) {
      showMessage('error', resp.msg || '生成失败')
      return
    }
    inviteLink.value = resp.data?.inviteToken ? getInviteLink(resp.data.inviteToken) : ''
    inviteExpiresAt.value = resp.data?.inviteExpiresAt || ''
    showInviteModal.value = true
    await refreshConnects()
  } catch {
    showMessage('error', '生成失败，请检查账号权限')
  }
}

const copyInviteLink = async () => {
  if (!inviteLink.value) {
    inviteMessageType.value = 'error'
    inviteMessage.value = '邀请链接无效'
    return
  }
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    inviteMessageType.value = 'success'
    inviteMessage.value = '邀请链接已复制'
  } catch {
    inviteMessageType.value = 'error'
    inviteMessage.value = '复制失败'
  }
}

const loadProfile = async () => {
  try {
    const resp = await $fetch<{ code: number; data?: { serverName?: string; serverUrl?: string; serverLogo?: string } }>('/api/settings/profile', {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
    })
    if (resp.code === 1 && resp.data) {
      serverName.value = resp.data.serverName || ''
      serverUrl.value = resp.data.serverUrl || ''
      serverLogo.value = resp.data.serverLogo || ''
    }
  } catch {
    // ignore
  }
}

const saveProfile = async () => {
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
  loadInbound()
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
          <AvatarInput
            v-model="serverLogo"
            label="站点头像"
            manual-label="手动填写 URL"
            :token="token"
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
              :disabled="loading"
            />
            <v-btn color="accent" size="large" :loading="loading" :disabled="loading" @click="addConnect">
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
                  <v-chip
                    v-if="conn.instanceType === 'ECH0'"
                    size="x-small"
                    variant="tonal"
                    color="secondary"
                  >
                    {{ (conn._count?.invitedUsers || 0) > 0 ? '已注册' : '邀请链接' }}
                  </v-chip>
                  <v-chip
                    v-if="conn.instanceType === 'JIBUN'"
                    size="x-small"
                    variant="tonal"
                    color="secondary"
                  >
                    {{ (conn._count?.invitedUsers || 0) > 0 ? '已注册' : '未注册' }}
                  </v-chip>
                </div>
              </v-list-item-title>
              <template #append>
                <div class="d-flex align-center gap-1">
                  <v-btn
                    v-if="conn.instanceType === 'ECH0' && (conn._count?.invitedUsers || 0) === 0"
                    size="small"
                    variant="outlined"
                    @click="generateInvite(conn.id)"
                  >
                    生成邀请链接
                  </v-btn>
                  <v-btn icon="mdi-delete-outline" variant="text" @click="deleteConnect(conn.id)" />
                </div>
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
            <div class="text-subtitle-1">以下 Jibun 实例添加了我</div>
            <v-chip variant="tonal" color="secondary">{{ inboundList.length }}</v-chip>
          </div>
          <v-list class="connect-list" density="compact">
            <v-list-item v-for="item in inboundList" :key="item.id" class="connect-item">
              <v-list-item-title class="connect-title">
                <div class="connect-row">
                  <span class="connect-url">{{ item.serverName }}</span>
                  <v-chip size="x-small" variant="tonal" color="secondary">Jibun</v-chip>
                </div>
                <div class="text-caption text-muted">
                  {{ item.serverUrl }}
                </div>
                <div class="text-caption text-muted">
                  {{ item.sysUsername }}
                </div>
              </v-list-item-title>
              <template #append>
                <div class="d-flex align-center gap-1">
                  <v-btn
                    v-if="!item.registeredAt"
                    size="small"
                    variant="outlined"
                    @click="openConnectModal(item)"
                  >
                    去注册
                  </v-btn>
                  <v-chip v-else size="small" variant="tonal" color="secondary">
                    已注册
                  </v-chip>
                  <v-btn
                    v-if="!item.registeredAt"
                    size="small"
                    variant="tonal"
                    @click="rejectInbound(item.id)"
                  >
                    拒绝
                  </v-btn>
                </div>
              </template>
            </v-list-item>
            <v-list-item v-if="inboundList.length === 0">
              <v-list-item-title class="text-muted">暂无记录。</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <ConnectAccountModal
      v-model="showConnectModal"
      :inbound="connectTarget"
      :local-server-url="serverUrl"
      @completed="loadInbound"
    />

    <v-dialog v-model="showRevokeModal" max-width="520">
      <v-card class="p-6" rounded="lg">
        <div class="mb-2 text-base font-semibold text-black/80">删除连接失败</div>
        <div class="text-sm text-black/60">
          对方服务器不可用或拒绝删除（{{ revokeMessage || '未知原因' }}）。你可以稍后再试，或强制仅删除本地连接。
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <v-btn variant="text" @click="showRevokeModal = false">稍后再试</v-btn>
          <v-btn color="error" variant="flat" @click="forceDeleteConnect">强制删除</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="panel-card" rounded="md">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-subtitle-1">用户管理</div>
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
                  <th>实例</th>
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
                    <span v-if="user.connect" class="text-caption text-muted">
                      {{ user.connect.instanceType }} · {{ user.connect.connectUrl }}
                    </span>
                    <span v-else class="text-caption text-muted">-</span>
                  </td>
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
                    <v-btn
                      v-if="!user.connectId && !user.invitedByConnectId"
                      size="small"
                      variant="text"
                      color="error"
                      @click="deleteUser(user.id)"
                    >
                      删除
                    </v-btn>
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
        <AvatarInput
          v-model="createForm.avatarUrl"
          label="用户头像"
          manual-label="手动填写 URL"
          :token="token"
        />
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
        <AvatarInput
          v-model="editForm.avatarUrl"
          label="用户头像"
          manual-label="手动填写 URL"
          :token="token"
        />
        <v-select v-model="editForm.role" :items="userRoles" label="角色" variant="outlined" density="compact" />
        <v-switch v-model="editDisableLogin" label="禁止登录" />
        <v-text-field v-model="editForm.password" label="重置密码（可选）" type="password" variant="outlined" density="compact" />
        <div class="d-flex justify-end gap-2 mt-4">
          <v-btn variant="text" @click="showEditModal = false">取消</v-btn>
          <v-btn color="accent" variant="flat" @click="updateUser">保存</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showInviteModal" max-width="520">
      <v-card class="panel-card" rounded="md">
        <div class="text-subtitle-1 mb-4">邀请链接已生成</div>
        <v-text-field
          v-model="inviteLink"
          label="邀请链接"
          variant="outlined"
          density="compact"
          readonly
        />
        <div v-if="inviteExpiresAt" class="text-caption text-muted">
          生成新链接会使旧链接失效，本链接自然有效期至 {{ new Date(inviteExpiresAt).toLocaleString() }}
        </div>
        <v-alert v-if="inviteMessage" :type="inviteMessageType" variant="tonal" class="mt-3">
          {{ inviteMessage }}
        </v-alert>
        <div class="d-flex justify-end gap-2 mt-2">
          <v-btn variant="outlined" @click="copyInviteLink">复制</v-btn>
          <v-btn variant="tonal" @click="showInviteModal = false">关闭</v-btn>
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

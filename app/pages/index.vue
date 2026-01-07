<script lang="ts" setup>
const { data: localInfo, pending: localPending } = useFetch('/api/connect')
const { data: connectInfo, pending: connectPending } = useFetch('/api/connects/info')
const { token } = useAuthToken()

const isLoggedIn = computed(() => Boolean(token.value))
const momentContent = ref('')
const moments = ref<Array<{
  id: number
  content: string
  createdAt: string
  author: {
    id: number
    displayName: string | null
    email: string
    role: string
  }
}>>([])
const page = ref(1)
const hasMore = ref(true)
const loading = ref(false)
const posting = ref(false)
type ConnectCardInfo = {
  server_name: string
  server_url: string
  logo: string
  total_moments: number
  today_moments: number
  sys_username: string
}

const connectItems = computed<ConnectCardInfo[]>(() => {
  return connectInfo.value?.data ?? []
})

const loadMoments = async () => {
  if (loading.value || !hasMore.value) {
    return
  }
  loading.value = true
  try {
    const resp = await $fetch<{ code: number; data: { items: typeof moments.value; hasMore: boolean } }>(
      '/api/moments',
      { query: { page: page.value, pageSize: 10 } },
    )
    if (resp.code === 1) {
      moments.value = moments.value.concat(resp.data.items)
      hasMore.value = resp.data.hasMore
      page.value += 1
    }
  } finally {
    loading.value = false
  }
}

const postMoment = async () => {
  if (!momentContent.value.trim()) {
    return
  }
  posting.value = true
  try {
    const resp = await $fetch<{ code: number }>(
      '/api/moments',
      {
        method: 'POST',
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
        body: { content: momentContent.value.trim() },
      },
    )
    if (resp.code === 1) {
      momentContent.value = ''
      moments.value = []
      page.value = 1
      hasMore.value = true
      await loadMoments()
    }
  } finally {
    posting.value = false
  }
}

onMounted(() => {
  loadMoments()
})
</script>

<template>
  <v-container class="py-8 timeline-wrap">
    <v-row class="timeline-grid">
      <v-col cols="12" md="7">
        <div class="timeline-list">
          <div v-if="moments.length === 0 && !loading" class="timeline-empty">
            <div class="timeline-dot" />
            <div class="timeline-card">
              <div class="text-caption text-muted">暂无动态</div>
              <div class="text-body-2">你的 Moment 动态会显示在这里。</div>
            </div>
          </div>
          <div v-for="moment in moments" :key="moment.id" class="timeline-item">
            <div class="timeline-dot" />
            <div class="timeline-card">
              <div class="timeline-meta">
                <span class="text-caption text-muted">
                  {{ new Date(moment.createdAt).toLocaleString() }}
                </span>
                <span class="text-caption text-muted">
                  {{ moment.author.displayName || moment.author.email }}
                </span>
              </div>
              <div class="text-body-2 whitespace-pre-wrap">
                {{ moment.content }}
              </div>
            </div>
          </div>
          <div v-if="loading" class="timeline-loading text-caption text-muted">
            加载中...
          </div>
          <div v-if="hasMore && !loading" class="timeline-load-more">
            <v-btn variant="text" @click="loadMoments">继续装填</v-btn>
          </div>
          <div v-if="!hasMore && moments.length > 0" class="timeline-end text-caption text-muted">
            没有啦
          </div>
        </div>
      </v-col>

      <v-col cols="12" md="5">
        <div class="timeline-top">
          <v-card class="panel-card" rounded="sm" elevation="1">
            <v-skeleton-loader v-if="localPending" type="list-item-two-line" />
            <div v-else-if="localInfo?.data" class="d-flex align-center">
              <v-avatar size="56" class="me-3" color="surface-variant">
                <v-img v-if="localInfo.data.logo" :src="localInfo.data.logo" />
                <v-icon v-else icon="mdi-account-circle-outline" />
              </v-avatar>
              <div>
                <div class="text-subtitle-1">{{ localInfo.data.sys_username }}</div>
                <div class="text-caption text-muted">
                  今日 {{ localInfo.data.today_moments }} · 总共 {{ localInfo.data.total_moments }}
                </div>
              </div>
            </div>
            <v-alert v-else type="warning" variant="tonal" class="mt-2">
              连接信息尚未就绪，请先配置服务地址。
            </v-alert>
          </v-card>

          <v-card class="panel-card" rounded="sm" elevation="1">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2">我的连接</div>
              <v-chip color="secondary" variant="tonal" size="small">
                {{ connectInfo?.data?.length || 0 }}
              </v-chip>
            </div>
            <v-skeleton-loader v-if="connectPending" type="list-item-two-line" />
            <div v-else-if="connectItems.length">
              <div v-for="info in connectItems" :key="info.server_url" class="mb-3">
                <InstanceCard :info="info" />
              </div>
            </div>
            <v-alert v-else type="info" variant="tonal">
              还没有连接实例。
            </v-alert>
          </v-card>

          <v-card class="panel-card" rounded="sm" elevation="1">
            <div class="text-subtitle-2 mb-2">写一条</div>
            <v-textarea
              v-model="momentContent"
              label="此刻想到..."
              variant="outlined"
              density="compact"
              rows="3"
              auto-grow
              :disabled="!isLoggedIn"
            />
            <v-btn color="accent" block class="mt-3" :disabled="!isLoggedIn || posting" @click="postMoment">
              发布
            </v-btn>
            <div v-if="!isLoggedIn" class="text-caption text-muted mt-2">
              登录后才能发布 Moment。
            </div>
          </v-card>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.timeline-wrap {
  max-width: 1280px;
}

.timeline-grid {
  align-items: start;
}

.timeline-top {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}

.panel-card {
  background: rgba(var(--v-theme-surface), 0.98);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding: 16px;
}

.timeline-list {
  position: relative;
  padding-left: 16px;
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.timeline-empty,
.timeline-item {
  position: relative;
  padding: 8px 0 8px 16px;
}

.timeline-dot {
  position: absolute;
  left: -9px;
  top: 16px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.5);
}

.timeline-card {
  background: rgba(var(--v-theme-surface), 0.95);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 6px;
  padding: 12px 14px;
}

.timeline-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.timeline-loading,
.timeline-end {
  padding: 12px 0 12px 16px;
}

.timeline-load-more {
  padding: 8px 0 8px 16px;
}

.whitespace-pre-wrap {
  white-space: pre-wrap;
}
</style>

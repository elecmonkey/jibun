<script lang="ts" setup>
const { data: localInfo, pending: localPending } = useFetch('/api/connect')
const { data: connectInfo, pending: connectPending } = useFetch('/api/connects/info', { server: false })
const { token, role } = useAuthToken()

const isLoggedIn = computed(() => Boolean(token.value))
const canPost = computed(() => role.value === 'ADMIN' || role.value === 'POSTER')
const momentContent = ref('')
const momentTags = ref<string[]>([])
const likedMoments = ref<string[]>([])
const moments = ref<Array<{
  id: number
  content: string
  createdAt: string
  tags: string[]
  favCount: number
  _count: {
    comments: number
  }
  author: {
    id: number
    displayName: string | null
    email: string
    role: string
    isOwner: boolean
    avatarUrl?: string | null
  }
}>>([])
const remoteMoments = ref<Array<{
  id: number
  content: string
  created_at: string
  username: string
  fav_count: number
  server_url: string
  server_name: string
  logo?: string | null
  sourcePage: number
}>>([])
const page = ref(1)
const hasMore = ref(true)
const remotePage = ref(1)
const remoteHasMore = ref(true)
const loading = ref(false)
const remoteLoading = ref(false)
const posting = ref(false)
const modalOpen = ref(false)
const modalMoment = ref<null | {
  id: number
  content: string
  createdAt: string
  tags: string[]
  favCount: number
  _count: {
    comments: number
  }
  author: {
    id: number
    displayName: string | null
    email: string
    role: string
    isOwner: boolean
    avatarUrl?: string | null
  }
}>(null)
const modalComments = ref<Array<{
  id: number
  content: string
  createdAt: string
  author: {
    id: number
    displayName: string | null
    email: string
    role: string
    isOwner: boolean
    avatarUrl?: string | null
  }
  replyTo?: {
    id: number
    content: string
    author: {
      id: number
      displayName: string | null
      email: string
      isOwner: boolean
      avatarUrl?: string | null
    }
  } | null
}>>([])
const commentContent = ref('')
const commentPosting = ref(false)
const replyTarget = ref<null | { id: number; name: string; content: string; time: string }>(null)
const route = useRoute()
const showFriends = ref(false)
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

type TimelineItem =
  | (typeof moments.value)[number] & { kind: 'local' }
  | (typeof remoteMoments.value)[number] & { kind: 'remote' }

const timelineItems = computed<TimelineItem[]>(() => {
  const local = moments.value.map((item) => ({ ...item, kind: 'local' as const }))
  if (!showFriends.value) {
    return local
  }
  const remote = remoteMoments.value.map((item) => ({ ...item, kind: 'remote' as const }))
  return [...local, ...remote].sort((a, b) => {
    const aTs = a.kind === 'local' ? new Date(a.createdAt).getTime() : new Date(a.created_at).getTime()
    const bTs = b.kind === 'local' ? new Date(b.createdAt).getTime() : new Date(b.created_at).getTime()
    return bTs - aTs
  })
})

const loadRemoteMoments = async () => {
  if (remoteLoading.value || !remoteHasMore.value) {
    return
  }
  if (connectItems.value.length === 0) {
    return
  }
  remoteLoading.value = true
  try {
    const tasks = connectItems.value.map(async (info) => {
      const baseUrl = info.server_url.replace(/\/+$/, '')
      const resp = await $fetch<{ code: number; data: { items: typeof remoteMoments.value } }>(
        `${baseUrl}/api/echo/page`,
        {
          method: 'POST',
          body: { page: remotePage.value, pageSize: 5 },
          timeout: 5000,
        },
      )
      if (resp.code !== 1 || !resp.data?.items?.length) {
        return []
      }
      return resp.data.items.map((item) => ({
        ...item,
        server_url: baseUrl,
        server_name: info.server_name,
        logo: info.logo,
        sourcePage: remotePage.value,
      }))
    })

    const results = await Promise.allSettled(tasks)
    const batch: typeof remoteMoments.value = []
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        batch.push(...result.value)
      }
    })
    if (batch.length) {
      remoteMoments.value = remoteMoments.value.concat(batch)
    }
    remoteHasMore.value = batch.length > 0
    remotePage.value += 1
  } catch {
    remoteHasMore.value = false
  } finally {
    remoteLoading.value = false
  }
}

const loadMoments = async () => {
  if (loading.value || !hasMore.value) {
    return
  }
  loading.value = true
  try {
    const resp = await $fetch<{ code: number; data: { items: typeof moments.value; hasMore: boolean } }>(
      '/api/moments',
      { query: { page: page.value, pageSize: 5 } },
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
        body: { content: momentContent.value.trim(), tags: momentTags.value },
      },
    )
    if (resp.code === 1) {
      momentContent.value = ''
      momentTags.value = []
      moments.value = []
      page.value = 1
      hasMore.value = true
      await loadMoments()
    }
  } finally {
    posting.value = false
  }
}

const LIKE_STORE_KEY = 'jibun-liked-moments'
const loadLikedMoments = () => {
  if (!import.meta.client) {
    return
  }
  try {
    const stored = localStorage.getItem(LIKE_STORE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    if (Array.isArray(parsed)) {
      likedMoments.value = parsed.map((item) => (typeof item === 'number' ? `local::${item}` : String(item)))
    } else {
      likedMoments.value = []
    }
  } catch {
    likedMoments.value = []
  }
}

const saveLikedMoments = () => {
  if (!import.meta.client) {
    return
  }
  localStorage.setItem(LIKE_STORE_KEY, JSON.stringify(likedMoments.value))
}

const likeKey = (id: number, sourceUrl?: string) => {
  return sourceUrl ? `${sourceUrl}::${id}` : `local::${id}`
}

const hasLikedMoment = (id: number, sourceUrl?: string) => likedMoments.value.includes(likeKey(id, sourceUrl))

const likeMoment = async (id: number, sourceUrl?: string) => {
  if (hasLikedMoment(id, sourceUrl)) {
    return
  }
  try {
    if (sourceUrl) {
      const resp = await $fetch<{ code: number; data?: { id: number; fav_count?: number; favCount?: number } }>(
        `${sourceUrl}/api/echo/like/${id}`,
        { method: 'PUT' },
      )
      if (resp.code === 1) {
        const target = remoteMoments.value.find((item) => item.id === id && item.server_url === sourceUrl)
        if (target) {
          await refreshRemoteMoment(sourceUrl, id, target.sourcePage)
        }
        likedMoments.value.push(likeKey(id, sourceUrl))
        saveLikedMoments()
      }
      return
    }

    const resp = await $fetch<{ code: number; data?: { id: number; favCount: number } }>(`/api/moments/like/${id}`, {
      method: 'PUT',
    })
    if (resp.code === 1 && resp.data) {
      await refreshLocalMoment(id)
      likedMoments.value.push(likeKey(id))
      saveLikedMoments()
    }
  } catch {
    // ignore
  }
}

const loadComments = async (id: number) => {
  try {
    const resp = await $fetch<{ code: number; data: typeof modalComments.value }>(`/api/moments/${id}/comments`)
    if (resp.code === 1) {
      modalComments.value = resp.data
    }
  } catch {
    modalComments.value = []
  }
}

const postComment = async () => {
  if (!modalMoment.value || !commentContent.value.trim()) {
    return
  }
  commentPosting.value = true
  try {
    const resp = await $fetch<{ code: number; data?: (typeof modalComments.value)[number] }>(
      `/api/moments/${modalMoment.value.id}/comments`,
      {
        method: 'POST',
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
        body: {
          content: commentContent.value.trim(),
          replyToId: replyTarget.value?.id,
        },
      },
    )
    if (resp.code === 1 && resp.data) {
      modalComments.value = modalComments.value.concat(resp.data)
      commentContent.value = ''
      replyTarget.value = null
      const target = moments.value.find((item) => item.id === modalMoment.value?.id)
      if (target && target._count) {
        target._count.comments += 1
      }
      if (modalMoment.value && modalMoment.value._count) {
        modalMoment.value._count.comments += 1
      }
    }
  } finally {
    commentPosting.value = false
  }
}

const refreshLocalMoment = async (id: number) => {
  try {
    const resp = await $fetch<{ code: number; data?: typeof modalMoment.value }>(`/api/moments/${id}`)
    if (resp.code !== 1 || !resp.data) {
      return
    }
    const target = moments.value.find((item) => item.id === id)
    if (target) {
      Object.assign(target, resp.data)
    }
    if (modalMoment.value && modalMoment.value.id === id) {
      modalMoment.value = resp.data
    }
  } catch {
    // ignore
  }
}

const refreshRemoteMoment = async (sourceUrl: string, id: number, sourcePage: number) => {
  try {
    const resp = await $fetch<{ code: number; data: { items: typeof remoteMoments.value } }>(
      `${sourceUrl}/api/echo/page`,
      {
        method: 'POST',
        body: { page: sourcePage, pageSize: 5 },
        timeout: 5000,
      },
    )
    if (resp.code !== 1) {
      return
    }
    const items = resp.data?.items || []
    const found = items.find((item) => item.id === id)
    if (!found) {
      return
    }
    const target = remoteMoments.value.find((item) => item.id === id && item.server_url === sourceUrl)
    if (target) {
      target.fav_count = found.fav_count
    }
  } catch {
    // ignore
  }
}

const openMomentModal = async (id: number) => {
  try {
    const resp = await $fetch<{ code: number; data?: typeof modalMoment.value }>('/api/moments/' + id)
    if (resp.code === 1 && resp.data) {
      modalMoment.value = resp.data
      commentContent.value = ''
      replyTarget.value = null
      await loadComments(id)
      modalOpen.value = true
    }
  } catch {
    // ignore
  }
}

const openExternalMoment = (sourceUrl: string, id: number) => {
  if (!import.meta.client) {
    return
  }
  window.open(`${sourceUrl}/echo/${id}`, '_blank')
}

const getMomentAvatar = (moment: TimelineItem) => {
  return moment.kind === 'local' ? moment.author.avatarUrl || undefined : moment.logo || undefined
}

const formatMomentTime = (input: string) => {
  const date = new Date(input)
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  const pad = (value: number) => String(value).padStart(2, '0')
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  const datePart = sameYear ? `${month}/${day}` : `${date.getFullYear()}/${month}/${day}`
  return `${datePart} ${hour}:${minute}`
}

onMounted(() => {
  loadLikedMoments()
  loadMoments()
  if (import.meta.client) {
    const stored = localStorage.getItem('jibun-show-friends')
    showFriends.value = stored === 'true'
  }
  if (showFriends.value) {
    loadRemoteMoments()
  }
  const queryId = Number(route.query.moment)
  if (Number.isInteger(queryId) && queryId > 0) {
    openMomentModal(queryId)
  }
})

watch(showFriends, (value) => {
  if (!import.meta.client) {
    return
  }
  localStorage.setItem('jibun-show-friends', value ? 'true' : 'false')
  if (value && remoteMoments.value.length === 0) {
    loadRemoteMoments()
  }
})

watch(
  () => connectItems.value.length,
  (value) => {
    if (value > 0 && showFriends.value && remoteMoments.value.length === 0) {
      loadRemoteMoments()
    }
  },
)

watch(
  () => route.query.moment,
  (value) => {
    const queryId = Number(value)
    if (Number.isInteger(queryId) && queryId > 0) {
      openMomentModal(queryId)
    }
  },
)
</script>

<template>
  <v-container class="py-8 timeline-wrap">
    <v-row class="timeline-grid">
      <v-col cols="12" lg="7">
        <div class="timeline-list">
          <div v-if="timelineItems.length === 0 && !(loading || remoteLoading)" class="timeline-empty">
            <div class="timeline-dot" />
            <div class="timeline-card">
              <div class="text-caption text-muted">暂无动态</div>
              <div class="text-body-2">你的 Moment 动态会显示在这里。</div>
            </div>
          </div>
          <div
            v-for="moment in timelineItems"
            :key="`${moment.kind}-${moment.id}-${moment.kind === 'remote' ? moment.server_url : 'local'}`"
            class="timeline-item"
          >
            <div class="timeline-dot timeline-dot-offset" />
            <div
              class="timeline-card moment-card"
              :class="{ 'timeline-card-remote': moment.kind === 'remote' }"
              @click="moment.kind === 'local' ? openMomentModal(moment.id) : undefined"
            >
              <div class="moment-header">
                <div class="moment-header-left">
                  <v-avatar size="24" class="moment-avatar" color="surface-variant">
                    <v-img v-if="getMomentAvatar(moment)" :src="getMomentAvatar(moment)" />
                    <v-icon v-else icon="mdi-account" size="14" />
                  </v-avatar>
                  <v-chip size="x-small" class="moment-chip">
                    <span class="moment-chip-text" :class="{ 'moment-chip-owner': moment.kind === 'local' && moment.author.isOwner }">
                      {{
                        moment.kind === 'local'
                          ? (moment.author.displayName || moment.author.email)
                          : `${moment.server_name} @${moment.username}`
                      }}
                    </span>
                  </v-chip>
                  <v-chip v-if="moment.kind === 'local' && moment.author.isOwner" size="x-small" class="owner-chip">
                    ★
                  </v-chip>
                </div>
                <v-chip size="x-small" class="moment-chip">
                  <span class="moment-chip-text">
                    {{ formatMomentTime(moment.kind === 'local' ? moment.createdAt : moment.created_at) }}
                  </span>
                </v-chip>
              </div>
              <div class="text-body-2 whitespace-pre-wrap">
                {{ moment.content }}
              </div>
              <div v-if="moment.kind === 'local' && moment.tags?.length" class="moment-tags">
                <v-chip
                  v-for="tag in moment.tags"
                  :key="tag"
                  size="x-small"
                  variant="tonal"
                  color="secondary"
                  class="me-1"
                >
                  {{ tag }}
                </v-chip>
              </div>
            </div>
            <div class="moment-actions-left">
              <v-btn
                size="x-small"
                variant="text"
                :color="hasLikedMoment(moment.id, moment.kind === 'remote' ? moment.server_url : undefined) ? 'secondary' : undefined"
                @click.stop="likeMoment(moment.id, moment.kind === 'remote' ? moment.server_url : undefined)"
              >
                <v-icon
                  size="16"
                  :icon="hasLikedMoment(moment.id, moment.kind === 'remote' ? moment.server_url : undefined) ? 'mdi-heart' : 'mdi-heart-outline'"
                />
                <span class="moment-like-count">
                  {{ moment.kind === 'local' ? (moment.favCount || 0) : (moment.fav_count || 0) }}
                </span>
              </v-btn>
              <v-btn
                size="x-small"
                variant="text"
                @click.stop="
                  moment.kind === 'local'
                    ? openMomentModal(moment.id)
                    : openExternalMoment(moment.server_url, moment.id)
                "
              >
                <v-icon size="16" :icon="moment.kind === 'local' ? 'mdi-comment-outline' : 'mdi-open-in-new'" />
                <span v-if="moment.kind === 'local'" class="moment-like-count">{{ moment._count?.comments || 0 }}</span>
              </v-btn>
            </div>
          </div>
          <div v-if="loading || remoteLoading" class="timeline-loading text-caption text-muted">
            加载中...
          </div>
          <div v-if="(hasMore || (showFriends && remoteHasMore)) && !(loading || remoteLoading)" class="timeline-load-more">
            <v-btn
              variant="text"
              @click="() => { loadMoments(); if (showFriends) loadRemoteMoments() }"
            >
              加载更多
            </v-btn>
          </div>
          <div v-if="!hasMore && (!showFriends || !remoteHasMore) && timelineItems.length > 0" class="timeline-end text-caption text-muted">
            没有啦
          </div>
        </div>
      </v-col>

      <v-col cols="12" lg="5">
        <div class="timeline-top">
          <v-card class="panel-card" rounded="sm" elevation="1">
            <v-skeleton-loader v-if="localPending" type="list-item-two-line" />
            <div v-else-if="localInfo?.data" class="d-flex align-center">
              <v-avatar size="56" class="me-3" color="surface-variant">
                <v-img v-if="localInfo.data.logo" :src="localInfo.data.logo" />
                <v-icon v-else icon="mdi-account-circle-outline" />
              </v-avatar>
              <div>
                <div class="name-serif name-serif--mid">{{ localInfo.data.sys_username }}</div>
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
              <div class="text-subtitle-2">朋友们</div>
              <div class="d-flex align-center gap-2">
                <div class="d-flex align-center gap-2" style="padding-right: 15px;">
                  <span class="text-caption text-muted" style="padding-right: 5px;">加载ta们的瞬间</span>
                  <v-switch
                    v-model="showFriends"
                    hide-details
                    density="compact"
                    color="secondary"
                  />
                </div>
                <v-chip color="secondary" variant="tonal" size="small">
                  {{ connectInfo?.data?.length || 0 }}
                </v-chip>
              </div>
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

          <v-card v-if="canPost" class="panel-card" rounded="sm" elevation="1">
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
            <v-combobox
              v-model="momentTags"
              class="mt-2"
              label="添加标签"
              variant="outlined"
              density="compact"
              chips
              multiple
              clearable
              :disabled="!isLoggedIn"
            />
            <v-btn color="accent" block class="mt-3" :disabled="!isLoggedIn || posting" @click="postMoment">
              发布
            </v-btn>
          </v-card>
        </div>
      </v-col>
    </v-row>

    <v-dialog v-model="modalOpen" max-width="640" @update:model-value="(v) => { if (!v) navigateTo({ path: '/', query: {} }) }">
      <v-card class="panel-card" rounded="sm" elevation="2">
        <div v-if="modalMoment" class="timeline-modal">
          <div class="timeline-meta mb-3">
            <span class="text-caption text-muted">
              {{ new Date(modalMoment.createdAt).toLocaleString() }}
            </span>
            <span v-if="!modalMoment.author.isOwner" class="text-caption text-muted">
              {{ modalMoment.author.displayName || modalMoment.author.email }}
            </span>
          </div>
          <div class="text-body-2 whitespace-pre-wrap">
            {{ modalMoment.content }}
          </div>
          <div v-if="modalMoment.tags?.length" class="moment-tags mt-2">
            <v-chip
              v-for="tag in modalMoment.tags"
              :key="tag"
              size="x-small"
              variant="tonal"
              color="secondary"
              class="me-1"
            >
              {{ tag }}
            </v-chip>
          </div>
          <div class="moment-actions mt-2">
            <v-btn
              size="x-small"
              variant="text"
              :color="hasLikedMoment(modalMoment.id) ? 'secondary' : undefined"
              @click.stop="likeMoment(modalMoment.id)"
            >
              <v-icon size="16" :icon="hasLikedMoment(modalMoment.id) ? 'mdi-heart' : 'mdi-heart-outline'" />
              <span class="moment-like-count">{{ modalMoment.favCount || 0 }}</span>
            </v-btn>
            <v-btn size="x-small" variant="text">
              <v-icon size="16" icon="mdi-comment-outline" />
              <span class="moment-like-count">{{ modalMoment._count?.comments || 0 }}</span>
            </v-btn>
          </div>
          <div class="comments-wrap">
            <div class="text-subtitle-2 mb-2">评论</div>
            <div v-if="modalComments.length === 0" class="text-caption text-muted">暂无评论。</div>
            <div v-else class="comments-list">
              <div v-for="comment in modalComments" :key="comment.id" class="comment-item">
                <div class="comment-header">
                  <div class="comment-meta text-caption text-muted">
                    <v-avatar size="18" class="comment-avatar" color="surface-variant">
                      <v-img v-if="comment.author.avatarUrl" :src="comment.author.avatarUrl" />
                      <v-icon v-else icon="mdi-account" size="14" />
                    </v-avatar>
                    <span>{{ comment.author.displayName || comment.author.email }}</span>
                    <span>{{ new Date(comment.createdAt).toLocaleString() }}</span>
                  </div>
                  <v-btn
                    v-if="isLoggedIn"
                    size="x-small"
                    variant="outlined"
                    @click="replyTarget = {
                      id: comment.id,
                      name: comment.author.displayName || comment.author.email,
                      content: comment.content,
                      time: new Date(comment.createdAt).toLocaleString(),
                    }"
                  >
                    回复
                  </v-btn>
                </div>
                <div class="comment-body">
                  <div v-if="comment.replyTo" class="comment-quote">
                  <div class="comment-quote-name">
                      {{ comment.replyTo.author.displayName || comment.replyTo.author.email || '匿名' }}
                  </div>
                    <div class="comment-quote-content">
                      {{ comment.replyTo.content }}
                    </div>
                  </div>
                  <div class="text-body-2 whitespace-pre-wrap">
                    {{ comment.content }}
                  </div>
                </div>
              </div>
            </div>
            <v-divider class="comment-divider" />
            <div v-if="isLoggedIn" class="comment-editor">
              <div v-if="replyTarget" class="reply-card">
                <div class="reply-card-header">
                  <div class="reply-meta text-caption text-muted">
                    <span>回复：{{ replyTarget.name }}</span>
                    <span>{{ replyTarget.time }}</span>
                  </div>
                  <v-btn size="x-small" variant="outlined" @click="replyTarget = null">取消</v-btn>
                </div>
                <div class="reply-content text-body-2 whitespace-pre-wrap">
                  {{ replyTarget.content }}
                </div>
              </div>
              <v-textarea
                v-model="commentContent"
                label="写下你的评论..."
                variant="outlined"
                density="compact"
                rows="2"
                auto-grow
              />
              <v-btn color="accent" class="mt-2" :disabled="commentPosting || !commentContent.trim()" @click="postComment">
                发布评论
              </v-btn>
            </div>
            <v-alert v-else type="info" variant="tonal" class="mt-3">
              登录后即可发表评论。
            </v-alert>
          </div>
        </div>
      </v-card>
    </v-dialog>
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
  padding: 16px 0 16px 16px;
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

.timeline-dot-offset {
  top: 14px;
  left: 1px;
}

.timeline-card {
  background: rgba(var(--v-theme-surface), 0.95);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 6px;
  padding: 12px 14px;
}

.moment-card {
  position: relative;
  padding-top: 26px;
}

.moment-header {
  position: absolute;
  top: -12px;
  left: 18px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  padding: 0;
}

.moment-header-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: -6px;
}

.moment-chip {
  background: rgba(var(--v-theme-surface), 0.5);
  border: none;
}

.moment-chip-text {
  font-size: 0.8rem;
}

.moment-chip-owner {
  /* font-family: "Noto Serif SC", "Songti SC", "STSong", "Times New Roman", serif; */
  /* font-size: 1.0rem; */
  font-weight: 900;
}

.moment-chip :deep(.v-chip) {
  height: 20px;
}

.moment-chip :deep(.v-chip__content) {
  line-height: 20px;
  padding: 0 4px;
}

.owner-chip {
  margin-left: 1px;
  background: #ffd84d;
  border: none;
  color: #6b4a00;
  border-radius: 999px;
  width: 20px;
  height: 20px;
  min-width: 20px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.owner-chip :deep(.v-chip__content) {
  padding: 0;
  line-height: 20px;
  font-size: 0.7rem;
}

.v-theme--dark .owner-chip {
  background: #2b5bd8;
  color: #e8f1ff;
}


.moment-tags {
  margin-top: 8px;
}

.moment-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
  gap: 6px;
}

.moment-like-count {
  margin-left: 4px;
  font-size: 0.75rem;
}

.moment-actions-left {
  margin-top: 6px;
  padding-left: 0;
  display: flex;
  align-items: center;
  gap: 1px;
}


.comments-wrap {
  margin-top: 16px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-top: 12px;
}

.comments-list {
  display: grid;
  gap: 16px;
  margin-bottom: 12px;
}

.comment-item {
  position: relative;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 6px;
  padding: 16px 12px 10px;
}

.comment-item:last-child {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.comment-editor {
  margin-top: 8px;
}

.reply-card {
  position: relative;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 6px;
  padding: 16px 12px 10px;
  margin: 16px 0 18px;
}

.reply-card-header {
  position: absolute;
  top: -12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgb(var(--v-theme-surface));
  padding: 2px 6px;
}

.reply-meta {
  display: inline-flex;
  gap: 8px;
}

.reply-content {
  padding: 2px 0 4px;
}

.comment-header {
  position: absolute;
  top: -12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgb(var(--v-theme-surface));
  padding: 2px 6px;
}

.comment-meta {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.comment-body {
  padding: 2px 0 4px;
}

.comment-quote {
  padding: 6px 10px;
  margin-bottom: 6px;
  border-left: 2px solid rgba(var(--v-theme-on-surface), 0.2);
  background: rgba(var(--v-theme-surface), 0.7);
  border-radius: 4px;
}

.comment-quote-name {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 2px;
}

.v-theme--light .comment-avatar {
  border: 1px solid rgba(var(--v-theme-surface-variant), 0.7);
}

.v-theme--dark .comment-avatar {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.35);
}

.comment-quote-content {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.comment-actions {
  margin-top: 4px;
}

.comment-divider {
  margin: 16px 0 14px;
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

.name-serif {
  font-family: "Noto Serif SC", "Songti SC", "STSong", "Times New Roman", serif;
  font-weight: 900;
}

.name-serif--mid {
  font-size: 1.8rem;
  line-height: 1.9rem;
}
</style>

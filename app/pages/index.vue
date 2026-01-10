<script lang="ts" setup>
import { MarkdownExit } from 'markdown-exit'
import DOMPurify from 'isomorphic-dompurify'
const { data: localInfo, pending: localPending } = useFetch('/api/connect')
const { token, role, email } = useAuthToken()

const isLoggedIn = computed(() => Boolean(token.value))
const canPost = computed(() => role.value === 'ADMIN' || role.value === 'POSTER')
const likedMoments = ref<string[]>([])
const moments = ref<Array<{
  id: number
  content: string
  createdAt: string
  tags: string[]
  images: string[]
  favCount: number
  extension?: string | null
  extensionType?: string | null
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
  images?: Array<{ image_url: string; image_source: string }>
  extension?: string | null
  extension_type?: string | null
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
const modalOpen = ref(false)
const editingModal = ref(false)
const modalDeleting = ref(false)
const modalMoment = ref<null | {
  id: number
  content: string
  createdAt: string
  tags: string[]
  images: string[]
  favCount: number
  extension?: string | null
  extensionType?: string | null
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
const modalImage = ref<string | null>(null)
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
    deletedAt?: string | null
    author: {
      id: number
      displayName: string | null
      email: string
      isOwner: boolean
      avatarUrl?: string | null
    }
  } | null
}>>([])
const imageLightboxOpen = ref(false)
const imageLightboxImages = ref<string[]>([])
const imageLightboxIndex = ref(0)
const commentContent = ref('')
const commentPosting = ref(false)
const commentDeletingId = ref<number | null>(null)
const replyTarget = ref<null | { id: number; name: string; content: string; time: string }>(null)
const route = useRoute()
const showFriends = ref(false)
const canEditModal = computed(() => {
  if (!isLoggedIn.value || !modalMoment.value) {
    return false
  }
  return role.value === 'ADMIN' || modalMoment.value.author.email === email.value
})
const canDeleteComment = (comment: (typeof modalComments.value)[number]) => {
  if (!isLoggedIn.value) {
    return false
  }
  return role.value === 'ADMIN' || comment.author.email === email.value
}
const markdown = new MarkdownExit({ linkify: true, breaks: true })
markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (!token) {
    return ''
  }
  const targetIndex = token.attrIndex('target')
  if (targetIndex < 0) {
    token.attrPush(['target', '_blank'])
  } else if (token.attrs?.[targetIndex]) {
    token.attrs[targetIndex][1] = '_blank'
  }
  const relIndex = token.attrIndex('rel')
  if (relIndex < 0) {
    token.attrPush(['rel', 'noopener noreferrer'])
  } else if (token.attrs?.[relIndex]) {
    token.attrs[relIndex][1] = 'noopener noreferrer'
  }
  return self.renderToken(tokens, idx, options)
}
let domPurifyHooked = false
const ensureDomPurifyHooks = () => {
  if (domPurifyHooked) {
    return
  }
  domPurifyHooked = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
}
const renderMarkdown = (content: string) => {
  ensureDomPurifyHooks()
  return DOMPurify.sanitize(markdown.render(content || ''))
}

const getExtensionType = (moment: TimelineItem) =>
  moment.kind === 'local' ? moment.extensionType : moment.extension_type
const getExtensionValue = (moment: TimelineItem) =>
  moment.kind === 'local' ? moment.extension : moment.extension
const parseWebsiteExtension = (value?: string | null) => {
  if (!value) {
    return null
  }
  try {
    const parsed = JSON.parse(value) as { title?: string; site?: string }
    if (!parsed || !parsed.site) {
      return null
    }
    return { title: parsed.title || '外部链接', site: parsed.site }
  } catch {
    return null
  }
}
const normalizeVideoId = (value: string) => {
  const trimmed = value.trim()
  const bvMatch = trimmed.match(/(BV[0-9A-Za-z]{10})/)
  if (bvMatch) {
    return { id: bvMatch[1] ?? bvMatch[0], provider: 'bilibili' }
  }
  const ytMatch =
    trimmed.match(/(?:https?:\/\/(?:www\.)?)?(?:youtu\.be\/|youtube\.com\/(?:(?:watch)?\?(?:.*&)?v(?:i)?=|(?:embed)\/))([\w-]+)/)
  if (ytMatch) {
    return { id: ytMatch[1] ?? '', provider: 'youtube' }
  }
  return { id: trimmed, provider: trimmed.startsWith('BV') ? 'bilibili' : 'youtube' }
}

const openExternalLink = (url: string) => {
  if (!url) {
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
type ConnectCardInfo = {
  server_name: string
  server_url: string
  logo: string
  total_moments: number
  today_moments: number
  sys_username: string
}

const connectItems = ref<ConnectCardInfo[]>([])

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

const deleteComment = async (commentId: number) => {
  if (!modalMoment.value || commentDeletingId.value !== null) {
    return
  }
  commentDeletingId.value = commentId
  try {
    const resp = await $fetch<{ code: number; msg: string }>(
      `/api/moments/${modalMoment.value.id}/comments/${commentId}`,
      {
        method: 'DELETE',
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
      },
    )
    if (resp.code === 1) {
      if (replyTarget.value?.id === commentId) {
        replyTarget.value = null
      }
      await loadComments(modalMoment.value.id)
      await refreshLocalMoment(modalMoment.value.id)
    }
  } finally {
    commentDeletingId.value = null
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

const openMomentModal = async (id: number, imageUrl?: string) => {
  try {
    const resp = await $fetch<{ code: number; data?: typeof modalMoment.value }>('/api/moments/' + id)
    if (resp.code === 1 && resp.data) {
      modalMoment.value = resp.data
      modalImage.value = imageUrl || resp.data.images?.[0] || null
      commentContent.value = ''
      replyTarget.value = null
      editingModal.value = false
      modalDeleting.value = false
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

const getRemoteImageUrl = (baseUrl: string, image: { image_url: string; image_source: string }) => {
  if (!image?.image_url) {
    return ''
  }
  if (image.image_source === 'local') {
    const base = baseUrl.replace(/\/+$/, '')
    const path = image.image_url.startsWith('/') ? image.image_url : `/${image.image_url}`
    return `${base}/api${path}`
  }
  return image.image_url
}

const openImageLightbox = (images: string[], startIndex = 0) => {
  if (!images.length) {
    return
  }
  imageLightboxImages.value = images
  imageLightboxIndex.value = Math.min(Math.max(startIndex, 0), images.length - 1)
  imageLightboxOpen.value = true
}

const openImageLightboxForMoment = (moment: TimelineItem, image: string | { image_url: string; image_source: string }) => {
  if (moment.kind === 'local') {
    const list = moment.images || []
    const index = typeof image === 'string' ? list.indexOf(image) : -1
    openImageLightbox(list, Math.max(index, 0))
    return
  }
  const list = (moment.images || []).map((img) => getRemoteImageUrl(moment.server_url, img)).filter(Boolean)
  const targetUrl = typeof image === 'string' ? image : getRemoteImageUrl(moment.server_url, image)
  const index = list.indexOf(targetUrl)
  openImageLightbox(list, Math.max(index, 0))
}

const openImageLightboxForModal = (image: string) => {
  const list = modalMoment.value?.images || []
  const index = list.indexOf(image)
  openImageLightbox(list, Math.max(index, 0))
}

const handlePosted = async () => {
  moments.value = []
  page.value = 1
  hasMore.value = true
  await loadMoments()
}

const handleModalUpdated = async () => {
  if (!modalMoment.value) {
    return
  }
  await refreshLocalMoment(modalMoment.value.id)
  const images = modalMoment.value?.images || []
  if (images.length === 0) {
    modalImage.value = null
  } else if (!modalImage.value || !images.includes(modalImage.value)) {
    modalImage.value = images[0] || null
  }
  editingModal.value = false
}

const deleteModalMoment = async () => {
  if (!modalMoment.value || modalDeleting.value) {
    return
  }
  modalDeleting.value = true
  try {
    const resp = await $fetch<{ code: number; msg: string }>(
      `/api/moments/${modalMoment.value.id}`,
      {
        method: 'DELETE',
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
      },
    )
    if (resp.code === 1) {
      const targetId = modalMoment.value.id
      moments.value = moments.value.filter((item) => item.id !== targetId)
      modalOpen.value = false
      modalMoment.value = null
    }
  } finally {
    modalDeleting.value = false
  }
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
              <div class="text-body-2 markdown-body" v-html="renderMarkdown(moment.content)" />
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
              <div v-if="moment.kind === 'local' && moment.images?.length" class="moment-images">
                <div
                  v-for="image in moment.images"
                  :key="image"
                  class="moment-image-thumb"
                  @click.stop="openImageLightboxForMoment(moment, image)"
                >
                  <v-img :src="image" aspect-ratio="1" cover />
                </div>
              </div>
              <div v-if="moment.kind === 'remote' && moment.images?.length" class="moment-images">
                <div
                  v-for="image in moment.images"
                  :key="image.image_url"
                  class="moment-image-thumb"
                  @click.stop="openImageLightboxForMoment(moment, image)"
                >
                  <v-img :src="getRemoteImageUrl(moment.server_url, image)" aspect-ratio="1" cover />
                </div>
              </div>
              <div
                v-if="getExtensionType(moment) && getExtensionValue(moment)"
                class="moment-extension"
                @click.stop
              >
                <v-card
                  v-if="getExtensionType(moment) === 'MUSIC'"
                  variant="tonal"
                  class="extension-card"
                >
                  <v-card-text class="extension-music">
                    <MetingPlayer :source="String(getExtensionValue(moment))" />
                  </v-card-text>
                </v-card>
                <v-responsive
                  v-else-if="getExtensionType(moment) === 'VIDEO'"
                  aspect-ratio="16/9"
                  class="extension-video"
                >
                  <iframe
                    v-if="normalizeVideoId(String(getExtensionValue(moment))).provider === 'bilibili'"
                    :src="`https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${normalizeVideoId(String(getExtensionValue(moment))).id}&as_wide=1&high_quality=1&danmaku=0`"
                    frameborder="no"
                    allowfullscreen
                    loading="lazy"
                    class="extension-iframe"
                  />
                  <iframe
                    v-else
                    :src="`https://www.youtube.com/embed/${normalizeVideoId(String(getExtensionValue(moment))).id}`"
                    frameborder="0"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                    loading="lazy"
                    class="extension-iframe"
                  />
                </v-responsive>
                <v-card
                  v-else-if="getExtensionType(moment) === 'GITHUBPROJ'"
                  v-ripple
                  variant="tonal"
                  class="extension-card"
                  @click="openExternalLink(String(getExtensionValue(moment)))"
                >
                  <v-card-text class="d-flex align-center gap-2">
                    <v-icon size="18" icon="mdi-github" />
                    <span class="extension-title">
                      {{ String(getExtensionValue(moment)) }}
                    </span>
                  </v-card-text>
                </v-card>
                <v-card
                  v-else-if="getExtensionType(moment) === 'WEBSITE'"
                  v-ripple
                  variant="tonal"
                  class="extension-card"
                  @click="
                    openExternalLink(
                      parseWebsiteExtension(String(getExtensionValue(moment)))?.site ||
                        String(getExtensionValue(moment)),
                    )
                  "
                >
                  <v-card-text class="d-flex align-center gap-2">
                    <v-icon size="18" icon="mdi-link-variant" />
                    <template v-if="parseWebsiteExtension(String(getExtensionValue(moment)))">
                      <span class="extension-title">
                        {{ parseWebsiteExtension(String(getExtensionValue(moment)))?.title }}
                      </span>
                    </template>
                    <template v-else>
                      <span class="extension-title">
                        {{ String(getExtensionValue(moment)) }}
                      </span>
                    </template>
                  </v-card-text>
                </v-card>
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
              variant="tonal"
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

          <FriendsPanel
            @update:show-friends="showFriends = $event"
            @connects-loaded="connectItems = $event"
          />

          <ComposeMoment
            v-if="canPost"
            :disabled="!isLoggedIn"
            @posted="handlePosted"
          />
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
          <div v-if="editingModal" class="mt-2">
            <ComposeMoment
              :disabled="!isLoggedIn || modalDeleting"
              mode="edit"
              :moment-id="modalMoment.id"
              :initial="{
                content: modalMoment.content,
                tags: modalMoment.tags,
                images: modalMoment.images,
                extension: modalMoment.extension,
                extensionType: modalMoment.extensionType,
              }"
              @updated="handleModalUpdated"
            />
          </div>
          <template v-else>
            <div class="text-body-2 markdown-body" v-html="renderMarkdown(modalMoment.content)" />
              <div v-if="modalMoment.images?.length" class="modal-images">
                <div v-if="modalImage" class="modal-image-main">
                  <v-img :src="modalImage" aspect-ratio="16/9" cover @click="openImageLightboxForModal(modalImage)" />
                </div>
                <div class="modal-image-list">
                  <div
                    v-for="image in modalMoment.images"
                    :key="image"
                    class="modal-image-thumb"
                    :class="{ 'is-active': image === modalImage }"
                  @click="modalImage = image"
                  >
                    <v-img :src="image" aspect-ratio="1" cover />
                  </div>
                </div>
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
            <div
              v-if="modalMoment.extensionType && modalMoment.extension"
              class="moment-extension mt-2"
              @click.stop
            >
              <v-card
                v-if="modalMoment.extensionType === 'MUSIC'"
                variant="tonal"
                class="extension-card"
              >
                <v-card-text class="extension-music">
                  <MetingPlayer :source="modalMoment.extension" />
                </v-card-text>
              </v-card>
              <v-responsive
                v-else-if="modalMoment.extensionType === 'VIDEO'"
                aspect-ratio="16/9"
                class="extension-video"
              >
                <iframe
                  v-if="normalizeVideoId(modalMoment.extension).provider === 'bilibili'"
                  :src="`https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${normalizeVideoId(modalMoment.extension).id}&as_wide=1&high_quality=1&danmaku=0`"
                  frameborder="no"
                  allowfullscreen
                  loading="lazy"
                  class="extension-iframe"
                />
                <iframe
                  v-else
                  :src="`https://www.youtube.com/embed/${normalizeVideoId(modalMoment.extension).id}`"
                  frameborder="0"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                  loading="lazy"
                  class="extension-iframe"
                />
              </v-responsive>
              <v-card
                v-else-if="modalMoment.extensionType === 'GITHUBPROJ'"
                v-ripple
                variant="tonal"
                class="extension-card"
                @click="openExternalLink(modalMoment.extension)"
              >
                <v-card-text class="d-flex align-center gap-2">
                  <v-icon size="18" icon="mdi-github" />
                  <span class="extension-title">
                    {{ modalMoment.extension }}
                  </span>
                </v-card-text>
              </v-card>
              <v-card
                v-else-if="modalMoment.extensionType === 'WEBSITE'"
                v-ripple
                variant="tonal"
                class="extension-card"
                @click="
                  openExternalLink(
                    parseWebsiteExtension(modalMoment.extension)?.site || modalMoment.extension,
                  )
                "
              >
                <v-card-text class="d-flex align-center gap-2">
                  <v-icon size="18" icon="mdi-link-variant" />
                  <template v-if="parseWebsiteExtension(modalMoment.extension)">
                    <span class="extension-title">
                      {{ parseWebsiteExtension(modalMoment.extension)?.title }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="extension-title">
                      {{ modalMoment.extension }}
                    </span>
                  </template>
                </v-card-text>
              </v-card>
            </div>
          </template>
          <div class="moment-actions mt-2">
            <v-btn
              v-if="canEditModal"
              size="x-small"
              variant="text"
              :disabled="modalDeleting"
              @click.stop="editingModal = !editingModal"
            >
              <v-icon size="16" :icon="editingModal ? 'mdi-close' : 'mdi-pencil-outline'" />
              <span class="moment-like-count">{{ editingModal ? '取消编辑' : '编辑' }}</span>
            </v-btn>
            <v-btn
              v-if="canEditModal"
              size="x-small"
              variant="text"
              color="error"
              :disabled="modalDeleting"
              @click.stop="deleteModalMoment"
            >
              <v-icon size="16" icon="mdi-delete-outline" />
              <span class="moment-like-count">删除</span>
            </v-btn>
            <v-btn
              size="x-small"
              variant="text"
              :color="hasLikedMoment(modalMoment.id) ? 'secondary' : undefined"
              :disabled="modalDeleting"
              @click.stop="likeMoment(modalMoment.id)"
            >
              <v-icon size="16" :icon="hasLikedMoment(modalMoment.id) ? 'mdi-heart' : 'mdi-heart-outline'" />
              <span class="moment-like-count">{{ modalMoment.favCount || 0 }}</span>
            </v-btn>
            <v-btn size="x-small" variant="text" :disabled="modalDeleting">
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
                    :disabled="modalDeleting || commentDeletingId !== null"
                    @click="replyTarget = {
                      id: comment.id,
                      name: comment.author.displayName || comment.author.email,
                      content: comment.content,
                      time: new Date(comment.createdAt).toLocaleString(),
                    }"
                  >
                    回复
                  </v-btn>
                  <v-btn
                    v-if="canDeleteComment(comment)"
                    size="x-small"
                    variant="text"
                    color="error"
                    :loading="commentDeletingId === comment.id"
                    :disabled="modalDeleting || commentDeletingId !== null"
                    @click="deleteComment(comment.id)"
                  >
                    删除
                  </v-btn>
                </div>
                <div class="comment-body">
                  <div v-if="comment.replyTo" class="comment-quote">
                  <div class="comment-quote-name">
                      {{
                        comment.replyTo.deletedAt
                          ? '原评论已删除'
                          : (comment.replyTo.author.displayName || comment.replyTo.author.email || '匿名')
                      }}
                  </div>
                  <div v-if="comment.replyTo.deletedAt" class="comment-quote-content text-caption text-muted">【原评论已删除】</div>
                  <div v-else class="comment-quote-content markdown-body" v-html="renderMarkdown(comment.replyTo.content)" />
                  </div>
                  <div class="text-body-2 markdown-body" v-html="renderMarkdown(comment.content)" />
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
                  <v-btn
                    size="x-small"
                    variant="outlined"
                    :disabled="modalDeleting || commentDeletingId !== null"
                    @click="replyTarget = null"
                  >
                    取消
                  </v-btn>
                </div>
                <div class="reply-content text-body-2 markdown-body" v-html="renderMarkdown(replyTarget.content)" />
              </div>
              <v-textarea
                v-model="commentContent"
                label="写下你的评论..."
                variant="outlined"
                density="compact"
                rows="2"
                auto-grow
              />
              <v-btn
                color="accent"
                class="mt-2"
                :disabled="modalDeleting || commentDeletingId !== null || commentPosting || !commentContent.trim()"
                @click="postComment"
              >
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
    <ImageLightbox
      v-model="imageLightboxOpen"
      :images="imageLightboxImages"
      :start-index="imageLightboxIndex"
      @update:start-index="imageLightboxIndex = $event"
    />
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

.moment-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.moment-extension {
  margin-top: 10px;
}

.extension-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.extension-music {
  padding: 0;
}

.extension-link {
  color: inherit;
  text-decoration: none;
  word-break: break-all;
}

.extension-title {
  font-size: 0.85rem;
  word-break: break-all;
}

.extension-video {
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.extension-iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.moment-image-thumb {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  cursor: pointer;
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

.modal-images {
  margin-top: 10px;
}

.modal-image-main {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.modal-image-list {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.modal-image-thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  cursor: pointer;
}

.modal-image-thumb.is-active {
  border-color: rgb(var(--v-theme-primary));
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

.markdown-body :deep(blockquote) {
  margin: 6px 0;
  padding: 6px 10px;
  border-left: 3px solid rgba(var(--v-theme-on-surface), 0.35);
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 4px;
}

.markdown-body :deep(blockquote p) {
  margin: 0;
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

.markdown-body :deep(p) {
  margin: 0 0 6px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(a) {
  color: rgb(var(--v-theme-primary));
}

.markdown-body :deep(pre) {
  background: rgba(var(--v-theme-on-surface), 0.06);
  padding: 8px 10px;
  border-radius: 6px;
  overflow-x: auto;
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

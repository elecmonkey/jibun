<script setup lang="ts">
const props = defineProps<{
  value: string
}>()

const { value: repoUrl } = toRefs(props)

type GitHubRepo = {
  full_name: string
  description: string | null
  stargazers_count: number
  forks_count: number
  language: string | null
  html_url: string
  owner: {
    avatar_url: string
  }
}

const repoInfo = ref<GitHubRepo | null>(null)
const loading = ref(false)
const error = ref(false)

const parseRepo = (url: string) => {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    if (pathParts.length >= 2) {
      return { owner: pathParts[0], repo: pathParts[1] }
    }
  } catch {
    // Try matching "owner/repo" if not a valid URL
    const match = url.match(/^([^/]+)\/([^/]+)$/)
    if (match) {
      return { owner: match[1], repo: match[2] }
    }
  }
  return null
}

const fetchRepoInfo = async () => {
  const parsed = parseRepo(repoUrl.value)
  if (!parsed) return

  loading.value = true
  error.value = false

  try {
    // Try proxy first
    const { data: proxyData } = await useFetch<{ code: number; data: GitHubRepo }>('/api/github/repo', {
      query: { owner: parsed.owner, repo: parsed.repo },
    })

    if (proxyData.value?.code === 1 && proxyData.value?.data) {
      repoInfo.value = proxyData.value.data
    } else {
      // Fallback to direct API
      throw new Error('Proxy failed')
    }
  } catch (err) {
    console.warn('GitHub Proxy failed, trying direct API', err)
    try {
      const directData = await $fetch<GitHubRepo>(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`)
      repoInfo.value = directData
    } catch (directErr) {
      console.error('GitHub Direct API failed', directErr)
      error.value = true
    }
  } finally {
    loading.value = false
  }
}

const openRepo = () => {
  if (repoInfo.value?.html_url) {
    window.open(repoInfo.value.html_url, '_blank', 'noopener,noreferrer')
  } else if (repoUrl.value) {
    window.open(repoUrl.value, '_blank', 'noopener,noreferrer')
  }
}

onMounted(() => {
  fetchRepoInfo()
})
</script>

<template>
  <v-card
    v-ripple
    variant="tonal"
    class="extension-card"
    @click="openRepo"
  >
    <div v-if="loading" class="d-flex align-center pa-3">
      <v-progress-circular indeterminate size="20" width="2" color="primary" class="me-3" />
      <span class="text-caption">加载 GitHub 信息...</span>
    </div>
    
    <div v-else-if="repoInfo" class="pa-3">
      <div class="d-flex align-start mb-2">
        <v-avatar size="40" rounded class="me-3">
          <v-img :src="repoInfo.owner.avatar_url" />
        </v-avatar>
        <div class="flex-grow-1 overflow-hidden">
          <div class="text-subtitle-2 font-weight-bold text-truncate">
            {{ repoInfo.full_name }}
          </div>
          <div class="text-caption text-muted text-truncate">
            {{ repoInfo.description || '暂无简介' }}
          </div>
        </div>
      </div>
      
      <div class="d-flex align-center gap-4 text-caption text-muted">
        <div class="d-flex align-center">
          <v-icon size="14" icon="mdi-star-outline" class="me-1" />
          {{ repoInfo.stargazers_count }}
        </div>
        <div class="d-flex align-center">
          <v-icon size="14" icon="mdi-source-fork" class="me-1" />
          {{ repoInfo.forks_count }}
        </div>
        <div v-if="repoInfo.language" class="d-flex align-center">
          <v-icon size="14" icon="mdi-circle-small" :color="repoInfo.language === 'TypeScript' ? 'blue' : 'grey'" class="me-1" />
          {{ repoInfo.language }}
        </div>
      </div>
    </div>

    <!-- Fallback / Simple view -->
    <v-card-text v-else class="d-flex align-center gap-2">
      <v-icon size="18" icon="mdi-github" />
      <span class="extension-title">
        {{ value }}
      </span>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.extension-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  cursor: pointer;
}

.extension-title {
  font-size: 0.85rem;
  word-break: break-all;
  margin-left: 8px;
}

.text-muted {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.gap-4 {
  gap: 16px;
}
</style>

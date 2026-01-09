<script setup lang="ts">
type ConnectCardInfo = {
  server_name: string
  server_url: string
  logo: string
  total_moments: number
  today_moments: number
  sys_username: string
}

const emit = defineEmits<{
  (e: 'update:showFriends', value: boolean): void
  (e: 'connects-loaded', items: ConnectCardInfo[]): void
}>()

const { data: connectInfo, pending: connectPending } = useFetch('/api/connects/info', { server: false })
const connectItems = computed<ConnectCardInfo[]>(() => {
  return connectInfo.value?.data ?? []
})

const storedShowFriends = ref(false)

onMounted(() => {
  const stored = localStorage.getItem('jibun-show-friends')
  storedShowFriends.value = stored === 'true'
  emit('update:showFriends', storedShowFriends.value)
})

watch(
  () => connectItems.value.length,
  (value) => {
    emit('connects-loaded', connectItems.value)
  },
  { immediate: true },
)
</script>

<template>
  <div class="rounded-sm border border-[rgba(var(--v-theme-on-surface),0.08)] bg-[rgba(var(--v-theme-surface),0.98)] p-4">
    <div class="mb-2 flex items-center justify-between">
      <div class="text-sm font-semibold text-[rgba(var(--v-theme-on-surface),0.85)]">
        朋友们
      </div>
      <div class="flex flex-row items-center gap-4">
        <span class="text-xs text-[rgba(var(--v-theme-on-surface),0.6)]">加载ta们的瞬间</span>
        <v-switch
          :model-value="storedShowFriends"
          hide-details
          density="compact"
          color="secondary"
          @update:model-value="(value) => {
            const next = Boolean(value)
            storedShowFriends.value = next
            localStorage.setItem('jibun-show-friends', next ? 'true' : 'false')
            emit('update:showFriends', next)
          }"
        />
        <v-chip color="secondary" variant="tonal" size="small">
          {{ connectItems.length }}
        </v-chip>
      </div>
    </div>
    <v-skeleton-loader v-if="connectPending" type="list-item-two-line" />
    <div v-else-if="connectItems.length">
      <div v-for="info in connectItems" :key="info.server_url" class="mb-3 last:mb-0">
        <InstanceCard :info="info" />
      </div>
    </div>
    <v-alert v-else type="info" variant="tonal">
      还没有连接实例。
    </v-alert>
  </div>
</template>

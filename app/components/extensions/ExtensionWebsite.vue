<script setup lang="ts">
const props = defineProps<{
  value: string
}>()

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

const parsedInfo = computed(() => parseWebsiteExtension(props.value))

const openLink = () => {
  const url = parsedInfo.value?.site || props.value
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <v-card
    v-ripple
    variant="tonal"
    class="extension-card"
    @click="openLink"
  >
    <v-card-text class="d-flex align-center gap-2">
      <v-icon size="18" icon="mdi-link-variant" />
      <span class="extension-title">
        {{ parsedInfo?.title || value }}
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
</style>

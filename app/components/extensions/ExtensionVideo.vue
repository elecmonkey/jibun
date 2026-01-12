<script setup lang="ts">
const props = defineProps<{
  value: string
}>()

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

const videoInfo = computed(() => normalizeVideoId(props.value))
</script>

<template>
  <v-responsive aspect-ratio="16/9" class="extension-video">
    <iframe
      v-if="videoInfo.provider === 'bilibili'"
      :src="`https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${videoInfo.id}&as_wide=1&high_quality=1&danmaku=0`"
      frameborder="no"
      allowfullscreen
      loading="lazy"
      class="extension-iframe"
    />
    <iframe
      v-else
      :src="`https://www.youtube.com/embed/${videoInfo.id}`"
      frameborder="0"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      loading="lazy"
      class="extension-iframe"
    />
  </v-responsive>
</template>

<style scoped>
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
</style>

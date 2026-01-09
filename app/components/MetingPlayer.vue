<script setup lang="ts">
type MetingAttrs = {
  server?: string
  type?: string
  id?: string
  auto?: string
  name?: string
  artist?: string
  url?: string
  cover?: string
  api?: string
  fixed?: string
  mini?: string
  autoplay?: string
  theme?: string
  loop?: string
  order?: string
  preload?: string
  volume?: string
  mutex?: string
  'lrc-type'?: string
  'list-folded'?: string
  'list-max-height'?: string
  'storage-name'?: string
}

const props = defineProps<{
  source: string
}>()

const parseSource = (raw: string): MetingAttrs | null => {
  const value = raw.trim()
  if (!value) {
    return null
  }

  if (value.startsWith('{') && value.endsWith('}')) {
    try {
      const parsed = JSON.parse(value) as Record<string, string>
      if (parsed.url) {
        return {
          name: parsed.name || 'Audio',
          artist: parsed.artist || 'Unknown',
          url: parsed.url,
          cover: parsed.cover || '',
          api: parsed.api || '',
          fixed: parsed.fixed || '',
          mini: parsed.mini || '',
          autoplay: parsed.autoplay || '',
          theme: parsed.theme || '',
          loop: parsed.loop || '',
          order: parsed.order || '',
          preload: parsed.preload || '',
          volume: parsed.volume || '',
          mutex: parsed.mutex || '',
          'lrc-type': parsed['lrc-type'] || parsed.lrcType || '',
          'list-folded': parsed['list-folded'] || parsed.listFolded || '',
          'list-max-height': parsed['list-max-height'] || parsed.listMaxHeight || '',
          'storage-name': parsed['storage-name'] || parsed.storageName || '',
        }
      }
      if (parsed.server && parsed.type && parsed.id) {
        return {
          server: parsed.server,
          type: parsed.type,
          id: parsed.id,
          api: parsed.api || '',
        }
      }
      if (parsed.auto) {
        return { auto: parsed.auto, api: parsed.api || '' }
      }
    } catch {
      return { auto: value }
    }
  }

  return { auto: value }
}

const attrs = computed(() => parseSource(props.source))
const playerKey = computed(() => `meting-${props.source}`)
</script>

<template>
  <div v-if="attrs" class="meting-wrap">
    <meting-js v-bind="attrs" :key="playerKey" />
  </div>
</template>

<style scoped>
.meting-wrap {
  width: 100%;
}
</style>

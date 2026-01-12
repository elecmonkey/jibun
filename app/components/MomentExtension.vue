<script setup lang="ts">
import ExtensionMusic from './extensions/ExtensionMusic.vue'
import ExtensionVideo from './extensions/ExtensionVideo.vue'
import ExtensionGithub from './extensions/ExtensionGithub.vue'
import ExtensionWebsite from './extensions/ExtensionWebsite.vue'

defineProps<{
  type?: string | null
  value?: string | null
}>()
</script>

<template>
  <div v-if="type && value" class="moment-extension" @click.stop>
    <ExtensionMusic
      v-if="type === 'MUSIC'"
      :value="value"
    />
    <ExtensionVideo
      v-else-if="type === 'VIDEO'"
      :value="value"
    />
    <ExtensionGithub
      v-else-if="type === 'GITHUBPROJ'"
      :value="value"
    />
    <ExtensionWebsite
      v-else-if="type === 'WEBSITE'"
      :value="value"
    />
  </div>
</template>

<style scoped>
.moment-extension {
  margin-top: 10px;
}
</style>

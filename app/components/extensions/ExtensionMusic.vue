<script setup lang="ts">
defineProps<{
  value: string
}>()
</script>

<template>
  <v-card variant="tonal" class="extension-card">
    <v-card-text class="extension-music">
      <MetingPlayer :source="value" />
    </v-card-text>
  </v-card>
</template>

<style scoped>
.extension-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.extension-music {
  padding: 0;
}
</style>

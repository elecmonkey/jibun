<script setup lang="ts">
type InstanceInfo = {
  server_name: string
  server_url: string
  logo: string
  total_moments: number
  today_moments: number
  sys_username: string
}

defineProps<{
  info: InstanceInfo
}>()
</script>

<template>
  <v-card class="instance-card" rounded="md" elevation="1">
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center">
        <v-avatar size="48" class="me-4" color="surface-variant">
          <v-img v-if="info.logo" :src="info.logo" alt="logo" />
          <v-icon v-else icon="mdi-radar" />
        </v-avatar>
        <div>
          <div class="text-h6 font-display">{{ info.server_name }}</div>
          <div class="text-body-2 text-muted">{{ info.server_url }}</div>
        </div>
      </div>
      <v-chip color="accent" variant="tonal" size="small">
        @{{ info.sys_username }}
      </v-chip>
    </div>

    <v-divider class="mb-4" />

    <div class="d-flex justify-space-between">
      <div>
        <div class="text-caption text-muted">总瞬间</div>
        <div class="text-h5">{{ info.total_moments }}</div>
      </div>
      <div>
        <div class="text-caption text-muted">今日</div>
        <div class="text-h5">{{ info.today_moments }}</div>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.instance-card {
  background: rgba(var(--v-theme-surface), 0.98);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
</style>

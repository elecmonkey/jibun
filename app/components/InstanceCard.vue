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
  <v-card
    class="instance-card"
    rounded="md"
    elevation="1"
    link
    :href="info.server_url"
    target="_blank"
    rel="noopener"
  >
    <div class="instance-body">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-avatar size="48" class="me-4" color="surface-variant">
            <v-img v-if="info.logo" :src="info.logo" alt="logo" />
            <v-icon v-else icon="mdi-radar" />
          </v-avatar>
          <div>
            <div class="text-h6 font-display">{{ info.server_name }}</div>
            <div class="text-caption text-muted">
              总瞬间 {{ info.total_moments }} · 今日 {{ info.today_moments }}
            </div>
          </div>
        </div>
        <v-chip color="accent" variant="tonal" size="small">
          @{{ info.sys_username }}
        </v-chip>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.instance-card {
  background: rgba(var(--v-theme-surface), 0.98);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.instance-body {
  padding: 12px 14px;
}

</style>

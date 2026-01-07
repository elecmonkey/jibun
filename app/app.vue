<script setup lang="ts">
const { toggle, isDark } = useThemeMode()
const { data: profile } = useFetch('/api/connect')

useHead(() => ({
  title: profile.value?.data?.server_name || 'Jibun',
}))
</script>

<template>
  <v-app class="app-root">
    <v-app-bar elevation="0" class="app-bar">
      <v-container class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-avatar size="28" class="me-2">
            <v-img src="/jibun-logo.svg" alt="Jibun logo" />
          </v-avatar>
          <span class="text-subtitle-1 font-weight-semibold">
            {{ profile?.data?.server_name || 'Jibun' }}
          </span>
        </div>
        <div class="d-flex align-center gap-2">
          <v-btn variant="text" to="/">首页</v-btn>
          <v-btn variant="text" to="/admin">管理端</v-btn>
          <v-divider vertical class="mx-2" />
          <v-btn icon variant="text" @click="toggle">
            <v-icon :icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'" />
          </v-btn>
        </div>
      </v-container>
    </v-app-bar>

    <v-main>
      <NuxtPage />
    </v-main>

    <AppFooter />
  </v-app>
</template>

<style>
.app-root {
  font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  background-color: rgb(var(--v-theme-background));
}

.app-bar {
  background: rgba(var(--v-theme-surface), 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.text-muted {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.gap-2 {
  gap: 8px;
}
</style>

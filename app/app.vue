<script setup lang="ts">
const { toggle, isDark } = useThemeMode()
const { role, name, email } = useAuthToken()
const { data: profile } = useFetch('/api/connect')

useHead(() => ({
  title: profile.value?.data?.server_name || 'Jibun',
}))
</script>

<template>
  <v-app class="app-root">
    <v-app-bar elevation="0" class="app-bar">
      <v-container class="d-flex align-center justify-space-between app-shell">
        <div class="d-flex align-center">
          <v-avatar size="28" class="me-2">
            <v-img src="/jibun-logo.svg" alt="Jibun logo" :class="{ 'logo-invert': isDark }" />
          </v-avatar>
          <span class="text-subtitle-1 font-weight-semibold">
            {{ profile?.data?.server_name || 'Jibun' }}
          </span>
        </div>
        <div class="d-flex align-center gap-2">
          <v-btn variant="text" to="/">Moments</v-btn>
          <v-btn v-if="role === 'ADMIN'" variant="text" to="/admin">Admin</v-btn>
          <v-divider v-if="role" vertical class="mx-2" />
          <v-menu v-if="role" open-on-hover location="bottom end">
            <template #activator="{ props }">
              <div class="role-pill text-caption text-muted" v-bind="props">
                {{ name || email }}
              </div>
            </template>
            <v-card class="profile-card" rounded="md" elevation="2">
              <div class="text-caption text-muted">身份</div>
              <div class="text-body-2 mb-2">{{ role }}</div>
              <div class="text-caption text-muted">邮箱</div>
              <div class="text-body-2">{{ email }}</div>
            </v-card>
          </v-menu>
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

.app-shell {
  max-width: 1280px;
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

.role-pill {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 999px;
  padding: 4px 10px;
  text-transform: uppercase;
}

.profile-card {
  padding: 12px 14px;
  background: rgba(var(--v-theme-surface), 0.98);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  min-width: 180px;
}
.logo-invert {
  filter: invert(1);
}
</style>

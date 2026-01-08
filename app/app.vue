<script setup lang="ts">
const { toggle, isDark } = useThemeMode()
const { role, name, email, token } = useAuthToken()
const { data: profile } = useFetch('/api/connect')

useHead(() => ({
  title: profile.value?.data?.server_name || 'Jibun',
}))
</script>

<template>
  <v-app class="app-root">
    <v-app-bar elevation="0" class="app-bar">
      <v-container class="app-shell">
        <div class="nav-desktop d-flex align-center justify-space-between">
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
            <v-btn v-if="token" variant="text" to="/mine">Mine</v-btn>
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
        </div>

        <div class="nav-mobile d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-avatar size="28" class="me-2">
              <v-img src="/jibun-logo.svg" alt="Jibun logo" :class="{ 'logo-invert': isDark }" />
            </v-avatar>
            <span class="text-subtitle-1 font-weight-semibold">
              {{ profile?.data?.server_name || 'Jibun' }}
            </span>
          </div>
          <div class="d-flex align-center gap-2">
            <v-btn icon variant="text" @click="toggle">
              <v-icon :icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'" />
            </v-btn>
            <v-menu location="bottom end">
              <template #activator="{ props }">
                <v-btn icon variant="text" v-bind="props">
                  <v-icon icon="mdi-menu" />
                </v-btn>
              </template>
              <v-card class="mobile-menu-card" rounded="md" elevation="2">
                <v-list density="compact">
                  <v-list-item to="/" title="Moments" />
                  <v-list-item v-if="token" to="/mine" title="Mine" />
                  <v-list-item v-if="role === 'ADMIN'" to="/admin" title="Admin" />
                  <v-divider class="my-2" />
                  <v-list-item v-if="role" class="mobile-user-item">
                    <div class="mobile-role-tag">
                      <v-chip size="x-small" variant="tonal" color="secondary">
                        {{ role }}
                      </v-chip>
                    </div>
                    <v-list-item-title>{{ name || email }}</v-list-item-title>
                    <v-list-item-subtitle>{{ email }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item v-else title="未登录" subtitle="请先登录" />
                </v-list>
              </v-card>
            </v-menu>
          </div>
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

.nav-mobile {
  display: none;
}

.mobile-menu-card {
  padding: 4px 0;
  background: rgba(var(--v-theme-surface), 0.98);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  min-width: 200px;
}

.mobile-user-item {
  display: block;
}

.mobile-role-tag {
  margin-bottom: 4px;
}

@media (max-width: 960px) {
  .nav-desktop {
    display: none;
  }

  .nav-mobile {
    display: flex;
  }
}
</style>

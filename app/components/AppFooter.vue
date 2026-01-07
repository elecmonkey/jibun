<template>
  <v-footer class="app-footer" height="48" app>
    <v-container class="footer-inner d-flex align-center justify-space-between app-shell">
      <div class="text-caption text-muted">
        © 2026 自分 (じぶん, Jibun) Made with ❤️ by
        <a class="author-link" href="https://www.elecmonkey.com" target="_blank" rel="noopener">Elecmonkey</a>.
      </div>
      <v-btn
        class="github-btn"
        icon="mdi-github"
        variant="text"
        size="small"
        href="https://github.com/elecmonkey/jibun"
        target="_blank"
        rel="noopener"
      />
    </v-container>
  </v-footer>
</template>

<style scoped>
.app-footer {
  background: rgba(var(--v-theme-surface), 0.98);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  height: 48px !important;
  min-height: 48px !important;
  padding: 0 !important;
}

.footer-inner {
  height: 48px;
}

.app-shell {
  max-width: 1280px;
}

.author-link {
  color: inherit;
  text-decoration: none;
}

.author-link:hover {
  text-decoration: underline;
}

.github-btn {
  width: 28px;
  height: 28px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>

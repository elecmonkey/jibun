import { useHead } from '#imports'

export default defineNuxtPlugin(() => {
  useHead({
    link: [
      {
        rel: 'stylesheet',
        href: 'https://cdn.jsdelivr.net/npm/aplayer/dist/APlayer.min.css',
      },
    ],
    script: [
      {
        src: 'https://cdn.jsdelivr.net/npm/aplayer/dist/APlayer.min.js',
        defer: true,
      },
      {
        src: 'https://cdn.jsdelivr.net/npm/meting@2/dist/Meting.min.js',
        defer: true,
      },
    ],
  })
})

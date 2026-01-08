import { prisma } from '../utils/prisma'

export default defineEventHandler(async (event) => {
  const setting = await prisma.systemSetting.findFirst()
  const name = setting?.serverName || 'Jibun'
  const description = 'Jibun (じぶん) - 时间轴分享平台'
  const themeColor = '#f7f4ef'
  const manifest = {
    name,
    short_name: name,
    description,
    theme_color: themeColor,
    background_color: themeColor,
    display: 'standalone',
    start_url: '/',
    icons: [
      {
        src: '/jibun-logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }

  event.node.res.setHeader('Content-Type', 'application/manifest+json')
  return manifest
})

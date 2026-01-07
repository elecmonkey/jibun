import { prisma } from '../utils/prisma'
import { fail, ok } from '../utils/response'

const buildLogoUrl = (serverUrl: string, serverLogo: string) => {
  if (!serverLogo) {
    return ''
  }

  if (serverLogo.startsWith('http://') || serverLogo.startsWith('https://')) {
    return serverLogo
  }

  if (!serverUrl) {
    return ''
  }

  const trimmedServerUrl = serverUrl.replace(/\/+$/, '')
  const trimmedLogo = serverLogo.replace(/^\/+/, '')
  return `${trimmedServerUrl}/${trimmedLogo}`
}

export default defineEventHandler(async () => {
  const setting = await prisma.systemSetting.findFirst()
  if (!setting || !setting.serverName || !setting.serverUrl || !setting.sysUsername) {
    return fail('system setting not configured', null)
  }

  const serverUrl = setting.serverUrl
  const serverName = setting.serverName
  const serverLogo = setting.serverLogo
  const sysUsername = setting.sysUsername

  const totalMoments = await prisma.moment.count()

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  const todayMoments = await prisma.moment.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  })

  return ok({
    server_name: serverName,
    server_url: serverUrl,
    logo: buildLogoUrl(serverUrl, serverLogo),
    total_moments: totalMoments,
    today_moments: todayMoments,
    total_echos: totalMoments,
    today_echos: todayMoments,
    sys_username: sysUsername,
  }, 'connect ok')
})

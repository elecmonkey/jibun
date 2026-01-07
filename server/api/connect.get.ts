import { prisma } from '../utils/prisma'
import { fail, ok } from '../utils/response'

const resolveTimeZone = (input?: string) => {
  const fallback = 'UTC'
  if (!input) {
    return fallback
  }
  try {
    Intl.DateTimeFormat('en-US', { timeZone: input })
    return input
  } catch {
    return fallback
  }
}

const getTimeZoneOffsetMinutes = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  )

  return (asUtc - date.getTime()) / 60000
}

const getZonedDayRange = (timeZone: string) => {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const year = Number(lookup.year)
  const month = Number(lookup.month)
  const day = Number(lookup.day)

  const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const offsetMinutes = getTimeZoneOffsetMinutes(startUtc, timeZone)
  const startOfDay = new Date(startUtc.getTime() - offsetMinutes * 60000)
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  return { startOfDay, endOfDay }
}

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

  const timeZone = resolveTimeZone(process.env.JIBUN_TIMEZONE)
  const { startOfDay, endOfDay } = getZonedDayRange(timeZone)

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

import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'

const fetchRemoteInfo = async (baseUrl: string) => {
  try {
    const resp = await $fetch<{
      code: number
      data?: {
        server_name?: string
        server_url?: string
        logo?: string
        sys_username?: string
        total_moments?: number
        today_moments?: number
      }
    }>(`${baseUrl}/api/connect`)
    if (resp?.code === 1 && resp.data) {
      return resp.data
    }
  } catch {
    // ignore
  }
  return null
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = String(query.token || '').trim()
  if (!token) {
    return fail('invalid token', null)
  }

  const connect = await prisma.connect.findFirst({
    where: {
      inviteToken: token,
      inviteExpiresAt: { gt: new Date() },
      instanceType: 'JIBUN',
    },
  })

  if (!connect) {
    return fail('invite invalid', null)
  }

  const invitedCount = await prisma.user.count({
    where: { invitedByConnectId: connect.id },
  })

  if (invitedCount > 0) {
    return fail('invite already used', null)
  }

  const remoteInfo = await fetchRemoteInfo(connect.connectUrl)
  if (!remoteInfo) {
    return fail('remote not available', null)
  }

  return ok({
    serverName: remoteInfo.server_name || '',
    serverUrl: remoteInfo.server_url || '',
    logo: remoteInfo.logo || '',
    sysUsername: remoteInfo.sys_username || '',
    totalMoments: remoteInfo.total_moments ?? 0,
    todayMoments: remoteInfo.today_moments ?? 0,
  }, 'invite ok')
})

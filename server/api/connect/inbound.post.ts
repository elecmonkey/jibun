import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { trimUrl } from '../../utils/normalize'

type InboundBody = {
  server_name?: string
  server_url?: string
  logo?: string
  sys_username?: string
  token?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<InboundBody>(event)
  const serverName = body?.server_name?.trim() || ''
  const serverUrl = trimUrl(body?.server_url?.trim() || '')
  const logo = body?.logo?.trim() || ''
  const sysUsername = body?.sys_username?.trim() || ''
  const token = body?.token?.trim() || ''

  if (!serverName || !serverUrl || !sysUsername || !token) {
    return fail('invalid payload', null)
  }

  const setting = await prisma.systemSetting.findFirst()
  if (!setting?.serverUrl) {
    return fail('system setting not configured', null)
  }

  const verifyResp = await $fetch<{ code: number }>(`${serverUrl}/api/connect/verify`, {
    method: 'POST',
    body: {
      server_url: setting.serverUrl,
      token,
    },
  }).catch(() => null)

  if (!verifyResp || verifyResp.code !== 1) {
    return fail('verify failed', null)
  }

  const upserted = await prisma.inboundConnect.upsert({
    where: { serverUrl },
    create: {
      serverName,
      serverUrl,
      serverLogo: logo,
      sysUsername,
      tokenHint: token,
      verifiedAt: new Date(),
    },
    update: {
      serverName,
      serverLogo: logo,
      sysUsername,
      tokenHint: token,
      verifiedAt: new Date(),
    },
  })

  return ok(upserted, 'inbound ok')
})

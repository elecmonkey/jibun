import { readBody } from 'h3'
import { randomBytes } from 'crypto'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { requireRole } from '../../utils/auth'

type InviteBody = {
  connect_id?: number
}

const buildInviteUrl = (serverUrl: string, token: string) => {
  const base = serverUrl.replace(/\/+$/, '')
  return `${base}/invite/ech0?token=${token}`
}

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN'])
  if (auth.error) {
    return auth.error
  }

  const body = await readBody<InviteBody>(event)
  const connectId = Number(body?.connect_id)
  if (!Number.isInteger(connectId) || connectId <= 0) {
    return fail('invalid connect_id', null)
  }

  const connect = await prisma.connect.findUnique({
    where: { id: connectId },
  })
  if (!connect) {
    return fail('connect not found', null)
  }

  if (connect.instanceType !== 'ECH0') {
    return fail('invite only for ech0', null)
  }

  const setting = await prisma.systemSetting.findFirst()
  if (!setting?.serverUrl) {
    return fail('system setting not configured', null)
  }

  const token = randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const updated = await prisma.connect.update({
    where: { id: connectId },
    data: {
      inviteToken: token,
      inviteExpiresAt: expiresAt,
    },
  })

  return ok({
    id: updated.id,
    inviteToken: updated.inviteToken,
    inviteExpiresAt: updated.inviteExpiresAt,
    inviteUrl: buildInviteUrl(setting.serverUrl, token),
  }, 'invite generated')
})

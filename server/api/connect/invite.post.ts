import { readBody } from 'h3'
import { randomBytes } from 'crypto'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { requireRole } from '../../utils/auth'
import { trimUrl } from '../../utils/normalize'

type InviteBody = {
  connect_id?: number
  server_url?: string
  token?: string
}

const buildInviteUrl = (serverUrl: string, token: string) => {
  const base = serverUrl.replace(/\/+$/, '')
  return `${base}/invite/ech0?token=${token}`
}

export default defineEventHandler(async (event) => {
  const body = await readBody<InviteBody>(event)
  const connectId = Number(body?.connect_id)
  const serverUrl = trimUrl(body?.server_url?.trim() || '')
  const token = body?.token?.trim() || ''

  if (Number.isInteger(connectId) && connectId > 0) {
    const auth = await requireRole(event, ['ADMIN'])
    if (auth.error) {
      return auth.error
    }

    const connect = await prisma.connect.findUnique({
      where: { id: connectId },
      include: {
        _count: {
          select: { invitedUsers: true },
        },
      },
    })
    if (!connect) {
      return fail('connect not found', null)
    }

    if (connect.instanceType !== 'ECH0') {
      return fail('invite only for ech0', null)
    }

    if (connect._count?.invitedUsers && connect._count.invitedUsers > 0) {
      return fail('invite already used', null)
    }

    const setting = await prisma.systemSetting.findFirst()
    if (!setting?.serverUrl) {
      return fail('system setting not configured', null)
    }

    const inviteToken = randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const updated = await prisma.connect.update({
      where: { id: connectId },
      data: {
        inviteToken,
        inviteExpiresAt: expiresAt,
      },
    })

    return ok({
      id: updated.id,
      inviteToken: updated.inviteToken,
      inviteExpiresAt: updated.inviteExpiresAt,
      inviteUrl: buildInviteUrl(setting.serverUrl, inviteToken),
    }, 'invite generated')
  }

  if (!serverUrl || !token) {
    return fail('invalid payload', null)
  }

  const connect = await prisma.connect.findFirst({
    where: {
      connectUrl: serverUrl,
      instanceType: 'JIBUN',
      inviteToken: token,
    },
    include: {
      _count: {
        select: { invitedUsers: true },
      },
    },
  })

  if (!connect) {
    return fail('invite invalid', null)
  }

  if (connect._count?.invitedUsers && connect._count.invitedUsers > 0) {
    return fail('invite already used', null)
  }

  const setting = await prisma.systemSetting.findFirst()
  if (!setting?.serverUrl) {
    return fail('system setting not configured', null)
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  const updated = await prisma.connect.update({
    where: { id: connect.id },
    data: {
      inviteExpiresAt: expiresAt,
    },
  })

  return ok({
    id: updated.id,
    inviteToken: updated.inviteToken,
    inviteExpiresAt: updated.inviteExpiresAt,
    inviteUrl: `${setting.serverUrl.replace(/\/+$/, '')}/invite/jibun?token=${updated.inviteToken}`,
  }, 'invite generated')
})

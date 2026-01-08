import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { hashPassword } from '../../utils/password'
import { signAccessToken } from '../../utils/jwt'

type InviteBody = {
  token?: string
  email?: string
  password?: string
}

const fetchRemoteInfo = async (baseUrl: string) => {
  try {
    const resp = await $fetch<{
      code: number
      data?: { logo?: string; sys_username?: string }
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
  const body = await readBody<InviteBody>(event)
  const token = body?.token?.trim() || ''
  const emailInput = body?.email?.trim().toLowerCase() || ''
  const password = body?.password || ''

  if (!token || !password || !emailInput) {
    return fail('invalid payload', null)
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

  const existing = await prisma.user.findUnique({ where: { email: emailInput } })
  if (existing) {
    return fail('email exists', null)
  }

  const passwordHash = await hashPassword(password)
  const remoteInfo = await fetchRemoteInfo(connect.connectUrl)

  const created = await prisma.user.create({
    data: {
      email: emailInput,
      passwordHash,
      role: 'POSTER',
      avatarUrl: remoteInfo?.logo || null,
      displayName: remoteInfo?.sys_username || null,
      connectId: connect.id,
      invitedByConnectId: connect.id,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
    },
  })

  const tokenValue = await signAccessToken(created.id, created.role)
  return ok({
    token: tokenValue,
    user: created,
  }, 'invite registered')
})

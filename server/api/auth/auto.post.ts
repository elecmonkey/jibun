import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { signAccessToken } from '../../utils/jwt'

type AutoLoginBody = {
  token?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AutoLoginBody>(event)
  const token = body?.token?.trim() || ''

  if (!token) {
    return fail('invalid payload', null)
  }

  const loginToken = await prisma.connectLoginToken.findUnique({
    where: { token },
  })

  if (!loginToken) {
    return fail('expired', null)
  }

  if (loginToken.usedAt || loginToken.expiresAt <= new Date()) {
    return fail('expired', null)
  }

  const user = await prisma.user.findUnique({
    where: { id: loginToken.userId },
  })

  if (!user || !user.isActive) {
    return fail('expired', null)
  }

  await prisma.connectLoginToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })

  const accessToken = await signAccessToken(user.id, user.role)
  return ok({
    token: accessToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  }, 'auto login ok')
})

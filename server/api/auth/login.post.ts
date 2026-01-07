import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { hashPassword, verifyPassword } from '../../utils/password'
import { signAccessToken } from '../../utils/jwt'

type LoginBody = {
  email?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const email = body?.email?.trim().toLowerCase() || ''
  const password = body?.password || ''

  if (!email || !password) {
    return fail('invalid credentials', null)
  }

  const userCount = await prisma.user.count()
  const bootstrapEmail = process.env.JIBUN_ADMIN_EMAIL?.trim().toLowerCase()
  const bootstrapPassword = process.env.JIBUN_ADMIN_PASSWORD || ''

  if (userCount === 0 && bootstrapEmail && bootstrapPassword) {
    if (email !== bootstrapEmail || password !== bootstrapPassword) {
      return fail('admin not initialized', null)
    }

    const passwordHash = await hashPassword(bootstrapPassword)
    const created = await prisma.user.create({
      data: {
        email: bootstrapEmail,
        passwordHash,
        role: 'ADMIN',
        displayName: 'admin',
      },
    })

    const token = await signAccessToken(created.id, created.role)
    return ok({
      token,
      user: {
        id: created.id,
        email: created.email,
        role: created.role,
        displayName: created.displayName,
      },
    }, 'login ok')
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) {
    return fail('invalid credentials', null)
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return fail('invalid credentials', null)
  }

  const token = await signAccessToken(user.id, user.role)
  return ok({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    },
  }, 'login ok')
})

import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { requireRole } from '../../utils/auth'
import { hashPassword } from '../../utils/password'

type CreateUserBody = {
  email?: string
  password?: string
  role?: 'ADMIN' | 'POSTER' | 'GUEST'
  displayName?: string
  avatarUrl?: string
  isOwner?: boolean
  isActive?: boolean
}

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN'])
  if (auth.error) {
    return auth.error
  }

  const body = await readBody<CreateUserBody>(event)
  const email = body?.email?.trim().toLowerCase() || ''
  const password = body?.password || ''
  const role = body?.role || 'GUEST'

  if (!email || !password) {
    return fail('invalid user payload', null)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return fail('email exists', null)
  }

  const passwordHash = await hashPassword(password)
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      displayName: body?.displayName?.trim() || null,
      avatarUrl: body?.avatarUrl?.trim() || null,
      isOwner: Boolean(body?.isOwner),
      isActive: body?.isActive ?? true,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      isOwner: true,
      isActive: true,
      createdAt: true,
    },
  })

  return ok(created, 'user created')
})

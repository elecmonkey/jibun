import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { requireAuth } from '../../utils/auth'
import { hashPassword } from '../../utils/password'

type UpdateMeBody = {
  email?: string
  displayName?: string
  avatarUrl?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  if (auth.error) {
    return auth.error
  }

  const body = await readBody<UpdateMeBody>(event)
  const data: Record<string, unknown> = {}

  if (body?.email) {
    data.email = body.email.trim().toLowerCase()
  }
  if (body?.displayName !== undefined) {
    const name = body.displayName.trim()
    data.displayName = name.length > 0 ? name : null
  }
  if (body?.avatarUrl !== undefined) {
    const avatar = body.avatarUrl.trim()
    data.avatarUrl = avatar.length > 0 ? avatar : null
  }
  if (body?.password) {
    data.passwordHash = await hashPassword(body.password)
  }

  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email as string } })
    if (existing && existing.id !== auth.user.id) {
      return fail('email exists', null)
    }
  }

  if (Object.keys(data).length === 0) {
    return fail('no changes', null)
  }

  try {
    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isOwner: true,
        isActive: true,
      },
    })

    return ok(updated, 'user me updated')
  } catch {
    return fail('update failed', null)
  }
})

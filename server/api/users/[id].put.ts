import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { requireRole } from '../../utils/auth'
import { hashPassword } from '../../utils/password'

type UpdateUserBody = {
  email?: string
  password?: string
  role?: 'ADMIN' | 'POSTER' | 'GUEST'
  displayName?: string
  isOwner?: boolean
  isActive?: boolean
}

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN'])
  if (auth.error) {
    return auth.error
  }

  const idParam = event.context.params?.id
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) {
    return fail('invalid id', null)
  }

  const body = await readBody<UpdateUserBody>(event)
  const data: Record<string, unknown> = {}

  if (body?.email) {
    data.email = body.email.trim().toLowerCase()
  }
  if (body?.displayName !== undefined) {
    const name = body.displayName.trim()
    data.displayName = name.length > 0 ? name : null
  }
  if (body?.role) {
    data.role = body.role
  }
  if (body?.isOwner !== undefined) {
    data.isOwner = Boolean(body.isOwner)
  }
  if (body?.isActive !== undefined) {
    data.isActive = Boolean(body.isActive)
  }
  if (body?.password) {
    data.passwordHash = await hashPassword(body.password)
  }

  if (Object.keys(data).length === 0) {
    return fail('no changes', null)
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isOwner: true,
        isActive: true,
        createdAt: true,
      },
    })

    return ok(updated, 'user updated')
  } catch {
    return fail('user not found', null)
  }
})

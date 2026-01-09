import { prisma } from '../../utils/prisma'
import { ok } from '../../utils/response'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN'])
  if (auth.error) {
    return auth.error
  }

  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      isOwner: true,
      isActive: true,
      createdAt: true,
      connectId: true,
      invitedByConnectId: true,
      connect: {
        select: {
          id: true,
          connectUrl: true,
          instanceType: true,
        },
      },
    },
  })

  return ok(users, 'user list ok')
})

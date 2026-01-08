import { prisma } from '../../utils/prisma'
import { ok } from '../../utils/response'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  if (auth.error) {
    return auth.error
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
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

  if (!user) {
    return ok(null, 'user me ok')
  }

  return ok(user, 'user me ok')
})

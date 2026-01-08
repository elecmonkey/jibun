import { prisma } from '../../utils/prisma'
import { ok } from '../../utils/response'

export default defineEventHandler(async () => {
  const connects = await prisma.connect.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: {
        select: {
          invitedUsers: true,
        },
      },
    },
  })

  return ok(connects, 'connect list ok')
})

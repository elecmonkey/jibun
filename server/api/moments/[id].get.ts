import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const idParam = event.context.params?.id
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) {
    return fail('invalid id', null)
  }

  const moment = await prisma.moment.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          isOwner: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: {
            where: { deletedAt: null },
          },
        },
      },
    },
  })

  if (!moment) {
    return fail('moment not found', null)
  }

  return ok(moment, 'moment ok')
})

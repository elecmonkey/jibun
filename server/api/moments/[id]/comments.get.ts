import { prisma } from '../../../utils/prisma'
import { fail, ok } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  const idParam = event.context.params?.id
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) {
    return fail('invalid id', null)
  }

  const comments = await prisma.comment.findMany({
    where: { momentId: id, deletedAt: null },
    orderBy: { createdAt: 'asc' },
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
      replyTo: {
        select: {
          id: true,
          content: true,
          deletedAt: true,
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
              isOwner: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  })

  return ok(comments, 'comments ok')
})

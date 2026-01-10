import { prisma } from '../../../../utils/prisma'
import { fail, ok } from '../../../../utils/response'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  if (auth.error) {
    return auth.error
  }

  const idParam = event.context.params?.id
  const commentIdParam = event.context.params?.commentId
  const momentId = Number(idParam)
  const commentId = Number(commentIdParam)
  if (!Number.isInteger(momentId) || momentId <= 0 || !Number.isInteger(commentId) || commentId <= 0) {
    return fail('invalid id', null)
  }

  const existing = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, momentId: true, authorId: true, deletedAt: true },
  })
  if (!existing || existing.momentId !== momentId) {
    return fail('comment not found', null)
  }
  if (existing.deletedAt) {
    return ok({ id: existing.id }, 'comment deleted')
  }

  if (auth.user.role !== 'ADMIN' && existing.authorId !== auth.user.id) {
    return fail('forbidden', null)
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  })

  return ok({ id: commentId }, 'comment deleted')
})

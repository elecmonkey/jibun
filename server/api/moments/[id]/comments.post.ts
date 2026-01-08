import { readBody } from 'h3'
import { prisma } from '../../../utils/prisma'
import { fail, ok } from '../../../utils/response'
import { requireAuth } from '../../../utils/auth'

type CommentBody = {
  content?: string
  replyToId?: number
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  if (auth.error) {
    return auth.error
  }

  const idParam = event.context.params?.id
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) {
    return fail('invalid id', null)
  }

  const body = await readBody<CommentBody>(event)
  const content = body?.content?.trim() || ''
  if (!content) {
    return fail('invalid content', null)
  }
  const replyToId = body?.replyToId

  try {
    if (Number.isInteger(replyToId)) {
      const replyTo = await prisma.comment.findUnique({
        where: { id: replyToId as number },
        select: { momentId: true },
      })
      if (!replyTo || replyTo.momentId !== id) {
        return fail('invalid reply target', null)
      }
    }

    const created = await prisma.comment.create({
      data: {
        content,
        momentId: id,
        authorId: auth.user.id,
        replyToId: Number.isInteger(replyToId) ? replyToId : null,
      },
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

    return ok(created, 'comment created')
  } catch {
    return fail('moment not found', null)
  }
})

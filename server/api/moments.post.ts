import { readBody } from 'h3'
import { prisma } from '../utils/prisma'
import { fail, ok } from '../utils/response'
import { requireRole } from '../utils/auth'

type MomentBody = {
  content?: string
}

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN', 'POSTER'])
  if (auth.error) {
    return auth.error
  }

  const body = await readBody<MomentBody>(event)
  const content = (body?.content || '').trim()
  if (!content) {
    return fail('content is required', null)
  }

  const created = await prisma.moment.create({
    data: {
      content,
      authorId: auth.user.id,
    },
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
        },
      },
    },
  })

  return ok(created, 'moment created')
})

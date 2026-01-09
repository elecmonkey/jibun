import { readBody } from 'h3'
import { prisma } from '../utils/prisma'
import { fail, ok } from '../utils/response'
import { requireRole } from '../utils/auth'

type MomentBody = {
  content?: string
  tags?: string[]
  images?: string[]
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

  const tagNames = Array.isArray(body?.tags)
    ? body?.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
    : []

  const rawImages = Array.isArray(body?.images)
    ? body?.images.map((item) => item.trim()).filter((item) => item.length > 0)
    : []
  if (rawImages.length > 9) {
    return fail('images limit exceeded', null)
  }
  const images = rawImages

  const created = await prisma.moment.create({
    data: {
      content,
      authorId: auth.user.id,
      tags: tagNames,
      images,
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

import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { requireAuth } from '../../utils/auth'

type UpdateMomentBody = {
  content?: string
  tags?: string[]
  images?: string[]
  extension?: string | null
  extension_type?: string | null
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

  const body = await readBody<UpdateMomentBody>(event)
  const content = (body?.content || '').trim()
  const tags = Array.isArray(body?.tags)
    ? body?.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
    : []
  const rawImages = Array.isArray(body?.images)
    ? body?.images.map((item) => item.trim()).filter((item) => item.length > 0)
    : []
  if (rawImages.length > 9) {
    return fail('images limit exceeded', null)
  }
  const images = rawImages

  const extension = typeof body?.extension === 'string' ? body.extension.trim() : ''
  const extensionType = typeof body?.extension_type === 'string' ? body.extension_type.trim() : ''

  if (!content && images.length === 0 && !extension) {
    return fail('moment is required', null)
  }

  const existing = await prisma.moment.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  })
  if (!existing) {
    return fail('moment not found', null)
  }

  if (auth.user.role !== 'ADMIN' && existing.authorId !== auth.user.id) {
    return fail('forbidden', null)
  }

  const updated = await prisma.moment.update({
    where: { id },
    data: {
      content,
      tags,
      images,
      extension: extension || null,
      extensionType: extensionType || null,
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
      _count: {
        select: {
          comments: true,
        },
      },
    },
  })

  return ok(updated, 'moment updated')
})

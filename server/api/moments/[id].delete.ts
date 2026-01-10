import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { requireAuth } from '../../utils/auth'
import { deleteImageByUrl } from '../../utils/s3'

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

  const existing = await prisma.moment.findUnique({
    where: { id },
    select: { id: true, authorId: true, images: true },
  })
  if (!existing) {
    return fail('moment not found', null)
  }

  if (auth.user.role !== 'ADMIN' && existing.authorId !== auth.user.id) {
    return fail('forbidden', null)
  }

  const images = existing.images || []
  if (images.length > 0) {
    try {
      await Promise.all(images.map((url) => deleteImageByUrl(url)))
    } catch (error) {
      return fail((error as Error).message || 'image delete failed', null)
    }
  }

  await prisma.$transaction([
    prisma.comment.deleteMany({ where: { momentId: id } }),
    prisma.moment.delete({ where: { id } }),
  ])

  return ok({ id }, 'moment deleted')
})

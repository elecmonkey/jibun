import { readBody } from 'h3'
import { prisma } from '../utils/prisma'
import { fail, ok } from '../utils/response'
import { requireRole } from '../utils/auth'
import { ExtensionType } from '../utils/ech0'
import { trimUrl } from '../utils/normalize'

type MomentBody = {
  content?: string
  tags?: string[]
  images?: string[]
  extension?: string | null
  extension_type?: string | null
}

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN', 'POSTER'])
  if (auth.error) {
    return auth.error
  }

  const body = await readBody<MomentBody>(event)
  const content = (body?.content || '').trim()

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

  let extension = typeof body?.extension === 'string' ? body.extension.trim() : ''
  let extensionType = typeof body?.extension_type === 'string' ? body.extension_type.trim() : ''

  if (extension && extensionType) {
    switch (extensionType) {
      case ExtensionType.GITHUBPROJ:
        extension = trimUrl(extension)
        break
      default:
        break
    }
  } else {
    extension = ''
    extensionType = ''
  }

  if (!content && images.length === 0 && !extension) {
    return fail('moment is required', null)
  }

  const created = await prisma.moment.create({
    data: {
      content,
      authorId: auth.user.id,
      tags: tagNames,
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
        },
      },
    },
  })

  return ok(created, 'moment created')
})

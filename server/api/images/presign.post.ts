import { readBody } from 'h3'
import { fail, ok } from '../../utils/response'
import { requireRole } from '../../utils/auth'
import { createImagePresign, MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_COUNT } from '../../utils/s3'

type PresignBody = {
  filename?: string
  contentType?: string
  size?: number
}

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN', 'POSTER'])
  if (auth.error) {
    return auth.error
  }

  const body = await readBody<PresignBody>(event)
  const filename = body?.filename || 'image'
  const contentType = body?.contentType || ''
  const size = Number(body?.size || 0)

  try {
    const data = await createImagePresign(auth.user.id, filename, contentType, size)
    return ok({
      ...data,
      maxCount: MAX_IMAGE_COUNT,
      maxSize: MAX_IMAGE_SIZE_BYTES,
    }, 'presign ok')
  } catch (error) {
    return fail((error as Error).message || 'presign failed', null)
  }
})

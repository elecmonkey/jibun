import { readBody } from 'h3'
import { fail, ok } from '../../utils/response'
import { requireRole } from '../../utils/auth'
import { confirmImage } from '../../utils/s3'

type ConfirmBody = {
  key?: string
}

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN', 'POSTER'])
  if (auth.error) {
    return auth.error
  }

  const body = await readBody<ConfirmBody>(event)
  const key = body?.key || ''
  if (!key) {
    return fail('missing key', null)
  }

  try {
    const data = await confirmImage(auth.user.id, key)
    return ok(data, 'confirm ok')
  } catch (error) {
    return fail((error as Error).message || 'confirm failed', null)
  }
})

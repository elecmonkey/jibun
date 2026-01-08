import { prisma } from '../../../utils/prisma'
import { fail, ok } from '../../../utils/response'
import { requireRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN'])
  if (auth.error) {
    return auth.error
  }

  const idParam = event.context.params?.id
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) {
    return fail('invalid id', null)
  }

  try {
    await prisma.inboundConnect.delete({ where: { id } })
    return ok(null, 'inbound deleted')
  } catch {
    return fail('inbound not found', null)
  }
})

import { prisma } from '../../utils/prisma'
import { ok } from '../../utils/response'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN'])
  if (auth.error) {
    return auth.error
  }

  const items = await prisma.inboundConnect.findMany({
    orderBy: { id: 'desc' },
  })

  return ok(items, 'inbound list ok')
})

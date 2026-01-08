import { prisma } from '../../../utils/prisma'
import { fail, ok } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  const idParam = event.context.params?.id
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) {
    return fail('invalid id', null)
  }

  try {
    const updated = await prisma.moment.update({
      where: { id },
      data: { favCount: { increment: 1 } },
      select: { id: true, favCount: true },
    })

    return ok(updated, 'like ok')
  } catch {
    return fail('moment not found', null)
  }
})

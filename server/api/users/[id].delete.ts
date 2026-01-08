import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { requireRole } from '../../utils/auth'

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
    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true, invitedByConnectId: true },
    })
    if (!target) {
      return fail('user not found', null)
    }

    if (target.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      })
      if (adminCount <= 1) {
        return fail('cannot delete last admin', null)
      }
    }

    if (target.invitedByConnectId) {
      await prisma.$transaction([
        prisma.user.delete({ where: { id } }),
        prisma.connect.updateMany({
          where: { id: target.invitedByConnectId },
          data: { inviteToken: null, inviteExpiresAt: null },
        }),
      ])
    } else {
      await prisma.user.delete({ where: { id } })
    }
    return ok(null, 'user deleted')
  } catch {
    return fail('user not found', null)
  }
})

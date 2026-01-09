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
      select: { role: true, invitedByConnectId: true, connectId: true },
    })
    if (!target) {
      return fail('user not found', null)
    }

    if (target.connectId || target.invitedByConnectId) {
      return fail('user bound to connect', null)
    }

    if (target.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      })
      if (adminCount <= 1) {
        return fail('cannot delete last admin', null)
      }
    }

    const momentIds = await prisma.moment.findMany({
      where: { authorId: id },
      select: { id: true },
    })
    const idsToDelete = momentIds.map((item) => item.id)

    const deleteSteps = [
      prisma.connectLoginToken.deleteMany({
        where: { userId: id },
      }),
      prisma.comment.deleteMany({
        where: { authorId: id },
      }),
      idsToDelete.length
        ? prisma.comment.deleteMany({
            where: { momentId: { in: idsToDelete } },
          })
        : prisma.comment.deleteMany({
            where: { momentId: { in: [-1] } },
          }),
      prisma.moment.deleteMany({ where: { authorId: id } }),
      prisma.user.delete({ where: { id } }),
    ]

    if (target.invitedByConnectId) {
      deleteSteps.push(
        prisma.connect.updateMany({
          where: { id: target.invitedByConnectId },
          data: { inviteToken: null, inviteExpiresAt: null },
        }),
      )
    }

    await prisma.$transaction(deleteSteps)
    return ok(null, 'user deleted')
  } catch {
    return fail('delete failed', null)
  }
})

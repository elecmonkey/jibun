import { getQuery } from 'h3'
import { prisma } from '../utils/prisma'
import { ok } from '../utils/response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(Number(query.page) || 1, 1)
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 50)
  const skip = (page - 1) * pageSize

  const [items, total] = await Promise.all([
    prisma.moment.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
            isOwner: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    }),
    prisma.moment.count(),
  ])

  const hasMore = skip + items.length < total

  return ok({
    items,
    total,
    page,
    pageSize,
    hasMore,
  }, 'moments ok')
})

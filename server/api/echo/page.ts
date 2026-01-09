import { readBody, getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { ok } from '../../utils/response'

type PageQueryDto = {
  page?: number
  pageSize?: number
}

const parsePage = (input: PageQueryDto) => {
  const page = Math.max(Number(input.page) || 1, 1)
  const pageSize = Math.min(Math.max(Number(input.pageSize) || 10, 1), 50)
  return { page, pageSize }
}

export default defineEventHandler(async (event) => {
  let page = 1
  let pageSize = 10

  if (event.method === 'POST') {
    const body = await readBody<PageQueryDto>(event)
    const parsed = parsePage(body || {})
    page = parsed.page
    pageSize = parsed.pageSize
  } else {
    const query = getQuery(event)
    const parsed = parsePage(query)
    page = parsed.page
    pageSize = parsed.pageSize
  }

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
          },
        },
      },
    }),
    prisma.moment.count(),
  ])

  const echoes = items.map((moment) => {
    const username = moment.author.displayName || moment.author.email
    const tagList = moment.tags || []
    const firstTag = tagList.length > 0 ? tagList[0] : null
    const images = (moment.images || []).map((url) => ({
      image_url: url,
      image_source: 'url',
    }))
    return {
      id: moment.id,
      content: moment.content,
      created_at: moment.createdAt.toISOString(),
      username,
      user_id: moment.author.id,
      images,
      tags: firstTag ? [{ id: firstTag, name: firstTag }] : null,
      layout: null,
      extension: null,
      extension_type: null,
      private: false,
      fav_count: moment.favCount ?? 0,
      // redundant moment fields for Jibun detection
      moment_id: moment.id,
      moment_content: moment.content,
      moment_created_at: moment.createdAt.toISOString(),
      moment_author_name: username,
      moment_author_email: moment.author.email,
    }
  })

  return ok({
    items: echoes,
    total,
  }, 'echos ok')
})

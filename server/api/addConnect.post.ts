import { readBody } from 'h3'
import { prisma } from '../utils/prisma'
import { fail, ok } from '../utils/response'
import { trimUrl } from '../utils/normalize'
import { requireRole } from '../utils/auth'

type AddConnectBody = {
  connect_url?: string
}

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN'])
  if (auth.error) {
    return auth.error
  }

  const body = await readBody<AddConnectBody>(event)
  const connectUrl = trimUrl(body?.connect_url || '')

  if (!connectUrl) {
    return fail('invalid connect_url', null)
  }

  const exists = await prisma.connect.findUnique({
    where: { connectUrl },
  })

  if (exists) {
    return fail('connect exists', null)
  }

  const created = await prisma.connect.create({
    data: { connectUrl },
  })

  return ok(created, 'add connect ok')
})

import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { requireRole } from '../../utils/auth'
import { trimUrl } from '../../utils/normalize'

type ProfileBody = {
  serverName?: string
  serverUrl?: string
  serverLogo?: string
}

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN'])
  if (auth.error) {
    return auth.error
  }

  const body = await readBody<ProfileBody>(event)
  const serverName = (body?.serverName || '').trim()
  const serverUrl = trimUrl((body?.serverUrl || '').trim())
  const serverLogo = (body?.serverLogo || '').trim()

  if (!serverName) {
    return fail('serverName is required', null)
  }
  if (!serverUrl) {
    return fail('serverUrl is required', null)
  }

  const setting = await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: {
      serverName,
      serverUrl,
      serverLogo,
    },
    create: {
      id: 1,
      serverName,
      serverUrl,
      serverLogo,
    },
  })

  return ok(setting, 'profile updated')
})

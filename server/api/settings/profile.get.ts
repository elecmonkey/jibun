import { prisma } from '../../utils/prisma'
import { ok } from '../../utils/response'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = await requireRole(event, ['ADMIN'])
  if (auth.error) {
    return auth.error
  }

  const setting = await prisma.systemSetting.findFirst()

  return ok({
    serverName: setting?.serverName || '',
    serverUrl: setting?.serverUrl || '',
    serverLogo: setting?.serverLogo || '',
  }, 'profile ok')
})

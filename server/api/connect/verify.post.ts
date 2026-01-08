import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { trimUrl } from '../../utils/normalize'

type VerifyBody = {
  server_url?: string
  token?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<VerifyBody>(event)
  const serverUrl = trimUrl(body?.server_url?.trim() || '')
  const token = body?.token?.trim() || ''

  if (!serverUrl || !token) {
    return fail('invalid payload', null)
  }

  const connect = await prisma.connect.findFirst({
    where: { connectUrl: serverUrl, inviteToken: token },
  })

  if (!connect) {
    return fail('invalid token', null)
  }

  if (connect.instanceType !== 'JIBUN' && (!connect.inviteExpiresAt || connect.inviteExpiresAt <= new Date())) {
    return fail('invalid token', null)
  }

  return ok({ valid: true }, 'verify ok')
})

import { createHmac } from 'crypto'
import { getQuery } from 'h3'
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

  const existing = await prisma.connect.findUnique({
    where: { id },
  })

  if (!existing) {
    return fail('connect not found', null)
  }

  const query = getQuery(event)
  const forceDelete = String(query.force || '').toLowerCase() === '1'

  if (existing.instanceType === 'JIBUN' && !forceDelete) {
    const setting = await prisma.systemSetting.findFirst()
    const serverUrl = setting?.serverUrl?.trim()
    if (!serverUrl || !existing.inviteToken) {
      return fail('system setting not configured', null)
    }

    const payload = { server_url: serverUrl }
    const body = JSON.stringify(payload)
    const timestamp = Date.now()
    const signaturePayload = `${timestamp}.${body}`
    const signature = createHmac('sha256', existing.inviteToken)
      .update(signaturePayload)
      .digest('hex')

    try {
      const resp = await $fetch<{ code: number; msg: string }>(
        `${existing.connectUrl.replace(/\/+$/, '')}/api/connect/inbound/revoke`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Timestamp': String(timestamp),
            'X-Signature': signature,
          },
          body,
        },
      )
      if (resp.code !== 1) {
        return fail(resp.msg || 'revoke failed', null)
      }
    } catch {
      return fail('revoke failed', null)
    }
  }

  await prisma.$transaction([
    prisma.connectLoginToken.deleteMany({ where: { connectId: id } }),
    prisma.user.updateMany({
      where: { connectId: id },
      data: { connectId: null },
    }),
    prisma.user.updateMany({
      where: { invitedByConnectId: id },
      data: { invitedByConnectId: null },
    }),
    prisma.connect.delete({ where: { id } }),
  ])

  return ok(null, 'delete connect ok')
})

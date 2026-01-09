import { readRawBody, getHeader } from 'h3'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '../../../utils/prisma'
import { fail, ok } from '../../../utils/response'
import { trimUrl } from '../../../utils/normalize'

const MAX_TIME_DRIFT_MS = 300_000

type RevokeBody = {
  server_url?: string
}

const buildSignature = (secret: string, payload: string) => {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export default defineEventHandler(async (event) => {
  const rawBody = (await readRawBody(event)) || ''
  const timestampHeader = getHeader(event, 'x-timestamp') || ''
  const signatureHeader = getHeader(event, 'x-signature') || ''

  if (!rawBody || !timestampHeader || !signatureHeader) {
    return fail('invalid payload', null)
  }

  const timestamp = Number(timestampHeader)
  if (!Number.isFinite(timestamp)) {
    return fail('invalid payload', null)
  }

  const now = Date.now()
  if (Math.abs(now - timestamp) > MAX_TIME_DRIFT_MS) {
    return fail('expired', null)
  }

  let body: RevokeBody
  try {
    body = JSON.parse(rawBody) as RevokeBody
  } catch {
    return fail('invalid payload', null)
  }

  const serverUrl = trimUrl(body.server_url?.trim() || '')
  if (!serverUrl) {
    return fail('invalid payload', null)
  }

  const inbound = await prisma.inboundConnect.findFirst({
    where: { serverUrl },
  })

  if (!inbound || !inbound.tokenHint) {
    return ok(null, 'inbound not found')
  }

  const signaturePayload = `${timestamp}.${rawBody}`
  const expectedSignature = buildSignature(inbound.tokenHint, signaturePayload)
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')
  const actualBuffer = Buffer.from(signatureHeader, 'hex')

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return fail('invalid signature', null)
  }

  const setting = await prisma.systemSetting.findFirst()
  const localUrl = setting?.serverUrl?.trim()
  if (!localUrl) {
    return fail('system setting not configured', null)
  }

  const verifyResp = await $fetch<{ code: number }>(
    `${serverUrl.replace(/\/+$/, '')}/api/connect/verify`,
    {
      method: 'POST',
      body: {
        server_url: localUrl,
        token: inbound.tokenHint,
      },
    },
  ).catch(() => null)

  if (!verifyResp || verifyResp.code !== 1) {
    return fail('verify failed', null)
  }

  await prisma.inboundConnect.delete({
    where: { id: inbound.id },
  })

  return ok(null, 'inbound revoked')
})

import { readRawBody, getHeader } from 'h3'
import { randomBytes, createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '../../utils/prisma'
import { fail, ok } from '../../utils/response'
import { hashPassword } from '../../utils/password'
import { trimUrl } from '../../utils/normalize'

const MAX_TIME_DRIFT_MS = 300_000
const LOGIN_TOKEN_TTL_MS = 60_000

type IssueAccountBody = {
  server_url?: string
  email?: string
  password?: string
  display_name?: string | null
  avatar_url?: string | null
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

  let body: IssueAccountBody
  try {
    body = JSON.parse(rawBody) as IssueAccountBody
  } catch {
    return fail('invalid payload', null)
  }

  const serverUrl = trimUrl(body.server_url?.trim() || '')
  const email = body.email?.trim().toLowerCase() || ''
  const password = body.password || ''
  const displayName = body.display_name?.trim() || null
  const avatarUrl = body.avatar_url?.trim() || null

  if (!serverUrl || !email || !password) {
    return fail('invalid payload', null)
  }

  const connect = await prisma.connect.findFirst({
    where: {
      connectUrl: serverUrl,
      instanceType: 'JIBUN',
    },
  })

  if (!connect || !connect.inviteToken) {
    return fail('connect not found', null)
  }

  const signaturePayload = `${timestamp}.${rawBody}`
  const expectedSignature = buildSignature(connect.inviteToken, signaturePayload)

  const expectedBuffer = Buffer.from(expectedSignature, 'hex')
  const actualBuffer = Buffer.from(signatureHeader, 'hex')

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return fail('invalid signature', null)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return fail('email exists', null)
  }

  const passwordHash = await hashPassword(password)
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'POSTER',
      displayName,
      avatarUrl,
      connectId: connect.id,
      invitedByConnectId: connect.id,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
    },
  })

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(now + LOGIN_TOKEN_TTL_MS)

  await prisma.connectLoginToken.create({
    data: {
      token,
      userId: created.id,
      connectId: connect.id,
      expiresAt,
    },
  })

  const setting = await prisma.systemSetting.findFirst()
  const serverBase = setting?.serverUrl?.replace(/\/+$/, '') || ''
  if (!serverBase) {
    return fail('invalid payload', null)
  }

  return ok({
    login_token: token,
    expires_at: expiresAt.toISOString(),
    redirect: `${serverBase}/auth/auto?token=${token}`,
  }, 'account issued')
})

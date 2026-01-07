import { getHeader, type H3Event } from 'h3'
import { jwtVerify } from 'jose'
import { prisma } from './prisma'
import { fail } from './response'

export type AuthUser = {
  id: number
  email: string
  role: 'ADMIN' | 'POSTER' | 'GUEST'
}

const getJwtSecret = () => {
  const secret = process.env.JWT_TOKEN
  if (!secret) {
    throw new Error('JWT_TOKEN is not set')
  }
  return new TextEncoder().encode(secret)
}

const extractToken = (event: H3Event) => {
  const authHeader = getHeader(event, 'authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim()
  }
  return authHeader.trim()
}

export const getAuthUser = async (event: H3Event): Promise<AuthUser | null> => {
  const token = extractToken(event)
  if (!token) {
    return null
  }

  const secret = getJwtSecret()
  const { payload } = await jwtVerify(token, secret)
  if (!payload.sub) {
    return null
  }

  const userId = Number(payload.sub)
  if (!Number.isInteger(userId)) {
    return null
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.isActive) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  }
}

export const requireAuth = async (event: H3Event) => {
  try {
    const user = await getAuthUser(event)
    if (!user) {
      return { error: fail('unauthorized', null) }
    }
    return { user }
  } catch {
    return { error: fail('unauthorized', null) }
  }
}

export const requireRole = async (
  event: H3Event,
  roles: Array<AuthUser['role']>,
) => {
  const result = await requireAuth(event)
  if (result.error) {
    return result
  }

  if (!roles.includes(result.user.role)) {
    return { error: fail('forbidden', null) }
  }

  return result
}

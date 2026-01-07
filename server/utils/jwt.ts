import { SignJWT } from 'jose'

const getJwtSecret = () => {
  const secret = process.env.JWT_TOKEN
  if (!secret) {
    throw new Error('JWT_TOKEN is not set')
  }
  return new TextEncoder().encode(secret)
}

export const signAccessToken = async (userId: number, role: string) => {
  const secret = getJwtSecret()
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24 * 7)
    .sign(secret)
}

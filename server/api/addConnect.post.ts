import { readBody } from 'h3'
import { prisma } from '../utils/prisma'
import { fail, ok } from '../utils/response'
import { trimUrl } from '../utils/normalize'
import { requireRole } from '../utils/auth'

type AddConnectBody = {
  connect_url?: string
}

const detectInstanceType = async (connectUrl: string) => {
  try {
    const resp = await $fetch<{ code: number; data?: Record<string, unknown> }>(`${connectUrl}/api/connect`)
    if (resp?.code === 1 && resp.data) {
      const totalMoments = resp.data.total_moments
      const todayMoments = resp.data.today_moments
      const totalEchos = resp.data.total_echos
      const todayEchos = resp.data.today_echos

      const hasMoments = typeof totalMoments === 'number' || typeof todayMoments === 'number'
      const hasEchos = typeof totalEchos === 'number' || typeof todayEchos === 'number'

      if (hasMoments) {
        return 'JIBUN'
      }

      if (hasEchos) {
        return 'ECH0'
      }
    }
  } catch {
    // ignore
  }

  return 'UNKNOWN'
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

  const instanceType = await detectInstanceType(connectUrl)
  const created = await prisma.connect.create({
    data: { connectUrl, instanceType },
  })

  return ok(created, 'add connect ok')
})

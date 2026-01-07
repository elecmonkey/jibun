import { prisma } from '../../utils/prisma'
import { ok } from '../../utils/response'
import { trimUrl } from '../../utils/normalize'

const ensureProtocol = (value: string) => {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }
  return `https://${value}`
}

type ConnectInfo = {
  server_name: string
  server_url: string
  logo: string
  total_moments: number
  today_moments: number
  total_echos?: number
  today_echos?: number
  sys_username: string
}

export default defineEventHandler(async () => {
  const connects = await prisma.connect.findMany({
    orderBy: { id: 'asc' },
  })

  if (connects.length === 0) {
    return ok([], 'connect info ok')
  }

  const tasks = connects.map(async (conn) => {
    const trimmed = trimUrl(conn.connectUrl)
    if (!trimmed) {
      return null
    }

    const baseUrl = ensureProtocol(trimmed).replace(/\/+$/, '')
    const url = `${baseUrl}/api/connect`

    try {
      const resp = await $fetch<{ code: number; data: ConnectInfo }>(url, {
        method: 'GET',
        headers: {
          Ech0_URL: trimmed,
        },
        timeout: 3000,
      })

      if (resp?.code !== 1 || !resp.data) {
        return null
      }

      return {
        ...resp.data,
        total_moments: resp.data.total_moments ?? resp.data.total_echos ?? 0,
        today_moments: resp.data.today_moments ?? resp.data.today_echos ?? 0,
      } as ConnectInfo
    } catch {
      return null
    }
  })

  const results = await Promise.all(tasks)
  const filtered = results.filter((item): item is ConnectInfo => item !== null)

  return ok(filtered, 'connect info ok')
})

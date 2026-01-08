const allowedPaths = new Set([
  '/api/connect',
  '/api/echo/page',
])

const isAllowedPath = (path: string) => {
  if (allowedPaths.has(path)) {
    return true
  }
  if (path.startsWith('/api/echo/like/')) {
    return true
  }
  return false
}

export default defineEventHandler((event) => {
  const url = event.node.req.url || ''
  const path = url.split('?')[0]

  if (!isAllowedPath(path)) {
    return
  }

  event.node.res.setHeader('Access-Control-Allow-Origin', '*')
  event.node.res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
  event.node.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (event.node.req.method === 'OPTIONS') {
    event.node.res.statusCode = 204
    event.node.res.end()
  }
})

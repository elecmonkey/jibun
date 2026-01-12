import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { owner, repo } = query

  if (!owner || !repo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing owner or repo',
    })
  }

  const token = process.env.GITHUB_TOKEN
  const headers: HeadersInit = {
    'User-Agent': 'Jibun/1.0',
    'Accept': 'application/vnd.github.v3+json',
  }

  if (token) {
    headers.Authorization = `token ${token}`
  }

  try {
    const data = await $fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
    })
    return {
      code: 1,
      data,
    }
  } catch (error) {
    // If rate limited or other error, return error code so frontend can try direct access
    const err = error as { message?: string; response?: { status?: number } }
    console.error('GitHub API Proxy Error:', err)
    return {
      code: 0,
      msg: err.message || 'Failed to fetch from GitHub',
      status: err.response?.status,
    }
  }
})

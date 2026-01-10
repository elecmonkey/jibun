import crypto from 'node:crypto'
import { S3Client, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'

const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
])

const getEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`${key} is not set`)
  }
  return value
}

const getOptionalEnv = (key: string) => {
  return process.env[key] || ''
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

const getS3PublicBases = () => {
  const bases = new Set<string>()
  const custom = getOptionalEnv('S3_PUBLIC_BASE_URL').trim()
  if (custom) {
    bases.add(normalizeBaseUrl(custom))
  }
  const endpoint = getOptionalEnv('S3_ENDPOINT').trim()
  const bucket = getOptionalEnv('S3_BUCKET').trim()
  if (endpoint && bucket) {
    bases.add(`${normalizeBaseUrl(endpoint)}/${bucket}`)
  }
  return [...bases]
}

const resolveKeyFromUrl = (url: string) => {
  if (!url) {
    return ''
  }
  for (const base of getS3PublicBases()) {
    const prefix = `${base}/`
    if (url.startsWith(prefix)) {
      return url.slice(prefix.length)
    }
  }
  return ''
}

export const getS3Client = () => {
  const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || '').toLowerCase() === 'true'
  return new S3Client({
    region: getEnv('S3_REGION'),
    endpoint: getEnv('S3_ENDPOINT'),
    credentials: {
      accessKeyId: getEnv('S3_ACCESS_KEY'),
      secretAccessKey: getEnv('S3_SECRET_KEY'),
    },
    forcePathStyle,
  })
}

export const getS3Bucket = () => getEnv('S3_BUCKET')

export const getS3Prefix = () => {
  const prefix = getOptionalEnv('S3_PREFIX').trim()
  if (!prefix) {
    return ''
  }
  return prefix.endsWith('/') ? prefix : `${prefix}/`
}

export const buildPublicUrl = (key: string) => {
  const base = getOptionalEnv('S3_PUBLIC_BASE_URL').trim()
  if (base) {
    return `${base.replace(/\/+$/, '')}/${key}`
  }
  const endpoint = getEnv('S3_ENDPOINT').replace(/\/+$/, '')
  const bucket = getS3Bucket()
  return `${endpoint}/${bucket}/${key}`
}

const sanitizeFilename = (name: string) => name.replace(/[^\w.-]+/g, '_')

export const createImagePresign = async (
  userId: number,
  filename: string,
  contentType: string,
  size: number,
) => {
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error('invalid image type')
  }
  if (size <= 0 || size > MAX_IMAGE_SIZE) {
    throw new Error('image size exceeded')
  }

  const safeName = sanitizeFilename(filename || 'image')
  const rand = crypto.randomBytes(6).toString('hex')
  const key = `${getS3Prefix()}${userId}/${Date.now()}_${rand}_${safeName}`

  const client = getS3Client()
  const bucket = getS3Bucket()
  const presign = await createPresignedPost(client, {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ['content-length-range', 0, MAX_IMAGE_SIZE],
      ['starts-with', '$Content-Type', 'image/'],
    ],
    Fields: {
      'Content-Type': contentType,
    },
    Expires: 120,
  })

  return {
    url: presign.url,
    fields: presign.fields,
    key,
    publicUrl: buildPublicUrl(key),
  }
}

export const confirmImage = async (userId: number, key: string) => {
  const prefix = `${getS3Prefix()}${userId}/`
  if (!key.startsWith(prefix)) {
    throw new Error('invalid image key')
  }

  const client = getS3Client()
  const bucket = getS3Bucket()
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  const size = Number(head.ContentLength || 0)
  const type = String(head.ContentType || '')
  if (size <= 0 || size > MAX_IMAGE_SIZE || !ALLOWED_TYPES.has(type)) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    throw new Error('invalid image object')
  }

  return {
    key,
    url: buildPublicUrl(key),
  }
}

export const MAX_IMAGE_COUNT = 9
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE

export const deleteImageByUrl = async (url: string) => {
  const key = resolveKeyFromUrl(url)
  if (!key) {
    return false
  }
  const client = getS3Client()
  const bucket = getS3Bucket()
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  return true
}

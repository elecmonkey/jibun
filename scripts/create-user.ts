import 'dotenv/config'
import { intro, select, text, password, confirm, outro, isCancel } from '@clack/prompts'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

type Role = 'ADMIN' | 'POSTER' | 'GUEST'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const out: Record<string, string> = {}
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i]
    const value = args[i + 1]
    if (!key || !key.startsWith('--')) {
      continue
    }
    out[key.slice(2)] = value ?? ''
  }
  return out
}

const usage = () => {
  console.log('Usage: pnpm db:create-user -- --email <email> --password <password> --role <ADMIN|POSTER|GUEST> --name <displayName>')
}

const promptIfMissing = async () => {
  intro('Jibun 用户创建向导')

  const email = await text({
    message: '邮箱',
    placeholder: 'you@example.com',
    validate(value) {
      if (!value?.includes('@')) {
        return '请输入有效邮箱'
      }
      return undefined
    },
  })
  if (isCancel(email)) {
    outro('已取消')
    process.exit(0)
  }

  const passwordValue = await password({
    message: '密码',
    validate(value) {
      if (!value || value.length < 6) {
        return '密码至少 6 位'
      }
      return undefined
    },
  })
  if (isCancel(passwordValue)) {
    outro('已取消')
    process.exit(0)
  }

  const role = await select({
    message: '用户角色',
    options: [
      { value: 'ADMIN', label: 'ADMIN' },
      { value: 'POSTER', label: 'POSTER' },
      { value: 'GUEST', label: 'GUEST' },
    ],
  })
  if (isCancel(role)) {
    outro('已取消')
    process.exit(0)
  }

  const name = await text({
    message: '显示名称（可选）',
  })
  if (isCancel(name)) {
    outro('已取消')
    process.exit(0)
  }

  const ok = await confirm({
    message: `确认创建用户 ${email} (${role})?`,
  })
  if (isCancel(ok) || !ok) {
    outro('已取消')
    process.exit(0)
  }

  return {
    email,
    password: passwordValue,
    role,
    name,
  }
}

const main = async () => {
  const args = parseArgs()
  const hasArgs = Boolean(args.email || args.password || args.role || args.name)
  const answers = hasArgs
    ? {
        email: args.email || '',
        password: args.password || '',
        role: (args.role || 'GUEST').toUpperCase(),
        name: args.name || '',
      }
    : await promptIfMissing()

  const email = (answers.email || '').trim().toLowerCase()
  const password = answers.password || ''
  const role = (answers.role || 'GUEST').toUpperCase() as Role
  const displayName = answers.name ? answers.name : null

  if (!email || !password) {
    usage()
    process.exit(1)
  }

  if (!['ADMIN', 'POSTER', 'GUEST'].includes(role)) {
    console.error('Invalid role. Use ADMIN, POSTER, or GUEST.')
    process.exit(1)
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role,
          displayName,
        },
      })
      console.log(`Updated user ${updated.email} (${updated.role})`)
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role,
          displayName,
        },
      })
      console.log(`Created user ${created.email} (${created.role})`)
    }
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

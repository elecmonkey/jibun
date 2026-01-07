# Jibun (じぶん)

一个极简的联邦时间轴应用，目标是成为完整的 ActivityPub 客户端。当前版本提供基础登录、发布 Moment 与实例连接展示。

## 快速开始

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm dev
```

## 环境变量

```bash
DATABASE_URL="postgresql://user:pass@host:5432/jibun"
JWT_TOKEN="your-secret"
```

站点名称、站点地址、头像、本人显示名称请在管理面板里配置（存入数据库）。

## 创建用户

```bash
pnpm db:create-user
```

## 常用脚本

```bash
pnpm dev
pnpm db:generate
pnpm db:push
pnpm db:studio
```

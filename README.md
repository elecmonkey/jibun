# Jibun (じぶん)

兼容 [Ech0](https://github.com/lin-snow/Ech0) 的时间轴分享平台。

## 主要功能 ✨

- 时间轴：Moments 发布、标签、点赞、评论 📝
- 朋友们：连接朋友们的 Jibun 或 Ech0，浏览并点赞 ta 们的动态 🌊
- 串门：被我们添加为朋友的 Jibun 或 Ech0 站点可以获得我们站点的帐号 🧩
  - Jibun 实例间可以在 Jibun 面板完成串门，Ech0 可以通过邀请链接的方式～

## 致谢

- [Ech0](https://github.com/lin-snow/Ech0) - 面向个人的新一代开源、自托管、专注思想流动的轻量级联邦发布平台
- [L1nSn0w](https://github.com/lin-snow/) - Ech0 的作者

本项目参考了 Ech0 的设计与实现。或者说 Jibun 就是因为需要和朋友的 Ech0 实例连接，但是自己又希望部署无需自己服务器、想 DIY 更多功能而开始的项目～

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

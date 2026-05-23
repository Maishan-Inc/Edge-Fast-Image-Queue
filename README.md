# Edge-Fast-Image-Queue

基于 Cloudflare Workers 边缘运行时的图片生成排队系统脚手架，面向高并发、抗滥用、可后台配置、支持第三方登录和优先队列的图片生成站点。

> 核心目标：用 Cloudflare 边缘能力承载图片生成入口，用 Durable Objects 做强一致排队协调，用 D1 保存业务数据，用 R2 保存图片结果，用后台动态调整模型、队列和第三方配置。

## 功能范围

- Cloudflare Workers + Hono API 服务
- Cloudflare Static Assets 前端页面
- Durable Object 全局队列协调器
- D1 SQLite 语义数据库迁移
- R2 图片结果存储绑定
- OpenAI Image API 封装，默认模型 `gpt-image-2`
- Google OAuth / Linux.DO OAuth 骨架
- Linux.DO 优先级高于 Google
- 队列超过阈值后，优先用户从第 51 位开始插入
- 前 50 名保护区严格 FIFO，不被插队
- 同一登录用户同一时间只能有一个 active job
- 普通配置可后台修改
- 敏感密钥支持加密入库
- AdSense 配置骨架
- Turnstile / Rate Limit / 安全响应头骨架
- 管理后台 API 和简易页面
- `CLAUDE.md` 和 `getdesign.md` 开发规范

## 技术栈

- Runtime: Cloudflare Workers
- API: Hono
- Queue Coordinator: Durable Objects
- DB: Cloudflare D1
- Object Storage: Cloudflare R2
- Frontend: 原生 HTML/CSS/JS，可替换成 React/Vue/Svelte
- Auth: OAuth/OIDC 骨架
- Image Provider: OpenAI compatible Image API

## 快速开始

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:local
pnpm dev
```

本地开发地址：

```text
http://localhost:8787
```

## 重要环境变量

复制 `.dev.vars.example` 后填写：

```env
APP_SESSION_SECRET=change-me
APP_CONFIG_ENCRYPTION_KEY=base64-32-byte-key
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_IMAGE_MODEL=gpt-image-2
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
LINUXDO_OAUTH_CLIENT_ID=
LINUXDO_OAUTH_CLIENT_SECRET=
TURNSTILE_SECRET_KEY=
```

生产环境建议使用：

```bash
wrangler secret put APP_SESSION_SECRET
wrangler secret put APP_CONFIG_ENCRYPTION_KEY
wrangler secret put OPENAI_API_KEY
```

## 初始化 Cloudflare 资源

```bash
wrangler d1 create edge-fast-image-queue-db
wrangler r2 bucket create edge-fast-image-queue-images
```

把返回的 D1 database_id 填入 `wrangler.jsonc`。

迁移：

```bash
pnpm db:remote
```

部署：

```bash
pnpm deploy
```

## 队列规则摘要

- 排名前 50 名是保护区，任何用户都不能插队进入。
- 当队列等待人数大于 `QUEUE_PRIORITY_TRIGGER_LENGTH`，Google / Linux.DO 用户可以从 `QUEUE_PRIORITY_INSERT_START` 开始插入。
- Linux.DO 优先级高于 Google。
- 如果 51 位已经是优先用户，则继续往后找合适位置。
- 被顺延的用户会收到 `delayed` 队列事件。
- 任务执行完成后自动离开队列。
- 同一个登录用户在 `queued/running` 状态下只能存在一个任务。

详细规则见：`docs/QUEUE_RULES.md`。

## 目录结构

```text
.
├── CLAUDE.md
├── getdesign.md
├── README.md
├── SECURITY.md
├── wrangler.jsonc
├── package.json
├── migrations/
├── docs/
├── public/
└── src/
```

## 开发注意

1. 修改 UI 前先读 `getdesign.md`。
2. 修改队列前先读 `docs/QUEUE_RULES.md`。
3. 修改密钥配置前先读 `docs/ENV_AND_SECRETS.md`。
4. 不要把完整密钥返回给前端。
5. 不要绕开 Durable Object 直接在普通 Worker 里重排队列。

## 当前脚手架状态

这是一套可继续开发的工程骨架，不是完整 SaaS 成品。它已经包含清晰的接口、表结构、安全边界和队列算法入口。你可以在此基础上继续完善 OAuth 回调、Session 签名、图片生成消费者、后台 UI 和内容审核策略。

# CLAUDE.md — Edge-Fast-Image-Queue 开发约束

本文件是本项目的主 AI/Agent 开发规范。任何自动化代码生成、重构、修复、UI 改造、接口扩展都必须遵守本文件。

## 项目身份

项目名称必须统一为：

```text
Edge-Fast-Image-Queue
```

禁止在代码、文档、页面标题、包名、部署名称中继续使用旧项目名。

## 第一优先级要求

在开发、修改、生成任何 UI、页面、组件、样式、前端交互、后台界面时，必须先阅读并严格遵守：

```text
getdesign.md
```

`getdesign.md` 是本项目的主题设计规范。任何 UI 输出如果与 `getdesign.md` 冲突，以 `getdesign.md` 为准。

## 架构约束

1. 项目运行目标是 Cloudflare Workers 边缘环境。
2. API 使用 Hono。
3. 全局队列协调必须通过 Durable Object 完成。
4. D1 用于业务数据、配置、审计日志和任务记录。
5. R2 用于存储生成后的图片。
6. 不允许把 OpenAI API Key、OAuth Client Secret、Turnstile Secret 等完整密钥返回给前端。
7. 敏感配置如果支持后台修改，必须加密后写入 D1。
8. 根密钥必须来自 Cloudflare Secrets / 环境变量。
9. 前 50 名队列保护区不能被任何优先用户插队。
10. Linux.DO 登录用户优先级必须高于 Google 登录用户。

## 队列规则不可破坏

队列逻辑必须符合：

```text
0. running 中的任务不参与等待排名。
1. 等待队列前 50 名为保护区，严格 FIFO。
2. 当等待人数超过 100 人时，优先用户可以从第 51 名开始插入。
3. Linux.DO > Google > Guest。 具体顺序管理员后台可以修改
4. 51 名如果已经是更高或同级优先用户，则继续向后寻找插入位置。
5. 被后移用户必须产生 delayed 事件。
6. 用户任务完成、失败或取消后，必须离开 active queue。
7. 同一登录用户同一时间只能有一个 queued/running 任务。
```

可配置项名称不得随意改动：

```text
QUEUE_CONCURRENCY
QUEUE_GROUP_WINDOW_SECONDS
QUEUE_GROUP_MAX_REQUESTS
QUEUE_PRIORITY_TRIGGER_LENGTH
QUEUE_PROTECTED_RANK
QUEUE_PRIORITY_INSERT_START
QUEUE_ALLOW_GUEST
```

## 代码风格

- 使用 TypeScript。
- 避免 `any`，确实需要时加注释说明。
- 所有 API 返回统一 JSON：`{ ok, data?, error? }`。
- 所有错误必须可审计，不要吞错。
- 所有管理接口必须检查管理员身份。
- 所有写接口必须考虑限流、Turnstile 或登录态。
- 不要在日志中打印密钥、完整 Cookie、完整 Authorization Header。

## 安全要求

- 密钥显示只能使用 masked 格式，例如 `sk-****abcd`。
- OAuth state 必须校验。
- Session Cookie 必须 HttpOnly、Secure、SameSite=Lax。
- 后台配置修改必须写入 audit log。
- 生成接口必须校验同用户 active job 数量。
- 不允许用浏览器指纹作为唯一身份，只能作为风控辅助信号。
- 对未登录用户默认关闭生成能力，除非后台显式开启。

## 文件职责

- `src/durable/QueueCoordinator.ts`：只放队列协调、重排、派发和事件逻辑。
- `src/services/config.ts`：只负责配置读取、缓存、合并、密钥读取。
- `src/services/crypto.ts`：只负责加密/解密/脱敏。
- `src/services/openai.ts`：只负责图片模型 API 封装。
- `src/routes/admin.ts`：只负责后台接口，不直接写复杂业务算法。
- `public/`：前端静态资源，必须符合 `getdesign.md`。

## 修改前检查清单

每次提交前检查：

```text
pnpm typecheck
pnpm lint
pnpm test
```

如果当前脚手架尚未完整实现测试，也必须保证 TypeScript 结构清晰、TODO 明确、无明显安全倒退。

## 禁止事项

- 禁止把队列排序逻辑分散到多个 route 中。
- 禁止在前端保存 API Key。
- 禁止将 Secret 明文写入 D1。
- 禁止在 UI 上诱导用户点击广告。
- 禁止将 AdSense 广告放在提交按钮、下载按钮、登录按钮旁边制造误点。
- 禁止绕过内容安全审核直接公开展示用户生成图片流。

## 输出要求

当 AI/Agent 生成代码时：

1. 必须保持项目名称为 `Edge-Fast-Image-Queue`。
2. 必须保留本文件。
3. 必须保留并遵守 `getdesign.md`。
4. 如果新增 UI，必须说明如何符合主题规范。
5. 如果修改队列，必须说明是否影响前 50 名保护区和优先插队规则。
6. 如果新增配置，必须说明是普通配置、Secret，还是加密入库配置。

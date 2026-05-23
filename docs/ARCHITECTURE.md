# Architecture

Edge-Fast-Image-Queue 使用 Cloudflare 边缘栈：

```text
Browser
  ↓
Cloudflare WAF / Turnstile / Rate Limit
  ↓
Worker + Hono API
  ↓
Durable Object QueueCoordinator
  ↓
D1 / R2 / OpenAI Image API
```

## 为什么用 Durable Object 做队列？

排队系统需要强一致协调：

- 多边缘节点并发提交任务
- 优先用户插队
- 前 50 名保护区
- 并发任务派发
- 单用户 active job 锁

这些逻辑不能散落在多个普通 Worker 实例中。Durable Object 用固定对象名集中处理队列状态。

## 数据职责

### D1

- users
- oauth_accounts
- sessions
- jobs
- queue_events
- app_settings
- secret_settings
- audit_logs
- user_limits

### R2

- 生成图片
- 图片元数据 JSON
- 可选缩略图

### Durable Object

- 当前等待队列快照
- 执行中任务集合
- 排队重排
- delayed 事件生成
- 派发下一批任务

## 图片生成流程

```text
POST /api/generate
  → 验证登录/Turnstile/限流
  → 检查用户 active job
  → 创建 job
  → 发送给 QueueCoordinator
  → 返回 jobId 和 rank

QueueCoordinator.dispatchNext
  → 按并发数取队首任务
  → 标记 running
  → 调用 OpenAI Image API
  → 写 R2
  → 更新 D1 completed/failed
  → 继续 dispatchNext
```

生产环境可以把 OpenAI 调用拆到 Cloudflare Queues 消费者中，本脚手架先保留 Worker/DO 内部派发骨架。

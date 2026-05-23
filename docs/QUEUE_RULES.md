# Queue Rules

## 优先级

```text
guest: 0
google: 10
linuxdo: 20
admin: 100
```

Linux.DO 必须高于 Google。

## 保护区

`QUEUE_PROTECTED_RANK=50`

排名 1–50 的等待任务进入保护区。保护区内严格 FIFO，任何新来的优先用户都不能插到保护区。

## 插队区

当等待人数超过 `QUEUE_PRIORITY_TRIGGER_LENGTH=100` 时：

- Google 和 Linux.DO 用户可以从 `QUEUE_PRIORITY_INSERT_START=51` 开始插入。
- Linux.DO 可以插到 Google 和普通用户前面。
- Google 不能插到 Linux.DO 前面，但可以插到普通用户前面。
- 同级优先用户按创建时间排序。
- 被后移用户产生 delayed 事件。

## 示例

```text
1-50: protected FIFO
51: linuxdo user A
52: google user B
53: guest user C
```

新 Linux.DO 用户 D：

```text
51: linuxdo user A
52: linuxdo user D
53: google user B   delayed
54: guest user C    delayed
```

新 Google 用户 E：

```text
51: linuxdo user A
52: google user B
53: google user E
54: guest user C delayed
```

## 单用户单队列

D1 建议唯一约束：

```sql
CREATE UNIQUE INDEX uniq_jobs_active_user
ON jobs(user_id)
WHERE status IN ('queued', 'running') AND user_id IS NOT NULL;
```

Durable Object 也会进行运行时检查，D1 约束作为最终兜底。

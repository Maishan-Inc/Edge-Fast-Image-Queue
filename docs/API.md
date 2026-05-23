# API

所有接口返回统一格式：

```json
{
  "ok": true,
  "data": {}
}
```

错误格式：

```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request"
  }
}
```

## Public

### GET /api/health

健康检查。

### GET /api/config/public

返回前端可见配置。

## Auth

### GET /api/auth/google/start

跳转 Google OAuth。

### GET /api/auth/linuxdo/start

跳转 Linux.DO OAuth。

### GET /api/auth/me

当前用户。

### POST /api/auth/logout

退出。

## Generate

### POST /api/generate

提交图片任务。

Body:

```json
{
  "prompt": "a cinematic cyberpunk cat",
  "size": "1024x1024",
  "quality": "auto",
  "turnstileToken": "optional"
}
```

## Queue

### GET /api/queue/status/:jobId

查询任务排名和状态。

### POST /api/queue/cancel/:jobId

取消任务。

## Admin

### GET /api/admin/settings

获取配置。

### PUT /api/admin/settings/:key

更新普通配置。

### PUT /api/admin/secrets/:key

更新加密密钥。

### POST /api/admin/queue/pause

暂停队列。

### POST /api/admin/queue/resume

恢复队列。

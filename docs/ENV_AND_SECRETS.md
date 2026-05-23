# Environment and Secrets

## 三层配置模型

```text
Cloudflare Secret / 环境变量
  根密钥、加密密钥、会话密钥、默认 OpenAI Key

D1 app_settings
  普通配置，可后台修改

D1 secret_settings
  业务密钥，加密后保存，可后台修改
```

## 配置读取优先级

```text
D1 后台配置 > 环境变量 > 代码默认值
```

## 普通配置

可明文保存：

```text
APP_NAME
OPENAI_BASE_URL
OPENAI_IMAGE_MODEL
OPENAI_IMAGE_SIZE
QUEUE_CONCURRENCY
QUEUE_PROTECTED_RANK
ADSENSE_CLIENT_ID
ADSENSE_SLOT_HOME
```

## 加密配置

必须加密保存：

```text
OPENAI_API_KEY
GOOGLE_OAUTH_CLIENT_SECRET
LINUXDO_OAUTH_CLIENT_SECRET
TURNSTILE_SECRET_KEY
```

## 根密钥

必须通过 Cloudflare Secret 设置：

```bash
wrangler secret put APP_SESSION_SECRET
wrangler secret put APP_CONFIG_ENCRYPTION_KEY
```

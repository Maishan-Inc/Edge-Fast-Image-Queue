# Security Policy

## 密钥策略

- 根密钥必须放 Cloudflare Secret / 环境变量。
- 后台可修改的第三方密钥必须加密后保存到 D1。
- 前端永远不能接触 OpenAI API Key、OAuth Client Secret、Turnstile Secret。
- 后台只能显示 masked value。

## 队列和滥用防护

- 同一登录用户同一时间只能有一个 queued/running 任务。
- 未登录用户默认不允许生成。
- 生成接口需要登录态、限流和可选 Turnstile。
- 浏览器指纹只能作为风控信号，不能作为唯一身份。

## 管理后台

- 所有 `/api/admin/*` 接口必须校验管理员。
- 修改配置必须写 audit log。
- 危险操作，例如暂停队列、删除任务、封禁用户，必须记录操作者、IP、UA 和时间。

## 报告漏洞

请通过项目维护者指定渠道报告安全问题。不要公开提交包含有效密钥、用户数据或可利用细节的 issue。

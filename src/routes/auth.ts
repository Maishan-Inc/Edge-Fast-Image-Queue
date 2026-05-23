import { Hono } from 'hono';
import type { AppContext } from '../types';
import { fail, ok } from '../utils/response';
import { getOAuthConfig } from '../services/oauth';

export const authRoutes = new Hono<AppContext>();

authRoutes.get('/me', (c) => ok(c, { user: c.get('user') ?? null }));

authRoutes.get('/:provider/start', async (c) => {
  const provider = c.req.param('provider');
  if (provider !== 'google' && provider !== 'linuxdo') return fail(c, 'BAD_PROVIDER', '不支持的登录平台。');

  const cfg = await getOAuthConfig(c.env, provider);
  if (!cfg.enabled) return fail(c, 'PROVIDER_DISABLED', `${provider} 登录未启用。`, 400);
  if (!cfg.clientId || !cfg.redirectUri) return fail(c, 'PROVIDER_NOT_CONFIGURED', `${provider} 登录配置不完整。`, 500);

  const state = crypto.randomUUID();
  // TODO: 将 state 写入短期签名 cookie，并在 callback 校验。
  const url = new URL(cfg.authorizationEndpoint);
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', cfg.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', cfg.scope);
  url.searchParams.set('state', state);
  return c.redirect(url.toString());
});

authRoutes.get('/:provider/callback', async (c) => {
  const provider = c.req.param('provider');
  if (provider !== 'google' && provider !== 'linuxdo') return fail(c, 'BAD_PROVIDER', '不支持的登录平台。');
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state) return fail(c, 'BAD_CALLBACK', 'OAuth 回调参数不完整。');

  // TODO: 校验 state，换 token，读取 userinfo，upsert users/oauth_accounts，创建 session cookie。
  return ok(c, {
    provider,
    message: 'OAuth callback scaffold reached. Implement token exchange and session creation here.'
  });
});

authRoutes.post('/logout', async (c) => {
  // TODO: 撤销 session。
  c.header('Set-Cookie', 'efi_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  return ok(c, { loggedOut: true });
});

import type { Env, Provider } from '../types';
import { getSetting, getSecret, toBool } from './config';

export interface OAuthProviderConfig {
  provider: Extract<Provider, 'google' | 'linuxdo'>;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
}

export async function getOAuthConfig(env: Env, provider: 'google' | 'linuxdo'): Promise<OAuthProviderConfig> {
  if (provider === 'google') {
    const enabled = toBool(await getSetting(env, 'GOOGLE_OAUTH_ENABLED', env.GOOGLE_OAUTH_ENABLED ?? 'false'));
    return {
      provider,
      enabled,
      clientId: await getSetting(env, 'GOOGLE_OAUTH_CLIENT_ID', env.GOOGLE_OAUTH_CLIENT_ID ?? ''),
      clientSecret: await getSecret(env, 'GOOGLE_OAUTH_CLIENT_SECRET'),
      redirectUri: await getSetting(env, 'GOOGLE_OAUTH_REDIRECT_URI', env.GOOGLE_OAUTH_REDIRECT_URI ?? ''),
      scope: await getSetting(env, 'GOOGLE_OAUTH_SCOPE', env.GOOGLE_OAUTH_SCOPE ?? 'openid email profile'),
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo'
    };
  }

  const issuer = await getSetting(env, 'LINUXDO_OAUTH_ISSUER', env.LINUXDO_OAUTH_ISSUER ?? 'https://connect.linux.do');
  const enabled = toBool(await getSetting(env, 'LINUXDO_OAUTH_ENABLED', env.LINUXDO_OAUTH_ENABLED ?? 'false'));
  return {
    provider,
    enabled,
    clientId: await getSetting(env, 'LINUXDO_OAUTH_CLIENT_ID', env.LINUXDO_OAUTH_CLIENT_ID ?? ''),
    clientSecret: await getSecret(env, 'LINUXDO_OAUTH_CLIENT_SECRET'),
    redirectUri: await getSetting(env, 'LINUXDO_OAUTH_REDIRECT_URI', env.LINUXDO_OAUTH_REDIRECT_URI ?? ''),
    scope: await getSetting(env, 'LINUXDO_OAUTH_SCOPE', env.LINUXDO_OAUTH_SCOPE ?? 'openid profile email'),
    authorizationEndpoint: `${issuer.replace(/\/$/, '')}/oauth2/authorize`,
    tokenEndpoint: `${issuer.replace(/\/$/, '')}/oauth2/token`,
    userInfoEndpoint: `${issuer.replace(/\/$/, '')}/oauth2/userinfo`
  };
}

export function providerPriority(provider: Provider): number {
  if (provider === 'admin') return 100;
  if (provider === 'linuxdo') return 20;
  if (provider === 'google') return 10;
  return 0;
}

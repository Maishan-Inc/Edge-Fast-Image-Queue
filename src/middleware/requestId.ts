import type { Context, Next } from 'hono';
import type { AppContext } from '../types';
import { newId } from '../utils/ids';

export async function requestId(c: Context<AppContext>, next: Next) {
  const existing = c.req.header('CF-Ray') ?? c.req.header('X-Request-Id');
  c.set('requestId', existing ?? newId('req'));
  await next();
  c.header('X-Request-Id', c.get('requestId'));
}

import type { Env } from '../types';
import { now, newId } from '../utils/ids';

export async function checkAndIncrementLimit(
  env: Env,
  scope: string,
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const current = now();
  const bucketStart = Math.floor(current / windowSeconds) * windowSeconds;
  const id = newId('lim');

  await env.DB.prepare(`
    INSERT INTO user_limits(id, scope, scope_key, bucket_start, count, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(scope, scope_key, bucket_start)
    DO UPDATE SET count = count + 1, updated_at = excluded.updated_at
  `).bind(id, scope, key, bucketStart, current, current).run();

  const row = await env.DB.prepare('SELECT count FROM user_limits WHERE scope = ? AND scope_key = ? AND bucket_start = ?')
    .bind(scope, key, bucketStart)
    .first<{ count: number }>();

  const count = row?.count ?? maxRequests + 1;
  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetAt: bucketStart + windowSeconds
  };
}

import type { Context } from 'hono';

export function ok<T>(c: Context, data: T, status = 200) {
  return c.json({ ok: true, data }, status as never);
}

export function fail(c: Context, code: string, message: string, status = 400) {
  return c.json({ ok: false, error: { code, message } }, status as never);
}

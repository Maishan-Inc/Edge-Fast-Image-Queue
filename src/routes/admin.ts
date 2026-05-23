import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppContext } from '../types';
import { fail, ok } from '../utils/response';
import { encryptSecret, maskSecret } from '../services/crypto';
import { newId, now } from '../utils/ids';

export const adminRoutes = new Hono<AppContext>();

adminRoutes.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') return fail(c, 'ADMIN_REQUIRED', '需要管理员权限。', 403);
  await next();
});

adminRoutes.get('/settings', async (c) => {
  const settings = await c.env.DB.prepare('SELECT key, value, value_type, group_name, description, is_public, updated_at FROM app_settings ORDER BY group_name, key').all();
  const secrets = await c.env.DB.prepare('SELECT key, masked_value, algorithm, updated_at FROM secret_settings ORDER BY key').all();
  return ok(c, { settings: settings.results ?? [], secrets: secrets.results ?? [] });
});

adminRoutes.put('/settings/:key', async (c) => {
  const key = c.req.param('key');
  const body = await c.req.json().catch(() => null) as null | { value?: string; valueType?: string; groupName?: string; description?: string; isPublic?: boolean };
  if (!body || body.value === undefined) return fail(c, 'BAD_REQUEST', 'value 不能为空。');

  const user = c.get('user')!;
  const old = await c.env.DB.prepare('SELECT value FROM app_settings WHERE key = ?').bind(key).first<{ value: string }>();
  await c.env.DB.prepare(`
    INSERT INTO app_settings(key, value, value_type, group_name, description, is_public, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      value_type = excluded.value_type,
      group_name = excluded.group_name,
      description = excluded.description,
      is_public = excluded.is_public,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).bind(
    key,
    body.value,
    body.valueType ?? 'string',
    body.groupName ?? 'general',
    body.description ?? null,
    body.isPublic ? 1 : 0,
    user.id,
    now()
  ).run();

  await audit(c, 'setting.update', 'app_setting', key, old?.value ?? null, body.value);
  await reloadQueueConfig(c);
  return ok(c, { key, value: body.value });
});

adminRoutes.put('/secrets/:key', async (c) => {
  const key = c.req.param('key');
  const body = await c.req.json().catch(() => null) as null | { value?: string };
  if (!body?.value) return fail(c, 'BAD_REQUEST', 'secret value 不能为空。');
  if (!c.env.APP_CONFIG_ENCRYPTION_KEY) return fail(c, 'MISSING_ENCRYPTION_KEY', 'APP_CONFIG_ENCRYPTION_KEY 未配置。', 500);

  const user = c.get('user')!;
  const encrypted = await encryptSecret(body.value, c.env.APP_CONFIG_ENCRYPTION_KEY);
  const masked = maskSecret(body.value);
  const old = await c.env.DB.prepare('SELECT masked_value FROM secret_settings WHERE key = ?').bind(key).first<{ masked_value: string }>();

  await c.env.DB.prepare(`
    INSERT INTO secret_settings(key, encrypted_value, iv, algorithm, masked_value, updated_by, updated_at)
    VALUES (?, ?, ?, 'AES-GCM', ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      encrypted_value = excluded.encrypted_value,
      iv = excluded.iv,
      masked_value = excluded.masked_value,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).bind(key, encrypted.encryptedValue, encrypted.iv, masked, user.id, now()).run();

  await audit(c, 'secret.update', 'secret_setting', key, old?.masked_value ?? null, masked);
  return ok(c, { key, maskedValue: masked });
});

adminRoutes.get('/jobs', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
  const jobs = await c.env.DB.prepare(`
    SELECT id, user_id, provider, status, priority, rank, model, size, quality, created_at, started_at, finished_at, error_code
    FROM jobs ORDER BY created_at DESC LIMIT ?
  `).bind(limit).all();
  return ok(c, { jobs: jobs.results ?? [] });
});

adminRoutes.post('/queue/pause', async (c) => {
  const stub = queueStub(c);
  const data = await stub.fetch('https://queue.local/pause', { method: 'POST' }).then((r) => r.json());
  await audit(c, 'queue.pause', 'queue', 'global', null, 'paused');
  return ok(c, data);
});

adminRoutes.post('/queue/resume', async (c) => {
  const stub = queueStub(c);
  const data = await stub.fetch('https://queue.local/resume', { method: 'POST' }).then((r) => r.json());
  await audit(c, 'queue.resume', 'queue', 'global', null, 'running');
  return ok(c, data);
});

adminRoutes.get('/audit-logs', async (c) => {
  const logs = await c.env.DB.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
  return ok(c, { logs: logs.results ?? [] });
});

async function audit(c: Context<AppContext>, action: string, resourceType: string, resourceId: string, oldValue: string | null, newValue: string | null) {
  const user = c.get('user');
  await c.env.DB.prepare(`
    INSERT INTO audit_logs(id, actor_user_id, action, resource_type, resource_id, old_value_masked, new_value_masked, ip, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    newId('aud'),
    user?.id ?? null,
    action,
    resourceType,
    resourceId,
    oldValue,
    newValue,
    c.req.header('CF-Connecting-IP') ?? null,
    c.req.header('User-Agent') ?? null,
    now()
  ).run();
}

function queueStub(c: Context<AppContext>) {
  const id = c.env.QUEUE_COORDINATOR.idFromName('global-image-queue');
  return c.env.QUEUE_COORDINATOR.get(id);
}

async function reloadQueueConfig(c: Context<AppContext>) {
  const stub = queueStub(c);
  await stub.fetch('https://queue.local/reload-config', { method: 'POST' });
}

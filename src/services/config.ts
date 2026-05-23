import type { Env, QueueConfig } from '../types';
import { decryptSecret } from './crypto';

export function envString(env: Env, key: keyof Env, fallback = ''): string {
  const value = env[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export function toBool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

export function toInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getSetting(env: Env, key: string, fallback = ''): Promise<string> {
  try {
    const row = await env.DB.prepare('SELECT value FROM app_settings WHERE key = ?').bind(key).first<{ value: string }>();
    if (row?.value !== undefined) return row.value;
  } catch {
    // During early migrations local dev may not have tables yet. Fall through to env/default.
  }
  const envValue = (env as unknown as Record<string, string | undefined>)[key];
  return envValue ?? fallback;
}

export async function getPublicSettings(env: Env): Promise<Record<string, string>> {
  const result = await env.DB.prepare('SELECT key, value FROM app_settings WHERE is_public = 1').all<{ key: string; value: string }>();
  const data: Record<string, string> = {};
  for (const row of result.results ?? []) data[row.key] = row.value;
  return data;
}

export async function getSecret(env: Env, key: string): Promise<string> {
  const direct = (env as unknown as Record<string, string | undefined>)[key];
  if (direct) return direct;

  const row = await env.DB.prepare('SELECT encrypted_value, iv FROM secret_settings WHERE key = ?')
    .bind(key)
    .first<{ encrypted_value: string; iv: string }>();

  if (!row) return '';
  if (!env.APP_CONFIG_ENCRYPTION_KEY) throw new Error('APP_CONFIG_ENCRYPTION_KEY is required to decrypt DB secret');
  return decryptSecret(row.encrypted_value, row.iv, env.APP_CONFIG_ENCRYPTION_KEY);
}

export async function getQueueConfig(env: Env): Promise<QueueConfig> {
  const [concurrency, trigger, protectedRank, insertStart] = await Promise.all([
    getSetting(env, 'QUEUE_CONCURRENCY', env.QUEUE_CONCURRENCY ?? '2'),
    getSetting(env, 'QUEUE_PRIORITY_TRIGGER_LENGTH', env.QUEUE_PRIORITY_TRIGGER_LENGTH ?? '100'),
    getSetting(env, 'QUEUE_PROTECTED_RANK', env.QUEUE_PROTECTED_RANK ?? '50'),
    getSetting(env, 'QUEUE_PRIORITY_INSERT_START', env.QUEUE_PRIORITY_INSERT_START ?? '51')
  ]);

  return {
    concurrency: Math.max(1, toInt(concurrency, 2)),
    priorityTriggerLength: Math.max(1, toInt(trigger, 100)),
    protectedRank: Math.max(1, toInt(protectedRank, 50)),
    priorityInsertStart: Math.max(1, toInt(insertStart, 51))
  };
}

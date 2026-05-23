import { describe, expect, it } from 'vitest';
import { isBanned } from '../src/services/bans';
import type { Env } from '../src/types';

interface BanRow { id: string; ban_type: string; ban_value: string; reason: string | null; expires_at: number | null; }

function mockEnv(rows: BanRow[]): Env {
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first<T>() {
              const nowParam = Number(args[args.length - 1]);
              const values = args.slice(0, -1) as string[];
              const typeMatchers = Array.from(sql.matchAll(/ban_type = '(\w+)'/g)).map((m) => m[1]);
              const pairs = typeMatchers.map((t, i) => ({ type: t, value: values[i] }));
              const hit = rows.find((r) =>
                pairs.some((p) => p.type === r.ban_type && p.value === r.ban_value) &&
                (r.expires_at === null || r.expires_at > nowParam)
              );
              return (hit ? { ban_type: hit.ban_type, reason: hit.reason } : null) as T | null;
            }
          };
        }
      };
    }
  };
  return { DB: db } as unknown as Env;
}

describe('isBanned', () => {
  it('returns banned=true when any identifier matches an active ban', async () => {
    const env = mockEnv([
      { id: 'b1', ban_type: 'email', ban_value: 'evil@example.com', reason: 'spam', expires_at: null }
    ]);
    const res = await isBanned(env, { userId: 'usr_1', email: 'evil@example.com', ip: '1.2.3.4' });
    expect(res.banned).toBe(true);
    expect(res.type).toBe('email');
    expect(res.reason).toBe('spam');
  });

  it('ignores expired bans and returns banned=false when no match', async () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    const env = mockEnv([
      { id: 'b1', ban_type: 'ip', ban_value: '1.2.3.4', reason: 'expired', expires_at: past }
    ]);
    const res = await isBanned(env, { userId: 'usr_1', ip: '1.2.3.4' });
    expect(res.banned).toBe(false);
  });

  it('returns banned=false when no identifiers are provided', async () => {
    const env = mockEnv([
      { id: 'b1', ban_type: 'user_id', ban_value: 'usr_1', reason: null, expires_at: null }
    ]);
    const res = await isBanned(env, {});
    expect(res.banned).toBe(false);
  });
});

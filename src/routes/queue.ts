import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppContext } from '../types';
import { fail, ok } from '../utils/response';

export const queueRoutes = new Hono<AppContext>();

function queueStub(c: Context<AppContext>) {
  const id = c.env.QUEUE_COORDINATOR.idFromName('global-image-queue');
  return c.env.QUEUE_COORDINATOR.get(id);
}

queueRoutes.get('/status/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const stub = queueStub(c);
  const memoryStatus = await stub.fetch(`https://queue.local/status/${jobId}`).then((r) => r.json());
  const dbJob = await c.env.DB.prepare('SELECT id, status, rank, result_r2_key, error_code, error_message FROM jobs WHERE id = ?')
    .bind(jobId)
    .first();
  if (!dbJob) return fail(c, 'NOT_FOUND', '任务不存在。', 404);
  return ok(c, { memoryStatus, job: dbJob });
});

queueRoutes.post('/cancel/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const user = c.get('user');
  const job = await c.env.DB.prepare('SELECT user_id, status FROM jobs WHERE id = ?').bind(jobId).first<{ user_id: string; status: string }>();
  if (!job) return fail(c, 'NOT_FOUND', '任务不存在。', 404);
  if (!user || (user.role !== 'admin' && job.user_id !== user.id)) return fail(c, 'FORBIDDEN', '无权取消该任务。', 403);

  const stub = queueStub(c);
  const data = await stub.fetch(`https://queue.local/cancel/${jobId}`, { method: 'POST' }).then((r) => r.json());
  return ok(c, data);
});

queueRoutes.get('/overview', async (c) => {
  const stub = queueStub(c);
  const data = await stub.fetch('https://queue.local/overview').then((r) => r.json());
  return ok(c, data);
});

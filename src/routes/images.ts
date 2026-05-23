import { Hono } from 'hono';
import type { AppContext } from '../types';
import { fail } from '../utils/response';

export const imagesRoutes = new Hono<AppContext>();

imagesRoutes.get('/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  if (!/^job_[0-9a-f]{32}$/.test(jobId)) {
    return fail(c, 'BAD_REQUEST', 'Invalid job ID format.', 400);
  }

  const row = await c.env.DB.prepare('SELECT result_r2_key FROM jobs WHERE id = ?')
    .bind(jobId)
    .first<{ result_r2_key: string | null }>();

  if (!row?.result_r2_key) {
    return fail(c, 'NOT_FOUND', 'Image not found.', 404);
  }

  const object = await c.env.IMAGES.get(row.result_r2_key);
  if (!object) {
    return fail(c, 'NOT_FOUND', 'Image file missing from storage.', 404);
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(object.size),
    },
  });
});

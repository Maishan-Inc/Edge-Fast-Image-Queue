import { Hono } from 'hono';
import type { AppContext } from '../types';
import { getPublicSettings } from '../services/config';
import { ok } from '../utils/response';

export const configRoutes = new Hono<AppContext>();

configRoutes.get('/public', async (c) => {
  const settings = await getPublicSettings(c.env);
  return ok(c, settings);
});

import { Hono } from 'hono';
import type { AppContext } from '../types';
import { ok } from '../utils/response';

export const healthRoutes = new Hono<AppContext>();

healthRoutes.get('/', (c) => ok(c, { name: 'Edge-Fast-Image-Queue', status: 'ok', time: new Date().toISOString() }));

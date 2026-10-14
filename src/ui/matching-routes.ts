import type { FastifyInstance } from 'fastify';
import type { MatchingLayer, RunMode } from '../matching/layer.js';
import { loadBrands } from './brands.js';

const bad = (message: string) => Object.assign(new Error(message), { statusCode: 400 });
const id = (value: unknown, label: string) => { if (typeof value !== 'string' || !/^\d{1,18}$/.test(value)) throw bad(`${label} inválido.`); return value; };

/** Explicit controls of the matching layer. Every action is a button in Actividad → Matching e IA. */
export function registerMatchingRoutes(app: FastifyInstance, layer: MatchingLayer): void {
  const houses = async () => new Map((await loadBrands().catch(() => [])).map(brand => [brand.id, brand.name]));
  app.get('/api/matching/status', async () => { await layer.snapshot(); return layer.fullStatus(); });
  app.get('/api/matching/groups', async () => { await layer.snapshot(); return layer.groups(await houses()); });
  app.post<{ Body: { mode?: string } }>('/api/matching/run', async request => {
    const mode = request.body?.mode;
    if (mode !== 'rules' && mode !== 'ai') throw bad('Elige agrupar con reglas o resolver con IA.');
    return layer.runNow(mode as RunMode);
  });
  app.post('/api/matching/cancel', async () => ({ cancelled: layer.cancelAi() }));
  app.post<{ Body: { autoAi?: boolean } }>('/api/matching/settings', async request => {
    if (typeof request.body?.autoAi !== 'boolean') throw bad('autoAi debe ser verdadero o falso.');
    await layer.setAutoAi(request.body.autoAi); return layer.fullStatus();
  });
  app.post<{ Body: { a?: string; b?: string; verdict?: string } }>('/api/matching/decision', async request => {
    const verdict = request.body?.verdict;
    if (verdict !== 'SAME' && verdict !== 'DIFFERENT') throw bad('Elige «Mismo partido» o «Son distintos».');
    await layer.decide(id(request.body?.a, 'Evento A'), id(request.body?.b, 'Evento B'), verdict); return layer.fullStatus();
  });
  app.post<{ Body: { eventId?: string } }>('/api/matching/separate', async request => { const separated = await layer.separate(id(request.body?.eventId, 'Evento')); return { separated, ...(await layer.fullStatus()) }; });
  app.post<{ Body: { key?: string } }>('/api/matching/forget', async request => {
    if (typeof request.body?.key !== 'string' || !/^[a-f0-9]{40}$/.test(request.body.key)) throw bad('Decisión inválida.');
    await layer.forget(request.body.key); return layer.fullStatus();
  });
}

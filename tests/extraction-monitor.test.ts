import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ExtractionMonitor, scrollFor, type ExtractionLine } from '../src/ui/extraction-monitor.js';
import { sourceKey } from '../src/engine/memory.js';
import { loadBrands } from '../src/ui/brands.js';
import { createUiServer } from '../src/ui/server.js';
import type { RunInfo } from '../src/ui/actions.js';

const source = { type: 'bet9ja', url: 'https://sports.bet9ja.com/' };
const rec = (event: string, market: string, selection: string, odds: string, line: string | null = null) => ({ sportsbook: 'bet9ja', eventName: `${event} vs Rival`, market, marketPeriod: null, selection, line, rawOdds: odds, rawOddsFormat: 'decimal', decimalOdds: Number(odds), sourceEventId: `source:${event}`, sourceMarketId: null, sourceSelectionId: null, sourceUrl: source.url, eventStartTime: null, qualifiers: { extraction: 'network' } });
const raw = async (root: string, key: string, ts: number, method: string, records: unknown[], extra: Record<string, unknown> = {}) => {
  await mkdir(join(root, 'raw'), { recursive: true });
  const id = `${key}-${ts}-${method}`;
  await writeFile(join(root, 'raw', `${id}.json`), JSON.stringify({ source, method, retrievedAt: new Date(ts).toISOString(), recordCount: records.length, evidence: { url: `${source.url}football`, transport: 'fetch', capturedAt: new Date(ts).toISOString(), payload: { records } }, ...extra }));
  return id;
};
const receipt = async (root: string, id: string, ingestion: string, error?: string) => { await mkdir(join(root, 'collection', 'receipts'), { recursive: true }); await writeFile(join(root, 'collection', 'receipts', `${id}.json`), JSON.stringify({ id, ingestion, error })); };
const run = (over: Partial<RunInfo>): RunInfo => ({ runId: 'r1', source, state: 'RUNNING', origin: 'manual', startedAt: new Date(Date.now() - 60_000).toISOString(), ...over } as RunInfo);

test('scroll mode follows the method: manual, automatic for DOM/Visual, not needed for HTTP/Network/Accessibility', () => {
  assert.equal(scrollFor({ method: 'dom' }), 'auto'); assert.equal(scrollFor({ method: 'visual' }), 'auto');
  for (const method of ['http', 'network', 'accessibility']) assert.equal(scrollFor({ method }), 'none');
  assert.equal(scrollFor({ method: 'dom', manualReading: {} as never }), 'manual'); assert.equal(scrollFor({}), 'unknown');
});

test('each row reports the engine work with real counts and narrates it as a human chain', async t => {
  const root = await mkdtemp(join(tmpdir(), 'extraction-monitor-')); t.after(() => rm(root, { recursive: true, force: true }));
  const key = sourceKey(source), now = Date.now(), name = (await loadBrands()).find(b => b.id === 'bet9ja')!.name;
  // Previous capture of the same source: two quotes that will not be "new" in the next pass.
  await raw(root, key, now - 3_600_000, 'network', [rec('e1', 'Moneyline', 'A', '1.50'), rec('e1', 'Moneyline', 'B', '2.50')]);
  const id = await raw(root, key, now - 20_000, 'dom', [rec('e1', 'Moneyline', 'A', '1.50'), rec('e1', 'Moneyline', 'B', '2.50'), rec('e1', 'Totals', 'Over', '1.90', '2.5'), rec('e1', 'Totals', 'Under', '1.90', '2.5'), rec('e2', 'Moneyline', 'A', '1.80'), rec('e2', 'Moneyline', 'B', '2.10'), rec('e1', 'Moneyline', 'A', '1.50')]);
  const published: ExtractionLine[] = [];
  let runs: RunInfo[] = [run({ method: 'dom', visualProgress: { visited: 3, pending: 7, tabsOpened: 1, records: 7, ocrCaptures: 0, url: `${source.url}football`, state: 'RUNNING', phase: 'Scroll window: vertical 800 px', visionCalls: 2 } })];
  const monitor = new ExtractionMonitor(root, () => runs, line => published.push(line));
  monitor.onLog('[dom] STARTED', source.type);
  monitor.onLog('[network] MISS: no JSON feed observed', source.type);

  const live = (await monitor.refresh()).rows[0]!;
  assert.equal(live.name, name); assert.equal(live.state, 'extracting'); assert.equal(live.stateLabel, 'Extrayendo'); assert.match(live.stateDetail!, /Scroll window/);
  assert.equal(live.methodLabel, 'DOM + AI'); assert.equal(live.scroll, 'auto'); assert.equal(live.scrollLabel, 'Auto');
  assert.equal(live.progressLabel, '3 / 10 páginas'); assert.equal(live.progressPercent, 30); assert.equal(live.currentUrl, `${source.url}football`);
  assert.deepEqual([live.events, live.markets, live.odds, live.duplicates, live.newRecords, live.captures], [2, 3, 6, 1, 4, 1]);
  assert.ok(live.speedPerMinute! > 0); assert.equal(live.lastCapture, new Date(now - 20_000).toISOString());
  assert.equal(live.saved, 'pending-load'); assert.match(live.savedLabel, /cargando a PostgreSQL/);

  await receipt(root, id, 'LOADED'); (monitor as unknown as { listing?: unknown }).listing = undefined; (monitor as unknown as { last?: unknown }).last = undefined;
  runs = [run({ method: 'dom', state: 'SUCCEEDED', finishedAt: new Date().toISOString(), records: 6, coverage: { skipped: 0, filtered: 0, pages: 10, complete: true } })];
  const done = (await monitor.refresh()).rows[0]!;
  assert.equal(done.state, 'done'); assert.equal(done.progressLabel, 'completo'); assert.equal(done.saved, 'postgres'); assert.equal(done.errors, 0);

  const text = published.map(l => l.text);
  assert.ok(text.includes(`${name} → DOM → intentando extraer`)); assert.ok(text.some(t => t.startsWith(`${name} → Network → sin datos (no JSON feed observed) → pasa al siguiente método`)));
  assert.ok(text.includes(`${name} → DOM → página leída → scroll automático → 2 eventos → 3 mercados → 7 cuotas → guardado en disco`));
  assert.ok(text.includes(`${name} → DOM → guardado en PostgreSQL → 7 cuotas`));
  assert.ok(text.includes(`${name} → DOM → 2 eventos → 3 mercados → 6 cuotas → 4 nuevas → 1 duplicadas descartadas → pasada completada`));
  assert.ok(published.every(l => l.source === null || l.source === source.type) && new Set(published.map(l => l.id)).size === published.length);
});

test('errors, waiting states, queued sources and manual sessions are reported without inventing numbers', async t => {
  const root = await mkdtemp(join(tmpdir(), 'extraction-monitor-states-')); t.after(() => rm(root, { recursive: true, force: true }));
  const published: ExtractionLine[] = [];
  const queued = { type: 'pinnacle', url: 'https://www.pinnacle.com/en' };
  const runs: RunInfo[] = [
    run({ runId: 'failed', state: 'FAILED', finishedAt: new Date().toISOString(), method: 'http', reason: 'HTTP 403' }),
    run({ runId: 'paused', state: 'PAUSED', method: 'http', challenge: { id: 'c', url: source.url, reason: 'Cloudflare', detectedAt: '', prompt: true, browserMode: 'isolated', reappearances: 0 } }),
    run({ runId: 'queued', source: queued, state: 'QUEUED' }),
    run({ runId: 'manual', method: 'dom', manualReading: { ready: true, savedViews: 2, records: 5, pendingViews: 1, archivedViews: 1, url: 'https://sports.bet9ja.com/live', browser: 'renzo', opened: true } }),
  ];
  const monitor = new ExtractionMonitor(root, () => runs, line => published.push(line));
  monitor.onLog('ERROR https://sports.bet9ja.com/: timeout after 20000 ms', source.type);
  const { rows, summary } = await monitor.refresh();
  const by = (id: string) => rows.find(r => r.runId === id)!;
  assert.equal(by('failed').state, 'error'); assert.equal(by('failed').errors >= 1, true); assert.equal(by('failed').scroll, 'none'); assert.equal(by('failed').events, null); assert.equal(by('failed').odds, null);
  assert.equal(by('paused').state, 'waiting'); assert.match(by('paused').stateDetail!, /Cloudflare/);
  assert.equal(by('queued').state, 'waiting'); assert.equal(by('queued').stateDetail, 'en cola'); assert.equal(by('queued').progressLabel, 'en cola'); assert.equal(by('queued').methodLabel, '—');
  const manual = by('manual'); assert.equal(manual.state, 'waiting'); assert.match(manual.stateDetail!, /esperando tu scroll/); assert.equal(manual.scroll, 'manual'); assert.equal(manual.progressLabel, '2 vistas leídas'); assert.equal(manual.currentUrl, 'https://sports.bet9ja.com/live');
  assert.deepEqual(summary, { extracting: 0, waiting: 3, error: 1, done: 0, stopped: 0 });
  assert.ok(published.some(l => l.type === 'error' && /timeout/.test(l.text)));
  assert.ok(published.some(l => /Manual → página cargada → https:\/\/sports\.bet9ja\.com\/live → esperando tu scroll/.test(l.text)));
  assert.equal(rows[0]!.state === 'waiting' || rows[0]!.state === 'extracting', true, 'active work is listed before finished passes');
});

test('the engine monitor lives in Actividad; Matches is only filters and results with no engine vocabulary', async t => {
  const root = await mkdtemp(join(tmpdir(), 'extraction-api-')), server = await createUiServer({ dataDir: root });
  t.after(async () => { await server.close(); await rm(root, { recursive: true, force: true }); });
  const snapshot = (await server.app.inject('/api/extraction')).json();
  assert.deepEqual(snapshot.summary, { extracting: 0, waiting: 0, error: 0, done: 0, stopped: 0 }); assert.deepEqual(snapshot.rows, []); assert.ok(snapshot.definitions.odds);
  assert.deepEqual((await server.app.inject('/api/extraction/log')).json().map((l: { text: string }) => l.text), ['Motor → monitor de extracción activo → cada pasada aparecerá aquí paso a paso']);
  for (const file of ['/extraction.js', '/matches.js']) assert.equal((await server.app.inject(file)).statusCode, 200, file);
  const html = (await server.app.inject('/')).body;
  const section = (id: string) => { const start = html.indexOf(`id="${id}"`), end = html.indexOf('</section>', start); assert.ok(start > 0, id); return html.slice(start, end); };
  // Actividad: the engine monitor (table + live log) and the plain log.
  const activity = section('panel-logs');
  for (const column of ['FUENTE', 'ESTADO', 'MÉTODO', 'URL ACTUAL', 'SCROLL', 'PROGRESO', 'EVENTOS EXTRAÍDOS', 'MERCADOS EXTRAÍDOS', 'CUOTAS EXTRAÍDAS', 'REGISTROS NUEVOS', 'DUPLICADOS DESCARTADOS', 'ERRORES', 'VELOCIDAD', 'ÚLTIMA CAPTURA']) assert.ok(activity.includes(`<th>${column}</th>`), column);
  assert.ok(activity.includes('LOG EN TIEMPO REAL')); assert.ok(html.includes('data-nav-tab="logs" data-nav-view="motor"'));
  assert.ok(!html.includes('data-nav-group="extraccion"') && !html.includes('id="panel-extraccion"'), 'no separate Extracción tab');
  // Matches: seven filters in this order, then results.
  const matches = section('panel-matches'), labels = [...matches.matchAll(/<label>([A-ZÁÉÍÓÚ]+)/g)].map(m => m[1]);
  assert.deepEqual(labels, ['DEPORTE', 'PAÍS', 'LIGA', 'FECHA', 'PARTIDO', 'CASA', 'MERCADO']);
  assert.ok(matches.includes('id="matchesResults"'));
  assert.doesNotMatch(matches, /\b(HTTP|DOM|NETWORK|VISUAL|AI|IA|SCROLL|ERRORES?|VELOCIDAD|LOGS?|MÉTODO|OCR)\b/i, 'no engine vocabulary in Matches');
  const script = (await server.app.inject('/matches.js')).body;
  assert.doesNotMatch(script, /\b(HTTP|DOM|NETWORK|VISUAL|SCROLL|VELOCIDAD|LOGS)\b/, 'the Matches script renders nothing about the engine');
  assert.match(html, /data-nav-group="matches"[\s\S]*?<span>Matches<\/span>/); assert.ok(!html.includes('data-nav-view="matches"'), 'Datos guardados does not hold a Matches view');
});

test('human log lines reach the browser through the live stream and the backfill endpoint', async t => {
  const root = await mkdtemp(join(tmpdir(), 'extraction-stream-')), server = await createUiServer({ dataDir: root, port: 0 });
  t.after(async () => { await server.close(); await rm(root, { recursive: true, force: true }); });
  const address = await server.listen();
  const controller = new AbortController(); t.after(() => controller.abort());
  const response = await fetch(`${address}/api/stream`, { signal: controller.signal });
  const reader = response.body!.getReader(), decoder = new TextDecoder();
  let received = ''; const pump = (async () => { try { for (;;) { const { value, done } = await reader.read(); if (done) break; received += decoder.decode(value); } } catch { /* aborted */ } })();
  const deadline = Date.now() + 3000;
  await fetch(`${address}/api/stop`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  while (!/event: extraction_log[\s\S]*detención solicitada por el usuario/.test(received) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
  controller.abort(); await pump;
  assert.match(received, /event: extraction_log\ndata: \{[^\n]*"text":"Motor → detención solicitada por el usuario → 0 runs cancelados/);
  const backfill = await (await fetch(`${address}/api/extraction/log`)).json() as ExtractionLine[];
  assert.ok(backfill.some(line => line.type === 'warn' && line.text.startsWith('Motor → detención solicitada por el usuario')));
});

test('matching controls: every action has an explicit button and an endpoint; invalid input is rejected', async t => {
  const root = await mkdtemp(join(tmpdir(), 'matching-controls-')), server = await createUiServer({ dataDir: root });
  t.after(async () => { await server.close(); await rm(root, { recursive: true, force: true }); });
  const html = (await server.app.inject('/')).body;
  for (const id of ['mcRules', 'mcAi', 'mcCancel', 'mcAuto', 'workbenchManualRead', 'workbenchManualFinish', 'mcPairs', 'mcGrouped']) assert.ok(html.includes(`id="${id}"`), id);
  for (const label of ['Agrupar ahora (sin IA)', 'Resolver ambiguos con IA', 'Cancelar IA', 'IA automática', 'Leer y extraer esta vista', 'Terminar sesión manual']) assert.ok(html.includes(label), label);
  assert.ok(html.includes('data-nav-view="matching"'));
  const post = (url: string, payload: unknown) => server.app.inject({ method: 'POST', url, payload: payload as Record<string, unknown> });
  assert.equal((await post('/api/matching/run', { mode: 'x' })).statusCode, 400);
  assert.equal((await post('/api/matching/settings', { autoAi: 'yes' })).statusCode, 400);
  assert.equal((await post('/api/matching/decision', { a: '1', b: '2', verdict: 'MAYBE' })).statusCode, 400);
  assert.equal((await post('/api/matching/decision', { a: 'x', b: '2', verdict: 'SAME' })).statusCode, 400);
  assert.equal((await post('/api/matching/forget', { key: 'nope' })).statusCode, 400);
  assert.deepEqual((await post('/api/matching/cancel', {})).json(), { cancelled: false });
  const saved = (await post('/api/matching/settings', { autoAi: false })).json(); assert.equal(saved.autoAi, false);
  assert.deepEqual(JSON.parse(await readFile(join(root, 'ui', 'matching.json'), 'utf8')), { autoAi: false }, 'the switch survives a restart');
  await server.close();
  const again = await createUiServer({ dataDir: root }); t.after(() => again.close());
  assert.equal((await again.app.inject('/api/matching/status')).json().autoAi, false);
});

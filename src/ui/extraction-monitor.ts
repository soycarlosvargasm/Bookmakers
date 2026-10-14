import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { sourceKey } from '../engine/memory.js';
import { quoteKey } from '../validation/records.js';
import type { ProviderRecord } from '../normalization/types.js';
import type { RunInfo } from './actions.js';
import { loadBrands } from './brands.js';
import { COLLECTOR_TIMEZONE, isFixtureSnapshot } from './daily-records.js';
import { dayInZone } from '../engine/collection.js';

/** Read-only observer of what the engine is doing. It never starts, stops or alters an extraction:
 * it only reads run state, the RAW captures a run has written and the PostgreSQL load receipts. */

export type ExtractionState = 'extracting' | 'waiting' | 'error' | 'done' | 'stopped';
export type ScrollMode = 'auto' | 'manual' | 'none' | 'unknown';
export type ExtractionRow = {
  runId: string; source: { type: string; url: string }; name: string; origin: 'manual' | 'scheduler'; persisted: boolean;
  state: ExtractionState; stateLabel: string; stateDetail: string | null;
  method: string | null; methodLabel: string; aiCalls: number;
  currentUrl: string; scroll: ScrollMode; scrollLabel: string;
  progressLabel: string; progressPercent: number | null;
  events: number | null; markets: number | null; odds: number | null; partial: boolean;
  newRecords: number | null; duplicates: number | null; errors: number; lastError: string | null;
  speedPerMinute: number | null; lastCapture: string | null; saved: 'postgres' | 'disk' | 'pending-load' | 'failed' | 'none'; savedLabel: string;
  captures: number; startedAt: string; finishedAt: string | null; elapsedMs: number;
};
export type ExtractionLine = { id: string; time: string; source: string | null; type: 'info' | 'ok' | 'warn' | 'error'; text: string };
export type ExtractionSnapshot = { now: string; rows: ExtractionRow[]; summary: { extracting: number; waiting: number; error: number; done: number; stopped: number }; definitions: Record<string, string> };

export const DEFINITIONS: Record<string, string> = {
  state: 'extrayendo = el motor trabaja ahora; esperando = en cola, verificación pendiente o a la espera de tu scroll manual; error = la pasada falló.',
  method: 'Último método que el motor está usando o usó: HTTP → Network → DOM → Accessibility → Visual (+ AI si hubo llamadas a la API).',
  scroll: 'Manual = lo haces tú. Auto = el motor desplaza la página (DOM/Visual). No necesario = HTTP, Network o Accessibility no usan scroll.',
  events: 'Enfrentamientos distintos en las capturas de esta pasada. «≥» = la captura guardó solo parte de sus registros.',
  markets: 'Mercados distintos (evento + mercado + periodo + línea) en las capturas de esta pasada.',
  odds: 'Cuotas con precio extraídas en esta pasada, sin contar repeticiones.',
  newRecords: 'Cuotas únicas de esta pasada que no estaban en la captura anterior de la misma fuente.',
  duplicates: 'Cuotas repetidas dentro de la pasada (p. ej. la misma tarjeta leída dos veces) más capturas idénticas ya guardadas.',
  errors: 'Errores del motor registrados en la pasada (una pasada fallida cuenta al menos 1).',
  speed: 'Cuotas extraídas por minuto desde que empezó la pasada.',
  lastCapture: 'Hora de la última captura RAW de la pasada y dónde quedó guardada.'
};

const RAW_NAME = /^([a-f0-9]{64})-(\d+)-(http|network|dom|accessibility|visual)\.json$/;
const METHOD_LABEL: Record<string, string> = { http: 'HTTP', network: 'Network', dom: 'DOM', accessibility: 'Accessibility', visual: 'Visual' };
const shortHash = (value: string) => createHash('sha1').update(value).digest('base64').slice(0, 12);
const number = (value: number) => value.toLocaleString('en-US');

type FileMetrics = { id: string; ts: number; method: string; events: Set<string>; markets: Set<string>; sigs: Set<string>; parsed: number; declared: number; capturedAt: string | null; url: string | null };
type RawFile = { name: string; id: string; key: string; ts: number; method: string };
type Receipt = { ingestion?: string; error?: string };
type Seen = { raw: Set<string>; ingest: Map<string, string>; state: string; phase: string | null; phaseAt: number; visited: number; opened: boolean; ready: boolean; url: string | null; finalLogged: boolean; startedLogged: boolean; method: string | null };

export function scrollFor(run: Pick<RunInfo, 'manualReading' | 'method'>): ScrollMode {
  if (run.manualReading) return 'manual';
  if (['http', 'network', 'accessibility'].includes(run.method ?? '')) return 'none';
  if (['dom', 'visual'].includes(run.method ?? '')) return 'auto';
  return 'unknown';
}
const SCROLL_LABEL: Record<ScrollMode, string> = { auto: 'Auto', manual: 'Manual', none: 'No necesario', unknown: '—' };

export class ExtractionMonitor {
  readonly lines: ExtractionLine[] = [];
  private sequence = 0;
  private names = new Map<string, string>();
  private cache = new Map<string, { fingerprint: string; value: FileMetrics | null }>();
  private receipts = new Map<string, { fingerprint: string; value: Receipt | null }>();
  private persistedRuns = new Map<string, { fingerprint: string; value: RunInfo | null }>();
  private listing?: { at: number; files: RawFile[] };
  private readonly seen = new Map<string, Seen>();
  private readonly errors = new Map<string, { count: number; last: string | null }>();
  private active?: Promise<ExtractionSnapshot>;
  private last?: { at: number; value: ExtractionSnapshot };
  constructor(private readonly dataDir: string, private readonly getRuns: () => RunInfo[], private readonly publish: (line: ExtractionLine) => void) {
    this.push(null, ['Motor', 'monitor de extracción activo', 'cada pasada aparecerá aquí paso a paso']);
  }

  private push(source: string | null, parts: Array<string | null | undefined | false>, type: ExtractionLine['type'] = 'info', time = new Date()): void {
    const text = parts.filter((part): part is string => Boolean(part)).join(' → ');
    const line: ExtractionLine = { id: `x-${process.pid}-${++this.sequence}`, time: time.toISOString(), source, type, text };
    this.lines.push(line); if (this.lines.length > 600) this.lines.shift();
    this.publish(line);
  }
  /** Human note about a phase after extraction (for example the matching layer); shown in the same live log. */
  note(type: ExtractionLine['type'], parts: string[]): void { this.push(null, parts, type); }
  private name(type: string): string { return this.names.get(type) ?? type; }
  private activeRunFor(source: string): RunInfo | undefined {
    const runs = this.getRuns().filter(run => run.source.type === source);
    return runs.find(run => !run.finishedAt && run.state !== 'QUEUED') ?? runs.filter(run => !run.finishedAt).at(-1) ?? runs.at(-1);
  }

  private loadingNames?: Promise<void>;
  private loadNames(): Promise<void> {
    return this.loadingNames ??= loadBrands().then(brands => { for (const brand of brands) this.names.set(brand.id, brand.name); }, () => undefined);
  }

  /** Engine log lines are translated, never echoed: only the ones that say what the engine is doing. */
  onLog(line: string, source?: string): void {
    // Brand display names load once; lines that arrive earlier wait for them so order is preserved.
    if (!this.names.size) { void this.loadNames().then(() => { if (!this.names.size) this.names.set('', ''); this.onLog(line, source); }); return; }
    if (!source) { if (/^Detener:/.test(line)) this.push(null, ['Motor', 'detención solicitada por el usuario', line.replace(/^Detener:\s*/, '')], 'warn'); return; }
    const name = this.name(source);
    const stage = /^\[(http|network|dom|accessibility|visual)\] (STARTED|MISS|SUCCEEDED|CHALLENGE|ERROR)(?:: (.*))?$/.exec(line);
    if (stage) {
      const method = METHOD_LABEL[stage[1]!]!, reason = stage[3]?.trim();
      if (stage[2] === 'STARTED') this.push(source, [name, method, 'intentando extraer']);
      else if (stage[2] === 'MISS') this.push(source, [name, method, `sin datos${reason ? ` (${reason})` : ''}`, 'pasa al siguiente método'], 'warn');
      else if (stage[2] === 'SUCCEEDED') this.push(source, [name, method, 'extracción correcta'], 'ok');
      else if (stage[2] === 'CHALLENGE') this.push(source, [name, method, `verificación pendiente${reason ? ` (${reason})` : ''}`, 'esperando a la persona'], 'warn');
      else { this.countError(source, reason ?? 'error del método'); this.push(source, [name, method, `error${reason ? `: ${reason}` : ''}`], 'error'); }
      return;
    }
    if (/^Run started /.test(line)) { const url = line.replace(/^Run started /, '').split(' ')[0]; this.push(source, [name, 'pasada iniciada', url]); return; }
    const attempts = /^Verificación: (\d+) intento/.exec(line);
    if (attempts) { this.push(source, [name, 'verificación', `${attempts[1]} intento(s) manual(es) detectado(s)`], 'warn'); return; }
    if (/cambiando automáticamente a Chrome Renzo|^Abriendo .* en Chrome Renzo|Abriendo la misma fuente en el perfil Chrome Renzo/.test(line)) { this.push(source, [name, 'cambio a Chrome Renzo', 'misma fuente, sin OCR ni recorrido automático'], 'warn'); return; }
    if (/^ERROR\b/.test(line) && !/^ERROR (Data|local database|API|reading local state)/.test(line) && !/ \| records=/.test(line)) {
      const reason = line.replace(/^ERROR\s+\S+?:?\s*/, '').slice(0, 220);
      this.countError(source, reason); this.push(source, [name, 'error', reason], 'error');
    }
  }
  private countError(source: string, reason: string): void {
    const run = this.activeRunFor(source); if (!run) return;
    const current = this.errors.get(run.runId) ?? { count: 0, last: null };
    this.errors.set(run.runId, { count: current.count + 1, last: reason });
  }

  // --- RAW captures and receipts ------------------------------------------------------------
  private async listRaw(): Promise<RawFile[]> {
    if (this.listing && Date.now() - this.listing.at < 1000) return this.listing.files;
    const names = await readdir(join(this.dataDir, 'raw')).catch(error => { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [] as string[]; throw error; });
    const files: RawFile[] = [];
    for (const name of names) { const match = RAW_NAME.exec(name); if (match) files.push({ name, id: name.replace(/\.json$/, ''), key: match[1]!, ts: Number(match[2]), method: match[3]! }); }
    this.listing = { at: Date.now(), files }; return files;
  }
  private async metrics(file: RawFile): Promise<FileMetrics | null> {
    const path = join(this.dataDir, 'raw', file.name);
    const meta = await stat(path).catch(() => null); if (!meta) return null;
    const fingerprint = `${meta.mtimeMs}:${meta.size}`, cached = this.cache.get(file.id);
    if (cached?.fingerprint === fingerprint) return cached.value;
    let value: FileMetrics | null = null;
    try {
      const raw = JSON.parse(await readFile(path, 'utf8')) as { recordCount?: number; evidence?: { url?: string; capturedAt?: string; payload?: { records?: ProviderRecord[] } } };
      if (!isFixtureSnapshot(raw as never)) {
        const records = (Array.isArray(raw.evidence?.payload?.records) ? raw.evidence!.payload!.records! : []).filter(r => r && typeof r === 'object');
        const events = new Set<string>(), markets = new Set<string>(), sigs = new Set<string>(); let parsed = 0;
        for (const r of records) {
          if (!(r.rawOdds || (typeof r.decimalOdds === 'number' && r.decimalOdds > 1))) continue;
          parsed++;
          const event = String(r.sourceEventId || r.qualifiers?.domEventKey || [r.eventName, r.eventStartTime].join('|'));
          events.add(shortHash(event)); markets.add(shortHash(JSON.stringify([event, r.market, r.marketPeriod, r.sourceMarketId, r.line])));
          sigs.add(shortHash(`${quoteKey(r)}|${r.rawOdds ?? r.decimalOdds}`));
        }
        value = { id: file.id, ts: file.ts, method: file.method, events, markets, sigs, parsed, declared: Math.max(Number(raw.recordCount) || 0, parsed), capturedAt: raw.evidence?.capturedAt ?? new Date(file.ts).toISOString(), url: raw.evidence?.url ?? null };
      }
    } catch { value = null; }
    this.cache.set(file.id, { fingerprint, value });
    if (this.cache.size > 90) this.cache.delete(this.cache.keys().next().value!);
    return value;
  }
  private async receipt(id: string): Promise<Receipt | null> {
    const path = join(this.dataDir, 'collection', 'receipts', `${id}.json`);
    const meta = await stat(path).catch(() => null); if (!meta) return null;
    const fingerprint = `${meta.mtimeMs}:${meta.size}`, cached = this.receipts.get(id);
    if (cached?.fingerprint === fingerprint) return cached.value;
    const value = await readFile(path, 'utf8').then(text => JSON.parse(text) as Receipt).catch(() => null);
    this.receipts.set(id, { fingerprint, value }); if (this.receipts.size > 400) this.receipts.delete(this.receipts.keys().next().value!);
    return value;
  }

  private async persisted(): Promise<RunInfo[]> {
    const folder = join(this.dataDir, 'ui', 'runs');
    const names = (await readdir(folder).catch(() => [] as string[])).filter(name => name.endsWith('.json'));
    const dated = (await Promise.all(names.map(async name => ({ name, meta: await stat(join(folder, name)).catch(() => null) })))).filter((x): x is { name: string; meta: NonNullable<typeof x.meta> } => Boolean(x.meta))
      .sort((a, b) => b.meta.mtimeMs - a.meta.mtimeMs).slice(0, 40);
    const runs: RunInfo[] = [];
    for (const { name, meta } of dated) {
      const fingerprint = `${meta.mtimeMs}:${meta.size}`, cached = this.persistedRuns.get(name);
      let value = cached?.fingerprint === fingerprint ? cached.value : undefined;
      if (value === undefined) { value = await readFile(join(folder, name), 'utf8').then(text => JSON.parse(text) as RunInfo).catch(() => null); this.persistedRuns.set(name, { fingerprint, value }); }
      if (value?.runId && value.source && value.startedAt && !value.discovery) runs.push(value);
    }
    return runs;
  }

  // --- rows ---------------------------------------------------------------------------------
  private async row(run: RunInfo, persisted: boolean, files: RawFile[]): Promise<{ row: ExtractionRow; metricsFiles: FileMetrics[]; receipts: Map<string, Receipt | null> }> {
    const key = sourceKey(run.source), start = Date.parse(run.startedAt), end = (run.finishedAt ? Date.parse(run.finishedAt) : Date.now()) + 10_000;
    const mine = files.filter(f => f.key === key && f.ts >= start - 2000 && f.ts <= end).sort((a, b) => a.ts - b.ts);
    const previous = files.filter(f => f.key === key && f.ts < start - 2000).sort((a, b) => b.ts - a.ts)[0];
    const metricsFiles = (await Promise.all(mine.map(file => this.metrics(file)))).filter((m): m is FileMetrics => Boolean(m));
    const previousMetrics = previous ? await this.metrics(previous) : null;
    const receipts = new Map<string, Receipt | null>();
    for (const file of mine) receipts.set(file.id, await this.receipt(file.id));

    const unique = new Set<string>(), events = new Set<string>(), markets = new Set<string>(); let totalParsed = 0, declaredExtra = 0, repeatedCaptures = 0;
    for (const m of metricsFiles) {
      totalParsed += m.parsed; declaredExtra += Math.max(0, m.declared - m.parsed);
      for (const s of m.sigs) unique.add(s); for (const e of m.events) events.add(e); for (const k of m.markets) markets.add(k);
    }
    const partial = declaredExtra > 0;
    const hasCaptures = metricsFiles.length > 0;
    const liveOdds = run.visualProgress?.records ?? run.records ?? null;
    const odds = hasCaptures ? unique.size + declaredExtra : liveOdds;
    const duplicates = hasCaptures ? Math.max(0, totalParsed - unique.size) + repeatedCaptures : null;
    let newRecords: number | null = null;
    if (hasCaptures) { const before = previousMetrics?.sigs; newRecords = before ? [...unique].filter(s => !before.has(s)).length + declaredExtra : unique.size + declaredExtra; }

    const finished = Boolean(run.finishedAt), elapsedMs = Math.max(0, (finished ? Date.parse(run.finishedAt!) : Date.now()) - start);
    const state: ExtractionState = run.state === 'QUEUED' ? 'waiting' : run.state === 'PAUSED' ? 'waiting' : run.state === 'FAILED' ? 'error' : run.state === 'SUCCEEDED' ? 'done' : run.state === 'SKIPPED' ? 'stopped'
      : run.manualReading ? (run.manualReading.ready ? 'waiting' : 'extracting') : 'extracting';
    const progress = run.visualProgress;
    let stateLabel = ({ extracting: 'Extrayendo', waiting: 'Esperando', error: 'Error', done: 'Completada', stopped: 'Detenida / saltada' } as const)[state], stateDetail: string | null = null;
    if (run.state === 'QUEUED') stateDetail = 'en cola';
    else if (run.state === 'PAUSED') stateDetail = run.challenge?.reason ?? run.reason ?? 'verificación pendiente: necesita a la persona';
    else if (run.manualReading && finished) stateDetail = run.reason ?? `${run.manualReading.savedViews} vista(s) leída(s) · ${run.manualReading.records ?? 0} cuotas extraídas`;
    else if (run.manualReading) stateDetail = run.manualReading.ready ? 'esperando tu scroll y la orden de leer la vista' : run.manualReading.opened ? 'cargando la fuente en Chrome Renzo' : 'abriendo Chrome Renzo';
    else if (state === 'extracting') stateDetail = progress?.phase ?? (run.method ? `método ${METHOD_LABEL[run.method] ?? run.method}` : 'iniciando');
    else if (state === 'error' || state === 'stopped') stateDetail = run.reason ?? null;
    const errorInfo = this.errors.get(run.runId);
    const errors = Math.max(errorInfo?.count ?? 0, run.state === 'FAILED' ? 1 : 0, progress?.lastError ? 1 : 0);
    const lastError = errorInfo?.last ?? (run.state === 'FAILED' ? run.reason ?? null : null) ?? progress?.lastError ?? null;

    let progressLabel = '—', progressPercent: number | null = null;
    if (run.manualReading) progressLabel = `${run.manualReading.savedViews} vista${run.manualReading.savedViews === 1 ? '' : 's'} leída${run.manualReading.savedViews === 1 ? '' : 's'}`;
    else if (progress && !finished) { const total = progress.visited + progress.pending; progressLabel = `${progress.visited} / ${total} páginas`; progressPercent = total ? Math.round(progress.visited / total * 100) : null; }
    else if (run.state === 'SUCCEEDED') { progressLabel = run.coverage ? (run.coverage.complete ? 'completo' : 'parcial') : 'completo'; progressPercent = run.coverage && !run.coverage.complete ? null : 100; }
    else if (run.state === 'FAILED' || run.state === 'SKIPPED') progressLabel = 'interrumpido';
    else if (run.state === 'QUEUED') { progressLabel = 'en cola'; progressPercent = 0; }
    else if (run.state === 'PAUSED') progressLabel = 'en pausa';
    else progressLabel = run.method ? 'en curso' : 'iniciando';

    const speed = odds && elapsedMs >= 5000 ? Math.round(odds / (elapsedMs / 60000)) : null;
    const last = metricsFiles.at(-1);
    const states = [...receipts.values()].map(r => r?.ingestion ?? 'NONE');
    const saved: ExtractionRow['saved'] = !metricsFiles.length ? 'none' : states.includes('FAILED') ? 'failed' : states.every(s => s === 'LOADED' || s === 'EMPTY') ? 'postgres' : states.includes('PENDING') || states.includes('NONE') ? 'pending-load' : 'disk';
    const savedLabel = ({ none: 'sin captura todavía', postgres: 'guardada en PostgreSQL', 'pending-load': 'en disco · cargando a PostgreSQL', failed: 'en disco · PostgreSQL falló, reintenta solo', disk: 'en disco' } as const)[saved];
    const method = run.method ?? null;
    const row: ExtractionRow = { runId: run.runId, source: run.source, name: this.name(run.source.type), origin: run.origin, persisted, state, stateLabel, stateDetail,
      method, methodLabel: method ? `${METHOD_LABEL[method] ?? method}${(progress?.visionCalls ?? 0) > 0 ? ' + AI' : ''}` : '—', aiCalls: progress?.visionCalls ?? 0,
      currentUrl: run.manualReading?.url ?? progress?.url ?? run.challenge?.url ?? last?.url ?? run.source.url, scroll: scrollFor(run), scrollLabel: SCROLL_LABEL[scrollFor(run)],
      progressLabel, progressPercent, events: hasCaptures ? events.size : null, markets: hasCaptures ? markets.size : null, odds, partial, newRecords, duplicates, errors, lastError,
      speedPerMinute: speed, lastCapture: last?.capturedAt ?? null, saved, savedLabel, captures: metricsFiles.length, startedAt: run.startedAt, finishedAt: run.finishedAt ?? null, elapsedMs };
    return { row, metricsFiles, receipts };
  }

  /** Narrate what changed since the previous look, using only evidence: state, RAW files and receipts. */
  private narrate(run: RunInfo, row: ExtractionRow, metricsFiles: FileMetrics[], receipts: Map<string, Receipt | null>): void {
    let seen = this.seen.get(run.runId);
    const name = row.name, method = row.method ? METHOD_LABEL[row.method] ?? row.method : null;
    if (!seen) { seen = { raw: new Set(), ingest: new Map(), state: '', phase: null, phaseAt: 0, visited: 0, opened: false, ready: false, url: null, finalLogged: false, startedLogged: false, method: null }; this.seen.set(run.runId, seen); }
    const scrollText = row.scroll === 'auto' ? 'scroll automático' : row.scroll === 'manual' ? 'scroll manual' : null;
    const mr = run.manualReading;
    if (mr) {
      if (mr.opened && !seen.opened) { seen.opened = true; this.push(run.source.type, [name, 'Manual', 'pestaña abierta en Chrome Renzo', 'cargando la fuente']); }
      if (mr.ready && !seen.ready) { seen.ready = true; this.push(run.source.type, [name, 'Manual', 'página cargada', mr.url, 'esperando tu scroll'], 'ok'); }
      else if (mr.ready && mr.url && seen.url && mr.url !== seen.url) this.push(run.source.type, [name, 'Manual', `navegaste a ${mr.url}`]);
      seen.url = mr.url ?? seen.url;
    }
    if (run.visualProgress && !run.finishedAt) {
      const p = run.visualProgress, now = Date.now();
      if (p.phase && p.phase !== seen.phase && now - seen.phaseAt >= 1500) { seen.phase = p.phase; seen.phaseAt = now; this.push(run.source.type, [name, 'Visual', p.phase]); }
      if (p.visited > seen.visited && now - seen.phaseAt >= 0) { seen.visited = p.visited; this.push(run.source.type, [name, 'Visual', `${p.visited} páginas visitadas`, `${p.pending} pendientes`, `${p.records} cuotas hasta ahora`]); }
    }
    for (const m of metricsFiles) {
      if (!seen.raw.has(m.id)) {
        seen.raw.add(m.id);
        const label = METHOD_LABEL[m.method] ?? m.method, n = (value: number) => number(value);
        const e = n(m.events.size), mk = n(m.markets.size), o = n(m.declared);
        this.push(run.source.type, [name, label, mr ? `vista ${seen.raw.size} leída` : 'página leída', scrollText, `${e} eventos`, `${mk} mercados`, `${o} cuotas`, 'guardado en disco'], 'ok', new Date(m.capturedAt ?? m.ts));
      }
      const state = receipts.get(m.id)?.ingestion;
      if (state && state !== seen.ingest.get(m.id) && state !== 'PENDING') {
        seen.ingest.set(m.id, state);
        const label = METHOD_LABEL[m.method] ?? m.method;
        if (state === 'LOADED') this.push(run.source.type, [name, label, `guardado en PostgreSQL`, `${number(m.declared)} cuotas`], 'ok');
        else if (state === 'EMPTY') this.push(run.source.type, [name, label, 'evidencia archivada en PostgreSQL', 'sin cuotas para cargar → pendiente de interpretación'], 'warn');
        else if (state === 'FAILED') this.push(run.source.type, [name, label, `no se pudo guardar en PostgreSQL${receipts.get(m.id)?.error ? `: ${receipts.get(m.id)!.error}` : ''}`, 'reintenta automáticamente'], 'error');
      }
    }
    if (method && method !== seen.method) seen.method = method;
    if (run.finishedAt && !seen.finalLogged) {
      seen.finalLogged = true;
      const totals = [row.events !== null && `${number(row.events)} eventos`, row.markets !== null && `${number(row.markets)} mercados`, row.odds !== null && `${number(row.odds)} cuotas`];
      if (run.state === 'SUCCEEDED') this.push(run.source.type, [name, method, ...totals, row.newRecords !== null && `${number(row.newRecords)} nuevas`, row.duplicates ? `${number(row.duplicates)} duplicadas descartadas` : null, 'pasada completada'], 'ok');
      else if (run.state === 'FAILED') this.push(run.source.type, [name, method, 'error', run.reason ?? 'sin detalle'], 'error');
      else if (run.state === 'SKIPPED') this.push(run.source.type, [name, method, mr ? `sesión manual terminada: ${mr.savedViews} vistas, ${mr.records} cuotas` : 'detenida o saltada', run.reason ?? null], 'warn');
    }
    seen.state = run.state;
  }

  async refresh(): Promise<ExtractionSnapshot> {
    if (this.active) return this.active;
    this.active = this.compute().finally(() => { this.active = undefined; });
    return this.active;
  }
  async snapshot(): Promise<ExtractionSnapshot> { return this.last && Date.now() - this.last.at < 800 ? this.last.value : this.refresh(); }
  private async compute(): Promise<ExtractionSnapshot> {
    await this.loadNames();
    const files = await this.listRaw();
    const session = this.getRuns().filter(run => !run.discovery), sessionIds = new Set(session.map(run => run.runId));
    const today = dayInZone(Date.now(), COLLECTOR_TIMEZONE);
    const past = (await this.persisted()).filter(run => !sessionIds.has(run.runId) && run.finishedAt && dayInZone(run.finishedAt, COLLECTOR_TIMEZONE) === today);
    const rows: ExtractionRow[] = [];
    for (const run of session) { const built = await this.row(run, false, files); this.narrate(run, built.row, built.metricsFiles, built.receipts); rows.push(built.row); }
    for (const run of past.slice(0, 25)) rows.push((await this.row(run, true, files)).row);
    const order = (row: ExtractionRow) => row.finishedAt ? 1 : row.state === 'extracting' ? -2 : row.state === 'waiting' && row.stateDetail !== 'en cola' ? -1 : 0;
    rows.sort((a, b) => order(a) - order(b) || (a.finishedAt ? Date.parse(b.finishedAt ?? '') - Date.parse(a.finishedAt) : Date.parse(a.startedAt) - Date.parse(b.startedAt)));
    const summary = { extracting: 0, waiting: 0, error: 0, done: 0, stopped: 0 };
    for (const row of rows) summary[row.state]++;
    const value = { now: new Date().toISOString(), rows, summary, definitions: DEFINITIONS };
    this.last = { at: Date.now(), value };
    for (const [id] of this.seen) if (!sessionIds.has(id) && this.seen.size > 300) this.seen.delete(id);
    return value;
  }
}

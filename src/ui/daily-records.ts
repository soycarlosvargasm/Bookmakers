import { createHash } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Pool } from 'pg';
import { dayInZone } from '../engine/collection.js';
import type { ProviderRecord } from '../normalization/types.js';
import { quoteIdentity, recordIdentity, type Provenance } from './ai-evidence.js';
import { assessRecord } from '../validation/records.js';

export const COLLECTOR_TIMEZONE = 'Asia/Bangkok';
export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RAW_NAME = /-\d+-(http|network|dom|accessibility|visual)\.json$/;
const FIXTURE_TRANSPORTS = new Set(['local-fixture', 'fixture-only']);

/** One validated odds row: every field comes from the stored capture, never guessed. */
export type DayRecordRow = {
  captureId: string; sha256: string; capturedAt: string; captureDay: string; source: string; bookmaker: string | null; sourceUrl: string; pageUrl: string;
  method: string; transport: string | null; competitionCountry: string | null; sport: string | null; league: string | null; event: string; participants: string[] | null;
  eventStart: string | null; market: string; period: string | null; line: string | null; selection: string; rawOdds: string | null; oddsFormat: string | null;
  decimalOdds: number | null; status: 'VALID' | 'PARTIAL' | 'IA'; reason: string; row: number; origin: CaptureOrigin; extraction: 'rules' | 'ai'; provenance?: Provenance;
};
export type DayPendingRow = {
  captureId: string; sha256: string; capturedAt: string; captureDay: string; source: string; sourceUrl: string; pageUrl: string; method: string; transport: string | null;
  kind: 'record' | 'text' | 'capture'; row: number | null; status: string; reason: string; textChars: number; origin: CaptureOrigin;
};
export type CaptureOrigin = 'local' | 'archive' | 'both';
export type DayCapture = { captureId: string; sha256: string; capturedAt: string; captureDay: string; source: string; sourceUrl: string; pageUrl: string; method: string; transport: string | null; validated: number; pending: number; hasText: boolean; textChars: number; origin: CaptureOrigin };
export type DaySummary = {
  day: string; timezone: string; captures: number; validated: number; pending: number; pendingCaptures: number; ai: number;
  sources: Record<string, { captures: number; validated: number; pending: number }>; origins: Record<CaptureOrigin, number>;
  archiveAvailable: boolean; archiveError: string | null; scope: string;
};
type AiQuoteRow = { home: string; away: string; sport: string | null; competition: string | null; market: string; period: string | null; selection: string; line: string | null; price: string; format: string; decimal: number; eventLine?: number; selectionLine?: number; priceLine?: number; bookmaker?: string | null; eventStart?: string | null; provenance?: Provenance };
export type DayRecords = { summary: DaySummary; captures: DayCapture[]; validated: DayRecordRow[]; pending: DayPendingRow[] };

type RawSnapshot = { source?: { type?: string; url?: string }; method?: string; retrievedAt?: string; recordCount?: number;
  evidence?: { url?: string; transport?: string; capturedAt?: string; textPath?: string; screenshotPath?: string; screenshotPaths?: string[]; payload?: Record<string, unknown> | null } };
export type StoredAiEvidence = { text: string | null; dom: unknown; records: ProviderRecord[]; images: Array<{ ref: string; bytes: Buffer }>; warnings: string[] };
type Parsed = { capture: DayCapture; validated: DayRecordRow[]; pending: DayPendingRow[]; fixture: boolean };
type LocalEntry = { fingerprint: string; retrievedAt: string | null; parsed?: Parsed | null };

export const SCOPE_DESCRIPTION = 'Capturas reales cuya fecha de captura cae en el día indicado (Asia/Bangkok). Una captura = un archivo con SHA256 distinto; una cuota repetida en dos capturas conserva ambas versiones. Se excluyen fixtures y archivos de fallo. Validadas: evento, mercado, opción y precio con asociación comprobada. Pendientes: registros ambiguos, texto sin interpretar y capturas sin registros.';

export function dayBounds(day: string): { from: string; to: string } {
  if (!DAY_PATTERN.test(day)) throw Object.assign(new Error('Indica la fecha como AAAA-MM-DD.'), { statusCode: 400 });
  const from = new Date(`${day}T00:00:00+07:00`);
  if (!Number.isFinite(from.getTime()) || dayInZone(from.getTime(), COLLECTOR_TIMEZONE) !== day) throw Object.assign(new Error('Fecha inválida.'), { statusCode: 400 });
  return { from: from.toISOString(), to: new Date(from.getTime() + 86_400_000).toISOString() };
}
export const todayInZone = (now = Date.now()) => dayInZone(now, COLLECTOR_TIMEZONE);

export function isFixtureSnapshot(snapshot: RawSnapshot): boolean {
  const payload = snapshot.evidence?.payload;
  return payload?.verificationFixture === true || payload?.liveSportsbook === false || FIXTURE_TRANSPORTS.has(snapshot.evidence?.transport ?? '');
}

const validDate = (value: unknown): string | null => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;

/** Project one stored capture into day rows. Pure: the same bytes always give the same rows. */
export function projectSnapshot(snapshot: RawSnapshot, sha256: string, captureId: string, origin: CaptureOrigin): Parsed {
  const capturedAt = validDate(snapshot.evidence?.capturedAt) ?? validDate(snapshot.retrievedAt) ?? new Date(0).toISOString();
  const captureDay = dayInZone(capturedAt, COLLECTOR_TIMEZONE);
  const source = text(snapshot.source?.type) ?? 'Fuente sin identificar', sourceUrl = text(snapshot.source?.url) ?? '', pageUrl = text(snapshot.evidence?.url) ?? sourceUrl;
  const method = text(snapshot.method) ?? 'unknown', transport = text(snapshot.evidence?.transport);
  const payload = snapshot.evidence?.payload && typeof snapshot.evidence.payload === 'object' ? snapshot.evidence.payload : {};
  const records: ProviderRecord[] = Array.isArray(payload.records) ? (payload.records as unknown[]).filter((r): r is ProviderRecord => Boolean(r) && typeof r === 'object' && !Array.isArray(r)) : [];
  const copied = typeof payload.copiedText === 'string' ? payload.copiedText : '';
  const hasText = Boolean(copied.trim() || snapshot.evidence?.textPath);
  const base = { sha256, captureId, capturedAt, captureDay, source, sourceUrl, pageUrl, method, transport, origin };
  const validated: DayRecordRow[] = [], pending: DayPendingRow[] = [];
  records.forEach((row, index) => {
    const assessment = assessRecord(row, pageUrl);
    if (assessment.status === 'VALID' || assessment.status === 'PARTIAL') {
      validated.push({ ...base, bookmaker: text(row.bookmaker) ?? text(row.qualifiers?.displayedBook) ?? null,
        competitionCountry: text(row.sportsMetadata?.competitionTerritory?.displayName) ?? null, sport: text(row.sport) ?? null, league: text(row.competition) ?? text(row.sportsMetadata?.competition?.name) ?? null,
        event: String(row.eventName), participants: Array.isArray(row.participants) ? row.participants.map(String) : null, eventStart: validDate(row.eventStartTime),
        market: String(row.market), period: text(row.marketPeriod) ?? null, line: row.line == null ? null : String(row.line), selection: String(row.selection),
        rawOdds: text(row.rawOdds) ?? null, oddsFormat: text(row.rawOddsFormat) ?? (row.rawOdds ? null : row.decimalOdds ? 'decimal' : null),
        decimalOdds: typeof row.decimalOdds === 'number' && Number.isFinite(row.decimalOdds) ? row.decimalOdds : null, status: assessment.status, reason: assessment.reason, row: index, extraction: 'rules' });
    } else pending.push({ ...base, kind: 'record', row: index, status: assessment.status, reason: assessment.reason, textChars: 0 });
  });
  if (!records.length) {
    const reason = text(payload.pendingReason) ?? (hasText ? 'Texto guardado pendiente de interpretación: todavía no se demostró ninguna asociación evento-mercado-opción-cuota.'
      : Array.isArray(payload.pageRawPaths) && payload.pageRawPaths.length ? 'Resumen de recorrido sin registros propios; consulta las páginas originales.' : 'Captura sin registros clasificados.');
    pending.push({ ...base, kind: hasText ? 'text' : 'capture', row: null, status: 'UNPARSED', reason, textChars: copied.length });
  }
  return { capture: { ...base, validated: validated.length, pending: pending.length, hasText, textChars: copied.length }, validated, pending, fixture: isFixtureSnapshot(snapshot) };
}

async function rawHeader(path: string): Promise<string | null> {
  const file = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(16384); const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    const match = /"retrievedAt"\s*:\s*"([^"]+)"/.exec(buffer.subarray(0, bytesRead).toString('utf8'));
    return match ? validDate(match[1]) : null;
  } finally { await file.close(); }
}

/** Day-scoped captures from durable storage: RAW files on disk plus the PostgreSQL archive.
 * In-memory maps are only caches keyed by file fingerprint; reopening rebuilds from disk and DB. */
export class DailyRecords {
  private readonly local = new Map<string, LocalEntry>();
  private readonly evidenceCache = new Map<string, Promise<StoredAiEvidence>>();
  private archiveCache = new Map<string, { at: number; value: Promise<Map<string, { fileName: string; summary: Omit<DayCapture, 'origin'> | null }>> }>();
  constructor(private readonly dataDir: string, private readonly pool?: Pool, private readonly cacheMs = 5000) {}

  private async scanLocal(day: string): Promise<Map<string, Parsed>> {
    const dir = join(this.dataDir, 'raw');
    const names = await readdir(dir).catch(error => { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [] as string[]; throw error; });
    const alive = new Set<string>();
    const { from, to } = dayBounds(day);
    const windowFrom = Date.parse(from) - 86_400_000, windowTo = Date.parse(to) + 86_400_000;
    const result = new Map<string, Parsed>();
    const files = names.filter(name => RAW_NAME.test(name));
    for (let offset = 0; offset < files.length; offset += 24) await Promise.all(files.slice(offset, offset + 24).map(async name => {
      const path = join(dir, name); alive.add(path);
      let metadata; try { metadata = await stat(path); } catch { return; }
      const fingerprint = `${metadata.mtimeMs}:${metadata.size}`;
      let entry = this.local.get(path);
      if (!entry || entry.fingerprint !== fingerprint) { entry = { fingerprint, retrievedAt: await rawHeader(path).catch(() => null) }; this.local.set(path, entry); }
      // The header is enough to skip files far from the requested day; capturedAt and retrievedAt differ by milliseconds.
      if (entry.retrievedAt) { const at = Date.parse(entry.retrievedAt); if (at < windowFrom || at > windowTo) return; }
      if (entry.parsed === undefined) {
        try {
          const bytes = await readFile(path);
          const snapshot = JSON.parse(bytes.toString('utf8')) as RawSnapshot;
          entry.parsed = projectSnapshot(snapshot, createHash('sha256').update(bytes).digest('hex'), basename(name, '.json'), 'local');
        } catch { entry.parsed = null; }
      }
      const parsed = entry.parsed;
      if (!parsed || parsed.fixture || parsed.capture.captureDay !== day) return;
      result.set(parsed.capture.sha256, parsed);
    }));
    for (const path of this.local.keys()) if (!alive.has(path)) this.local.delete(path);
    return result;
  }

  private archiveDay(day: string) {
    const cached = this.archiveCache.get(day);
    if (cached && Date.now() - cached.at < this.cacheMs) return cached.value;
    const { from, to } = dayBounds(day);
    const value = (async () => {
      const map = new Map<string, { fileName: string; summary: Omit<DayCapture, 'origin'> | null }>();
      if (!this.pool) return map;
      const rows = (await this.pool.query<{ sha256: string; file_name: string; captured_at: Date | null; retrieved_at: string | null }>(
        `SELECT sha256,file_name,captured_at,snapshot->>'retrievedAt' AS retrieved_at FROM collector_captures
         WHERE coalesce(captured_at,(snapshot->>'retrievedAt')::timestamptz) >= $1::timestamptz AND coalesce(captured_at,(snapshot->>'retrievedAt')::timestamptz) < $2::timestamptz`, [from, to])).rows;
      for (const row of rows) map.set(row.sha256, { fileName: row.file_name, summary: null });
      return map;
    })();
    this.archiveCache.set(day, { at: Date.now(), value });
    value.catch(() => this.archiveCache.delete(day));
    return value;
  }

  private async archiveSnapshots(shas: string[]): Promise<Map<string, Parsed>> {
    const result = new Map<string, Parsed>();
    if (!this.pool || !shas.length) return result;
    for (let offset = 0; offset < shas.length; offset += 50) {
      const rows = (await this.pool.query<{ sha256: string; file_name: string; snapshot: RawSnapshot }>('SELECT sha256,file_name,snapshot FROM collector_captures WHERE sha256 = ANY($1::text[])', [shas.slice(offset, offset + 50)])).rows;
      for (const row of rows) {
        const parsed = projectSnapshot(row.snapshot, row.sha256, basename(row.file_name, '.json'), 'archive');
        if (!parsed.fixture) result.set(row.sha256, parsed);
      }
    }
    return result;
  }

  async forDay(day: string, options: { rows?: boolean } = {}): Promise<DayRecords> {
    const { rows = true } = options;
    const local = await this.scanLocal(day);
    let archiveError: string | null = null, archive = new Map<string, { fileName: string; summary: Omit<DayCapture, 'origin'> | null }>();
    try { archive = await this.archiveDay(day); } catch (error) { archiveError = error instanceof Error ? error.message : String(error); }
    const archiveOnly = [...archive.keys()].filter(sha => !local.has(sha));
    let fromArchive = new Map<string, Parsed>();
    if (archiveOnly.length) { try { fromArchive = await this.archiveSnapshots(archiveOnly); } catch (error) { archiveError ??= error instanceof Error ? error.message : String(error); } }
    const all: Parsed[] = [];
    for (const [sha, parsed] of local) all.push(archive.has(sha) ? { ...parsed, capture: { ...parsed.capture, origin: 'both' }, validated: parsed.validated.map(r => ({ ...r, origin: 'both' as const })), pending: parsed.pending.map(r => ({ ...r, origin: 'both' as const })) } : parsed);
    for (const parsed of fromArchive.values()) if (parsed.capture.captureDay === day) all.push(parsed);
    all.sort((a, b) => a.capture.capturedAt.localeCompare(b.capture.capturedAt) || a.capture.sha256.localeCompare(b.capture.sha256));
    const withAi = await this.mergeAi(all);
    all.splice(0, all.length, ...withAi.parsed);
    const summary: DaySummary = { day, timezone: COLLECTOR_TIMEZONE, captures: all.length, validated: 0, pending: 0, pendingCaptures: 0, ai: 0, sources: {}, origins: { local: 0, archive: 0, both: 0 }, archiveAvailable: Boolean(this.pool) && !archiveError, archiveError, scope: SCOPE_DESCRIPTION };
    for (const { capture } of all) {
      summary.validated += capture.validated; summary.pending += capture.pending; if (capture.pending) summary.pendingCaptures++;
      summary.origins[capture.origin]++;
      const entry = summary.sources[capture.source] ??= { captures: 0, validated: 0, pending: 0 };
      entry.captures++; entry.validated += capture.validated; entry.pending += capture.pending;
    }
    summary.ai = withAi.ai;
    return { summary, captures: all.map(p => p.capture), validated: rows ? all.flatMap(p => p.validated) : [], pending: rows ? all.flatMap(p => p.pending) : [] };
  }

  /** AI-structured rows live in ai_text_extractions; they are merged on read into copies, never into the cached RAW projection. */
  private async mergeAi(all: Parsed[]): Promise<{ parsed: Parsed[]; ai: number }> {
    if (!this.pool || !all.length) return { parsed: all, ai: 0 };
    let rows: Array<{ capture_sha256: string; model: string; accepted: number; quotes: AiQuoteRow[] }> = [];
    try { rows = (await this.pool.query<{ capture_sha256: string; model: string; accepted: number; quotes: AiQuoteRow[] }>('SELECT capture_sha256,model,accepted,quotes FROM ai_text_extractions WHERE capture_sha256 = ANY($1::text[])', [all.map(p => p.capture.sha256)])).rows; }
    catch { return { parsed: all, ai: 0 }; }
    const bySha = new Map(rows.map(row => [row.capture_sha256, row]));
    let ai = 0;
    const parsed = all.map(item => {
      const found = bySha.get(item.capture.sha256);
      if (!found) return item;
      const base = { sha256: item.capture.sha256, captureId: item.capture.captureId, capturedAt: item.capture.capturedAt, captureDay: item.capture.captureDay, source: item.capture.source, sourceUrl: item.capture.sourceUrl, pageUrl: item.capture.pageUrl, method: item.capture.method, transport: item.capture.transport, origin: item.capture.origin };
      const known = new Set(item.validated.map(r => recordIdentity({ eventName: r.event, participants: r.participants, market: r.market,
        selection: r.selection, marketPeriod: r.period, line: r.line, rawOdds: r.rawOdds, bookmaker: r.bookmaker ?? item.capture.source })).filter((key): key is string => key !== null));
      const quotes = (Array.isArray(found.quotes) ? found.quotes : []).filter(q => {
        const key = quoteIdentity({ ...q, bookmaker: q.bookmaker ?? item.capture.source, eventStart: null });
        if (known.has(key)) return false;
        known.add(key); return true;
      });
      const added: DayRecordRow[] = quotes.map((q, index) => ({ ...base, bookmaker: q.bookmaker ?? null, competitionCountry: null, sport: q.sport ?? null, league: q.competition ?? null, event: `${q.home} vs ${q.away}`, participants: [q.home, q.away], eventStart: q.eventStart ?? null,
        market: q.market, period: q.period ?? null, line: q.line ?? null, selection: q.selection, rawOdds: q.price, oddsFormat: q.format, decimalOdds: q.decimal, status: 'IA' as const,
        reason: q.provenance ? `IA (${found.model}) · ${q.provenance.type} · ${q.provenance.evidence} · contenedor ${q.provenance.blockId} · confianza ${q.provenance.confidence}. Precio exacto verificado contra la evidencia guardada.`
          : `IA (${found.model}) estructuró el texto guardado; equipos, opción y cuota se comprobaron literalmente en las líneas ${q.eventLine}, ${q.selectionLine} y ${q.priceLine}.`,
        provenance: q.provenance, row: index, extraction: 'ai' as const }));
      ai += added.length;
      const pending = added.length ? item.pending.filter(p => p.kind !== 'text') : item.pending.map(p => p.kind === 'text' ? { ...p, reason: 'La IA revisó el texto guardado y no encontró cuotas demostrables.' } : p);
      const validated = [...item.validated, ...added];
      return { ...item, capture: { ...item.capture, validated: validated.length, pending: pending.length }, validated, pending };
    });
    return { parsed, ai };
  }

  captureEvidence(sha256: string, captureId: string): Promise<StoredAiEvidence> {
    if (!/^[\w.-]+$/.test(captureId)) throw new Error('Identificador de captura inválido.');
    const cached = this.evidenceCache.get(sha256);
    if (cached) return cached;
    const task = this.readEvidence(sha256, captureId);
    this.evidenceCache.set(sha256, task);
    task.catch(() => this.evidenceCache.delete(sha256));
    return task;
  }

  private async readEvidence(sha256: string, captureId: string): Promise<StoredAiEvidence> {
    const missing = (error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    };
    const raw = await readFile(join(this.dataDir, 'raw', `${captureId}.json`), 'utf8').catch(missing);
    let snapshot: RawSnapshot | undefined;
    if (raw) snapshot = JSON.parse(raw) as RawSnapshot;
    else if (this.pool) snapshot = (await this.pool.query<{ snapshot: RawSnapshot }>('SELECT snapshot FROM collector_captures WHERE sha256=$1', [sha256])).rows[0]?.snapshot;
    if (!snapshot) throw new Error(`No se encontró la captura ${captureId}.`);
    const payload = snapshot.evidence?.payload ?? {};
    const fileText = await readFile(join(this.dataDir, 'raw', `${captureId}.txt`), 'utf8').catch(missing);
    const copied = typeof payload.copiedText === 'string' ? payload.copiedText : null;
    const refs = [...new Set([snapshot.evidence?.screenshotPath, ...(snapshot.evidence?.screenshotPaths ?? []), `${captureId}.png`].filter((p): p is string => typeof p === 'string').map(p => basename(p)))];
    const images: StoredAiEvidence['images'] = [], warnings: string[] = [];
    for (const ref of refs) {
      const bytes = await readFile(join(this.dataDir, 'raw', ref)).catch(missing);
      if (bytes) images.push({ ref, bytes });
      else if (ref !== `${captureId}.png` || snapshot.evidence?.screenshotPath) warnings.push(`Imagen referenciada no disponible: ${ref}`);
    }
    return { text: fileText?.trim() ? fileText : copied, dom: payload.dom ?? payload.tree ?? payload.root ?? null,
      records: Array.isArray(payload.records) ? payload.records as ProviderRecord[] : [], images, warnings };
  }

  /** Saved text of a capture: the .txt next to the RAW file, then the RAW payload, then the PostgreSQL archive. */
  async captureText(sha256: string, captureId: string): Promise<string | null> {
    if (!/^[\w.-]+$/.test(captureId)) return null;
    const fromFile = await readFile(join(this.dataDir, 'raw', `${captureId}.txt`), 'utf8').catch(() => null);
    if (fromFile?.trim()) return fromFile;
    const fromRaw = await readFile(join(this.dataDir, 'raw', `${captureId}.json`), 'utf8').then(value => (JSON.parse(value) as RawSnapshot).evidence?.payload?.copiedText).catch(() => null);
    if (typeof fromRaw === 'string' && fromRaw.trim()) return fromRaw;
    if (!this.pool) return null;
    const row = (await this.pool.query<{ text: string | null }>("SELECT snapshot->'evidence'->'payload'->>'copiedText' AS text FROM collector_captures WHERE sha256=$1", [sha256]).catch(() => ({ rows: [] as Array<{ text: string | null }> }))).rows[0];
    return row?.text?.trim() ? row.text : null;
  }

  async summary(day: string): Promise<DaySummary> { return (await this.forDay(day, { rows: false })).summary; }

  /** Write CSV + JSON files under dataDir/exports; never overwrites an earlier export. */
  async exportDay(day: string, now = new Date()): Promise<{ folder: string; files: { validatedCsv: string; pendingCsv: string; json: string }; summary: DaySummary }> {
    const data = await this.forDay(day);
    const folder = join(this.dataDir, 'exports', day); await mkdir(folder, { recursive: true });
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const files = { validatedCsv: join(folder, `registros-${day}-${stamp}.csv`), pendingCsv: join(folder, `pendientes-${day}-${stamp}.csv`), json: join(folder, `registros-${day}-${stamp}.json`) };
    const write = async (path: string, content: string) => { const temporary = `${path}.tmp`; await writeFile(temporary, content, { mode: 0o600 }); await rename(temporary, path); };
    await write(files.validatedCsv, validatedCsv(data.validated));
    await write(files.pendingCsv, pendingCsv(data.pending));
    await write(files.json, JSON.stringify({ exportedAt: now.toISOString(), ...data }, null, 2));
    return { folder, files, summary: data.summary };
  }
}

const csvCell = (value: unknown): string => { const s = value == null ? '' : Array.isArray(value) ? value.join(' | ') : String(value); return /[",\n\r;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
const csv = (header: string[], rows: unknown[][]): string => [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
export const VALIDATED_COLUMNS = ['fuente', 'casa', 'url_fuente', 'url_pagina', 'pais_competicion', 'deporte', 'liga', 'evento', 'participantes', 'inicio_evento', 'mercado', 'periodo', 'linea', 'opcion', 'cuota_original', 'formato_original', 'cuota_decimal', 'estado', 'motivo', 'fecha_captura', 'dia_captura', 'metodo', 'transporte', 'evidencia_id', 'fila', 'sha256', 'origen', 'extraccion', 'ia_provenance', 'ia_evidencia', 'ia_confianza', 'ia_modelo', 'ia_citas'];
export function validatedCsv(rows: DayRecordRow[]): string {
  return csv(VALIDATED_COLUMNS, rows.map(r => [r.source, r.bookmaker, r.sourceUrl, r.pageUrl, r.competitionCountry, r.sport, r.league, r.event, r.participants, r.eventStart, r.market, r.period, r.line, r.selection, r.rawOdds, r.oddsFormat, r.decimalOdds, r.status, r.reason, r.capturedAt, r.captureDay, r.method, r.transport, r.captureId, r.row, r.sha256, r.origin, r.extraction === 'ai' ? 'ia' : 'reglas',
    r.provenance?.type, r.provenance?.evidence, r.provenance?.confidence, r.provenance?.model, r.provenance ? JSON.stringify(r.provenance.citations) : null]));
}
export const PENDING_COLUMNS = ['fuente', 'url_fuente', 'url_pagina', 'tipo', 'estado', 'motivo', 'caracteres_texto', 'fecha_captura', 'dia_captura', 'metodo', 'transporte', 'evidencia_id', 'fila', 'sha256', 'origen'];
export function pendingCsv(rows: DayPendingRow[]): string {
  return csv(PENDING_COLUMNS, rows.map(r => [r.source, r.sourceUrl, r.pageUrl, r.kind, r.status, r.reason, r.textChars, r.capturedAt, r.captureDay, r.method, r.transport, r.captureId, r.row, r.sha256, r.origin]));
}

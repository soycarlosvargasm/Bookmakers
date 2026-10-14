import { validateSource } from './collection-routes.js';
import { savedEvidence } from './saved-evidence.js';
import { catalogDimensions } from './sports-organizer.js';
import { SportsLogoCatalog } from './sports-catalog.js';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { stableName } from '../matching/service.js';
import { dayInZone, marketFamily, validateCollection } from '../engine/collection.js';
import { loadBrands } from './brands.js';
import type { UiActions, UiSettings } from './actions.js';
import { readManualNotes } from './manual-notes.js';

export type Filters = Partial<Record<import('./sports-organizer.js').CatalogDimension, string[]>> & { sport?: string; league?: string; search?: string; source?: string; bookmaker?: string; marketName?: string; market?: string; from?: string; to?: string; captureFrom?: string; captureTo?: string; includePast?: boolean; freshOnly?: boolean };
export type QuoteRow = { event_id: string; market_id: string; selection_id: string; sport: string | null; competition: string | null; event_name: string | null; home_participant: string | null; away_participant: string | null; participants: string[] | null; event_start_time: string | Date | null; event_status: string | null; source: string; bookmaker: string | null; market_type: string | null; market_period: string | null; selection_name: string; line: string | null; decimal_odds: string | number | null; raw_odds: string | null; raw_odds_format: string | null; captured_at: string | Date; observation_id: string; source_url: string | null; cross_validation: string | null };
export type MatchCard = { id: string; eventId: string; sport: string; league: string; event: string; start: string | null; source: string; bookmaker: string; market: string; period: string | null; options: Array<{ label: string; price: string; decimal: number | null; format: string | null; selectionId: string; observationId: string; capturedAt: string; sourceUrl: string | null }>; updatedAt: string; complete: boolean; fresh: boolean; needs: string[] };
const iso = (value: string | Date | null) => value ? new Date(value).toISOString() : null;
const closed = /^(closed|finished|ended|final|cancelled|canceled|settled)$/i;
const live = /^(live|inplay|inprogress|in-play|in_play)$/i;

export function validateFilters(value: unknown): Filters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('Selecciona filtros válidos.'), { statusCode: 400 });
  const input = value as Record<string, unknown>, result: Filters = {};
  for (const key of ['sport', 'league', 'search', 'source', 'bookmaker', 'marketName', 'market', 'from', 'to', 'captureFrom', 'captureTo'] as const) {
    if (input[key] === undefined || input[key] === '') continue;
    if (typeof input[key] !== 'string' || input[key].length > 300) throw Object.assign(new Error('Filtro inválido.'), { statusCode: 400 });
    result[key] = input[key].trim();
  }
  for (const key of catalogDimensions) {
    if (input[key] === undefined) continue;
    if (!Array.isArray(input[key]) || input[key].length > 100 || input[key].some((id:unknown) => typeof id !== 'string' || !id || id.length > 500)) throw Object.assign(new Error('Selecciona identidades válidas del catálogo.'), { statusCode:400 });
    result[key] = [...new Set(input[key] as string[])];
  }
  for (const key of ['includePast', 'freshOnly'] as const) if (input[key] !== undefined) {
    if (typeof input[key] !== 'boolean') throw Object.assign(new Error('Filtro inválido.'), { statusCode: 400 });
    result[key] = input[key];
  }
  try { validateCollection({ from: result.from || '', to: result.to || '' }); validateCollection({ from: result.captureFrom || '', to: result.captureTo || '' }); } catch (error) { throw Object.assign(error as Error, { statusCode: 400 }); }
  if (result.market && !['all', 'winner', 'totals', 'handicap', 'both'].includes(result.market)) throw Object.assign(new Error('Selecciona un mercado válido.'), { statusCode: 400 });
  return result;
}

/** Keep bookmakers, periods and market identities separate. A card never borrows
 * its missing opponent or draw price from another source or another market. */
export function organizeQuotes(rows: QuoteRow[], filters: Filters, now = Date.now()): MatchCard[] {
  const cards = new Map<string, MatchCard>(), latest = new Map<string, QuoteRow>();
  for (const row of rows) {
    const key = row.selection_id;
    if (!latest.has(key) || Date.parse(iso(row.captured_at)!) > Date.parse(iso(latest.get(key)!.captured_at)!)) latest.set(key, row);
  }
  for (const row of latest.values()) {
    const start = iso(row.event_start_time), family = marketFamily(row.market_type || '');
    if (!filters.includePast && (closed.test(row.event_status || '') || (start && Date.parse(start) < now && !live.test(row.event_status || '')))) continue;
    if (filters.from || filters.to) { const day = start && dayInZone(start, 'Asia/Bangkok'); if (!day || (filters.from && day < filters.from) || (filters.to && day > filters.to)) continue; }
    if (filters.market && filters.market !== 'all' && family !== filters.market) continue;
    const capturedAt = iso(row.captured_at)!;
    if (filters.freshOnly && now - Date.parse(capturedAt) > 900_000) continue;
    if (/^(CONFLICT|REJECTED)$/i.test(row.cross_validation || '')) continue;
    const id = JSON.stringify([row.event_id, row.market_id, row.bookmaker || row.source]);
    let card = cards.get(id);
    if (!card) {
      card = { id, eventId: row.event_id, sport: row.sport || 'Deporte sin identificar', league: row.competition || 'Liga por confirmar', event: row.event_name || [row.home_participant, row.away_participant].filter(Boolean).join(' vs. ') || 'Partido por confirmar', start, source: row.source, bookmaker: row.bookmaker || row.source, market: row.market_type || 'Mercado por confirmar', period: row.market_period, options: [], updatedAt: capturedAt, complete: false, fresh: true, needs: [] };
      cards.set(id, card);
    }
    let label = row.selection_name;
    if (/^(1|home|local)$/i.test(label) && row.home_participant) label = row.home_participant;
    else if (/^(2|away|visitante)$/i.test(label) && row.away_participant) label = row.away_participant;
    else if (/^(x|draw|tie|empate)$/i.test(label)) label = 'Empate';
    if (row.line && !label.includes(row.line)) label += ` ${row.line}`;
    const decimal = row.decimal_odds === null ? null : Number(row.decimal_odds);
    const price = row.raw_odds?.trim() || (decimal && decimal > 1 ? String(decimal) : '');
    if (!price || (decimal !== null && (!Number.isFinite(decimal) || decimal <= 1))) continue;
    card.options.push({ label, price, decimal, format: row.raw_odds_format, selectionId: row.selection_id, observationId: row.observation_id, capturedAt, sourceUrl: row.source_url });
    if (row.cross_validation === 'UNCONFIRMED' && !card.needs.includes('Confirmar cuotas de la fuente')) card.needs.push('Confirmar cuotas de la fuente');
    if (capturedAt > card.updatedAt) card.updatedAt = capturedAt;
    card.fresh &&= now - Date.parse(capturedAt) <= 900_000;
  }
  for (const card of cards.values()) {
    const outcomes = new Set(card.options.filter(o => o.label !== 'Empate').map(o => stableName(o.label)));
    if (outcomes.size < 2) card.needs.push('Falta la cuota del rival');
    if (!card.start) card.needs.push('Confirmar fecha del partido');
    if (card.league === 'Liga por confirmar') card.needs.push('Confirmar liga');
    if (card.event === 'Partido por confirmar') card.needs.push('Confirmar partido');
    const football = /^(football|soccer|futbol|fútbol)$/i.test(card.sport);
    const threeWay = /1x2|match odds|resultado final|resultado del partido|full time result/i.test(card.market) || (football && /^(winner|match winner|ganador)$/i.test(card.market));
    if (threeWay && !card.options.some(o => o.label === 'Empate')) card.needs.push('Falta la cuota del empate');
    card.complete = card.needs.length === 0;
    card.options.sort((a, b) => a.label === 'Empate' ? 1 : b.label === 'Empate' ? -1 : a.label.localeCompare(b.label, 'es'));
  }
  return [...cards.values()].sort((a, b) => a.sport.localeCompare(b.sport, 'es') || a.league.localeCompare(b.league, 'es') || (a.start || '9999').localeCompare(b.start || '9999') || a.event.localeCompare(b.event, 'es') || a.bookmaker.localeCompare(b.bookmaker));
}

async function readQuotes(pool: Pool, filters: Filters): Promise<QuoteRow[]> {
  const values: unknown[] = [], clauses: string[] = [];
  for (const [key, column] of [['sport', 'e.sport'], ['league', 'e.competition'], ['search', 'e.event_name'], ['source', 'b.key']] as const) if (filters[key]) {
    values.push(`%${filters[key]!.replace(/[\\%_]/g, '\\$&')}%`); clauses.push(`${column} ILIKE $${values.length}`);
  }
  if (!filters.includePast) clauses.push("lower(coalesce(e.event_status,'')) NOT IN ('closed','finished','ended','final','cancelled','canceled','settled') AND (e.event_start_time IS NULL OR e.event_start_time >= now() OR lower(e.event_status) IN ('live','inplay','inprogress','in-play','in_play'))");
  if (filters.from) { values.push(`${filters.from}T00:00:00+07:00`); clauses.push(`e.event_start_time >= $${values.length}::timestamptz`); }
  if (filters.to) { values.push(`${filters.to}T00:00:00+07:00`); clauses.push(`e.event_start_time < $${values.length}::timestamptz + interval '1 day'`); }
  if (filters.freshOnly) clauses.push("s.last_seen_at >= now() - interval '15 minutes'");
  return (await pool.query<QuoteRow>(`SELECT e.id::text AS event_id,m.id::text AS market_id,s.id::text AS selection_id,e.sport,e.competition,e.event_name,e.home_participant,e.away_participant,e.participants,e.event_start_time,e.event_status,b.key AS source,coalesce(s.latest_qualifiers->>'displayedBook',m.qualifiers->>'displayedBook') AS bookmaker,m.market_type,m.market_period,s.selection_name,s.line,o.decimal_odds,o.raw_odds,o.raw_odds_format,coalesce(s.last_seen_at,o.collected_at) AS captured_at,o.id::text AS observation_id,o.source_url,s.latest_qualifiers->>'crossValidation' AS cross_validation
    FROM events e JOIN sportsbooks b ON b.id=e.sportsbook_id JOIN markets m ON m.event_id=e.id JOIN selections s ON s.market_id=m.id JOIN LATERAL (SELECT * FROM odds_observations WHERE selection_id=s.id ORDER BY observed_at DESC,id DESC LIMIT 1) o ON true
    LEFT JOIN odds_observation_flags flagged ON flagged.observation_id=o.id
    WHERE (s.canonical_selection_id IS NULL OR s.canonical_selection_id=s.id) AND flagged.observation_id IS NULL AND lower(coalesce(s.selection_status,'')) NOT IN ('closed','suspended','settled','unavailable')${clauses.length ? ` AND ${clauses.join(' AND ')}` : ''}`, values)).rows;
}

export function registerWorkbenchRoutes(app: FastifyInstance, pool: Pool, actions: UiActions, root: string, settings: () => UiSettings) {
  app.get<{Querystring:{date?:string}}>('/api/workbench/manual/notes',async(request,reply)=>{
    if(request.query.date!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(request.query.date)||!Number.isFinite(Date.parse(request.query.date+'T00:00:00Z'))||new Date(request.query.date+'T00:00:00Z').toISOString().slice(0,10)!==request.query.date))return reply.code(400).send({error:'Fecha de textos guardados inválida.'});
    return readManualNotes(root,request.query.date);
  });
  const logos = new SportsLogoCatalog(undefined, pool);
  app.get<{Params:{hash:string}}>('/api/workbench/logos/:hash', async (request,reply) => {
    const asset = /^[a-f0-9]{64}$/.test(request.params.hash) && logos.resource(request.params.hash);
    if (!asset) return reply.code(404).send({error:'Logotipo no disponible.'});
    return reply.header('Cache-Control','private, max-age=31536000, immutable').header('X-Content-Type-Options','nosniff').type(asset.type).send(asset.buffer);
  });
  app.post<{ Body: { textOnly?: boolean; scrollMode?: 'auto'|'manual'; url?: string } }>('/api/workbench/extract', async (request, reply) => {
    const textOnly = request.body?.textOnly ?? true, scrollMode=request.body?.scrollMode??'auto', revision=actions.stopVersion;
    if (typeof textOnly !== 'boolean' || !['auto','manual'].includes(scrollMode)) return reply.code(400).send({ error: 'Selecciona un modo de lectura válido.' });
    if(scrollMode==='manual') {
      if(!textOnly)return reply.code(400).send({error:'El scroll manual usa lectura de texto, sin screenshots ni IA.'});
      try {
        const input=validateSource({type:'manual',url:request.body?.url});
        const brands=await loadBrands();
        if(revision!==actions.stopVersion)return reply.code(409).send({error:'La apertura fue cancelada al detener.'});
        const hostOf=(value:string)=>new URL(value).hostname.toLowerCase().replace(/^www\./,'');
        const brand=brands.find(b=>b.regions.some(r=>hostOf(r.url)===hostOf(input.url)));
        // Admitted destinations are explicit: the chosen page's host plus the other regions of the same catalog brand.
        const allowedHosts=[hostOf(input.url),...(brand?.regions.map(r=>hostOf(r.url))??[])];
        return reply.code(202).send(actions.startManualReading({...input,type:brand?.id??`manual-${hostOf(input.url)}`},allowedHosts));
      }catch(error){return reply.code(400).send({error:(error as Error).message});}
    }
    const brands = await loadBrands();
    if(revision!==actions.stopVersion)return reply.code(409).send({error:'La extracción fue cancelada al detener.'});
    const sources = [...new Map(brands.flatMap(b => b.regions.map(r => ({ type: b.id, url: r.url }))).map(s => [JSON.stringify(s), s])).values()];
    try { return reply.code(202).send(actions.runCountry(sources, false, settings(), true, validateCollection({ scope: 'site', budgetMinutes: 120, maxPages: 10000, textOnly, ...(textOnly ? {maxVisionCalls:0} : {}) }))); }
    catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
  });
  app.post<{Body:{runId?:string}}>('/api/workbench/manual/finish',async(request,reply)=>{
    if(typeof request.body?.runId!=='string')return reply.code(400).send({error:'Selecciona una sesión manual activa.'});
    try{return await actions.finishManualReading(request.body.runId);}catch(error){return reply.code(409).send({error:(error as Error).message});}
  });
  app.post<{Body:{runId?:string}}>('/api/workbench/manual/read',async(request,reply)=>{
    if(typeof request.body?.runId!=='string')return reply.code(400).send({error:'Selecciona una lectura manual activa.'});
    try{return await actions.readManualText(request.body.runId);}catch(error){return reply.code(409).send({error:(error as Error).message});}
  });
  app.post<{ Body: { filters?: unknown; offset?: number; pendingOffset?: number; source?: { type: string; url: string }; captureIds?: string[]; reconcileFrom?: import('./sports-organizer.js').CatalogDimension } }>('/api/workbench/organize', async (request, reply) => {
    const filters = validateFilters(request.body?.filters ?? {}), source = request.body?.source, ids = request.body?.captureIds;
    if (source && (typeof source.type !== 'string' || typeof source.url !== 'string' || source.type.length > 200 || source.url.length > 4096) || ids !== undefined && (!Array.isArray(ids) || ids.length > 10000 || ids.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)))) return reply.code(400).send({ error: 'Selección de capturas inválida.' });
    if (request.body?.reconcileFrom && !catalogDimensions.includes(request.body.reconcileFrom)) return reply.code(400).send({error:'Jerarquía inválida.'});
    const result = await savedEvidence(root).organize(filters, { source, ids, reconcileFrom:request.body?.reconcileFrom });
    const offset = Math.max(0, Math.floor(Number(request.body?.offset) || 0)), pendingOffset = Math.max(0, Math.floor(Number(request.body?.pendingOffset) || 0));
    const logoStates = await logos.attach(result.events.slice(offset,offset+50).flatMap(e => [...e.participants.map(p => p.entity), ...[e.competition,e.card,e.organization].filter((x):x is NonNullable<typeof x> => Boolean(x))]),result.catalog);
    return { facets:result.facets, entityFacets:result.entityFacets, counts:result.counts, warnings:result.warnings, versions:result.versions, removedFilters:result.removedFilters, appliedFilters:result.appliedFilters, overlapTotal:result.overlapTotal, pendingFileTotal:result.pendingFileTotal, events:result.events.slice(offset,offset+50), eventTotal:result.events.length, logos:logoStates, cards:result.cards.slice(offset,offset+50), total:result.cards.length, pending:result.pending.slice(pendingOffset,pendingOffset+30), pendingTotal:result.pending.length, pendingOffset, captureTotal:result.captures.length, offset, filters };
  });
  app.post<{ Body: { filters?: unknown; ids?: string[] } }>('/api/workbench/final', async (request, reply) => {
    const filters = validateFilters(request.body?.filters ?? {}), ids = request.body?.ids;
    if (ids !== undefined && (!Array.isArray(ids) || ids.length > 10000 || ids.some(id => typeof id !== 'string' || id.length > 1000))) return reply.code(400).send({ error: 'Selección de partidos inválida.' });
    if (ids?.length === 0) return reply.code(400).send({ error: 'Selecciona al menos un partido.' });
    const selected = ids ? new Set(ids) : null;
    const cards = organizeQuotes(await readQuotes(pool, filters), filters).filter(card => !selected || selected.has(card.id));
    // The output is an explicit draft of matches and observed prices. No invented
    // selections, stakes, probability ranking or bookmaker submission occurs.
    const ready = cards.filter(card => card.complete), pending = cards.filter(card => !card.complete);
    if (!ready.length) return reply.code(422).send({ error: pending.length ? 'Los partidos seleccionados todavía necesitan datos. Revisa qué falta en Ordenar y filtrar.' : 'No hay partidos para esta selección. Extrae datos o cambia los filtros.', pending });
    const draft = { id: randomUUID(), createdAt: new Date().toISOString(), filters, cards: ready, pending };
    const folder = join(root, 'bets'); await mkdir(folder, { recursive: true });
    const path = join(folder, `${draft.id}.json`); await writeFile(`${path}.tmp`, JSON.stringify(draft, null, 2)); await rename(`${path}.tmp`, path);
    const latest = join(folder, 'latest.json'), temp = `${latest}.${draft.id}.tmp`; await writeFile(temp, JSON.stringify({ id: draft.id })); await rename(temp, latest);
    return draft;
  });
  app.get('/api/workbench/final', async () => {
    try { const latest = JSON.parse(await readFile(join(root, 'bets', 'latest.json'), 'utf8')); if (!/^[a-f0-9-]{36}$/.test(latest.id)) throw new Error('Invalid draft'); return JSON.parse(await readFile(join(root, 'bets', `${latest.id}.json`), 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  });
}

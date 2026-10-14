import type { Pool } from 'pg';
import { aiAvailable, aiEntry, defaultAiConfig, matchingAiUsage, resolveWithAi, type AiConfig, type AiOutcome, type AiPair } from './ai.js';
import { WINDOW_MINUTES, compareEvents, pairKey, unify, type AliasIndex, type Cluster, type Decision, type Member, type PendingPair, type ReviewedPair, type UEvent, type UnifyStats } from './unify.js';

export type NoteType = 'info' | 'ok' | 'warn' | 'error';
export type Placement = { cluster: Cluster; member: Member };
export type LayerSnapshot = { clusters: Cluster[]; byEvent: Map<string, Placement>; stats: UnifyStats; pending: PendingPair[]; reviewed: ReviewedPair[]; builtAt: number };
export type LayerStatus = { events: number; matches: number; merged: number; byRules: number; byAi: number; byManual: number; byCanonical: number; pendingForAi: number; decidedByAi: number; autoAi: boolean; aiRunning: boolean; ai: { available: boolean; reason: string; model: string; requests: number; same: number; different: number; unsure: number; lastError: string }; persistent: boolean; lastRunAt: string | null; running: boolean };
export type LayerOptions = {
  note?: (type: NoteType, parts: string[]) => void; autoAi?: boolean; onAutoAi?: (value: boolean) => void | Promise<void>; intervalMs?: number; batchSize?: number; maxPairsPerRun?: number; unsureRetryMs?: number; minConfidence?: number;
  resolve?: (pairs: AiPair[]) => Promise<AiOutcome>; config?: () => Promise<AiConfig>; houses?: () => Promise<Map<string, string>>; aliases?: () => Promise<AliasIndex | undefined>;
};
const HOUR = 3_600_000;
export type RunMode = 'rules' | 'ai';
export type AiRunSummary = { available: boolean; reason: string; queued: number; sent: number; same: number; different: number; unsure: number; error: string | null; cancelled: boolean };
export type RunSummary = { stats: UnifyStats; ai: AiRunSummary | null };
export type GroupedRow = { eventId: string; house: string; listing: string; start: string | null; clusterId: string; match: string; league: string | null; method: Member['method']; confidence: number; reason: string | null; viaKey: string | null };
export type PairView = { key: string; state: 'pending' | 'ai-different' | 'ai-unsure'; a: { eventId: string; house: string; listing: string }; b: { eventId: string; house: string; listing: string }; league: string | null; start: string | null; reasons: string[]; aiReason: string | null; aiConfidence: number | null };
export type GroupsView = { grouped: GroupedRow[]; pairs: PairView[] };

/** Post-extraction matching layer: normalised source events -> one match. Rules decide the clear cases; the AI only
 * settles pairs the rules flagged as ambiguous, and its verdict is stored so it is never requested twice. */
export class MatchingLayer {
  private decisions = new Map<string, Decision>();
  private loadedDecisions?: Promise<void>;
  private persistent = true;
  private snap?: LayerSnapshot;
  private building?: Promise<LayerSnapshot>;
  private running?: Promise<void>;
  private timer?: ReturnType<typeof setInterval>;
  private closed = false;
  private lastRunAt: string | null = null;
  private blockedUntil = 0;
  private failures = 0;
  private lastSummary = '';
  private readonly abort = new AbortController();
  private aiAbort?: AbortController;
  private aiRunning = false;
  private autoAi: boolean;
  constructor(private readonly pool: Pool, private readonly loadEvents: (pool: Pool) => Promise<UEvent[]>, private readonly options: LayerOptions = {}) { this.autoAi = options.autoAi ?? true; }

  private note(type: NoteType, ...parts: string[]) { this.options.note?.(type, parts); }
  private loadDecisions(): Promise<void> {
    return this.loadedDecisions ??= (async () => {
      try {
        const rows = (await this.pool.query<{ pair_key: string; verdict: Decision['verdict']; swapped: boolean; confidence: string; method: Decision['method']; reason: string | null; decided_at: Date }>('SELECT pair_key, verdict, swapped, confidence, method, reason, decided_at FROM match_resolutions')).rows;
        for (const row of rows) this.decisions.set(row.pair_key, { verdict: row.verdict, swapped: row.swapped, confidence: Number(row.confidence), method: row.method, reason: row.reason ?? undefined, decidedAt: row.decided_at.toISOString() });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === '42P01') { this.persistent = false; this.note('warn', 'Matching', 'falta la tabla match_resolutions (migración 022)', 'las decisiones de IA solo viven en memoria'); }
        else this.loadedDecisions = undefined;
        if (code !== '42P01') throw error;
      }
    })();
  }
  private async save(pair: { key: string; a: UEvent; b: UEvent; comparison?: PendingPair['comparison'] }, decision: Decision, model: string | null): Promise<void> {
    this.decisions.set(pair.key, decision);
    if (!this.persistent) return;
    try {
      const signature = (event: UEvent) => `${event.sport}|${event.home}|${event.away}|${event.start}|${event.league}`;
      await this.pool.query(`INSERT INTO match_resolutions(pair_key,left_signature,right_signature,verdict,swapped,confidence,method,model,reason,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
        ON CONFLICT(pair_key) DO UPDATE SET verdict=EXCLUDED.verdict,swapped=EXCLUDED.swapped,confidence=EXCLUDED.confidence,method=EXCLUDED.method,model=EXCLUDED.model,reason=EXCLUDED.reason,evidence=EXCLUDED.evidence,decided_at=now()`,
        [pair.key, signature(pair.a), signature(pair.b), decision.verdict, decision.swapped, decision.confidence.toFixed(3), decision.method, model, decision.reason ?? null, JSON.stringify({ rules: pair.comparison?.reasons ?? [], teams: pair.comparison?.teams ?? null, minutes: pair.comparison?.minutes ?? null })]);
    } catch (error) { this.note('error', 'Matching', 'no se pudo guardar la decisión', error instanceof Error ? error.message : String(error)); }
  }
  private async remove(key: string): Promise<void> {
    this.decisions.delete(key);
    if (!this.persistent) return;
    await this.pool.query('DELETE FROM match_resolutions WHERE pair_key = $1', [key]).catch(error => this.note('error', 'Matching', 'no se pudo borrar la decisión', error instanceof Error ? error.message : String(error)));
  }

  /** Deterministic clusters with every stored verdict applied. Cheap; safe to call from a request. */
  async build(): Promise<LayerSnapshot> {
    await this.loadDecisions().catch(() => undefined);
    const [events, aliases] = [await this.loadEvents(this.pool), await this.options.aliases?.().catch(() => undefined)];
    const result = unify(events, { aliases, decisions: this.decisions });
    const byEvent = new Map<string, Placement>();
    for (const cluster of result.clusters) for (const member of cluster.members) byEvent.set(member.event.id, { cluster, member });
    this.snap = { clusters: result.clusters, byEvent, stats: result.stats, pending: result.pending, reviewed: result.reviewed, builtAt: Date.now() };
    return this.snap;
  }
  async snapshot(maxAgeMs = 10_000): Promise<LayerSnapshot> {
    if (this.snap && Date.now() - this.snap.builtAt < maxAgeMs) return this.snap;
    if (!this.building) this.building = this.build().finally(() => { this.building = undefined; });
    const value = await this.building;
    this.start();
    return value;
  }
  /** Automatic pass: rebuild; the AI only runs when "IA automática" is on. */
  refresh(): Promise<void> {
    if (this.closed) return Promise.resolve();
    return this.running ??= this.run(this.autoAi ? 'ai' : 'rules').then(() => undefined, error => { this.note('error', 'Matching', error instanceof Error ? error.message : String(error)); }).finally(() => { this.running = undefined; });
  }
  /** Explicit pass from the controls: 'rules' groups without the AI; 'ai' also sends the ambiguous pairs. */
  async runNow(mode: RunMode): Promise<RunSummary> {
    if (this.closed) throw new Error('El matching está cerrado.');
    while (this.running) await this.running;
    const task = this.run(mode); this.running = task.then(() => undefined, () => undefined).finally(() => { this.running = undefined; });
    return task;
  }
  start(): void {
    if (this.timer || this.closed) return;
    this.timer = setInterval(() => void this.refresh(), this.options.intervalMs ?? 60_000); this.timer.unref();
    void this.refresh();
  }
  get auto(): boolean { return this.autoAi; }
  async setAutoAi(value: boolean): Promise<void> { this.autoAi = value; await this.options.onAutoAi?.(value); this.note('info', 'Matching', value ? 'IA automática activada' : 'IA automática desactivada', value ? 'los casos ambiguos se envían solos' : 'los ambiguos solo se resuelven con el botón'); }
  cancelAi(): boolean { if (!this.aiAbort) return false; this.aiAbort.abort(new Error('Cancelado por el usuario')); return true; }

  private async run(mode: RunMode): Promise<RunSummary> {
    let snap = await this.build();
    this.lastRunAt = new Date().toISOString();
    const summary = `${snap.stats.events}|${snap.stats.matches}|${snap.stats.byRules}|${snap.stats.byAi}|${snap.stats.byManual}|${snap.stats.pending}`;
    if (summary !== this.lastSummary) {
      this.lastSummary = summary;
      this.note('ok', 'Matching', `${n(snap.stats.events)} eventos de las casas`, `${n(snap.stats.matches)} partidos únicos`, `${n(snap.stats.merged)} agrupados (${n(snap.stats.byCanonical)} canónicos, ${n(snap.stats.byRules)} por reglas, ${n(snap.stats.byAi)} por IA, ${n(snap.stats.byManual)} manuales)`, snap.stats.pending ? `${n(snap.stats.pending)} ambiguos` : 'sin ambiguos');
    }
    const result: RunSummary = { stats: snap.stats, ai: null };
    if (mode !== 'ai') return result;
    const ai: AiRunSummary = { available: false, reason: '', queued: 0, sent: 0, same: 0, different: 0, unsure: 0, error: null, cancelled: false };
    result.ai = ai;
    const now = Date.now(), retry = this.options.unsureRetryMs ?? 24 * HOUR;
    const queue = snap.pending.filter(pair => { const decision = this.decisions.get(pair.key); return !decision || (decision.verdict === 'UNSURE' && decision.method === 'ai' && now - Date.parse(decision.decidedAt ?? '') > retry); }).slice(0, this.options.maxPairsPerRun ?? 36);
    ai.queued = queue.length;
    if (!queue.length) { ai.reason = 'No hay casos ambiguos pendientes.'; return result; }
    const availability = await aiAvailable(this.options.config ?? defaultAiConfig);
    ai.available = availability.available; ai.reason = availability.reason;
    if (!availability.available) { this.note('warn', 'Matching', `${n(queue.length)} casos ambiguos sin resolver`, availability.reason); return result; }
    if (Date.now() < this.blockedUntil) { ai.error = 'IA en pausa tras un fallo reciente; se reintenta sola.'; return result; }
    const houses = (await this.options.houses?.().catch(() => undefined)) ?? new Map<string, string>();
    const batch = this.options.batchSize ?? 12;
    this.aiRunning = true; this.aiAbort = new AbortController();
    const signal = AbortSignal.any([this.abort.signal, this.aiAbort.signal]);
    try {
      for (let offset = 0; offset < queue.length && !this.closed; offset += batch) {
        if (signal.aborted) { ai.cancelled = true; break; }
        const slice = queue.slice(offset, offset + batch);
        this.note('info', 'Matching', 'IA', `${n(slice.length)} casos ambiguos enviados (solo nombres, liga y hora; sin cuotas)`);
        const pairs: AiPair[] = slice.map(pair => ({ id: pair.key, a: aiEntry(pair.a, houses), b: aiEntry(pair.b, houses), rulesNote: pair.comparison.reasons.join('; ') }));
        let outcome: AiOutcome;
        try {
          const call = (this.options.resolve ?? (batchPairs => resolveWithAi(batchPairs, { signal, config: this.options.config })))(pairs);
          void call.catch(() => undefined);
          // Cancel returns immediately even if the request is still in flight; its late answer is discarded.
          outcome = await Promise.race([call, new Promise<never>((_, reject) => { if (signal.aborted) reject(signal.reason); signal.addEventListener('abort', () => reject(signal.reason), { once: true }); })]);
        }
        catch (error) { if (signal.aborted) { ai.cancelled = true; this.note('warn', 'Matching', 'IA', 'cancelada por el usuario'); break; } throw error; }
        ai.sent += slice.length;
        if ('error' in outcome) {
          this.failures++; this.blockedUntil = Date.now() + (outcome.permanent || this.failures >= 3 ? 30 * 60_000 : 5 * 60_000);
          ai.error = outcome.error;
          this.note('error', 'Matching', 'IA', `no disponible: ${outcome.error}`, 'los casos ambiguos quedan sin agrupar y se reintentan');
          break;
        }
        this.failures = 0;
        const byId = new Map(slice.map(pair => [pair.key, pair]));
        for (const verdict of outcome.results) {
          const pair = byId.get(verdict.id); if (!pair) continue;
          const minConfidence = this.options.minConfidence ?? 0.85;
          // Guard rails the model cannot override: same sport and kickoff inside the safe window, whatever it answers.
          const safe = pair.a.sport === pair.b.sport && pair.comparison.minutes !== null && pair.comparison.minutes <= WINDOW_MINUTES;
          const accepted = verdict.verdict === 'SAME' && verdict.confidence >= minConfidence && safe;
          const decision: Decision = { verdict: accepted ? 'SAME' : verdict.verdict === 'DIFFERENT' ? 'DIFFERENT' : 'UNSURE', swapped: accepted ? verdict.swapped : false, confidence: verdict.confidence, method: 'ai', reason: verdict.reason || undefined, decidedAt: new Date().toISOString() };
          const bucket = decision.verdict === 'SAME' ? 'same' : decision.verdict === 'DIFFERENT' ? 'different' : 'unsure';
          matchingAiUsage[bucket]++; ai[bucket]++;
          await this.save(pair, decision, outcome.model);
          const label = `${pair.a.home} vs ${pair.a.away} (${pair.a.source}) ↔ ${pair.b.home} vs ${pair.b.away} (${pair.b.source})`;
          this.note(decision.verdict === 'SAME' ? 'ok' : 'info', 'Matching', 'IA', label, decision.verdict === 'SAME' ? `mismo partido (${Math.round(decision.confidence * 100)}%)` : decision.verdict === 'DIFFERENT' ? 'partidos distintos' : 'sin decisión segura', decision.reason ?? '');
        }
        snap = await this.build();
      }
    } finally { this.aiRunning = false; this.aiAbort = undefined; }
    result.stats = (this.snap ?? snap).stats;
    return result;
  }

  // ---- explicit decisions -------------------------------------------------------------------
  private eventOf(id: string): UEvent { const placed = this.snap?.byEvent.get(id); if (!placed) throw Object.assign(new Error('Ese evento ya no está en el matching. Pulsa Agrupar ahora.'), { statusCode: 404 }); return placed.member.event; }
  /** "Mismo partido" / "Son distintos" for any two listings. Beats the rules and the AI. */
  async decide(aId: string, bId: string, verdict: 'SAME' | 'DIFFERENT'): Promise<LayerSnapshot> {
    const a = this.eventOf(aId), b = this.eventOf(bId);
    if (a.id === b.id) throw Object.assign(new Error('Elige dos eventos distintos.'), { statusCode: 400 });
    if (verdict === 'SAME' && a.sport !== b.sport) throw Object.assign(new Error('No se pueden unir partidos de deportes distintos.'), { statusCode: 400 });
    const comparison = compareEvents(a, b);
    await this.save({ key: pairKey(a, b), a, b, comparison }, { verdict, swapped: comparison.swapped, confidence: 1, method: 'manual', reason: verdict === 'SAME' ? 'Unido por ti' : 'Separado por ti', decidedAt: new Date().toISOString() }, null);
    this.note('ok', 'Matching', verdict === 'SAME' ? 'unido por ti' : 'separado por ti', `${a.home} vs ${a.away} (${a.source}) ↔ ${b.home} vs ${b.away} (${b.source})`);
    return this.build();
  }
  /** Takes one listing out of its match: it is marked different from every other listing in that match. */
  async separate(eventId: string): Promise<number> {
    const placed = this.snap?.byEvent.get(eventId); if (!placed) throw Object.assign(new Error('Ese evento ya no está en el matching.'), { statusCode: 404 });
    const others = placed.cluster.members.filter(member => member.event.id !== eventId);
    for (const member of others) { const comparison = compareEvents(member.event, placed.member.event); await this.save({ key: pairKey(member.event, placed.member.event), a: member.event, b: placed.member.event, comparison }, { verdict: 'DIFFERENT', swapped: false, confidence: 1, method: 'manual', reason: 'Separado por ti', decidedAt: new Date().toISOString() }, null); }
    this.note('ok', 'Matching', 'separado por ti', `${placed.member.event.home} vs ${placed.member.event.away} (${placed.member.event.source})`);
    await this.build(); return others.length;
  }
  /** Forget a stored verdict (AI or manual): the rules decide that pair again. */
  async forget(key: string): Promise<LayerSnapshot> { await this.remove(key); this.note('info', 'Matching', 'decisión olvidada', key.slice(0, 8)); return this.build(); }

  groups(houses: Map<string, string> = new Map()): GroupsView {
    const snap = this.snap; if (!snap) return { grouped: [], pairs: [] };
    const house = (source: string) => houses.get(source) ?? source, listing = (event: UEvent) => `${event.home} vs ${event.away}`;
    const grouped: GroupedRow[] = [];
    for (const cluster of snap.clusters) {
      if (cluster.members.length < 2) continue;
      for (const member of cluster.members) {
        if (member.method === 'anchor') continue;
        let via: { key: string; decision: Decision } | null = null;
        for (const other of cluster.members) { if (other.event.id === member.event.id) continue; const key = pairKey(other.event, member.event), decision = this.decisions.get(key); if (decision && (decision.verdict === 'SAME')) { via = { key, decision }; break; } }
        grouped.push({ eventId: member.event.id, house: house(member.event.source), listing: listing(member.event), start: member.event.start, clusterId: cluster.id, match: `${cluster.home} vs ${cluster.away}`, league: cluster.league, method: member.method,
          confidence: via?.decision.confidence ?? member.confidence, reason: via?.decision.reason ?? null, viaKey: via?.key ?? null });
      }
    }
    grouped.sort((x, y) => (x.start ?? '9999').localeCompare(y.start ?? '9999') || x.match.localeCompare(y.match));
    const view = (event: UEvent) => ({ eventId: event.id, house: house(event.source), listing: listing(event) });
    const pairs: PairView[] = [
      ...snap.pending.map((pair): PairView => ({ key: pair.key, state: 'pending', a: view(pair.a), b: view(pair.b), league: pair.a.league ?? pair.b.league, start: pair.a.start, reasons: pair.comparison.reasons, aiReason: null, aiConfidence: null })),
      ...snap.reviewed.filter(pair => pair.decision.method === 'ai').map((pair): PairView => ({ key: pair.key, state: pair.decision.verdict === 'UNSURE' ? 'ai-unsure' : 'ai-different', a: view(pair.a), b: view(pair.b), league: pair.a.league ?? pair.b.league, start: pair.a.start, reasons: pair.comparison.reasons, aiReason: pair.decision.reason ?? null, aiConfidence: pair.decision.confidence }))
    ].sort((x, y) => (x.start ?? '9999').localeCompare(y.start ?? '9999'));
    return { grouped: grouped.slice(0, 500), pairs: pairs.slice(0, 300) };
  }

  status(): LayerStatus {
    const stats = this.snap?.stats, ai = matchingAiUsage;
    return { events: stats?.events ?? 0, matches: stats?.matches ?? 0, merged: stats?.merged ?? 0, byRules: stats?.byRules ?? 0, byAi: stats?.byAi ?? 0, byManual: stats?.byManual ?? 0, byCanonical: stats?.byCanonical ?? 0, autoAi: this.autoAi, aiRunning: this.aiRunning,
      pendingForAi: this.snap?.pending.filter(pair => !this.decisions.has(pair.key)).length ?? 0, decidedByAi: [...this.decisions.values()].filter(decision => decision.method === 'ai').length,
      ai: { available: false, reason: '', model: '', requests: ai.requests, same: ai.same, different: ai.different, unsure: ai.unsure, lastError: ai.lastError }, persistent: this.persistent, lastRunAt: this.lastRunAt, running: Boolean(this.running) };
  }
  async fullStatus(): Promise<LayerStatus> { const availability = await aiAvailable(this.options.config ?? defaultAiConfig); const status = this.status(); return { ...status, ai: { ...status.ai, available: availability.available, reason: availability.reason, model: availability.model } }; }
  async close(): Promise<void> { this.closed = true; clearInterval(this.timer); this.abort.abort(new Error('closing')); await this.running; }
}
const n = (value: number) => value.toLocaleString('en-US');

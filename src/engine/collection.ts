import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { ProviderRecord } from "../normalization/types.js";
import type { AcquisitionContext, Source } from "./types.js";
import { navigationDecision, navigationUrl, sportsControl } from "../visual/navigation-policy.js";
import { quoteKey } from "../validation/records.js";
import { sourceKey } from "./memory.js";

export type CollectionOptions = {
  scope: "url" | "section" | "site"; sectionUrl: string;
  urls: string[]; tabs: string[]; sports: string[]; leagues: string[]; markets: string[];
  from: string; to: string; timezone: string; excludePast: boolean; resume: boolean;
  refreshMinutes: number; budgetMinutes: number; maxPages: number; maxVisionCalls: number;
  textOnly: boolean;
};
export const collectionDefaults: CollectionOptions = {
  scope: "site", sectionUrl: "", urls: [], tabs: [], sports: [], leagues: [], markets: [],
  from: "", to: "", timezone: "Asia/Bangkok", excludePast: true, resume: true,
  refreshMinutes: 15, budgetMinutes: 30, maxPages: 200, maxVisionCalls: 20,
  textOnly: false,
};
export function validateCollection(input: unknown, source?: Source): CollectionOptions {
  if (input != null && (typeof input !== "object" || Array.isArray(input))) throw new Error("Preferencias de colección inválidas.");
  const value = { ...collectionDefaults, ...(input as Partial<CollectionOptions> ?? {}) };
  if (!["url", "section", "site"].includes(value.scope)) throw new Error("Selecciona URL, sección o sitio.");
  for (const field of ["urls", "tabs", "sports", "leagues", "markets"] as const) {
    if (!Array.isArray(value[field]) || value[field].length > 500 || value[field].some(v => typeof v !== "string" || !v.trim() || v.length > 4096)) throw new Error(`Selección inválida: ${field}`);
    value[field] = [...new Set(value[field].map(v => v.trim()))];
  }
  for (const [field, min, max] of [["refreshMinutes", 1, 10080], ["budgetMinutes", 1, 120], ["maxPages", 1, 10000], ["maxVisionCalls", 0, 1000]] as const)
    if (!Number.isSafeInteger(value[field]) || value[field] < min || value[field] > max) throw new Error(`Valor inválido: ${field} (${min}–${max}).`);
  for (const field of ["from", "to"] as const) if (typeof value[field] !== "string" || value[field] && (!/^\d{4}-\d{2}-\d{2}$/.test(value[field]) || new Date(`${value[field]}T00:00:00Z`).toISOString().slice(0, 10) !== value[field])) throw new Error("Fecha inválida.");
  if (value.from && value.to && value.from > value.to) throw new Error("La fecha inicial supera la fecha final.");
  if (typeof value.timezone !== "string") throw new Error("Zona horaria inválida.");
  new Intl.DateTimeFormat("en", { timeZone: value.timezone });
  for (const field of ["excludePast", "resume", "textOnly"] as const) if (typeof value[field] !== "boolean") throw new Error(`Valor inválido: ${field}`);
  if (typeof value.sectionUrl !== "string") throw new Error("Sección inválida.");
  for (const link of [...value.urls, ...(value.sectionUrl ? [value.sectionUrl] : [])]) {
    const url = new URL(link);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || source && url.origin !== new URL(source.url).origin) throw new Error("Las URLs seleccionadas deben pertenecer a la fuente y no contener credenciales.");
  }
  return value;
}
export const dayInZone = (date: string | number, timezone: string): string => {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(parsed);
  return ["year", "month", "day"].map(key => parts.find(p => p.type === key)!.value).join("-");
};
export const comparable = (text: string) => text.normalize("NFKC").toLocaleLowerCase().replace(/[\s_-]+/g, " ").trim();
const terminal = (row: ProviderRecord) => /^(closed|finished|ended|final|cancelled|canceled|settled)$/i.test(row.eventStatus ?? "");
const live = (row: ProviderRecord) => /^(live|inplay|in-play|inprogress|resumed)$/i.test(row.eventStatus ?? "");
const selected = (choices: string[], value: string | null | undefined) => !choices.length || Boolean(value && choices.some(choice => comparable(value).includes(comparable(choice))));
const canonical = navigationUrl;
export const sportFamily = (value: string) => { const text = comparable(value); return /^(soccer|fútbol|futbol|football)$/.test(text) ? "football" : /^(tenis|tennis)$/.test(text) ? "tennis" : /^(baloncesto|básquet|basquet|basketball)$/.test(text) ? "basketball" : text; };
export const marketFamily = (value: string): string => {
  const text = comparable(value);
  if (/moneyline|match winner|match result|match odds|resultado|ganador|^winner$|1x2|1 x 2/.test(text)) return "winner";
  if (/total|goals|over.?under|más.?menos/.test(text)) return "totals";
  if (/handicap|hándicap|spread/.test(text)) return "handicap";
  if (/both teams|ambos.*marcan/.test(text)) return "both";
  return text;
};
export type SkipRule = { id: string; source: Source; kind: "source" | "url" | "league" | "sport" | "market" | "tab" | "date"; value: string;
  duration: "run" | "until" | "forever"; until: string | null; runId: string | null; createdAt: string };
export type ViewEntry = { url: string; label: string; status: "COMPLETE" | "PARTIAL" | "SKIPPED" | "FAILED"; at: string; reason?: string };
export type CoverageEntry = { source: Source; url: string; league: string; date: string; market: string; archived: boolean; complete: boolean; at: string };
type Checkpoint = { version: 1; source: Source; options: CollectionOptions; runId: string; state: "RUNNING" | "PARTIAL" | "COMPLETE"; updatedAt: string;
  views: ViewEntry[]; crawl?: Omit<NonNullable<AcquisitionContext["visualCrawl"]>, "records">; betfair?: Record<string, unknown>; reason?: string };
export type Receipt = { id: string; source: Source; url: string; capturedAt: string; method: string; records: number; summary: boolean;
  groups: Array<{ sport: string; league: string; date: string; market: string; records: number }>;
  images: string[]; ingestion: "PENDING" | "LOADED" | "FAILED" | "UNKNOWN" | "EMPTY"; loadedAt?: string; error?: string };
const atomic = async (path: string, data: unknown) => { await mkdir(join(path, ".."), { recursive: true }); const tmp = `${path}.${randomUUID()}.tmp`; await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 }); await rename(tmp, path); };
const read = async <T>(path: string): Promise<T | null> => { try { return JSON.parse(await readFile(path, "utf8")); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; } };

export class CollectionStore {
  private mutations: Promise<unknown> = Promise.resolve();
  constructor(readonly root = ".engine") {}
  path(folder: string, id: string) { return join(this.root, "collection", folder, `${id}.json`); }
  async serial<T>(action: () => Promise<T>): Promise<T> { const task = this.mutations.then(action); this.mutations = task.catch(() => undefined); return task; }
  async options(source: Source) { return validateCollection((await read<{ options: CollectionOptions }>(this.path("profiles", sourceKey(source))))?.options, source); }
  async saveProfile(source: Source, options: CollectionOptions) { await atomic(this.path("profiles", sourceKey(source)), { source, options: validateCollection(options, source), updatedAt: new Date().toISOString() }); }
  async rules() { return (await read<SkipRule[]>(join(this.root, "collection", "rules.json"))) ?? []; }
  async addRule(source: Source, input: Partial<SkipRule>) {
    if (!["source", "url", "league", "sport", "market", "tab", "date"].includes(input.kind ?? "") || !["run", "until", "forever"].includes(input.duration ?? "") || typeof input.value !== "string" || input.value.length > 4096 || input.kind !== "source" && !input.value.trim()) throw new Error("Regla de salto inválida.");
    if (input.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(input.value)) throw new Error("Fecha inválida.");
    if (input.kind === "url") validateCollection({ urls: [input.value] }, source);
    if (input.duration === "until" && (!input.until || !Number.isFinite(Date.parse(input.until)) || Date.parse(input.until) <= Date.now())) throw new Error("Selecciona una fecha futura para reactivar.");
    const rule: SkipRule = { id: randomUUID(), source, kind: input.kind!, value: input.value.trim(), duration: input.duration!, until: input.duration === "until" ? input.until! : null, runId: input.duration === "run" ? input.runId ?? null : null, createdAt: new Date().toISOString() };
    await this.serial(async () => atomic(join(this.root, "collection", "rules.json"), [...await this.rules(), rule])); return rule;
  }
  async removeRule(id: string) { await this.serial(async () => atomic(join(this.root, "collection", "rules.json"), (await this.rules()).filter(rule => rule.id !== id))); }
  async claimRules(source: Source, runId: string) { await this.serial(async () => { const rules = await this.rules(); for (const rule of rules) if (sourceKey(rule.source) === sourceKey(source) && rule.duration === "run" && !rule.runId) rule.runId = runId; await atomic(join(this.root, "collection", "rules.json"), rules); }); }
  checkpointId(source: Source, options: CollectionOptions) { const { resume, refreshMinutes, budgetMinutes, maxPages, maxVisionCalls, textOnly, ...scope } = options; return createHash("sha256").update(JSON.stringify([source, { ...scope, ...(textOnly ? {textOnly:true} : {}), urls: [...scope.urls].sort(), tabs: [...scope.tabs].sort(), sports: [...scope.sports].sort(), leagues: [...scope.leagues].sort(), markets: [...scope.markets].sort() }])).digest("hex"); }
  async checkpoint(source: Source, options: CollectionOptions) { return read<Checkpoint>(this.path("checkpoints", this.checkpointId(source, options))); }
  async saveCheckpoint(value: Checkpoint) { await atomic(this.path("checkpoints", this.checkpointId(value.source, value.options)), value); }
  async files<T>(folder: string): Promise<T[]> { const dir = join(this.root, "collection", folder); const files = await readdir(dir).catch(error => { if (error.code === "ENOENT") return []; throw error; }); return (await Promise.all(files.filter(f => f.endsWith(".json")).map(file => read<T>(join(dir, file))))).filter(v => v !== null) as T[]; }
  async receipt(id: string) { return read<Receipt>(this.path("receipts", id)); }
  async coverage(source: Source) { return await read<CoverageEntry[]>(this.path("coverage", sourceKey(source))) ?? []; }
  async saveCoverage(source: Source, entries: CoverageEntry[]) {
    await this.serial(async () => {
      const all = new Map((await this.coverage(source)).map(entry => [JSON.stringify([entry.url, entry.league, entry.date, entry.market]), entry]));
      for (const entry of entries) all.set(JSON.stringify([entry.url, entry.league, entry.date, entry.market]), entry);
      await atomic(this.path("coverage", sourceKey(source)), [...all.values()].slice(-10000));
    });
  }
  async saveReceipt(rawPath: string, source: Source, method: string, data: { url: string; capturedAt: string; payload: unknown; screenshotPath?: string; screenshotPaths?: string[] }, count: number, ingestion: Receipt["ingestion"] = "PENDING") {
    const payload = data.payload as { records?: ProviderRecord[]; pageRawPaths?: string[] };
    const groups = new Map<string, Receipt["groups"][number]>();
    for (const row of payload?.records ?? []) { const group = { sport: row.sport ?? "Sin verificar", league: row.competition ?? "Sin verificar", date: row.eventStartTime ? dayInZone(row.eventStartTime, "Asia/Bangkok") : "Sin verificar", market: row.market ?? "Sin verificar", records: 0 }; const key = JSON.stringify(group); if (!groups.has(key)) groups.set(key, group); groups.get(key)!.records++; }
    const receipt: Receipt = { id: basename(rawPath, ".json"), source, url: data.url, capturedAt: data.capturedAt, method, records: count, summary: Boolean(payload?.pageRawPaths?.length), groups: [...groups.values()], images: [data.screenshotPath, ...(data.screenshotPaths ?? [])].filter((v): v is string => Boolean(v)).map(v => basename(v)), ingestion };
    await atomic(this.path("receipts", receipt.id), receipt);
  }
  async ingestion(rawPath: string, error?: string, empty = false) { const id = basename(rawPath, ".json"); await this.serial(async () => { const receipt = await this.receipt(id); if (!receipt) return; receipt.ingestion = error ? "FAILED" : empty ? "EMPTY" : "LOADED"; receipt.error = error; if (!error) receipt.loadedAt = new Date().toISOString(); await atomic(this.path("receipts", id), receipt); }); }
}

export class CollectionRuntime {
  resumeUrl = ""; resumePending = false; freshRun = false; cachedReason = "";
  rules: SkipRule[] = []; views: ViewEntry[] = []; skipped = 0; pages = 0; filtered = 0; reason = "";
  private rejected = new Set<string>(); private closedUrls = new Set<string>(); private completedAt = new Map<string, number>();
  private started = Date.now(); private pausedAt = 0; private pausedMs = 0; private initialized = false; private finished = false; private writes: Promise<unknown> = Promise.resolve();
  private currentLabel = ""; private currentUrl = "";
  private observations = new Map<string, Map<string, ProviderRecord>>();
  private viewFailures = new Map<string, string>();
  constructor(readonly store: CollectionStore, readonly source: Source, readonly options: CollectionOptions, readonly runId: string) {}
  get restricted() { return this.options.scope !== "site" || [this.options.urls, this.options.tabs, this.options.sports, this.options.leagues, this.options.markets].some(list => list.length > 0) || Boolean(this.options.from || this.options.to || this.rules.length); }
  async initialize(context: AcquisitionContext) {
    if (this.initialized) return; this.initialized = true;
    await this.store.claimRules(this.source, this.runId); await this.refreshRules();
    const coverage = await this.store.coverage(this.source);
    for (const entry of coverage) if (this.options.resume && entry.archived && entry.complete && (/\b\d{4}-\d{2}-\d{2}\b/.test(entry.url) || /\/(?:e|event|fixture|match)-|\/(?:events|fixtures|matches)\/[^/?]+/.test(entry.url))) this.closedUrls.add(canonical(entry.url));
    const old = await this.store.checkpoint(this.source, this.options);
    if (!this.options.resume || !old) return;
    if (old.state === "COMPLETE" && !(old.views ?? []).some(view => !navigationDecision(view.url, this.source.url).allowed) && !(old.crawl?.pending ?? []).some(url => !navigationDecision(url, this.source.url).allowed)) {
      const historical = this.options.from && this.options.from === this.options.to && this.options.to < dayInZone(Date.now(), this.options.timezone) && coverage.some(entry => entry.date === this.options.from && entry.complete && entry.archived);
      this.freshRun = Boolean(historical || Date.parse(old.updatedAt) > Date.now() - this.options.refreshMinutes * 60000);
      this.cachedReason = historical ? "Fecha histórica seleccionada ya completa y con eventos terminados" : "Recorrido completo y cuotas dentro del período de actualización";
      return;
    }
    this.views = old.views;
    for (const view of old.views) if (view.status === "COMPLETE") this.completedAt.set(canonical(view.url), Date.parse(view.at));
    if (old.crawl) {
      const pending = [...new Set([...old.crawl.pending, ...old.crawl.visited])].filter(url => this.allowedUrl(url));
      context.visualCrawl = { ...old.crawl, records: [], visits: [], visited: [], pending };
      this.resumeUrl = pending[0] ?? ""; this.resumePending = Boolean(pending.length);
    }
    if (old.betfair) {
      const b = old.betfair as any;
      context.betfairCrawl = { ...b, queued: new Set(b.queued), seen: new Set(), competitions: new Set(b.competitions), events: new Set(b.events), marketViews: new Set(b.marketViews), rootControls: new Map((b.rootControls ?? []).map(([key, values]: [string, string[]]) => [key, new Set(values)])), ready: undefined, completed: false, failures: [] };
      const restored = context.betfairCrawl!;
      if (b.active) { restored.pending.unshift(b.active); restored.active = undefined; }
      for (const failure of b.failures ?? []) restored.pending.push({ url: failure.url, path: failure.controls ?? [] });
      restored.pending = restored.pending.filter(item => this.allowedUrl(item.url));
      this.resumePending = Boolean(restored.pending.length); this.resumeUrl = restored.pending[0]?.url ?? "";
    }
  }
  async refreshRules() { this.rules = (await this.store.rules()).filter(rule => sourceKey(rule.source) === sourceKey(this.source) && (rule.duration === "forever" || rule.duration === "run" && rule.runId === this.runId || rule.duration === "until" && Date.parse(rule.until!) > Date.now())); }
  private skippedRule(kind: SkipRule["kind"], value: string) { return this.rules.some(rule => rule.kind === "source" || rule.kind === kind && (kind === "url" ? canonical(rule.value) === canonical(value) : kind === "sport" ? sportFamily(rule.value) === sportFamily(value) : kind === "market" ? marketFamily(rule.value) === marketFamily(value) : comparable(value).includes(comparable(rule.value)))); }
  private reject(url: string, label: string, reason: string) { const key = `${url}|${label}|${reason}`; if (!this.rejected.has(key)) { this.rejected.add(key); this.skipped++; this.views.push({ url, label, status: "SKIPPED", reason, at: new Date().toISOString() }); } return false; }
  allowedUrl(url: string, label = ""): boolean {
    let parsed: URL; try { parsed = new URL(url); } catch { return false; }
    if (parsed.origin !== new URL(this.source.url).origin || !["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return false;
    const decision = navigationDecision(url, this.source.url);
    if (!decision.allowed) return this.reject(url, label, decision.reason);
    if (this.skippedRule("url", url) || label && this.skippedRule("league", label)) return this.reject(url, label, "Salto solicitado");
    const explicitDate = /\b\d{4}-\d{2}-\d{2}\b/.exec(`${label} ${parsed.pathname} ${parsed.search}`)?.[0];
    if (explicitDate && (this.skippedRule("date", explicitDate) || this.options.excludePast && explicitDate < dayInZone(Date.now(), this.options.timezone) || this.options.from && explicitDate < this.options.from || this.options.to && explicitDate > this.options.to)) return this.reject(url, label, "Fecha excluida");
    if (this.closedUrls.has(canonical(url))) return this.reject(url, label, "Fecha histórica completa");
    if (!label && canonical(url) !== canonical(this.source.url) && (this.completedAt.get(canonical(url)) ?? 0) > Date.now() - this.options.refreshMinutes * 60000) return this.reject(url, label, "Vista completa aún vigente");
    const sportPath = /\/(football|soccer|cricket|tennis|basketball|baseball|hockey|mma|boxing|rugby)(?:\/|$)/i.exec(parsed.pathname)?.[1];
    if (sportPath && this.options.sports.length && !this.options.sports.map(sportFamily).includes(sportFamily(sportPath))) return this.reject(url, label, "Deporte no seleccionado");
    const root = new URL(this.options.sectionUrl || this.source.url);
    if (this.options.scope === "url" && canonical(url) !== canonical(this.source.url)) return this.reject(url, label, "Fuera de la URL exacta");
    if (this.options.scope === "section" && (parsed.pathname !== root.pathname && !parsed.pathname.startsWith(`${root.pathname.replace(/\/$/, "")}/`) || [...root.searchParams].some(([key, value]) => parsed.searchParams.get(key) !== value) || root.hash && !parsed.hash.startsWith(root.hash))) return this.reject(url, label, "Fuera de la sección");
    if (this.options.urls.length && canonical(url) !== canonical(this.source.url) && !this.options.urls.some(selectedUrl => canonical(url) === canonical(selectedUrl))) return this.reject(url, label, "Página no seleccionada");
    if (label && this.options.leagues.length && !selected(this.options.leagues, label) && /\/c-|competition|league/i.test(parsed.pathname)) return this.reject(url, label, "Liga no seleccionada");
    return true;
  }
  allowedControl(label: string, href?: string | null, role = "tab", category = ""): boolean {
    if (!sportsControl(label, category)) return this.reject(this.currentUrl || this.source.url, label, "Control sin contexto deportivo o informativo");
    if (href && !this.allowedUrl(href, label)) return false;
    const explicitDate = /\b\d{4}-\d{2}-\d{2}\b/.exec(label)?.[0];
    if (explicitDate && (this.skippedRule("date", explicitDate) || this.options.excludePast && explicitDate < dayInZone(Date.now(), this.options.timezone))) return this.reject(this.currentUrl || this.source.url, label, "Fecha excluida");
    if (this.skippedRule("tab", label) || this.skippedRule("league", label) || this.skippedRule("sport", label) || this.skippedRule("market", label)) return this.reject(this.currentUrl || this.source.url, label, "Salto solicitado");
    if (this.options.sports.length && /^(football|soccer|fútbol|futbol|cricket|tennis|tenis|basketball|baloncesto|baseball|hockey|mma|boxing|rugby)$/i.test(label) && !this.options.sports.map(sportFamily).includes(sportFamily(label))) return this.reject(this.currentUrl || this.source.url, label, "Deporte no seleccionado");
    const family = marketFamily(label);
    if (this.options.markets.length && ["winner", "totals", "handicap", "both"].includes(family) && !this.options.markets.some(m => marketFamily(m) === family)) return this.reject(this.currentUrl || this.source.url, label, "Mercado no seleccionado");
    const expands = /^(all|more|show|load|next|ver|mostrar|siguiente|today|tomorrow|hoy|mañana|upcoming|in.play|competitions|leagues|countries)/i.test(label);
    if (!expands && category === "league" && !selected(this.options.leagues, label)) return this.reject(this.currentUrl || this.source.url, label, "Liga no seleccionada");
    if (this.options.tabs.length && !expands && (role === "tab" || ["winner", "totals", "handicap", "both"].includes(family)) && category !== "league" && !selected(this.options.tabs, label)) return this.reject(this.currentUrl || this.source.url, label, "Pestaña no seleccionada");
    return true;
  }
  setView(url: string, label = "") { this.currentUrl = url; this.currentLabel = label; }
  noteFailure(url: string, reason: string) { this.viewFailures.set(url, reason); this.reason = reason; }
  observeRows(url: string, rows: ProviderRecord[]) {
    const observations = this.observations.get(url) ?? new Map();
    for (const row of rows) observations.set(quoteKey(row), row);
    this.observations.set(url, observations);
  }
  accepts(row: ProviderRecord): boolean {
    const date = row.eventStartTime ? dayInZone(row.eventStartTime, this.options.timezone) : "";
    const inMarket = !this.options.markets.length || this.options.markets.some(m => marketFamily(m) === marketFamily(row.market ?? ""));
    const marketTabs = this.options.tabs.filter(t => /odds|goals|points|winner|moneyline|resultado|ganador|1x2|total|handicap|spread|both teams|ambos|score|shots|corners|cards|goles|marcador|hándicap/i.test(t));
    const inTab = !marketTabs.length || marketTabs.some(t => comparable(`${row.marketPeriod ?? ""} ${row.market ?? ""}`).includes(comparable(t)) || /^(goals|totals?|moneyline|match odds|match winner|winner|ganador|1x2|handicap|hándicap|spread|both teams to score|ambos marcan)$/i.test(t) && marketFamily(t) === marketFamily(row.market ?? ""));
    const result = inTab && selected(this.options.sports.map(sportFamily), row.sport ? sportFamily(row.sport) : null) && selected(this.options.leagues, row.competition || this.currentLabel) && inMarket
      && !this.skippedRule("sport", row.sport ?? "") && !this.skippedRule("league", row.competition || this.currentLabel) && !this.skippedRule("market", row.market ?? "")
      && !(date && this.skippedRule("date", date)) && !(this.options.from && (!date || date < this.options.from)) && !(this.options.to && (!date || date > this.options.to))
      && !(this.options.excludePast && date && date < dayInZone(Date.now(), this.options.timezone) && !live(row));
    if (!result) this.filtered++; return result;
  }
  pause() { if (!this.pausedAt) this.pausedAt = Date.now(); }
  resume() { if (this.pausedAt) { this.pausedMs += Date.now() - this.pausedAt; this.pausedAt = 0; } }
  checkBudget() { if (Date.now() - this.started - this.pausedMs - (this.pausedAt ? Date.now() - this.pausedAt : 0) >= this.options.budgetMinutes * 60000) throw new Error("Presupuesto de tiempo agotado; el recorrido queda pendiente."); if (this.pages >= this.options.maxPages) throw new Error("Presupuesto de páginas agotado; el recorrido queda pendiente."); }
  async view(context: AcquisitionContext, url: string, label: string, complete: boolean, reason?: string) {
    if (this.viewFailures.has(url)) { complete = false; reason = this.viewFailures.get(url); }
    this.pages++; this.views.push({ url, label, status: complete ? "COMPLETE" : "PARTIAL", at: new Date().toISOString(), reason });
    if (complete) this.completedAt.set(canonical(url), Date.now());
    const rows = [...this.observations.get(url)?.values() ?? []];
    // A start time in the past does not prove the event ended. Archive a URL only
    // after an exhausted, error-free view with explicit terminal statuses throughout.
    const archived = complete && rows.length > 0 && rows.every(row => terminal(row) && Boolean(row.eventStartTime) && dayInZone(row.eventStartTime!, this.options.timezone) < dayInZone(Date.now(), this.options.timezone));
    const entries = new Map<string, CoverageEntry>();
    for (const row of rows) { const entry: CoverageEntry = { source: this.source, url, league: (row.competition ?? this.currentLabel) || "Sin verificar", date: row.eventStartTime ? dayInZone(row.eventStartTime, this.options.timezone) : "Sin verificar", market: row.market ?? "Sin verificar", archived, complete, at: new Date().toISOString() }; entries.set(JSON.stringify([entry.league, entry.date, entry.market]), entry); }
    if (entries.size) await this.store.saveCoverage(this.source, [...entries.values()]);
    await this.checkpoint(context);
  }
  async checkpoint(context: AcquisitionContext, state: Checkpoint["state"] = "RUNNING", reason?: string) {
    if (this.finished && state === "RUNNING") return;
    if (state !== "RUNNING") this.finished = true;
    const crawl = context.visualCrawl; const b = context.betfairCrawl;
    const value: Checkpoint = { version: 1, source: this.source, options: this.options, runId: this.runId, state, reason, updatedAt: new Date().toISOString(), views: this.views.slice(-10000),
      ...(crawl ? { crawl: { visited: [...crawl.visited], pending: [...new Set([...(!crawl.visited.includes(this.currentUrl) && this.currentUrl ? [this.currentUrl] : []), ...crawl.pending])], rawPaths: [...crawl.rawPaths], visits: [...crawl.visits], tabsOpened: crawl.tabsOpened, ocrCaptures: crawl.ocrCaptures } } : {}),
      ...(b ? { betfair: { ...b, pending: [...b.pending], queued: [...b.queued], seen: [...b.seen], competitions: [...b.competitions], events: [...b.events], marketViews: [...b.marketViews], rootControls: [...b.rootControls ?? []].map(([key, values]) => [key, [...values]]) } } : {}) };
    // Snapshot now; serialize writes so a late heartbeat cannot overwrite Stop.
    const snapshot = JSON.parse(JSON.stringify(value)); const task = this.writes.then(() => this.store.saveCheckpoint(snapshot)); this.writes = task.catch(() => undefined); await task;
  }
}

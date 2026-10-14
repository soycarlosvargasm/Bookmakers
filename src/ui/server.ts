import Fastify, { type FastifyInstance } from "fastify";
import { Pool } from "pg";
import { existsSync } from "node:fs";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { basename, resolve, join } from "node:path";
import type { ServerResponse } from "node:http";
import { listChangeFiles, getState, readJson } from "./state.js";
import { UiActions, defaultSettings, validateSettings, engineLogContext, type UiSettings, type RunInfo } from "./actions.js";
import { loadBrands } from "./brands.js";
import { findCountry, groupCountries } from "./countries.js";
import { registerCatalogRoutes } from "./catalog.js";
import { registerMatchesRoutes, loadCurrentEvents, loadAliasIndex } from "./matches.js";
import { aiAvailable } from "../matching/ai.js";
import { MatchingLayer } from "../matching/layer.js";
import { registerMatchingRoutes } from "./matching-routes.js";
import { ExtractionMonitor } from "./extraction-monitor.js";
import { SnapshotIngestion } from "./ingestion.js";
import { ensureOcrBackend } from "../visual/ocr.js";
import { setVisionEnabled, visionStatus } from "../visual/openai-config.js";
import { registerCollectionRoutes } from "./collection-routes.js";
import { validateCollection } from "../engine/collection.js";
import { ensureLocalDatabase } from "./database.js";
import { registerCountryPagesRoutes, type CountryPagesOpener } from './country-pages.js';
import { registerWorkbenchRoutes } from "./workbench.js";
import { AiDayExtraction, type JobStatus } from "./ai-day-extraction.js";
import { DailyRecords, DAY_PATTERN, pendingCsv, todayInZone, validatedCsv } from "./daily-records.js";
import { execFile } from "node:child_process";

export type UiServerOptions = { openCountryPages?:CountryPagesOpener; nativeToken?: string; port?: number; host?: string; dataDir?: string; onCloseRequest?: () => void; manageDatabase?: boolean; ingestSnapshots?: boolean; databaseUrl?: string };
export async function createUiServer(options: UiServerOptions = {}): Promise<{ app: FastifyInstance; actions: UiActions; listen: () => Promise<string>; close: () => Promise<void> }> {
  if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
  const dataDir = options.dataDir ?? ".engine";
  const app = Fastify({ logger: false, routerOptions: { maxParamLength: 256 } });
  const clients = new Set<ServerResponse>();
  let sequence = 0, closing = false;
  const logs: Array<{ id: string; time: string; line: string; source: string | null; type: string }> = [];
  // Read-only observer of the engine; assigned once the actions exist.
  let extraction: ExtractionMonitor | undefined;
  let matching: MatchingLayer | undefined;
  const send = (response: ServerResponse, event: string, data: unknown, id?: string) => {
    if (response.destroyed || response.writableEnded) return;
    if (response.writableLength > 1024 * 1024) { response.end(); return; }
    response.write(`${id ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const publish = (event: string, data: unknown, id?: string) => { for (const client of clients) send(client, event, data, id); };
  const log = (line: string, source?: string) => {
    const type = /^(ERROR|FAILED)\b|\] ERROR|persistence failed|detection failed/i.test(line) ? "ERROR" : /CHALLENGE|PAUSED/i.test(line) ? "CHALLENGE" : /\bMISS\b/.test(line) ? "MISS" : /^(OK|SUCCEEDED)\b|\] SUCCEEDED/.test(line) ? "OK" : "INFO";
    const entry = { id: `${process.pid}-${++sequence}`, time: new Date().toISOString(), line, source: source ?? null, type };
    logs.push(entry); if (logs.length > 500) logs.shift(); publish("log_line", entry, entry.id);
    extraction?.onLog(line, source);
  };
  pool.on("error", error => log(`ERROR local database connection: ${error.message}`));
  const ingestion = options.ingestSnapshots ? new SnapshotIngestion(pool, dataDir, log, (source, records) => {
    publish("data_update", { source, records, loadedAt: new Date().toISOString() });
    void matching?.refresh();
  }) : undefined;
  let databaseRecovery: Promise<void> | undefined;
  const databaseController = new AbortController();
  if (options.manageDatabase) databaseRecovery = ensureLocalDatabase(pool, databaseUrl, log, databaseController.signal)
    .then(() => ingestion?.sync()).catch(error => log(`ERROR database startup: ${error.message}. Data retries remain active.`));
  else if (ingestion) void ingestion.sync();
  app.setErrorHandler((error, _request, reply) => {
    const problem = error as Error & { code?: string; statusCode?: number };
    if (["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "57P01", "57P03"].includes(problem.code ?? ""))
      return reply.code(503).send({ error: "Base de datos no disponible. Reintentando automáticamente." });
    log(`ERROR API: ${problem.message}`);
    return reply.code(problem.statusCode ?? 500).send({ error: problem.message });
  });
  let cached: Awaited<ReturnType<typeof getState>> | undefined;
  let reading: Promise<Awaited<ReturnType<typeof getState>>> | undefined;
  let dirty = true;
  const storedSnapshot = async () => {
    if (reading) return reading;
    if (cached && !dirty) return cached;
    dirty = false;
    reading = getState(dataDir, actions.schedulerState, [...actions.runs.values()]).then(value => { cached = value; return value; }).finally(() => { reading = undefined; });
    return reading;
  };
  const snapshot = async () => {
    const value = await storedSnapshot();
    // Records today come from durable storage (RAW on disk ∪ PostgreSQL archive), not from in-memory run maps.
    const today = todayInZone();
    const day = await daily.summary(today).catch(error => { log(`ERROR records today: ${error instanceof Error ? error.message : String(error)}`); return null; });
    // File reads may finish after Stop. Always publish the current runtime flags.
    return { ...value, status: { ...value.status, ...actions.schedulerState, today,
      ...(day ? { recordsToday: day.validated, pendingToday: day.pending, capturesToday: day.captures, recordsArchive: day.archiveAvailable, recordsScope: day.scope } : {}),
      busy: [...actions.runs.values()].some(run => !run.finishedAt), challenges: actions.challenges } };
  };
  let lastChanges = "";
  const broadcast = async () => {
    void extraction?.refresh().catch(error => log(`ERROR extraction monitor: ${error instanceof Error ? error.message : String(error)}`));
    try { const state = await snapshot(); const signature = JSON.stringify(state.changes.files); const changed = signature !== lastChanges; lastChanges = signature; publish("status_update", { ...state.status, ...(changed ? { changes: state.changes } : {}) }); publish("source_update", state.brands); publish("country_update", groupCountries(state.brands)); }
    catch (error) { dirty = true; log(`ERROR reading local state: ${String(error)}`); }
  };
  const actions = new UiActions(log, () => { dirty = true; if (!closing) void broadcast(); }, dataDir);
  const daily = new DailyRecords(dataDir, pool);
  const aiReportPath = join(dataDir, "ui", "records-ai-last.json");
  const aiDay = new AiDayExtraction(pool, daily, { note: (type, parts) => extraction?.note(type, parts),
    finished: async status => {
      await mkdir(join(dataDir, "ui"), { recursive: true });
      await writeFile(`${aiReportPath}.tmp`, JSON.stringify(status), { mode: 0o600 });
      await rename(`${aiReportPath}.tmp`, aiReportPath);
    } });
  const savedAiReport = await readJson<JobStatus>(aiReportPath);
  if (savedAiReport && !savedAiReport.running) aiDay.restore(savedAiReport);
  extraction = new ExtractionMonitor(dataDir, () => [...actions.runs.values()], line => publish("extraction_log", line));
  const houseNames = async () => new Map((await loadBrands()).map(brand => [brand.id, brand.name]));
  const matchingSettingsPath = join(dataDir, "ui", "matching.json");
  const matchingSettings = await readJson<{ autoAi?: boolean }>(matchingSettingsPath).catch(() => null);
  matching = new MatchingLayer(pool, loadCurrentEvents, { note: (type, parts) => extraction?.note(type, parts), houses: houseNames, aliases: () => loadAliasIndex(pool), autoAi: matchingSettings?.autoAi ?? true,
    onAutoAi: async autoAi => { await mkdir(join(dataDir, "ui"), { recursive: true }); await writeFile(`${matchingSettingsPath}.tmp`, JSON.stringify({ autoAi })); await rename(`${matchingSettingsPath}.tmp`, matchingSettingsPath); } });
  const settingsPath = join(dataDir, "ui", "settings.json");
  let settings = validateSettings((await readJson<UiSettings>(settingsPath)) ?? { ...defaultSettings });
  registerCollectionRoutes(app, actions, dataDir, () => settings);
  registerWorkbenchRoutes(app, pool, actions, dataDir, () => settings);
  const restoreStreams = [process.stdout, process.stderr].map(stream => {
    const write = stream.write;
    const buffers = new Map<string, string>();
    stream.write = ((...args: Parameters<typeof stream.write>) => {
      const source = engineLogContext.getStore();
      if (source) {
        const lines = ((buffers.get(source) ?? "") + String(args[0])).split(/\r?\n/); buffers.set(source, lines.pop() ?? "");
        for (const line of lines) if (line.trim()) log(line, source);
      }
      return write.apply(stream, args);
    }) as typeof stream.write;
    return () => { stream.write = write; for (const [source,line] of buffers) if (line) log(line,source); };
  });
  app.addHook("onRequest", async (request, reply) => {
    if (options.nativeToken && request.url !== "/api/health") {
      const fromApp = request.headers["x-collector-app"] === options.nativeToken;
      const cookie = request.headers.cookie?.split(";").some(part => part.trim() === `collector_native=${options.nativeToken}`);
      if (!fromApp && !cookie) return reply.code(403).type("text/plain; charset=utf-8").send("El administrador está disponible únicamente en la app Sportsbook Collector de macOS.");
      if (fromApp) reply.header("Set-Cookie", `collector_native=${options.nativeToken}; HttpOnly; SameSite=Strict; Path=/`);
    }
    const origin = request.headers.origin;
    if (origin && origin !== `http://${request.headers.host}`) return reply.code(403).send({ error: "Local app origin required" });
  });
  app.post("/api/app/quit", async () => { setImmediate(() => options.onCloseRequest?.()); return { closing: true }; });
  registerCountryPagesRoutes(app, options.openCountryPages);
  registerCatalogRoutes(app, pool);
  registerMatchesRoutes(app, pool, matching!);
  registerMatchingRoutes(app, matching!);
  app.get("/api/health", async () => ({ ready: true }));
  app.get("/api/status", async () => (await snapshot()).status);
  app.get('/api/storage/status',async()=>{
    const local=databaseUrl?['localhost','127.0.0.1','[::1]'].includes(new URL(databaseUrl).hostname):false;
    const backend=local?'PostgreSQL local':'PostgreSQL';
    try{
      const result=await pool.query('SELECT count(*)::integer AS captures FROM collector_captures');
      return {backend,connected:true,automatic:Boolean(ingestion),captures:result.rows[0].captures,...ingestion?.status};
    }catch{return {backend,connected:false,automatic:Boolean(ingestion),captures:0,...ingestion?.status};}
  });
  app.get("/api/extraction", async () => extraction!.snapshot());
  app.get("/api/extraction/log", async () => extraction!.lines.slice(-300));
  app.get("/api/brands", async () => (await snapshot()).brands);
  const requestedDay = (value: unknown) => { const day = typeof value === "string" && value ? value : todayInZone(); if (!DAY_PATTERN.test(day)) throw Object.assign(new Error("Indica la fecha como AAAA-MM-DD."), { statusCode: 400 }); return day; };
  app.get<{ Querystring: { date?: string; format?: string; offset?: string; limit?: string } }>("/api/records/day", async (request, reply) => {
    const day = requestedDay(request.query.date), format = request.query.format ?? "json";
    const data = await daily.forDay(day);
    if (format === "csv") return reply.type("text/csv; charset=utf-8").header("Content-Disposition", `attachment; filename="registros-${day}.csv"`).send(validatedCsv(data.validated));
    if (format === "pending-csv") return reply.type("text/csv; charset=utf-8").header("Content-Disposition", `attachment; filename="pendientes-${day}.csv"`).send(pendingCsv(data.pending));
    if (format !== "json") return reply.code(400).send({ error: "Formato admitido: json, csv o pending-csv." });
    // The UI pages rows; counts always describe the complete day so nothing is lost to pagination.
    const offset = Math.max(0, Math.floor(Number(request.query.offset) || 0)), limit = Math.min(500, Math.max(1, Math.floor(Number(request.query.limit) || 100)));
    return { ...data, validated: data.validated.slice(offset, offset + limit), pending: data.pending.slice(0, 200), offset, limit, validatedTotal: data.validated.length, pendingTotal: data.pending.length };
  });
  app.post<{ Body: { date?: string } }>("/api/records/export", async (request) => {
    const day = requestedDay(request.body?.date);
    const result = await daily.exportDay(day);
    log(`OK Exportación del ${day}: ${result.summary.validated} registros validados, ${result.summary.pending} pendientes, ${result.summary.captures} capturas → ${result.folder}`);
    return result;
  });
  app.get<{ Querystring: { date?: string } }>("/api/records/ai", async (request) => {
    const day = requestedDay(request.query.date), availability = await aiAvailable();
    const { eligible, all, reviewed, aiRows } = await aiDay.eligible(day);
    return { day, available: availability.available, reason: availability.reason, model: availability.model, pendingCaptures: eligible.length,
      pendingChars: eligible.reduce((sum, item) => sum + item.chars, 0), evidenceCaptures: all.filter(c => c.hasEvidence).length,
      totalCaptures: all.length, noEvidenceCaptures: all.filter(c => !c.hasEvidence).length, imageCaptures: all.filter(c => c.images > 0).length,
      textChars: all.reduce((sum, item) => sum + item.chars, 0), reviewedCaptures: reviewed, aiRows, job: aiDay.status };
  });
  app.post<{ Body: { date?: string; again?: boolean } }>("/api/records/ai", async (request, reply) => reply.code(202).send(await aiDay.start(requestedDay(request.body?.date), request.body?.again === true)));
  app.post("/api/records/ai/cancel", async () => ({ cancelled: aiDay.cancel() }));
  app.post<{ Body: { path?: string } }>("/api/records/reveal", async (request, reply) => {
    const exportsRoot = resolve(dataDir, "exports"), target = typeof request.body?.path === "string" ? resolve(request.body.path) : "";
    if (!target || !(target === exportsRoot || target.startsWith(`${exportsRoot}/`))) return reply.code(400).send({ error: "Solo se pueden mostrar archivos exportados por esta app." });
    if (process.platform !== "darwin") return reply.code(501).send({ error: "Mostrar en Finder solo está disponible en macOS." });
    await new Promise<void>((done, fail) => execFile("open", ["-R", target], error => error ? fail(error) : done()));
    return { revealed: target };
  });
  app.get("/api/countries", async () => groupCountries((await snapshot()).brands));
  app.get("/api/logs", async () => logs);
  app.get("/api/changes/today", async () => (await snapshot()).changes);
  app.get<{ Params: { id: string } }>("/api/changes/file/:id", async (request, reply) => {
    const id = request.params.id;
    if (basename(id) !== id || !id.endsWith(".json")) return reply.code(400).send({ error: "Invalid change file ID" });
    const path = (await listChangeFiles(dataDir)).find(file => basename(file) === id);
    if (!path) return reply.code(404).send({ error: "Change file not found" });
    return JSON.parse(await readFile(path,"utf8"));
  });
  app.get("/api/settings", async () => settings);
  app.post<{ Body: UiSettings }>("/api/settings", async (request, reply) => {
    try {
      const body = request.body;
      const next = validateSettings({ intervalMinutes: body?.intervalMinutes, timeoutSeconds: body?.timeoutSeconds, delaySeconds: body?.delaySeconds });
      await mkdir(join(dataDir,"ui"), { recursive: true });
      await writeFile(`${settingsPath}.tmp`, JSON.stringify(next,null,2)); await rename(`${settingsPath}.tmp`,settingsPath); settings = next;
      log(`Settings saved: interval=${settings.intervalMinutes} min timeout=${settings.timeoutSeconds} sec delay=${settings.delaySeconds} sec`);
      return settings;
    } catch(error) { return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post<{ Body: { url?: string; type?: string; forceBrowser?: boolean } }>("/api/run", async (request, reply) => {
    const revision=actions.stopVersion;
    const { url,type,forceBrowser = false } = request.body ?? {};
    if (typeof forceBrowser !== "boolean" || !(await loadBrands()).some(b => b.id === type && b.regions.some(r => r.url === url))) return reply.code(400).send({ error: "Select a URL and source type from the configured catalog." });
    if(revision!==actions.stopVersion)return reply.code(409).send({error:'La captura fue cancelada al detener.'});
    try { return reply.code(202).send(actions.run({url: url!,type: type!},forceBrowser,settings)); }
    catch(error) { return reply.code(409).send({ error: String(error instanceof Error ? error.message : error) }); }
  });
  app.post<{ Params: { runId: string }; Body: { id?: string; choice?: string } }>("/api/run/:runId/challenge", async (request, reply) => {
    const { id, choice } = request.body ?? {};
    if (typeof id !== "string" || !["chrome", "continue", "cancel"].includes(choice ?? "")) return reply.code(400).send({ error: "Selecciona abrir Chrome, seguir intentando o cancelar." });
    try {
      actions.chooseChallenge(request.params.runId, id, choice as import("./actions.js").ChallengeChoice);
      return reply.code(202).send({ accepted: true });
    } catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.get("/api/ocr/health", async (_request, reply) => {
    try { await ensureOcrBackend(); return { installed: true, engine: "Apple Vision", languages: ["en", "es"] }; }
    catch (error) { return reply.code(503).send({ installed: false, error: error instanceof Error ? error.message : String(error) }); }
  });
  app.get("/api/ocr/vision", async () => visionStatus());
  app.post<{ Body: { enabled?: boolean } }>("/api/ocr/vision", async (request, reply) => {
    if (typeof request.body?.enabled !== "boolean") return reply.code(400).send({ error: "enabled debe ser booleano" });
    return setVisionEnabled(request.body.enabled);
  });
  const visualRun = (run: RunInfo) => Boolean(run.exhaustive || run.visualProgress || run.method === "visual" || run.manualReading);
  app.get("/api/ocr/status", async () => {
    const runs = [...actions.runs.values()].filter(run=>!run.finishedAt||visualRun(run));
    return [...runs.filter(run => run.finishedAt).slice(-10), ...runs.filter(run => !run.finishedAt)];
  });
  app.post<{ Body: { url?: string; type?: string; collection?: unknown } }>("/api/ocr/explore", async (request, reply) => {
    const revision=actions.stopVersion;
    const { url, type } = request.body ?? {};
    if (!(await loadBrands()).some(b => b.id === type && b.regions.some(r => r.url === url))) return reply.code(400).send({ error: "Selecciona una fuente del catálogo." });
    if(revision!==actions.stopVersion)return reply.code(409).send({error:'La extracción fue cancelada al detener.'});
    try { return reply.code(202).send(actions.run({ url: url!, type: type! }, false, settings, undefined, true, request.body?.collection ? validateCollection(request.body.collection, { url: url!, type: type! }) : undefined)); }
    catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post<{ Body: { country?: string; collection?: unknown } }>("/api/ocr/explore-country", async (request, reply) => {
    const revision=actions.stopVersion;
    const country = findCountry(request.body?.country);
    if (!country) return reply.code(400).send({ error: "Selecciona un país configurado." });
    const group = groupCountries(await loadBrands()).find(group => group.code === country.code)!;
    if(revision!==actions.stopVersion)return reply.code(409).send({error:'La extracción fue cancelada al detener.'});
    if (!group.brands.length) return reply.code(400).send({ error: "No hay fuentes configuradas para este país." });
    try {
      return reply.code(202).send({ ...actions.runCountry(group.brands.map(brand => ({ type: brand.id, url: brand.region.url })), false, settings, true, request.body?.collection ? validateCollection(request.body.collection) : undefined), country: country.code });
    } catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post<{ Body: { url?: string; collection?: unknown } }>("/api/ocr/explore-url", async (request, reply) => {
    const revision=actions.stopVersion;
    const input = request.body?.url;
    if (typeof input !== "string" || !input.trim() || input.length > 4096) return reply.code(400).send({ error: "Escribe una URL válida." });
    let url: URL;
    try {
      const value = input.trim();
      url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
      if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error("Invalid URL");
    } catch { return reply.code(400).send({ error: "La URL debe ser HTTP o HTTPS, sin credenciales incrustadas." }); }
    const hostname = (value: string) => new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    const known = (await loadBrands()).find(brand => brand.regions.some(region => hostname(region.url) === hostname(url.href)));
    if(revision!==actions.stopVersion)return reply.code(409).send({error:'La extracción fue cancelada al detener.'});
    const type = known?.id ?? `custom-${url.hostname.toLowerCase().replace(/^www\./, "").replace(/[^a-z\d.-]/g, "-")}`;
    try { return reply.code(202).send(actions.run({ url: url.href, type }, false, settings, undefined, true, validateCollection(request.body?.collection ?? { scope: "url" }, { url: url.href, type }))); }
    catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post("/api/ocr/stop", async (_request, reply) => {
    return reply.code(202).send(await actions.stopRuns());
  });
  app.post<{ Body: { intervalMinutes?: number } }>("/api/scheduler/start", async (request, reply) => {
    try { await actions.startScheduler({ ...settings, intervalMinutes: request.body?.intervalMinutes ?? settings.intervalMinutes }); return reply.code(202).send(actions.schedulerState); }
    catch(error) { log(`ERROR scheduler start: ${String(error)}`); return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post<{ Body: { country?: string; forceBrowser?: boolean } }>("/api/run-country", async (request, reply) => {
    const revision=actions.stopVersion;
    const { country: value, forceBrowser = false } = request.body ?? {};
    const country = findCountry(value);
    if (!country || typeof forceBrowser !== "boolean") return reply.code(400).send({ error: "Select a configured country and a boolean forceBrowser value." });
    const group = groupCountries(await loadBrands()).find(group => group.code === country.code)!;
    if(revision!==actions.stopVersion)return reply.code(409).send({error:'La captura del país fue cancelada al detener.'});
    if (!group.brands.length) return reply.code(400).send({ error: "No brands configured for this country." });
    try {
      return reply.code(202).send(actions.runCountry(group.brands.map(brand => ({ type: brand.id, url: brand.region.url })), forceBrowser, settings));
    } catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post("/api/scheduler/stop", async (_request,reply) => { const result = await actions.stopRuns(); return reply.code(202).send({ ...actions.schedulerState, ...result }); });
  app.post("/api/stop", async (_request, reply) => reply.code(202).send(await actions.stopRuns()));
  app.get<{ Params: { runId: string } }>("/api/run/:runId", async (request,reply) => {
    const id = request.params.runId;
    if (!/^[a-f0-9-]{36}$/.test(id)) return reply.code(404).send({ error: "Run not found" });
    const run = actions.runs.get(id) ?? await readJson<RunInfo>(join(dataDir,"ui","runs",`${id}.json`));
    return run ?? reply.code(404).send({ error: "Run not found" });
  });
  app.get("/api/stream", async (request,reply) => {
    reply.hijack(); const response = reply.raw;
    response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    clients.add(response); response.write(": connected\n\n");
    response.on("close", () => clients.delete(response));
    const last = logs.findIndex(log => log.id === request.headers["last-event-id"]);
    for (const entry of logs.slice(last + 1)) send(response,"log_line",entry,entry.id);
    await broadcast();
  });
  app.get("/assets/logo.png", async (_request, reply) => reply.header("Cache-Control", "no-store").type("image/png").send(await readFile(resolve("public/ui/assets/logo.png"))));
  for (const [route,file,type] of [["/","index.html","text/html"],["/app.js","app.js","text/javascript"],["/collection.js","collection.js","text/javascript"],["/workbench.js","workbench.js","text/javascript"],["/extraction.js","extraction.js","text/javascript"],["/matches.js","matches.js","text/javascript"],["/matching.js","matching.js","text/javascript"],["/freshness.js","freshness.js","text/javascript"],["/style.css","style.css","text/css"]] as const) {
    app.get(route,async (_request,reply) => reply.header("Cache-Control","no-store").type(`${type}; charset=utf-8`).send(await readFile(resolve("public/ui",file),"utf8")));
  }
  const timer = setInterval(() => { dirty = true; if (clients.size) void broadcast(); },2000);
  timer.unref();
  const listen = async () => { const address = await app.listen({port:options.port ?? 3000,host:options.host ?? "127.0.0.1"}); log("INFO Local app ready. Source status and totals are read from engine files."); return address; };
  const close = async () => {
    if (closing) return; closing = true; clearInterval(timer);
    await actions.close();
    databaseController.abort(new Error("Application closing"));
    aiDay.cancel(); await aiDay.idle().catch(() => undefined);
    await matching?.close();
    await ingestion?.close(); await databaseRecovery;
    for (const client of clients) client.end(); clients.clear(); for (const restore of restoreStreams) restore(); await app.close();
    await pool.end();
  };
  return { app,actions,listen,close };
}

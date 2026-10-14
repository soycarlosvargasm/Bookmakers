import { ManualReading } from './manual-reading.js';
import { CollectionStore, CollectionRuntime, validateCollection, type CollectionOptions } from "../engine/collection.js";
import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { EventEmitter } from "node:events";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AcquisitionOrchestrator } from "../engine/orchestrator.js";
import { EngineStorage } from "../engine/storage.js";
import { HttpHandler, NetworkHandler, DomHandler, AccessibilityHandler, VisualHandler } from "../engine/handlers.js";
import type { Source, AcquisitionContext, AcquisitionOutcome, Handler, VisualProgress } from "../engine/types.js";
import { chromium } from "playwright";
import { discoverVisualLinks } from "../visual/browser.js";
import { visualNavigationCandidates } from "../visual/exploration.js";
import { discoverBetfairView } from "../engine/betfair-crawler.js";
import { detectPageChallenge } from "../engine/challenge.js";
import { schedule } from "../scheduler/scheduler.js";
import { loadBrands } from "./brands.js";
import { cancellable, closeAcquisitionContext } from "../engine/cancellation.js";

export type UiSettings = { intervalMinutes: number; timeoutSeconds: number; delaySeconds: number };
export type ChallengeChoice = "chrome" | "continue" | "cancel";
export type RunChallenge = { id: string; url: string; reason: string; detectedAt: string; prompt: boolean; browserMode: "isolated" | "renzo"; reappearances: number; manualAttempts?: number };
export type RunInfo = { runId: string; source: Source; state: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "PAUSED" | "SKIPPED"; origin: "manual" | "scheduler"; startedAt: string; finishedAt?: string; method?: string | null; records?: number; reason?: string; rawPath?: string; exhaustive?: boolean; visualProgress?: VisualProgress; challenge?: RunChallenge; browserMode?: "isolated" | "renzo"; manualReading?: import('./manual-reading.js').ManualReadingStatus; collection?: CollectionOptions; discovery?: boolean; coverage?: { skipped: number; filtered: number; pages: number; complete: boolean }; };
export type UiLog = (line: string, source?: string) => void;
export const engineLogContext = new AsyncLocalStorage<string>();
export const defaultSettings: UiSettings = { intervalMinutes: 15, timeoutSeconds: 180, delaySeconds: 2 };
export function validateSettings(value: UiSettings): UiSettings {
  for (const [key, minimum, maximum] of [["intervalMinutes", 1, 35791], ["timeoutSeconds", 1, 2147483], ["delaySeconds", 0, 2147483]] as const) {
    if (!Number.isSafeInteger(value[key]) || value[key] < minimum || value[key] > maximum) throw new Error(`${key} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}
export class UiActions {
  readonly collection: CollectionStore;
  private stopRevision = 0;
  get stopVersion() { return this.stopRevision; }
  private readonly manualSessions = new Map<string, ManualReading>();
  private readonly runtimes = new Map<string, CollectionRuntime>();
  readonly runs = new Map<string, RunInfo>();
  private readonly inflightEngines = new Set<Promise<AcquisitionOutcome>>();
  private readonly pending = new Map<string, Promise<AcquisitionOutcome>>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly challengeChoices = new Map<string, { id: string; resolve: (choice: ChallengeChoice) => void }>();
  private scheduler: ReturnType<typeof schedule> | null = null;
  private starting = false;
  private stopping = false;
  private closing = false;
  private nextCycleAt: string | null = null;
  private intervalMinutes: number | null = null;
  private schedulerSources: Source[] = [];
  private countryTask: Promise<void> | null = null;
  private countryController: AbortController | null = null;
  private manualStopping = false;
  private discoveryContext?: AcquisitionContext;
  private readonly countryRunIds = new Set<string>();
  constructor(private readonly log: UiLog, private readonly emitStatus: () => void, private readonly dataDir = ".engine") { this.collection = new CollectionStore(dataDir); }
  get schedulerState() { return { running: Boolean(this.scheduler), starting: this.starting, stopping: this.stopping || this.manualStopping, nextCycleAt: this.nextCycleAt, intervalMinutes: this.intervalMinutes, schedulerSources: this.schedulerSources }; }
  get challenges() { return [...this.runs.values()].filter(run => !run.finishedAt && run.state === "PAUSED" && run.challenge).map(run => ({ runId: run.runId, source: run.source, ...run.challenge! })); }
  chooseChallenge(runId: string, id: string, choice: ChallengeChoice): void {
    const run = this.runs.get(runId), pending = this.challengeChoices.get(runId);
    if (!run || run.finishedAt || run.state !== "PAUSED" || run.challenge?.id !== id || pending?.id !== id) throw new Error("Esta verificación ya cambió. Actualiza el aviso.");
    if (choice === "chrome" && run.challenge.browserMode === "renzo") throw new Error("Esta página ya está en tu Chrome personal.");
    this.challengeChoices.delete(runId);
    run.challenge.prompt = false;
    pending.resolve(choice);
    this.emitStatus();
  }

  run(source: Source, forceBrowser: boolean, settings: UiSettings, reservedRunId?: string, exhaustive = false, collection?: CollectionOptions): RunInfo {
    if (this.closing || this.scheduler || this.starting || this.stopping || this.manualStopping) throw new Error("Wait for collection to stop before starting a manual run.");
    if ((this.countryRunIds.size && (!reservedRunId || !this.countryRunIds.has(reservedRunId))) ||
      [...this.runs.values()].some(run => !run.finishedAt && run.state !== "QUEUED")) throw new Error("Another source is running. Wait for it to finish.");
    return this.begin(source, forceBrowser, settings, "manual", reservedRunId ? this.countryController?.signal : undefined, reservedRunId, exhaustive, collection).info;
  }
  startManualReading(source: Source, allowedHosts: string[] = []): RunInfo {
    if(this.closing || this.scheduler || this.starting || this.stopping || this.manualStopping || this.countryRunIds.size || [...this.runs.values()].some(run=>!run.finishedAt)) throw new Error('Detén la colección actual antes de abrir una página manual.');
    const runId=randomUUID(),controller=new AbortController();
    const info: RunInfo={runId,source,state:'RUNNING',origin:'manual',method:'dom',browserMode:'renzo',startedAt:new Date().toISOString(),manualReading:{ready:false,savedViews:0,records:0,pendingViews:0,archivedViews:0,url:null,browser:'renzo',opened:false}};
    this.runs.set(runId,info);this.controllers.set(runId,controller);
    const session=new ManualReading(source,controller.signal,new EngineStorage(this.dataDir),()=>{
      info.manualReading=session.status;info.records=session.records;this.emitStatus();
    },undefined,{allowedHosts});
    this.manualSessions.set(runId,session);this.emitStatus();
    const task=session.run().then(()=>undefined,error=>{info.reason=error instanceof Error?error.message:String(error);}).then(async():Promise<AcquisitionOutcome>=>{
      await session.refreshArchived().catch(()=>undefined);
      info.manualReading=session.status;info.records=session.records;info.finishedAt=new Date().toISOString();
      // Opening a page or saving text is not an extraction: success requires validated odds.
      if(session.records)info.state='SUCCEEDED';
      else if(session.savedViews){info.state='SKIPPED';info.reason=`${session.savedViews} vista(s) con texto guardado, 0 cuotas extraídas: pendiente de interpretación.${info.reason?` ${info.reason}`:''}`;}
      else info.state=controller.signal.aborted&&!info.reason?'SKIPPED':info.reason?'FAILED':'SKIPPED';
      if(info.state==='SKIPPED'&&!info.reason)info.reason=session.finished?'Sesión manual terminada por ti sin vistas guardadas.':controller.signal.aborted?'Detenido por el usuario sin vistas guardadas.':'La pestaña manual se cerró sin vistas guardadas.';
      this.controllers.delete(runId);this.manualSessions.delete(runId);this.pending.delete(runId);this.manualStopping=false;
      await this.saveRun(info);this.emitStatus();
      const reason=info.reason??'Lectura manual completada';
      return info.state==='FAILED'?{status:'FAILED',source,reason,attempts:[]}:{status:'SKIPPED',source,reason,attempts:[]};
    });
    this.pending.set(runId,task);return info;
  }
  async finishManualReading(runId: string) {
    const session=this.manualSessions.get(runId);
    if(!session)throw new Error('No hay una sesión manual activa.');
    session.finish();return {finishing:true,savedViews:session.savedViews,records:session.records};
  }
  async readManualText(runId: string) {
    const session=this.manualSessions.get(runId);
    if(!session)throw new Error('No hay una lectura manual activa. Abre primero la página.');
    return session.read();
  }
  runCountry(sources: Source[], forceBrowser: boolean, settings: UiSettings, exhaustive = false, collection?: CollectionOptions) {
    validateSettings(settings);
    if (this.closing || this.scheduler || this.starting || this.stopping || this.manualStopping || this.countryRunIds.size || [...this.runs.values()].some(run => !run.finishedAt)) {
      throw new Error("Stop the scheduler and wait for the current run to finish before starting a country.");
    }
    if (!sources.length) throw new Error("No brands configured for this country.");
    this.countryController = new AbortController();
    const queued = sources.map(source => ({ runId: randomUUID(), source, state: "QUEUED" as const, origin: "manual" as const, exhaustive, startedAt: new Date().toISOString() }));
    for (const info of queued) { this.runs.set(info.runId, info); this.countryRunIds.add(info.runId); }
    this.emitStatus();
    const execute = async () => {
      try {
        for (const info of queued) {
          if (this.runs.get(info.runId)?.finishedAt) continue;
          try {
            this.countryController?.signal.throwIfAborted();
            if (this.closing) throw new Error("Application shutting down");
            const run = this.run(info.source, forceBrowser, settings, info.runId, exhaustive, collection);
            await this.pending.get(run.runId);
          } catch (error) {
            const failed: RunInfo = { ...this.runs.get(info.runId)!, state: "FAILED", records: 0, finishedAt: new Date().toISOString(), reason: error instanceof Error ? error.message : String(error) };
            this.runs.set(info.runId, failed);
            this.log(`ERROR ${info.source.url}: ${failed.reason}`, info.source.type);
            await this.saveRun(failed);
          }
        }
      } finally { this.countryRunIds.clear(); this.countryTask = null; this.countryController = null; this.manualStopping = false; this.emitStatus(); }
    };
    this.countryTask = execute();
    return { started: queued.length, runIds: queued.map(info => info.runId) };
  }
  private async saveRun(info: RunInfo) {
    try {
      const folder = join(this.dataDir, "ui", "runs"); await mkdir(folder, { recursive: true });
      const path = join(folder, `${info.runId}.json`), temporary = `${path}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(info, null, 2)); await rename(temporary, path);
    } catch (error) { this.log(`ERROR saving UI run: ${String(error)}`, info.source.type); }
  }
  private begin(source: Source, forceBrowser: boolean, settings: UiSettings, origin: RunInfo["origin"], signal?: AbortSignal, runId: string = randomUUID(), exhaustive = false, collectionOptions?: CollectionOptions) {
    exhaustive ||= source.type === "betfair" && collectionOptions?.scope !== "url";
    const info: RunInfo = { runId, source, state: "RUNNING", origin, exhaustive, browserMode: "isolated", startedAt: new Date().toISOString() };
    const controller = new AbortController();
    this.runs.set(info.runId, info); this.controllers.set(info.runId, controller);
    const abort = () => controller.abort(signal?.reason ?? new Error("Source cancelled"));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    let remainingMs = (exhaustive ? 7200 : settings.timeoutSeconds) * 1000, budgetStarted = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pauseBudget = () => { if (timer) { clearTimeout(timer); timer = undefined; remainingMs -= Date.now() - budgetStarted; } };
    const resumeBudget = () => {
      // Betfair ends when its discovered frontier is exhausted or the user
      // presses Stop. Individual navigations and requests remain bounded.
      if (source.type === "betfair" && !info.collection) return;
      if (!timer) { budgetStarted = Date.now(); timer = setTimeout(() => controller.abort(new Error(`Source timeout after ${exhaustive ? 7200 : settings.timeoutSeconds} seconds`)), Math.max(0, remainingMs)); }
    };
    resumeBudget();
    this.log(`Run started ${source.url}${forceBrowser ? " (force browser)" : ""}`, source.type); this.emitStatus();
    const task = engineLogContext.run(source.type, async (): Promise<AcquisitionOutcome> => {
      const options = collectionOptions ? validateCollection(collectionOptions, source) : await this.collection.options(source);
      info.collection = options;
      remainingMs = Math.min(remainingMs, options.budgetMinutes * 60000); pauseBudget(); resumeBudget();
      const runtime = new CollectionRuntime(this.collection, source, options, runId);
      this.runtimes.set(runId, runtime);
      let lastVisualEmit = 0;
      let context: AcquisitionContext | undefined;
      let paused: Extract<AcquisitionOutcome, { status: "PAUSED" }> | undefined;
      let challengeCount = 0, acknowledgedAt = 0, acknowledgedReappearances = 0;
      let browserMode: "isolated" | "renzo" = "isolated";
      let betfairHandoff: Pick<AcquisitionContext, "betfairCrawl" | "visualCrawl"> | undefined;
      const closeBrowser = () => { void paused?.close().catch(() => undefined); void closeAcquisitionContext(context); };
      controller.signal.addEventListener("abort", closeBrowser);
      let result: AcquisitionOutcome;
      try {
        controller.signal.throwIfAborted();
        const handlers: Handler[] = [new HttpHandler(), new NetworkHandler(), new DomHandler(), new AccessibilityHandler(), new VisualHandler()].map(handler => ({
          method: handler.method,
          async run(current) {
            if (betfairHandoff && !current.betfairCrawl) Object.assign(current, betfairHandoff);
            context = current;
            controller.signal.throwIfAborted();
            const value = await new Promise<Awaited<ReturnType<Handler["run"]>>>((resolve, reject) => {
              const cancel = () => reject(controller.signal.reason);
              controller.signal.addEventListener("abort", cancel, { once: true });
              Promise.resolve(handler.run(current)).then(resolve, reject).finally(() => {
                controller.signal.removeEventListener("abort", cancel);
                if (controller.signal.aborted) void closeAcquisitionContext(current);
              });
              if (controller.signal.aborted) cancel();
            });
            controller.signal.throwIfAborted();
            return value;
          }
        }));
        const createEngine = () => new AcquisitionOrchestrator({ collection: runtime, storage: new EngineStorage(this.dataDir), handlers, forceBrowser, browserMode, keepPersonalPageOpen: browserMode === "renzo", consoleNotifier: false, exhaustive: exhaustive && (browserMode !== "renzo" || source.type === "betfair"), currentOnly: options.excludePast,
          onHumanIntervention: event => {
            if (controller.signal.aborted) return;
            pauseBudget(); runtime.pause();
            acknowledgedAt = Date.now(); acknowledgedReappearances = 0;
            info.challenge = { id: randomUUID(), url: source.url, reason: event.reason, detectedAt: new Date().toISOString(), prompt: ++challengeCount > 1 || event.method === "http", browserMode, reappearances: 0 };
            this.emitStatus();
          },
          onChallengeProgress: progress => {
            if (!info.challenge || controller.signal.aborted) return;
            const previousAttempts = info.challenge.manualAttempts ?? 0;
            info.challenge.reappearances = progress.reappearances;
            info.challenge.manualAttempts = progress.manualAttempts ?? 0;
            if (info.challenge.manualAttempts !== previousAttempts) {
              this.log(`Verificación: ${info.challenge.manualAttempts} intento(s) manual(es) detectado(s).`, source.type);
              this.emitStatus();
            }
            if (browserMode === "isolated" && ((progress.manualAttempts ?? 0) >= 2 && (progress.secondAttemptAgeMs ?? progress.lastAttemptAgeMs ?? 0) >= 6_000 || progress.reappearances >= 1 || challengeCount >= 2)) {
              const choice = this.challengeChoices.get(runId);
              if (choice?.id === info.challenge.id) {
                this.log("La verificación sigue bloqueada tras los intentos manuales o vuelve a aparecer: cambiando automáticamente a Chrome Renzo.", source.type);
                this.chooseChallenge(runId, choice.id, "chrome");
              }
              return;
            }
            if (!info.challenge.prompt && (progress.reappearances > acknowledgedReappearances || Date.now() - acknowledgedAt >= 30_000)) {
              info.challenge.prompt = true; this.emitStatus();
            }
          },
          onVisualProgress: progress => { if (controller.signal.aborted || info.finishedAt) return; info.visualProgress = progress; info.records = progress.records;
            if (Date.now() - lastVisualEmit >= 1000 || progress.state !== "RUNNING") { lastVisualEmit = Date.now(); this.emitStatus(); } },
          timeoutMs: Math.min(20000, settings.timeoutSeconds * 1000), signal: controller.signal,
          onStage: stage => {
            if (controller.signal.aborted || info.finishedAt) return;
            info.method = stage.method;
            if (stage.status === "CHALLENGE") { info.state = "PAUSED"; info.reason = stage.reason; pauseBudget(); }
            else if (stage.status === "STARTED") { runtime.resume(); info.state = "RUNNING"; delete info.reason; delete info.challenge; this.challengeChoices.delete(runId); resumeBudget(); }
            this.log(`[${stage.method}] ${stage.status}${stage.reason ? `: ${stage.reason}` : ""}`, source.type); this.emitStatus();
          }
        });
        const invoke = () => {
          const operation = createEngine().run(source); this.inflightEngines.add(operation);
          void operation.finally(() => this.inflightEngines.delete(operation)).catch(() => undefined);
          return cancellable(operation, controller.signal);
        };
        result = await invoke();
        while (result.status === "PAUSED") {
          paused = result; info.state = "PAUSED"; info.method = paused.event.method; info.reason = paused.event.reason; this.emitStatus();
          if (origin === "scheduler") {
            this.log(`CHALLENGE ${paused.event.reason}. Use Force browser to resolve a browser challenge.`, source.type);
            await cancellable(paused.close(), controller.signal); await cancellable(paused.completion, controller.signal); break;
          }
          this.log("CHALLENGE: puedes resolverlo manualmente, abrir tu Chrome o cancelar desde el administrador.", source.type);
          let switchToChrome = false;
          while (true) {
            const choice = new Promise<ChallengeChoice>(resolve => this.challengeChoices.set(runId, { id: info.challenge!.id, resolve }));
            const selected = await cancellable(Promise.race([paused.completion.then(outcome => ({ outcome })), choice.then(choice => ({ choice }))]), controller.signal);
            this.challengeChoices.delete(runId);
            if ("outcome" in selected) { result = selected.outcome; break; }
            if (selected.choice === "cancel") { controller.abort(new Error("Verificación cancelada por el usuario")); throw controller.signal.reason; }
            if (selected.choice === "chrome") {
              if (context?.betfairCrawl) {
                betfairHandoff = { betfairCrawl: context.betfairCrawl, visualCrawl: context.visualCrawl };
                context.betfairCrawl.ready = undefined;
              }
              // Close only the collector-owned test context before changing modes.
              await paused.close(); await paused.completion; await closeAcquisitionContext(context);
              paused = undefined; context = undefined;
              browserMode = "renzo"; info.browserMode = browserMode;
              info.state = "RUNNING"; delete info.challenge; delete info.reason; delete info.visualProgress;
              this.log(source.type === "betfair" ? "Abriendo Betfair en Chrome Renzo; se conserva la cola de ligas, eventos y mercados y continúa el recorrido por DOM y red."
                : "Abriendo la misma fuente en el perfil Chrome Renzo existente. Lectura de la página actual; esta conexión no ofrece OCR ni recorrido automático.", source.type); this.emitStatus();
              resumeBudget(); switchToChrome = true; break;
            }
            acknowledgedAt = Date.now(); acknowledgedReappearances = info.challenge?.reappearances ?? 0;
            if (info.challenge) { info.challenge.id = randomUUID(); info.challenge.prompt = false; }
            this.emitStatus();
            if (paused.event.method === "http") void paused.resume();
          }
          if (switchToChrome) result = await invoke();
          paused = undefined;
        }
        if (controller.signal.aborted) throw controller.signal.reason;
      } catch (error) { result = { status: "FAILED", source, reason: error instanceof Error ? error.message : String(error), attempts: [] }; }
      finally {
        clearTimeout(timer); this.challengeChoices.delete(runId); delete info.challenge; signal?.removeEventListener("abort", abort); controller.signal.removeEventListener("abort", closeBrowser);
        await closeAcquisitionContext(context);
      }
      if (result.status === "FAILED" && info.reason === "Fuente saltada por el usuario") result = { status: "SKIPPED", source, reason: info.reason, attempts: [] };
      info.state = result.status;
      if (result.status === "SUCCEEDED") { info.method = result.method; info.records = result.records.length; info.rawPath = result.rawPath; delete info.reason; }
      else if (result.status === "FAILED" || result.status === "SKIPPED") { info.reason = result.reason; info.records = context?.visualCrawl?.records.length ?? 0; info.rawPath = context?.visualCrawl?.rawPaths.at(-1); }
      else { info.reason = result.event.reason; info.records = 0; }
      info.coverage = { skipped: runtime.skipped, filtered: runtime.filtered, pages: runtime.pages, complete: (result.status === "SUCCEEDED" || result.status === "SKIPPED" && (runtime.freshRun || runtime.filtered > 0) && (runtime.freshRun || runtime.views.some(v => v.status === "COMPLETE"))) && !runtime.reason && info.visualProgress?.complete !== false };
      if (context) await runtime.checkpoint(context, info.coverage.complete ? "COMPLETE" : "PARTIAL", info.reason || runtime.reason);
      this.runtimes.delete(runId);
      this.controllers.delete(info.runId);
      if (!this.countryTask) this.manualStopping = false;
      info.finishedAt = new Date().toISOString();
      this.log(`${result.status === "SKIPPED" ? "SKIP" : result.status === "SUCCEEDED" ? "OK" : result.status === "PAUSED" ? "CHALLENGE" : "ERROR"} ${source.url} | records=${info.records} method=${info.method ?? "none"}${info.reason ? ` | ${info.reason}` : ""}`, source.type);
      await this.saveRun(info);
      this.controllers.delete(info.runId); this.pending.delete(info.runId); this.emitStatus();
      if (!this.countryTask) { this.manualStopping = false; this.emitStatus(); }
      return result;
    }).catch(async error => {
      clearTimeout(timer); this.controllers.delete(runId); this.runtimes.delete(runId);
      info.state = "FAILED"; info.finishedAt = new Date().toISOString(); info.reason = error instanceof Error ? error.message : String(error);
      await this.saveRun(info); this.pending.delete(runId); this.emitStatus();
      return { status: "FAILED" as const, source, reason: info.reason, attempts: [] };
    });
    this.pending.set(info.runId, task);
    return { info, task };
  }
  async discover(source: Source) {
    if (this.closing || this.scheduler || this.starting || this.manualStopping || [...this.runs.values()].some(run => !run.finishedAt)) throw new Error("Espera a que termine la colección antes de descubrir secciones.");
    const runId = randomUUID(), controller = new AbortController();
    const info: RunInfo = { runId, source, state: "RUNNING", origin: "manual", startedAt: new Date().toISOString(), exhaustive: true, discovery: true };
    const context: AcquisitionContext = { source, memory: null, configuration: null, signal: controller.signal, timeoutMs: 15000, observeMs: 500 };
    this.discoveryContext = context;
    this.runs.set(runId, info); this.controllers.set(runId, controller); this.emitStatus();
    const timer = setTimeout(() => controller.abort(new Error("Descubrimiento agotó 30 segundos; puedes reintentar.")), 30000);
    try {
      const memory = await new EngineStorage(this.dataDir).readMemory(source);
      context.browser = await chromium.launch({ headless: true });
      controller.signal.throwIfAborted();
      context.browserContext = await context.browser.newContext(memory?.session.status === "VALID" && memory.session.path ? { storageState: memory.session.path } : {});
      context.page = await context.browserContext.newPage();
      const page = context.page;
      await cancellable(page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 15000 }), controller.signal);
      await page.waitForTimeout(500);
      const challenge = await detectPageChallenge(page, undefined, source.url);
      if (challenge) throw new Error("La fuente pide verificación. Resuélvela desde una ejecución normal y vuelve a descubrir.");
      const urls = await discoverVisualLinks(page);
      const labels = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLAnchorElement>("a[href]")].map(a => [a.href, (a.innerText || a.getAttribute("aria-label") || "").trim()])));
      const controls = source.type === "betfair" ? (await discoverBetfairView(page, true)).controls.filter(c => c.role === "tab").map(c => ({ label: c.label, key: c.key })) : (await visualNavigationCandidates(page, new Set(), true)).filter(c => c.role === "tab").map(c => ({ label: c.label, key: c.key }));
      const inventory = { source, capturedAt: new Date().toISOString(), pages: urls.map(url => ({ url, label: labels[url] || new URL(url).pathname })), tabs: [...new Map(controls.map(c => [c.label, c])).values()] };
      controller.signal.throwIfAborted(); info.state = "SUCCEEDED";
      const folder = join(this.dataDir, "collection", "inventory"); await mkdir(folder, { recursive: true });
      const path = join(folder, `${(await import("../engine/memory.js")).sourceKey(source)}.json`);
      await writeFile(`${path}.tmp`, JSON.stringify(inventory)); await rename(`${path}.tmp`, path);
      return inventory;
    } catch (error) { info.state = "FAILED"; info.reason = error instanceof Error ? error.message : String(error); throw error; }
    finally { clearTimeout(timer); controller.abort(); await closeAcquisitionContext(context); this.discoveryContext = undefined; info.finishedAt = new Date().toISOString(); await this.saveRun(info); this.controllers.delete(runId); this.manualStopping = false; this.emitStatus(); }
  }
  async skip(source: Source, input: Parameters<CollectionStore["addRule"]>[1]) {
    const active = [...this.runs.values()].find(run => !run.finishedAt && run.source.type === source.type && run.source.url === source.url);
    const rule = await this.collection.addRule(source, { ...input, runId: input.duration === "run" ? active?.runId : undefined });
    await Promise.all([...this.runtimes.values()].map(runtime => runtime.refreshRules()));
    if (input.kind === "source" && active) { active.reason = "Fuente saltada por el usuario"; this.controllers.get(active.runId)?.abort(new Error(active.reason)); }
    this.emitStatus(); return rule;
  }
  async startScheduler(settings: UiSettings): Promise<void> {
    validateSettings(settings);
    if (this.closing || this.scheduler || this.starting || this.stopping || this.manualStopping) throw new Error("Wait for collection to stop before starting the scheduler.");
    if (this.pending.size || this.countryRunIds.size) throw new Error("Wait for the manual run to finish.");
    this.starting = true; this.stopping = false; this.emitStatus();
    try {
      const sources = (await loadBrands()).flatMap(brand => brand.regions.filter(region => region.verified).map(region => ({ url: region.url, type: brand.id })));
      if (this.closing || this.stopping) return;
      this.schedulerSources = sources; this.intervalMinutes = settings.intervalMinutes; this.nextCycleAt = null; this.stopping = false;
      const task = schedule({ sources, intervalMinutes: settings.intervalMinutes, perSourceTimeoutMs: settings.timeoutSeconds * 1000, delayBetweenSourcesMs: settings.delaySeconds * 1000,
        onCycleComplete: () => { this.nextCycleAt = this.stopping ? null : new Date(Date.now() + settings.intervalMinutes * 60000).toISOString(); this.emitStatus(); }
      }, { dataDir: this.dataDir, signals: new EventEmitter(), log: line => {
        const source = sources.find(source => line.includes(source.url) || line.includes(` ${source.type}:`)); this.log(line, source?.type);
      }, runEngine: async (source, signal) => {
        signal.throwIfAborted();
        if (this.closing || this.stopping) throw new Error("Scheduler stopped");
        this.nextCycleAt = null;
        const { task } = this.begin(source, false, settings, "scheduler", signal); return task;
      } });
      this.scheduler = task;
      void task.completion.catch(error => this.log(`ERROR scheduler: ${String(error)}`)).finally(() => {
        if (this.scheduler === task) { this.scheduler = null; this.stopping = false; this.nextCycleAt = null; this.emitStatus(); }
      });
    } finally { this.starting = false; if (!this.scheduler) this.stopping = false; this.emitStatus(); }
  }
  stopScheduler(): void {
    if (this.starting) { this.stopping = true; this.emitStatus(); }
    if (!this.scheduler) return;
    this.stopping = true; this.nextCycleAt = null; this.scheduler.stop(); this.emitStatus();
  }
  async stopRuns(): Promise<{ stopped: number }> {
    this.stopRevision++;
    this.stopScheduler();
    const active = [...this.runs.values()].filter(run => !run.finishedAt);
    this.manualStopping = active.length > 0;
    const reason = new Error("Detenido por el usuario");
    this.countryController?.abort(reason);
    const queued = active.filter(run => run.state === "QUEUED");
    for (const info of queued) { info.state = "FAILED"; info.finishedAt = new Date().toISOString(); info.records = 0; info.reason = reason.message; }
    for (const controller of this.controllers.values()) controller.abort(reason);
    if (this.discoveryContext) await closeAcquisitionContext(this.discoveryContext);
    this.log(`Detener: ${active.length} runs cancelados, incluyendo ${queued.length} marcas en cola.`);
    this.emitStatus();
    await Promise.all(queued.map(info => this.saveRun(info)));
    return { stopped: active.length };
  }
  async close(): Promise<void> {
    this.closing = true; this.stopScheduler();
    this.countryController?.abort(new Error("Application shutting down"));
    for (const controller of this.controllers.values()) controller.abort(new Error("Application shutting down"));
    if (this.discoveryContext) await closeAcquisitionContext(this.discoveryContext);
    await Promise.allSettled([...this.pending.values(), ...this.inflightEngines, ...(this.countryTask ? [this.countryTask] : []), ...(this.scheduler ? [this.scheduler.completion] : [])]);
    await Promise.allSettled([...this.inflightEngines]);
  }
}

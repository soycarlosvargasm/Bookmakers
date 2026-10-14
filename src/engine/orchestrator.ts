import { isBestFightOdds, usableRecord, assessRecord } from "../validation/records.js";
import type { CollectionRuntime } from "./collection.js";
import { copyVisibleSportsText } from "../visual/readiness.js";
import type { Evidence } from "./types.js";
import { EventEmitter } from "node:events";
import type { ProviderRecord } from "../normalization/types.js";
import { EngineStorage } from "./storage.js";
import { AccessibilityHandler, DomHandler, HttpHandler, NetworkHandler, VisualHandler, ensurePage, type VisualExtractor } from "./handlers.js";
import { waitForChallengeClear, type ChallengeProgress } from "./challenge.js";
import { BESTFIGHTODDS_EXTRACTION_PROFILE } from "../profiles/bestfightodds.js";
import { RenzoBrowserError } from "./renzo-browser.js";
import { crossValidateAcquisition } from "./cross-validation.js";
import { closeAcquisitionContext } from "./cancellation.js";
import type { AcquisitionContext, AcquisitionMethod, AcquisitionOutcome, Handler, InterventionEvent, Source, StageEvent, VisualProgress } from "./types.js";

const DEFAULT_HANDLERS: AcquisitionMethod[] = ["http", "network", "dom", "accessibility", "visual"];
const validate = (rows: ProviderRecord[]): ProviderRecord[] => rows.filter((row) =>
  Boolean(row.eventName?.trim() && row.market?.trim() && row.selection?.trim()) &&
  Boolean(row.rawOdds?.trim() || (typeof row.decimalOdds === "number" && row.decimalOdds > 1)) &&
  (!row.decimalOdds || (Number.isFinite(row.decimalOdds) && row.decimalOdds > 1 && row.decimalOdds < 10_000))
);

export type OrchestratorOptions = {
  collection?: CollectionRuntime;
  storage?: EngineStorage;
  handlers?: Handler[];
  visualExtractor?: VisualExtractor;
  onHumanIntervention?: (event: InterventionEvent) => void;
  onChallengeProgress?: (progress: ChallengeProgress) => void;
  onStage?: (event: StageEvent) => void;
  consoleNotifier?: boolean;
  challengeCheckIntervalMs?: number;
  timeoutMs?: number;
  observeMs?: number;
  forceBrowser?: boolean;
  browserMode?: "isolated" | "renzo";
  keepPersonalPageOpen?: boolean;
  signal?: AbortSignal;
  persist?: boolean;
  exhaustive?: boolean;
  currentOnly?: boolean;
  onVisualProgress?: (progress: VisualProgress) => void;
};

/** One-source cascade. A PAUSED outcome owns its visible browser until resume() or close(). */
export class AcquisitionOrchestrator extends EventEmitter {
  private readonly collection?: CollectionRuntime;
  private readonly storage: EngineStorage;
  private readonly handlers: Handler[];
  private readonly timeoutMs: number;
  private readonly observeMs: number;
  private readonly forceBrowser: boolean;
  private readonly browserMode: "isolated" | "renzo";
  private readonly keepPersonalPageOpen: boolean;
  private readonly persist: boolean;
  private readonly exhaustive: boolean;
  private readonly currentOnly: boolean;
  private readonly onVisualProgress?: (progress: VisualProgress) => void;
  private readonly signal?: AbortSignal;
  private readonly onHumanIntervention?: (event: InterventionEvent) => void;
  private readonly onChallengeProgress?: (progress: ChallengeProgress) => void;
  private readonly onStage?: (event: StageEvent) => void;
  private readonly consoleNotifier: boolean;
  private readonly challengeCheckIntervalMs: number;

  constructor(options: OrchestratorOptions = {}) {
    super();
    this.collection = options.collection;
    this.storage = options.storage ?? new EngineStorage();
    this.handlers = options.handlers ?? [new HttpHandler(), new NetworkHandler(), new DomHandler(), new AccessibilityHandler(), new VisualHandler(options.visualExtractor)];
    if (this.handlers.length !== DEFAULT_HANDLERS.length || this.handlers.some((handler, index) => handler.method !== DEFAULT_HANDLERS[index]))
      throw new Error(`Handlers must follow ${DEFAULT_HANDLERS.join(" → ")}`);
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.observeMs = options.observeMs ?? 2_000;
    this.browserMode = options.browserMode ?? "isolated";
    this.keepPersonalPageOpen = options.keepPersonalPageOpen ?? false;
    this.signal = options.signal;
    this.persist = options.persist ?? true;
    this.exhaustive = options.exhaustive ?? false;
    this.currentOnly = options.currentOnly ?? false;
    this.onVisualProgress = options.onVisualProgress;
    this.forceBrowser = this.browserMode === "renzo" || (options.forceBrowser ?? false);
    this.onHumanIntervention = options.onHumanIntervention;
    this.onChallengeProgress = options.onChallengeProgress;
    this.onStage = options.onStage;
    this.consoleNotifier = options.consoleNotifier ?? true;
    this.challengeCheckIntervalMs = options.challengeCheckIntervalMs ?? 1_000;
  }

  async run(source: Source): Promise<AcquisitionOutcome> {
    try {
      const url = new URL(source.url);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !source.type.trim())
        return { status: "FAILED", source, reason: "Invalid source URL or type", attempts: [] };
    } catch { return { status: "FAILED", source, reason: "Invalid source URL", attempts: [] }; }

    let memory;
    try { memory = await this.storage.readMemory(source); }
    catch (error) { return { status: "FAILED", source, reason: `Source memory unavailable: ${error instanceof Error ? error.message : String(error)}`, attempts: [] }; }
    const builtInProfile = isBestFightOdds(source) ? BESTFIGHTODDS_EXTRACTION_PROFILE : null;
    const extractionProfile = builtInProfile && memory?.extractionProfile?.version !== builtInProfile.version ? builtInProfile : memory?.extractionProfile ?? builtInProfile;
    // A remembered OCR success must never promote screenshot extraction ahead of
    // structured acquisition. The visual handler is always the final fallback.
    const primary = this.handlers.filter(handler => handler.method !== "visual" && (!(this.forceBrowser || this.collection?.options.textOnly) || handler.method !== "http"));
    const rememberedHandler = !this.forceBrowser && primary.find(handler => handler.method === memory?.method);
    const ordered = [...(rememberedHandler ? [rememberedHandler, ...primary.filter(handler => handler !== rememberedHandler)] : primary),
      this.handlers.find(handler => handler.method === "visual")!];
    const exhaustive = this.collection?.options.textOnly || (this.collection ? this.exhaustive : this.exhaustive || source.type === "betfair");
    const context: AcquisitionContext = { collection: this.collection, exhaustive, visualProgress: this.onVisualProgress, source, memory, signal: this.signal, configuration: null, timeoutMs: this.timeoutMs, observeMs: this.observeMs, browserMode: this.browserMode, sessionState: this.browserMode !== "renzo" && memory?.session.status === "VALID" ? memory.session.path ?? undefined : undefined };
    await this.collection?.initialize(context);
    this.collection?.setView(source.url);
    if (this.collection?.freshRun && !this.forceBrowser) return { status: "SKIPPED", source, reason: this.collection.cachedReason, attempts: [] };
    if (this.collection && !this.collection.allowedUrl(source.url)) {
      await this.collection.checkpoint(context, "PARTIAL", "Fuente saltada por una regla activa");
      return { status: "SKIPPED", source, reason: "Fuente saltada por una regla activa", attempts: [] };
    }
    context.keepPersonalPageOpen = this.keepPersonalPageOpen;
    const currentRecords = (rows: ProviderRecord[]) => validate(rows).filter(row => {
      if ((isBestFightOdds(source) || row.qualifiers?.extraction === "rendered-dom") && !usableRecord(row)) return false;
      if (this.collection && !this.collection.accepts(row)) return false;
      if (!this.currentOnly) return true;
      if (["closed", "finished", "ended", "final", "cancelled", "canceled", "settled"].includes((row.eventStatus ?? "").toLowerCase())) return false;
      if (["closed", "suspended", "settled", "unavailable"].includes((row.selectionStatus ?? "").toLowerCase())) return false;
      const start = row.eventStartTime ? Date.parse(row.eventStartTime) : NaN;
      return !Number.isFinite(start) || start >= Date.now() || ["live", "inplay", "in-play", "inprogress", "resumed"].includes((row.eventStatus ?? "").toLowerCase());
    });
    const copyTextEvidence = async (proof: Evidence) => {
      if (!context.page || context.page.isClosed() || (proof.payload as { copiedText?: string })?.copiedText) return;
      try { const copied = await copyVisibleSportsText(context.page); if (copied.prices) proof.payload = { ...(proof.payload as Record<string,unknown>), copiedText: copied.text }; }
      catch { this.signal?.throwIfAborted(); }
    };
    context.savePageCapture = async (method, result) => {
      this.signal?.throwIfAborted();
      this.collection?.observeRows(result.evidence.url, result.records);
      let accepted = currentRecords(result.records);
      const validation = await crossValidateAcquisition(context, { method, records: accepted });
      this.signal?.throwIfAborted();
      if (validation.conflicting) this.collection?.noteFailure(result.evidence.url, "Cuotas con precios contradictorios pendientes de revisión");
      const structuralRejected = result.records.filter(row => !usableRecord(row,result.evidence.url) && (isBestFightOdds(source) || row.qualifiers?.extraction === "rendered-dom"));
      const rejectedRecords = [...structuralRejected, ...accepted.filter((_, index) => validation.quotes[index]!.status === "CONFLICT")];
      accepted = accepted.flatMap((record, index) => validation.quotes[index]!.status === "CONFLICT" ? [] : [{ ...record, qualifiers: { ...record.qualifiers, crossValidation: validation.quotes[index]!.status } }]);
      result.evidence.payload = { ...(result.evidence.payload as Record<string, unknown>), records: accepted, rejectedRecords, crossValidation: validation };
      await copyTextEvidence(result.evidence);
      const rawPath = this.persist ? await this.storage.saveRaw(source, method, result.evidence, accepted.length) : "";
      return { records: accepted, rawPath };
    };
    const attempts: Array<{ method: AcquisitionMethod; reason: string }> = [];
    const closeBrowser = async () => { await closeAcquisitionContext(context); context.browser = undefined; context.browserContext = undefined; context.page = undefined; };
    const notify = (event: InterventionEvent): void => {
      if (this.consoleNotifier) console.warn(`[HUMAN_INTERVENTION_REQUIRED] ${event.source.type} ${event.url}: ${event.reason}`);
      try { this.emit("HUMAN_INTERVENTION_REQUIRED", event); this.onHumanIntervention?.(event); }
      catch (error) { console.error("Human intervention notifier failed:", error); }
    };
    const stage = (event: StageEvent): void => {
      try { this.emit("STAGE", event); this.onStage?.(event); }
      catch (error) { console.error("Stage notifier failed:", error); }
    };

    const paused = (index: number, event: InterventionEvent): AcquisitionOutcome => {
      const controller = new AbortController();
      const abort = () => { controller.abort(this.signal?.reason); confirmHttp?.(); void closeBrowser(); };
      this.signal?.addEventListener("abort", abort, { once: true });
      let confirmHttp: (() => void) | undefined;
      const httpConfirmation = event.method === "http" ? new Promise<void>((resolve) => { confirmHttp = resolve; }) : null;
      if (this.signal?.aborted) abort();
      const completion: Promise<AcquisitionOutcome> = (async () => {
        try {
          if (httpConfirmation) await httpConfirmation;
          else if (event.page) await waitForChallengeClear(event.page, source.url, controller.signal, this.challengeCheckIntervalMs, this.onChallengeProgress);
          controller.signal.throwIfAborted();
          this.signal?.throwIfAborted();
          if (this.persist) await this.storage.memory.recordHumanResolution(source);
          return await cascade(event.method === "http" ? index + 1 : index);
        } catch (error) {
          await closeBrowser();
          return { status: "FAILED", source, reason: error instanceof Error ? error.message : String(error), attempts };
        } finally { this.signal?.removeEventListener("abort", abort); }
      })();
      return { status: "PAUSED", source, event, completion, resume: () => { confirmHttp?.(); return completion; }, close: async () => { controller.abort(); confirmHttp?.(); await closeBrowser(); } };
    };

    const cascade = async (start: number): Promise<AcquisitionOutcome> => {
      for (let index = start; index < ordered.length; index++) {
        this.signal?.throwIfAborted();
        const handler = ordered[index]!;
        const remembered = memory?.method === handler.method ? memory.configuration : null;
        const configuration = {
          ...(remembered ?? {}),
          ...(handler.method === "dom" && extractionProfile?.domProfile ? { profile: extractionProfile.domProfile } : {}),
          ...(handler.method === "network" && extractionProfile?.networkEndpoints ? { endpoints: extractionProfile.networkEndpoints } : {})
        };
        context.configuration = Object.keys(configuration).length ? configuration : null;
        stage({ source, method: handler.method, status: "STARTED" });
        try {
          const result = await handler.run(context);
          this.signal?.throwIfAborted();
          if (result.kind === "miss") {
            if (handler.method === "visual" && this.collection?.filtered && !this.collection.reason && this.collection.views.some(v => v.status === "COMPLETE")) {
              await this.collection.checkpoint(context, "COMPLETE", "Las vistas procesadas quedaron fuera de la selección o son históricas");
              await closeBrowser();
              return { status: "SKIPPED", source, reason: "Las vistas procesadas quedaron fuera de la selección o son históricas", attempts: [] };
            }
            attempts.push({ method: handler.method, reason: result.reason });
            if (this.persist) await this.storage.memory.recordAttempt(source, handler.method, "MISS", result.reason);
            if (result.sessionInvalid) { if (this.persist) await this.storage.memory.invalidateSession(source); context.sessionState = undefined; }
            stage({ source, method: handler.method, status: "MISS", reason: result.reason });
            continue;
          }
          if (result.kind === "challenge") {
            if (handler.method === "http" && (exhaustive || ["retabet-pe", "bet9ja", "10cric"].includes(source.type))) {
              const reason = `${result.reason}; continuing automatically in Chromium`;
              attempts.push({ method: handler.method, reason });
              if (this.persist) await this.storage.memory.recordAttempt(source, handler.method, "MISS", reason);
              stage({ source, method: handler.method, status: "MISS", reason });
              continue;
            }
            const page = handler.method === "http" ? undefined : await ensurePage(context);
            const event: InterventionEvent = { type: "HUMAN_INTERVENTION_REQUIRED", source, method: handler.method, reason: result.reason, url: result.url, page };
            if (this.persist) await this.storage.memory.recordChallenge(source, handler.method, result.reason, Boolean(context.sessionState));
            stage({ source, method: handler.method, status: "CHALLENGE", reason: result.reason });
            notify(event);
            return paused(index, event);
          }
          this.collection?.observeRows(result.evidence.url, result.records);
      let accepted = currentRecords(result.records);
          if (!accepted.length) {
            if (this.persist && isBestFightOdds(source)) {result.evidence.payload={...(result.evidence.payload as Record<string,unknown>),pendingReason:"BestFightOdds: asociación no demostrada; evidencia pendiente",rejectedRecords:result.records.map(row=>({record:row,reason:assessRecord(row,result.evidence.url).reason})),records:[]};await copyTextEvidence(result.evidence);await this.storage.saveRaw(source,handler.method,result.evidence,0);}
            attempts.push({ method: handler.method, reason: "Validation rejected incomplete records" });
            if (this.persist) await this.storage.memory.recordAttempt(source, handler.method, "MISS", "Validation rejected incomplete records");
            stage({ source, method: handler.method, status: "MISS", reason: "Validation rejected incomplete records" });
            continue;
          }
          if (!result.validatedPages) {
          const validation = await crossValidateAcquisition(context, { method: handler.method, records: accepted });
          if (validation.conflicting) this.collection?.noteFailure(result.evidence.url, "Cuotas con precios contradictorios pendientes de revisión");
      const structuralRejected = result.records.filter(row => !usableRecord(row,result.evidence.url) && (isBestFightOdds(source) || row.qualifiers?.extraction === "rendered-dom"));
      const rejectedRecords = [...structuralRejected, ...accepted.filter((_, index) => validation.quotes[index]!.status === "CONFLICT")];
          accepted = accepted.flatMap((record, index) => validation.quotes[index]!.status === "CONFLICT" ? [] : [{ ...record,
            qualifiers: { ...record.qualifiers, crossValidation: validation.quotes[index]!.status } }]);
          result.evidence.payload = { ...(result.evidence.payload && typeof result.evidence.payload === "object" && !Array.isArray(result.evidence.payload)
            ? result.evidence.payload as Record<string, unknown> : { acquisitionPayload: result.evidence.payload }), records: accepted,
            ...(rejectedRecords.length ? { rejectedRecords } : {}), crossValidation: validation };
          if (!accepted.length) {
            if (this.persist) await this.storage.saveRaw(source, handler.method, result.evidence, 0);
            const reason = `Cross-validation found conflicting prices for all ${validation.conflicting} quotes`;
            attempts.push({ method: handler.method, reason });
            if (this.persist) await this.storage.memory.recordAttempt(source, handler.method, "MISS", reason);
            stage({ source, method: handler.method, status: "MISS", reason });
            continue;
          }
          }
          this.signal?.throwIfAborted();
          const acquiredBy = result.acquisitionMethod ?? handler.method;
          await copyTextEvidence(result.evidence);
          const rawPath = this.persist ? await this.storage.saveRaw(source, acquiredBy, result.evidence, accepted.length) : "";
          this.signal?.throwIfAborted();
          const timestamp = this.persist ? (await this.storage.memory.recordSuccess(source, acquiredBy, result.configuration, context.browserContext, result.extractionProfile)).lastSuccessAt! : new Date().toISOString();
          stage({ source, method: acquiredBy, status: "SUCCEEDED" });
          if (exhaustive && handler.method !== "visual") {
            context.visualSeed = { url: context.page?.url() ?? source.url, records: accepted, method: handler.method };
            index = ordered.length - 2; continue;
          }
          await this.collection?.checkpoint(context, this.collection.reason || (result.evidence.payload as { coverage?: { complete?: boolean } })?.coverage?.complete === false ? "PARTIAL" : "COMPLETE");
          await closeBrowser();
          return { status: "SUCCEEDED", source, method: acquiredBy, records: accepted, rawPath, timestamp };
        } catch (error) {
          if (this.signal?.aborted) throw this.signal.reason;
          if (/Presupuesto de/.test(error instanceof Error ? error.message : String(error))) throw error;
          const reason = error instanceof Error ? error.message : String(error);
          attempts.push({ method: handler.method, reason });
          if (this.persist) await this.storage.memory.recordAttempt(source, handler.method, "ERROR", reason);
          stage({ source, method: handler.method, status: "ERROR", reason });
          if (error instanceof RenzoBrowserError) {
            await closeBrowser();
            return { status: "FAILED", source, reason, attempts };
          }
        }
      }
      await this.collection?.checkpoint(context, "PARTIAL", attempts.at(-1)?.reason);
      if (this.persist) await this.storage.saveFailure(context, attempts);
      await closeBrowser();
      return { status: "FAILED", source, reason: `All acquisition handlers exhausted: ${attempts.map(a => `${a.method}: ${a.reason}`).join("; ")}`, attempts };
    };
    try { return await cascade(this.collection?.resumePending ? ordered.length - 1 : 0); }
    catch (error) {
      await this.storage.flush();
      await this.collection?.checkpoint(context, "PARTIAL", String(error));
      await closeBrowser();
      return { status: "FAILED", source, reason: `Orchestrator failed: ${error instanceof Error ? error.message : String(error)}`, attempts };
    }
  }
}

export const acquire = (source: Source, options?: OrchestratorOptions): Promise<AcquisitionOutcome> =>
  new AcquisitionOrchestrator(options).run(source);

export type { Source, AcquisitionOutcome, InterventionEvent, StageEvent } from "./types.js";

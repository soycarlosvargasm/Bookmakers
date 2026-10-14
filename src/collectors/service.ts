import { randomUUID } from "node:crypto";
import type { SportsbookConnector } from "../connectors/types.js";
import { normalizeRecord } from "../normalization/normalize.js";
import { AppendOnlyOddsHistory } from "../normalization/deduplication.js";
import { RawPayloadCollector } from "./raw.js";
import type { RawPayloadSink } from "./raw.js";
import { inspectCollection } from "../quality/service.js";
import type { QualityFinding } from "../quality/service.js";
import type { NormalizedRecord } from "../normalization/types.js";

export interface NormalizedRecordSink {
  saveNormalizedRecords(records: NormalizedRecord[], lease?: {runId:number;leaseOwner:string}): Promise<void>;
  priorNonemptyRun?(source:string,mode:string):Promise<boolean>;
  countTimestampRegressions?(records:NormalizedRecord[]):Promise<number>;
  saveQualityFindings?(runId:number|undefined,findings:QualityFinding[]):Promise<void>;
  collectReviewCases?(records:NormalizedRecord[],findings:QualityFinding[]):Promise<void>;
}

export type CollectorRunInput = {
  sportsbook: string;
  accountAlias: string;
  mode: "events" | "prematch" | "live";
  startedAt: string;
  leaseOwner: string;
  leaseDurationMs: number;
};

export interface CollectorRunSink {
  startCollectorRun(input: CollectorRunInput): Promise<number>;
  heartbeatCollectorRun?(id: number, leaseOwner: string, leaseDurationMs: number): Promise<boolean>;
  reconcileOrphanCollectorRuns?(): Promise<number>;
  finishCollectorRun(id: number, input: { leaseOwner?: string; status: "SUCCEEDED" | "FAILED"; finishedAt: string; recordsSeen: number; errorMessage?: string }): Promise<void>;
}

export class CollectorService {
  constructor(
    private readonly history = new AppendOnlyOddsHistory(),
    private readonly raw = new RawPayloadCollector(),
    private readonly rawSink?: RawPayloadSink,
    private readonly normalizedSink?: NormalizedRecordSink,
    private readonly log?: (line: string) => void,
    private readonly runSink?: CollectorRunSink,
    private readonly leaseConfig = { durationMs: 60_000, heartbeatMs: 15_000 }
  ) {}

  async collect(connector: SportsbookConnector, mode: "events" | "prematch" | "live") {
    const startedAt = Date.now();
    const leaseOwner = randomUUID();
    await this.runSink?.reconcileOrphanCollectorRuns?.();
    const runId = await this.runSink?.startCollectorRun({ sportsbook: connector.context.sportsbook, accountAlias: connector.context.accountAlias, mode, startedAt: new Date().toISOString(), leaseOwner, leaseDurationMs: this.leaseConfig.durationMs });
    let leaseFailure: Error | undefined;
    let heartbeating = false;
    const heartbeat = async (): Promise<void> => {
      if (runId === undefined || !this.runSink?.heartbeatCollectorRun || heartbeating) return;
      heartbeating = true;
      try { if (!await this.runSink.heartbeatCollectorRun(runId, leaseOwner, this.leaseConfig.durationMs)) leaseFailure = new Error("Collector lease lost"); }
      catch { leaseFailure = new Error("Collector heartbeat failed"); }
      finally { heartbeating = false; }
    };
    const timer = setInterval(() => { void heartbeat(); }, this.leaseConfig.heartbeatMs);
    timer.unref();
    try {
      const method = mode === "events" ? connector.collectEvents : mode === "prematch" ? connector.collectPrematch : connector.collectLive;
      const result = await method.call(connector);
      await heartbeat();
      if (leaseFailure) throw leaseFailure;
      const rawPayloads = [];
      for (const payload of result.rawPayloads ?? []) rawPayloads.push(await this.raw.collect(payload, this.rawSink));
      const normalizedRecords = (result.normalizedRecords ?? []).map((record) => normalizeRecord(record));
      const priorRegressions=await this.normalizedSink?.countTimestampRegressions?.(normalizedRecords)??0;
      await this.normalizedSink?.saveNormalizedRecords(normalizedRecords,runId===undefined?undefined:{runId,leaseOwner});
      await heartbeat();
      if(leaseFailure) throw leaseFailure;
      const priorNonempty=await this.normalizedSink?.priorNonemptyRun?.(connector.context.sportsbook,mode)??false;
      const findings=inspectCollection(connector.context.sportsbook,normalizedRecords,result.rawPayloads??[],priorNonempty);
      if(priorRegressions)findings.push({source:connector.context.sportsbook,code:"TIMESTAMP_REGRESSION",count:priorRegressions,details:{reason:"provider timestamp older than previous observation"}});
      await this.normalizedSink?.saveQualityFindings?.(runId,findings);
      const changes = normalizedRecords.map((record) => this.history.record(record));
      await (runId === undefined ? undefined : this.runSink?.finishCollectorRun(runId, { leaseOwner, status: "SUCCEEDED", finishedAt: new Date().toISOString(), recordsSeen: normalizedRecords.length }));
      const reviewCollection = this.normalizedSink?.collectReviewCases?.(normalizedRecords,findings);
      if (reviewCollection) void reviewCollection.catch((error) => this.log?.(JSON.stringify({ run: "review-dataset", status: "skipped", error: error instanceof Error ? error.message : String(error) })));
      this.log?.(JSON.stringify({ connector: connector.id, sportsbook: connector.context.sportsbook, run: mode, eventsParsed: new Set(normalizedRecords.map((record) => record.sourceEventId).filter(Boolean)).size, marketsParsed: new Set(normalizedRecords.map((record) => `${record.sourceEventId}:${record.market}:${record.marketPeriod}`)).size, quotesParsed: normalizedRecords.length, duration: Date.now() - startedAt }));
      return { rawPayloads, changes };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      await (runId === undefined ? undefined : this.runSink?.finishCollectorRun(runId, { leaseOwner, status: "FAILED", finishedAt: new Date().toISOString(), recordsSeen: 0, errorMessage: message }));
      throw cause;
    } finally { clearInterval(timer); }
  }

  get historyStore(): AppendOnlyOddsHistory { return this.history; }
}

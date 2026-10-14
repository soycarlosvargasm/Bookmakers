import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { EventEmitter } from "node:events";
import { executeSource, type BatchResult, type BatchSummary } from "../batch.js";
import type { AcquisitionOutcome, Source } from "../engine/types.js";
import { CycleChanges } from "../changes/cycles.js";
import { cancellable } from "../engine/cancellation.js";

export type CycleSummary = BatchSummary & { cycleId: string; intervalMinutes: number };
export type ScheduleOptions = {
  sources: Source[];
  intervalMinutes?: number;
  perSourceTimeoutMs?: number;
  delayBetweenSourcesMs?: number;
  onCycleComplete?: (summary: CycleSummary) => void | Promise<void>;
};
export type SchedulerDependencies = {
  dataDir?: string;
  log?: (line: string) => void;
  signals?: Pick<EventEmitter, "on" | "off">;
  /** Tests may inject a cancellable engine invocation; production uses the isolated batch worker. */
  runEngine?: (source: Source, signal: AbortSignal) => Promise<AcquisitionOutcome>;
};
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

async function invokeEngine(source: Source, timeoutMs: number, run: NonNullable<SchedulerDependencies["runEngine"]>, signal: AbortSignal): Promise<BatchResult> {
  signal.throwIfAborted();
  const started = Date.now();
  const cancellation = new AbortController();
  const abort = () => cancellation.abort(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const task = Promise.resolve().then(() => { cancellation.signal.throwIfAborted(); return run(source, cancellation.signal); }).then(async outcome => {
    if (outcome.status === "PAUSED") await outcome.close();
    cancellation.signal.throwIfAborted();
    if (outcome.status === "SUCCEEDED") return { source, status: outcome.status, method: outcome.method, recordCount: outcome.records.length };
    if (outcome.status === "PAUSED") return { source, status: outcome.status, method: outcome.event.method, recordCount: 0, reason: outcome.event.reason };
    return { source, status: outcome.status, method: outcome.attempts.at(-1)?.method ?? null, recordCount: 0, reason: outcome.reason };
  });
  try {
    timer = setTimeout(() => cancellation.abort(new Error(`Global source timeout after ${timeoutMs} ms`)), timeoutMs);
    const result = await cancellable(task, cancellation.signal);
    return { ...result, durationMs: Date.now() - started };
  } finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
}

/** Serial cycles, with the configured interval measured from completion of each cycle. */
export function schedule(options: ScheduleOptions, dependencies: SchedulerDependencies = {}): { stop: () => void; completion: Promise<void> } {
  const sources = options.sources.map(source => ({ ...source }));
  const intervalMinutes = options.intervalMinutes ?? 15;
  const intervalMs = intervalMinutes * 60_000;
  const timeoutMs = options.perSourceTimeoutMs ?? 180_000;
  const delayMs = options.delayBetweenSourcesMs ?? 2_000;
  if (!sources.length) throw new Error("Scheduler requires at least one source");
  if (!Number.isFinite(intervalMs) || intervalMs < 1 || intervalMs > 2_147_483_647) throw new Error("Interval must be between 1 and 2147483647 ms");
  for (const [name, value, minimum] of [["perSourceTimeoutMs", timeoutMs, 1], ["delayBetweenSourcesMs", delayMs, 0]] as const)
    if (!Number.isSafeInteger(value) || value < minimum || value > 2_147_483_647) throw new Error(`${name} must be an integer between ${minimum} and 2147483647`);
  const dataDir = dependencies.dataDir ?? ".engine";
  const log = dependencies.log ?? console.log;
  const changes = new CycleChanges(dataDir, log);
  const signals = dependencies.signals ?? process;
  const idle = new AbortController();
  let stopping = false;
  const stop = (): void => {
    if (stopping) return;
    stopping = true;
    log("Stopping scheduler...");
    idle.abort(new Error("Detenido por el usuario"));
  };
  signals.on("SIGINT", stop);
  log(`Scheduler started. Interval: ${intervalMinutes} min. Sources: ${sources.length}.`);
  const completion = (async () => {
    try {
      while (!stopping) {
        const started = Date.now();
        const results: BatchResult[] = [];
        for (const [index, source] of sources.entries()) {
          if (stopping) break;
          if (index) await delay(delayMs, undefined, { signal: idle.signal }).catch(error => { if (!idle.signal.aborted) throw error; });
          if (stopping) break;
          const sourceStarted = Date.now();
          try {
            results.push(dependencies.runEngine
              ? await invokeEngine(source, timeoutMs, dependencies.runEngine, idle.signal)
              : await executeSource(source, timeoutMs, dataDir, idle.signal));
          } catch (error) {
            results.push({ source, status: "FAILED", method: null, recordCount: 0, durationMs: Date.now() - sourceStarted, reason: message(error) });
          }
        }
        const finished = Date.now();
        const summary: CycleSummary = {
          cycleId: randomUUID(), startedAt: new Date(started).toISOString(), finishedAt: new Date(finished).toISOString(),
          durationMs: finished - started, intervalMinutes, results,
          totals: { attempted: results.length, succeeded: results.filter(r => r.status === "SUCCEEDED").length,
            failed: results.filter(r => r.status === "FAILED").length, paused: results.filter(r => r.status === "PAUSED").length,
            totalRecords: results.reduce((sum, r) => sum + r.recordCount, 0) }
        };
        const directory = join(dataDir, "scheduler", summary.startedAt.slice(0, 10));
        let path = join(directory, `${summary.startedAt.slice(11, 19).replace(/:/g, "-")}.json`);
        try {
          await mkdir(directory, { recursive: true });
          const body = JSON.stringify(summary, null, 2) + "\n";
          try { await writeFile(path, body, { flag: "wx" }); }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
            path = path.replace(/\.json$/, `-${summary.cycleId}.json`);
            await writeFile(path, body, { flag: "wx" });
          }
          log(`Cycle ${summary.cycleId}`);
          for (const result of results) log(`${result.status} ${result.source.url} | method=${result.method ?? "none"} records=${result.recordCount} duration=${result.durationMs} ms${result.reason ? ` | ${result.reason.replace(/\r?\n/g, " ")}` : ""}`);
          log(`Attempted: ${summary.totals.attempted}; succeeded: ${summary.totals.succeeded}; failed: ${summary.totals.failed}; paused: ${summary.totals.paused}; total records: ${summary.totals.totalRecords}`);
          log(`Summary: ${path}`);
        } catch (error) { log(`Cycle persistence failed: ${message(error)}`); }
        try { if (!stopping) await changes.processCycle(summary); }
        catch (error) { log(`Change detection failed: ${message(error)}`); }
        try { await options.onCycleComplete?.(summary); }
        catch (error) { log(`onCycleComplete failed: ${message(error)}`); }
        if (!stopping) await delay(intervalMs, undefined, { signal: idle.signal }).catch(error => { if (!idle.signal.aborted) throw error; });
      }
    } finally { signals.off("SIGINT", stop); }
  })();
  return { stop, completion };
}

import { fork } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type BrowserServer } from "playwright";
import { loadSourceCatalog, type CatalogRow } from "./sources/registry.js";
import { AcquisitionOrchestrator } from "./engine/orchestrator.js";
import { EngineStorage } from "./engine/storage.js";
import { HttpHandler, NetworkHandler, DomHandler, AccessibilityHandler, VisualHandler } from "./engine/handlers.js";
import type { AcquisitionMethod, AcquisitionOutcome, Handler, Source } from "./engine/types.js";

export type BatchResult = {
  source: Source;
  status: "SUCCEEDED" | "FAILED" | "PAUSED" | "SKIPPED";
  method: AcquisitionMethod | null;
  recordCount: number;
  reason?: string;
  durationMs: number;
};
export type BatchSummary = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  results: BatchResult[];
  totals: { attempted: number; succeeded: number; failed: number; paused: number; totalRecords: number };
};
export type BatchOptions = { timeoutMs?: number; delayMs?: number; dataDir?: string; log?: (message: string) => void };
type WorkerMessage = { kind: "result"; result: Omit<BatchResult, "durationMs"> } | { kind: "browser"; pid: number } | { kind: "stage"; method: AcquisitionMethod };
const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);

export function catalogSources(rows: CatalogRow[]): Source[] {
  const sources = new Map<string, Source>();
  for (const row of rows) {
    if (!sources.has(row.url)) sources.set(row.url, { url: row.url, type: row.domain.replace(/^www\./, "").split(".")[0]! });
  }
  return [...sources.values()];
}

/** An isolated invocation of the existing cascade; no human-resume loop. */
async function worker(source: Source, dataDir: string): Promise<void> {
  let server: BrowserServer | undefined;
  let paused: Extract<AcquisitionOutcome, { status: "PAUSED" }> | undefined;
  let method: AcquisitionMethod | null = null;
  let stopping = false;
  const close = async (): Promise<void> => {
    stopping = true;
    await paused?.close();
    await server?.close();
  };
  process.once("SIGTERM", () => {
    void close().catch(() => server?.process()?.kill("SIGKILL")).finally(() => process.exit(0));
  });
  const handlers: Handler[] = [new HttpHandler(), new NetworkHandler(), new DomHandler(), new AccessibilityHandler(), new VisualHandler()].map((handler) => ({
    method: handler.method,
    async run(context) {
      if (handler.method !== "http" && !context.browser) {
        server = await chromium.launchServer({ headless: true });
        const pid = server.process()?.pid;
        if (pid) process.send?.({ kind: "browser", pid } satisfies WorkerMessage);
        if (stopping) { await server.close(); throw new Error("Batch source cancelled"); }
        context.browser = await chromium.connect(server.wsEndpoint());
      }
      return handler.run(context);
    }
  }));
  let result: Omit<BatchResult, "durationMs">;
  try {
    const engine = new AcquisitionOrchestrator({
      storage: new EngineStorage(dataDir), handlers, consoleNotifier: false,
      onStage: (event) => { method = event.method; process.send?.({ kind: "stage", method } satisfies WorkerMessage); }
    });
    const outcome = await engine.run(source);
    if (outcome.status === "PAUSED") {
      paused = outcome;
      result = { source, status: "PAUSED", method: outcome.event.method, recordCount: 0, reason: outcome.event.reason };
      await paused.close();
      await paused.completion;
    } else if (outcome.status === "SUCCEEDED") {
      result = { source, status: "SUCCEEDED", method: outcome.method, recordCount: outcome.records.length };
    } else if (outcome.status === "SKIPPED") {
      result = { source, status: "SKIPPED", method: null, recordCount: 0, reason: outcome.reason };
    } else {
      const last = outcome.attempts.at(-1);
      result = { source, status: "FAILED", method: last?.method ?? method, recordCount: 0, reason: last ? `${outcome.reason}: ${last.reason}` : outcome.reason };
    }
  } catch (error) {
    result = { source, status: "FAILED", method, recordCount: 0, reason: messageOf(error) };
  }
  try { await close(); }
  catch (error) {
    server?.process()?.kill("SIGKILL");
    result = { source, status: "FAILED", method, recordCount: 0, reason: `Source cleanup failed: ${messageOf(error)}` };
  }
  process.send?.({ kind: "result", result } satisfies WorkerMessage, () => process.exit(0));
}

export async function executeSource(source: Source, timeoutMs: number, dataDir: string, cancellation?: AbortSignal): Promise<BatchResult> {
  cancellation?.throwIfAborted();
  const started = Date.now();
  return new Promise((complete) => {
    const child = fork(fileURLToPath(import.meta.url), ["--worker", JSON.stringify(source), dataDir], {
      execArgv: ["--import", "tsx"], stdio: ["ignore", "ignore", "pipe", "ipc"]
    });
    let received: Omit<BatchResult, "durationMs"> | undefined;
    let browserPid: number | undefined;
    let lastMethod: AcquisitionMethod | null = null;
    let stderr = "";
    let force: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("message", (message: WorkerMessage) => {
      if (message.kind === "browser") browserPid = message.pid;
      else if (message.kind === "stage") lastMethod = message.method;
      else if (!timedOut) received = message.result;
    });
    child.on("error", (error) => { received = { source, status: "FAILED", method: null, recordCount: 0, reason: messageOf(error) }; });
    const terminate = (reason: string) => {
      if (timedOut) return;
      timedOut = true;
      received = { source, status: "FAILED", method: lastMethod, recordCount: 0, reason };
      child.kill("SIGTERM");
      force = setTimeout(() => {
        if (browserPid) { try { process.kill(browserPid, "SIGKILL"); } catch { /* Already closed. */ } }
        child.kill("SIGKILL");
      }, 5_000);
    };
    const abort = () => terminate(messageOf(cancellation?.reason ?? "Source cancelled"));
    const timer = setTimeout(() => terminate(`Global source timeout after ${timeoutMs} ms`), timeoutMs);
    cancellation?.addEventListener("abort", abort, { once: true });
    if (cancellation?.aborted) abort();
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      clearTimeout(force);
      cancellation?.removeEventListener("abort", abort);
      if (browserPid) { try { process.kill(browserPid, "SIGKILL"); } catch { /* Already closed. */ } }
      complete({ ...(received ?? { source, status: "FAILED", method: null, recordCount: 0,
        reason: `Engine worker exited (${signal ?? code})${stderr.trim() ? `: ${stderr.trim()}` : " without a result"}` }), durationMs: Date.now() - started });
    });
  });
}

export async function runBatch(sources: Source[], options: BatchOptions = {}): Promise<{ summary: BatchSummary; path: string }> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const delayMs = options.delayMs ?? 2_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) throw new Error("--timeout-ms must be an integer between 1 and 2147483647");
  if (!Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > 2_147_483_647) throw new Error("--delay-ms must be an integer between 0 and 2147483647");
  const dataDir = options.dataDir ?? ".engine";
  const log = options.log ?? console.log;
  const started = Date.now();
  const results: BatchResult[] = [];
  log(`Batch: ${sources.length} sources; timeout=${timeoutMs} ms; delay=${delayMs} ms; sequential`);
  for (const [index, source] of sources.entries()) {
    if (index) await delay(delayMs);
    const sourceStarted = Date.now();
    let result: BatchResult;
    try { result = await executeSource(source, timeoutMs, dataDir); }
    catch (error) { result = { source, status: "FAILED", method: null, recordCount: 0, reason: messageOf(error), durationMs: Date.now() - sourceStarted }; }
    results.push(result);
    log(`[${index + 1}/${sources.length}] ${result.status} ${source.url} | method=${result.method ?? "none"} records=${result.recordCount} duration=${result.durationMs} ms${result.reason ? ` | ${result.reason.replace(/\r?\n/g, " ")}` : ""}`);
  }
  const finished = Date.now();
  const summary: BatchSummary = {
    startedAt: new Date(started).toISOString(), finishedAt: new Date(finished).toISOString(), durationMs: finished - started, results,
    totals: { attempted: results.length, succeeded: results.filter(r => r.status === "SUCCEEDED").length,
      failed: results.filter(r => r.status === "FAILED").length, paused: results.filter(r => r.status === "PAUSED").length,
      totalRecords: results.reduce((sum, r) => sum + r.recordCount, 0) }
  };
  const directory = join(dataDir, "batch");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${started}.json`);
  await writeFile(path, JSON.stringify(summary, null, 2) + "\n", { flag: "wx" });
  log(`Attempted: ${summary.totals.attempted}; succeeded: ${summary.totals.succeeded}; failed: ${summary.totals.failed}; paused: ${summary.totals.paused}; total records: ${summary.totals.totalRecords}`);
  log(`Duration: ${summary.durationMs} ms`);
  log(`Summary: ${path}`);
  return { summary, path };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] === "--worker" && process.send) {
    await worker(JSON.parse(args[1]!) as Source, args[2]!);
    return;
  }
  const options: BatchOptions = {};
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i];
    if ((name !== "--timeout-ms" && name !== "--delay-ms") || args[i + 1] === undefined) throw new Error("Usage: npm run engine:batch -- [--timeout-ms <ms>] [--delay-ms <ms>]");
    options[name === "--timeout-ms" ? "timeoutMs" : "delayMs"] = Number(args[i + 1]);
  }
  const sources = catalogSources(await loadSourceCatalog());
  if (sources.length < 2) throw new Error("Source catalogue must contain at least two distinct source URLs");
  await runBatch(sources, options);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => { console.error(messageOf(error)); process.exitCode = 1; });
}

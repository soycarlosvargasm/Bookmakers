import { loadConfig } from "./config/index.js";
import { BrowserManager } from "./browser/manager.js";
import { BovadaConnector } from "./connectors/bovada/connector.js";
import { SxBetConnector } from "./connectors/sxbet/connector.js";
import { ActionNetworkConnector } from "./connectors/actionnetwork/connector.js";
import { DEFAULT_YAHOO_ODDS_PATHS, YahooOddsConnector } from "./connectors/yahoo/connector.js";
import { BestFightOddsConnector } from "./connectors/bestfightodds/connector.js";
import { FightOddsConnector } from "./connectors/fightodds/connector.js";
import type { SportsbookConnector } from "./connectors/types.js";
import { CollectorService } from "./collectors/service.js";
import { PostgresStorage } from "./storage/postgres.js";
import { CollectorScheduler, DEFAULT_SCHEDULER_CONFIG } from "./scheduler/scheduler.js";
import { RequestGovernor, DEFAULT_REQUEST_POLICY } from "./scheduler/requests.js";
import type { SchedulerConfig } from "./scheduler/types.js";

const config = loadConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required for polling");

const numberEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};
const enabled = (name: string, fallback: boolean): boolean => (process.env[name] ?? String(fallback)).toLowerCase() === "true";
const schedulerConfig: SchedulerConfig = {
  liveIntervalMs: numberEnv("POLL_LIVE_INTERVAL_MS", DEFAULT_SCHEDULER_CONFIG.liveIntervalMs),
  prematchNearIntervalMs: numberEnv("POLL_EVENTS_INTERVAL_MS", DEFAULT_SCHEDULER_CONFIG.prematchNearIntervalMs),
  prematchFarIntervalMs: DEFAULT_SCHEDULER_CONFIG.prematchFarIntervalMs,
  idleIntervalMs: DEFAULT_SCHEDULER_CONFIG.idleIntervalMs,
  errorBackoffMs: DEFAULT_SCHEDULER_CONFIG.errorBackoffMs,
  maxRequestsPerMinute: numberEnv("POLL_MAX_REQUESTS_PER_MINUTE", DEFAULT_SCHEDULER_CONFIG.maxRequestsPerMinute)
};

const storage = new PostgresStorage(config.databaseUrl);
const scheduler = new CollectorScheduler();
const browser = new BrowserManager({ headless: true, sessionStoragePath: config.sessionStoragePath });
const connectors: SportsbookConnector[] = [];
const governor = (): RequestGovernor => new RequestGovernor({ ...DEFAULT_REQUEST_POLICY, maxRequestsPerMinute: schedulerConfig.maxRequestsPerMinute, maxConcurrency: numberEnv("POLL_MAX_CONCURRENT_REQUESTS", 4) });
if (enabled("POLL_BOVADA", true)) connectors.push(new BovadaConnector({
  browserManager: browser,
  requestGovernor: governor(),
  sportPaths: (process.env.BOVADA_SPORT_PATHS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  requestTimeoutMs: numberEnv("BOVADA_REQUEST_TIMEOUT_MS", 15_000)
}));
if (enabled("POLL_SXBET", true)) connectors.push(new SxBetConnector({
  requestGovernor: governor(),
  maxMarkets: numberEnv("SXBET_MAX_MARKETS", 100),
  requestTimeoutMs: numberEnv("SXBET_REQUEST_TIMEOUT_MS", 15_000)
}));
if (enabled("POLL_ACTIONNETWORK", false)) connectors.push(new ActionNetworkConnector({
  requestGovernor: governor(),
  ...(process.env.ACTION_LEAGUES ? { leagues: process.env.ACTION_LEAGUES.split(",").map((value) => value.trim()).filter(Boolean) } : {}),
  ...(process.env.ACTION_BOOK_IDS ? { bookIds: process.env.ACTION_BOOK_IDS.split(",").map(Number).filter(Number.isFinite) } : {}),
  requestTimeoutMs: numberEnv("ACTION_REQUEST_TIMEOUT_MS", 15_000)
}));
if (enabled("POLL_YAHOO_ODDS", true)) connectors.push(new YahooOddsConnector({
  browserManager: browser,
  paths: (process.env.YAHOO_ODDS_PATHS ?? DEFAULT_YAHOO_ODDS_PATHS.join(",")).split(",").map((value) => value.trim()).filter(Boolean),
  requestTimeoutMs: numberEnv("YAHOO_ODDS_REQUEST_TIMEOUT_MS", 30_000)
}));
if (enabled("POLL_BESTFIGHTODDS", true)) connectors.push(new BestFightOddsConnector({
  browserManager: browser,
  requestTimeoutMs: numberEnv("BESTFIGHTODDS_REQUEST_TIMEOUT_MS", 30_000)
}));
if (enabled("POLL_FIGHTODDS", true)) connectors.push(new FightOddsConnector({
  browserManager: browser,
  requestTimeoutMs: numberEnv("FIGHTODDS_REQUEST_TIMEOUT_MS", 30_000)
}));
if (!connectors.length) throw new Error("No polling connectors are enabled");

const collector = new CollectorService(undefined, undefined, storage, storage, (line) => console.log(line), storage);
const collect = async (connector: SportsbookConnector, mode: "events" | "live"): Promise<void> => {
  const checkedAt = new Date().toISOString();
  const health = await connector.health();
  await storage.saveSourceHealth({ sportsbook: connector.context.sportsbook, accountAlias: connector.context.accountAlias, status: health.status, checkedAt, ...(health.message ? { message: health.message } : {}) });
  if (health.status !== "HEALTHY") {
    console.log(JSON.stringify({ connector: connector.id, run: mode, status: "skipped", reason: health.message ?? health.status }));
    throw new Error(health.message ?? health.status);
  }
  await collector.collect(connector, mode);
};

await storage.reconcileOrphanCollectorRuns();
const reconciliation = setInterval(() => { void storage.reconcileOrphanCollectorRuns().catch((error: unknown) => console.error(JSON.stringify({ run: "reconciliation", error: error instanceof Error ? error.message : String(error) }))); }, 30_000);
reconciliation.unref();
for (const connector of connectors) {
  scheduler.schedule(`${connector.id}:events`, "prematch-near", schedulerConfig, () => collect(connector, "events"), (error) => console.error(JSON.stringify({ connector: connector.id, run: "events", error: error instanceof Error ? error.message : String(error) })));
  // MMA comparison boards publish prematch tables only. Do not manufacture a
  // live cadence (or unnecessary browser requests) for a source that has no
  // live market semantics.
  if (!["bestfightodds", "fightodds"].includes(connector.id)) {
    scheduler.schedule(`${connector.id}:live`, "live", schedulerConfig, () => collect(connector, "live"), (error) => console.error(JSON.stringify({ connector: connector.id, run: "live", error: error instanceof Error ? error.message : String(error) })));
  }
}

console.log(JSON.stringify({ run: "polling-started", connectors: connectors.map((connector) => connector.id), eventsIntervalMs: schedulerConfig.prematchNearIntervalMs, liveIntervalMs: schedulerConfig.liveIntervalMs }));
let resolveStopped: (() => void) | undefined;
const stopped = new Promise<void>((resolve) => { resolveStopped = resolve; });
let stopping = false;
const stop = async (): Promise<void> => {
  if (stopping) return;
  stopping = true;
  clearInterval(reconciliation);
  scheduler.shutdown();
  await scheduler.drain();
  await Promise.allSettled(connectors.map((connector) => connector.shutdown()));
  await browser.shutdown();
  await storage.close();
  resolveStopped?.();
};
process.once("SIGINT", () => { void stop(); });
process.once("SIGTERM", () => { void stop(); });
await stopped;

import { loadConfig } from "./config/index.js";
import { BrowserManager } from "./browser/manager.js";
import { BetOnlineConnector } from "./connectors/betonline/connector.js";
import { CollectorService } from "./collectors/service.js";
import { PostgresStorage } from "./storage/postgres.js";

const config = loadConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required for a real BetOnline run");
if (!config.betonlineCdpUrl) throw new Error("BETONLINE_CDP_URL is required; open an authorized BetOnline Edge session with remote debugging enabled");

const cycles = Number(process.env.BETONLINE_CYCLES ?? 1);
const intervalMs = Number(process.env.BETONLINE_INTERVAL_MS ?? 15_000);
const browsers = new BrowserManager({ headless: false, sessionStoragePath: config.sessionStoragePath, connectOverCdpUrl: config.betonlineCdpUrl });
const storage = new PostgresStorage(config.databaseUrl);
const connector = new BetOnlineConnector({
  browserManager: browsers,
  accountAlias: process.env.ACCOUNT_ALIAS ?? "personal",
  refreshBeforeCollect: false
});
const collector = new CollectorService(undefined, undefined, storage, storage, (line) => console.log(line), storage);
let exitCode = 0;

try {
  await connector.initialize();
  const health = await connector.health();
  console.log(JSON.stringify({ connector: connector.id, sportsbook: connector.context.sportsbook, run: "health", health }));
  await storage.saveSourceHealth({ sportsbook: connector.context.sportsbook, accountAlias: connector.context.accountAlias, status: health.status, checkedAt: new Date().toISOString(), ...(health.message ? { message: health.message } : {}) });
  if (health.status === "UNHEALTHY" || health.status === "AUTH_REQUIRED") throw new Error(health.message ?? "BetOnline session is not active");
  if (health.status === "DEGRADED") {
    // Keep the session and connector intact. A passive health result is enough
    // evidence to skip collection until the normal session has access again.
    console.log(JSON.stringify({ connector: connector.id, sportsbook: connector.context.sportsbook, run: "collection-skipped", reason: health.message ?? "degraded" }));
  } else for (let cycle = 1; cycle <= cycles; cycle += 1) {
      const startedAt = Date.now();
      // One passive snapshot contains both live and prematch cards. Running all
      // three modes duplicated DOM RAW data without increasing coverage.
      await collector.collect(connector, "events");
      console.log(JSON.stringify({ connector: connector.id, sportsbook: connector.context.sportsbook, run: `cycle-${cycle}`, duration: Date.now() - startedAt }));
      if (cycle < cycles) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
} catch (error) {
  exitCode = 1;
  throw error;
} finally {
  await connector.shutdown();
  await browsers.shutdown();
  await storage.close();
  await new Promise<void>((resolve) => setImmediate(resolve));
  process.exit(exitCode);
}

import { loadConfig } from "./config/index.js";
import { BrowserManager } from "./browser/manager.js";
import { BovadaConnector } from "./connectors/bovada/connector.js";
import { CollectorService } from "./collectors/service.js";
import { PostgresStorage } from "./storage/postgres.js";

const config = loadConfig();
const databaseUrl = config.databaseUrl;
if (!databaseUrl) throw new Error("DATABASE_URL is required for a real Bovada run");

const cycles = Number(process.env.BOVADA_CYCLES ?? 1);
const intervalMs = Number(process.env.BOVADA_INTERVAL_MS ?? 15_000);
const sportPaths = (process.env.BOVADA_SPORT_PATHS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const requestTimeoutMs = Number(process.env.BOVADA_REQUEST_TIMEOUT_MS ?? 15_000);
const browsers = new BrowserManager({ headless: true, sessionStoragePath: config.sessionStoragePath });
const storage = new PostgresStorage(databaseUrl);
const connector = new BovadaConnector({ browserManager: browsers, sportPaths, requestTimeoutMs, accountAlias: process.env.ACCOUNT_ALIAS ?? "public" });
const collector = new CollectorService(undefined, undefined, storage, storage, (line) => console.log(line), storage);

try {
  await connector.initialize();
  const health = await connector.health();
  console.log(JSON.stringify({ connector: connector.id, sportsbook: connector.context.sportsbook, run: "health", health }));
  await storage.saveSourceHealth({ sportsbook: connector.context.sportsbook, accountAlias: connector.context.accountAlias, status: health.status, checkedAt: new Date().toISOString(), ...(health.message ? { message: health.message } : {}) });
  if (health.status === "UNHEALTHY") throw new Error(health.message ?? "Bovada is unhealthy");
  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    const startedAt = Date.now();
    await collector.collect(connector, "events");
    await collector.collect(connector, "live");
    console.log(JSON.stringify({ connector: connector.id, sportsbook: connector.context.sportsbook, run: `cycle-${cycle}`, duration: Date.now() - startedAt }));
    if (cycle < cycles) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
} finally {
  await connector.shutdown();
  await browsers.shutdown();
  await storage.close();
}

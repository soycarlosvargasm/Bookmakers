import { loadConfig } from "./config/index.js";
import { BrowserManager } from "./browser/manager.js";
import { FightOddsConnector } from "./connectors/fightodds/connector.js";
import { CollectorService } from "./collectors/service.js";
import { PostgresStorage } from "./storage/postgres.js";

const config = loadConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required for a real FightOdds run");
const storage = new PostgresStorage(config.databaseUrl);
const browser = new BrowserManager({ headless: true, sessionStoragePath: config.sessionStoragePath });
const connector = new FightOddsConnector({ browserManager: browser, requestTimeoutMs: Number(process.env.FIGHTODDS_REQUEST_TIMEOUT_MS ?? 30_000) });
const collector = new CollectorService(undefined, undefined, storage, storage, (line) => console.log(line), storage);
try {
  const health = await connector.health();
  console.log(JSON.stringify({ connector: connector.id, run: "health", health }));
  await storage.saveSourceHealth({ sportsbook: connector.context.sportsbook, accountAlias: connector.context.accountAlias, status: health.status, checkedAt: new Date().toISOString(), ...(health.message ? { message: health.message } : {}) });
  if (health.status !== "HEALTHY") throw new Error(health.message ?? "FightOdds is unhealthy");
  await collector.collect(connector, "events");
} finally { await browser.shutdown(); await storage.close(); }

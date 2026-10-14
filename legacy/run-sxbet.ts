import { loadConfig } from "./config/index.js";
import { SxBetConnector } from "./connectors/sxbet/connector.js";
import { CollectorService } from "./collectors/service.js";
import { PostgresStorage } from "./storage/postgres.js";

const config = loadConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required for a real SX Bet run");
const storage = new PostgresStorage(config.databaseUrl);
const connector = new SxBetConnector({
  maxMarkets: Number(process.env.SXBET_MAX_MARKETS ?? 100),
  requestTimeoutMs: Number(process.env.SXBET_REQUEST_TIMEOUT_MS ?? 15_000)
});
const collector = new CollectorService(undefined, undefined, storage, storage, (line) => console.log(line), storage);

try {
  const health = await connector.health();
  console.log(JSON.stringify({ connector: connector.id, sportsbook: connector.context.sportsbook, run: "health", health }));
  await storage.saveSourceHealth({ sportsbook: connector.context.sportsbook, accountAlias: connector.context.accountAlias, status: health.status, checkedAt: new Date().toISOString(), ...(health.message ? { message: health.message } : {}) });
  if (health.status === "UNHEALTHY") throw new Error(health.message ?? "SX Bet is unhealthy");
  await collector.collect(connector, "events");
  await collector.collect(connector, "live");
} finally {
  await storage.close();
}

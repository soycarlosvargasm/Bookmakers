import { loadConfig } from "./config/index.js";
import { ActionNetworkConnector } from "./connectors/actionnetwork/connector.js";
import { CollectorService } from "./collectors/service.js";
import { PostgresStorage } from "./storage/postgres.js";

const config = loadConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required for a real Action Network run");
const list = (name: string): string[] => (process.env[name] ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const storage = new PostgresStorage(config.databaseUrl);
const connector = new ActionNetworkConnector({
  ...(list("ACTION_LEAGUES").length ? { leagues: list("ACTION_LEAGUES") } : {}),
  ...(list("ACTION_BOOK_IDS").length ? { bookIds: list("ACTION_BOOK_IDS").map(Number).filter(Number.isFinite) } : {}),
  requestTimeoutMs: Number(process.env.ACTION_REQUEST_TIMEOUT_MS ?? 15_000)
});
const collector = new CollectorService(undefined, undefined, storage, storage, (line) => console.log(line), storage);
try {
  const health = await connector.health();
  console.log(JSON.stringify({ connector: connector.id, run: "health", health }));
  await storage.saveSourceHealth({ sportsbook: connector.context.sportsbook, accountAlias: connector.context.accountAlias, status: health.status, checkedAt: new Date().toISOString(), ...(health.message ? { message: health.message } : {}) });
  if (health.status === "UNHEALTHY") throw new Error(health.message ?? "Action Network is unhealthy");
  await collector.collect(connector, "events");
  await collector.collect(connector, "live");
} finally { await storage.close(); }

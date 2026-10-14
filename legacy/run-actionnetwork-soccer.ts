import { ActionNetworkEmbeddedOddsConnector } from "./connectors/actionnetwork/embedded-odds.js";
import { loadConfig } from "./config/index.js";
import { CollectorService } from "./collectors/service.js";
import { PostgresStorage } from "./storage/postgres.js";

const connector = new ActionNetworkEmbeddedOddsConnector();
const config = loadConfig();
const health = await connector.health();
if (health.status === "UNHEALTHY") throw new Error(health.message ?? "Action Network is unhealthy");
if (config.databaseUrl) {
  const storage = new PostgresStorage(config.databaseUrl);
  const collector = new CollectorService(undefined, undefined, storage, storage, (line) => console.log(line), storage);
  try {
    await collector.collect(connector, "prematch");
    await collector.collect(connector, "live");
    console.log(JSON.stringify({ connector: connector.id, sourceUrl: "https://www.actionnetwork.com/soccer/odds", transport: "embedded-json", health, persisted: true }));
  } finally { await storage.close(); }
} else {
const prematch = await connector.collectPrematch();
const live = await connector.collectLive();
const summarize = (collection: Awaited<ReturnType<typeof connector.collectEvents>>) => ({ events: new Set((collection.normalizedRecords ?? []).map((record) => record.sourceEventId).filter(Boolean)).size, markets: new Set((collection.normalizedRecords ?? []).map((record) => `${record.sportsbook}:${record.sourceEventId}:${record.sourceMarketId}`)).size, selections: collection.normalizedRecords?.length ?? 0, rawPayloads: collection.rawPayloads?.length ?? 0 });
console.log(JSON.stringify({ connector: connector.id, sourceUrl: "https://www.actionnetwork.com/soccer/odds", transport: "embedded-json", health, persisted: false, prematch: summarize(prematch), live: summarize(live) }));
}

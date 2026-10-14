import { ActionNetworkEmbeddedOddsConnector } from "./connectors/actionnetwork/embedded-odds.js";
import { loadConfig } from "./config/index.js";
import { CollectorService } from "./collectors/service.js";
import { PostgresStorage } from "./storage/postgres.js";

/** Exact Action Network URLs supplied in the second catalogue block. */
const pages = [
  { source: "Action Network", sport: "basketball", label: "NBA", sourceUrl: "https://www.actionnetwork.com/nba/odds" },
  { source: "Action Network", sport: "baseball", label: "MLB", sourceUrl: "https://www.actionnetwork.com/mlb/odds" },
  { source: "Action Network", sport: "ice-hockey", label: "NHL", sourceUrl: "https://www.actionnetwork.com/nhl/odds" },
  { source: "Action Network", sport: "american-football", label: "NFL", sourceUrl: "https://www.actionnetwork.com/nfl/odds" },
  { source: "Action Network", sport: "mma", label: "UFC", sourceUrl: "https://www.actionnetwork.com/ufc/odds" }
] as const;

const config = loadConfig();
const summarize = (collection: Awaited<ReturnType<ActionNetworkEmbeddedOddsConnector["collectEvents"]>>) => ({
  events: new Set((collection.normalizedRecords ?? []).map((record) => record.sourceEventId).filter(Boolean)).size,
  markets: new Set((collection.normalizedRecords ?? []).map((record) => `${record.sportsbook}:${record.sourceEventId}:${record.sourceMarketId}`)).size,
  selections: collection.normalizedRecords?.length ?? 0,
  rawPayloads: collection.rawPayloads?.length ?? 0
});

const storage = config.databaseUrl ? new PostgresStorage(config.databaseUrl) : undefined;
const collector = storage ? new CollectorService(undefined, undefined, storage, storage, (line) => console.log(line), storage) : undefined;
try {
  for (const page of pages) {
    const connector = new ActionNetworkEmbeddedOddsConnector({ sourceUrl: page.sourceUrl });
    const health = await connector.health();
    if (health.status === "UNHEALTHY") {
      console.log(JSON.stringify({ ...page, status: "BLOCKED", transport: "embedded-json", health, persisted: false }));
      continue;
    }
    if (collector) {
      await collector.collect(connector, "prematch");
      await collector.collect(connector, "live");
      console.log(JSON.stringify({ ...page, status: "PERSISTED", transport: "embedded-json", health, persisted: true }));
      continue;
    }
    const prematch = await connector.collectPrematch();
    const live = await connector.collectLive();
    const status = (prematch.normalizedRecords?.length ?? 0) ? "CAPTURED" : "SEASONAL";
    console.log(JSON.stringify({ ...page, status, transport: "embedded-json", health, persisted: false, prematch: summarize(prematch), live: summarize(live) }));
  }
} finally { await storage?.close(); }

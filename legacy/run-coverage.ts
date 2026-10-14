import { ActionNetworkEmbeddedOddsConnector } from "./connectors/actionnetwork/embedded-odds.js";
import { PuntersEdgeConnector } from "./connectors/puntersedge/connector.js";
import { RaceHubConnector } from "./connectors/racehub/connector.js";
import { MuayThai2000Connector } from "./connectors/muaythai2000/connector.js";
import { BestFightOddsConnector } from "./connectors/bestfightodds/connector.js";
import { FightOddsConnector } from "./connectors/fightodds/connector.js";
import { OneXBetTrottingConnector } from "./connectors/onexbet/connector.js";
import { SxBetConnector } from "./connectors/sxbet/connector.js";
import { MarathonbetConnector } from "./connectors/marathonbet/connector.js";
import { BrowserManager } from "./browser/manager.js";
import { normalizeRecord } from "./normalization/normalize.js";
import type { NormalizedRecord, RawPayloadInput } from "./normalization/types.js";
import type { SportsbookConnector } from "./connectors/types.js";
import { SupabaseManagementDiscoveryRepository } from "./storage/supabase-management.js";

const ACTION_SPORTS = ["soccer", "nfl", "ncaaf", "nba", "ncaab", "ncaaw", "nhl", "mlb", "wnba", "ufc", "atp", "wta", "nascar_cup", "pga", "world_baseball_classic"];
const repository = await SupabaseManagementDiscoveryRepository.fromLinkedProject();
const before = await repository.visualCounts();
const browser = new BrowserManager({ headless: true, sessionStoragePath: ".sessions" });
const allSources: Array<[string, SportsbookConnector]> = [
  ...ACTION_SPORTS.map((sport): [string, SportsbookConnector] => [`actionnetwork:${sport}`, new ActionNetworkEmbeddedOddsConnector({ sourceUrl: `https://www.actionnetwork.com/${sport}/odds`, requestTimeoutMs: 20_000 })]),
  ["puntersedge", new PuntersEdgeConnector()], ["racehub", new RaceHubConnector()], ["muaythai2000", new MuayThai2000Connector()],
  ["bestfightodds", new BestFightOddsConnector({ browserManager: browser, requestTimeoutMs: 30_000 })],
  ["fightodds", new FightOddsConnector({ browserManager: browser, requestTimeoutMs: 30_000 })],
  ["1xbet-trotting", new OneXBetTrottingConnector(20_000)],
  ["sxbet", new SxBetConnector({ maxMarkets: 100, requestTimeoutMs: 15_000 })],
  ["marathonbet-chess", new MarathonbetConnector("https://www.marathonbet.com/en/betting/Chess/?menu=true", 20_000)],
  ["marathonbet-moto", new MarathonbetConnector("https://www.marathonbet.com/th/betting/MotoSport/Outright/Moto2/Men%2B-%2B21039296", 20_000)]
];
const requested = process.env.COVERAGE_SOURCES?.split(",").map((value) => value.trim()).filter(Boolean);
const sources = requested?.length ? allSources.filter(([name]) => requested.includes(name)) : allSources;
if (!sources.length) throw new Error("No requested coverage sources are configured");

function verified(record: NormalizedRecord): boolean {
  return Boolean(record.sportsbook && record.sourceEventId && record.sourceMarketId && record.sourceSelectionId && record.sport && record.eventName && record.market && record.selection && record.sourceUrl && record.decimalOdds && Number.isFinite(record.decimalOdds) && record.decimalOdds > 1 && record.decimalOdds <= 1001 && record.eventStatus !== "closed" && (!record.eventStartTime || record.eventStatus === "live" || Date.parse(record.eventStartTime) >= Date.now() - 86_400_000));
}

function boundedRaw(payloads: RawPayloadInput[]): RawPayloadInput[] {
  return payloads.flatMap((payload) => {
    const root = payload.rawPayload && typeof payload.rawPayload === "object" && !Array.isArray(payload.rawPayload) ? payload.rawPayload as Record<string, unknown> : null;
    const events = root?.events;
    if (!Array.isArray(events) || events.length <= 10) return [payload];
    const chunks: RawPayloadInput[] = [];
    for (let offset = 0; offset < events.length; offset += 10) chunks.push({ ...payload, rawPayload: { ...root, events: events.slice(offset, offset + 10) } });
    return chunks;
  });
}

console.log(JSON.stringify({ coverage: "before", counts: before }));
try {
  for (const [name, connector] of sources) {
    try {
      const collection = await connector.collectEvents();
      const records = (collection.normalizedRecords ?? []).map((record) => normalizeRecord(record)).filter(verified);
      if (!records.length) { console.log(JSON.stringify({ source: name, verified: 0, status: "no-current-prices" })); continue; }
      const raw = boundedRaw(collection.rawPayloads ?? []);
      if (!raw.length) throw new Error("Priced records without source RAW");
      await repository.saveMarketCollection(raw, records);
      console.log(JSON.stringify({ source: name, status: "persisted", verified: records.length, fixtures: new Set(records.map((record) => record.sourceEventId)).size, sports: [...new Set(records.map((record) => record.sport))], raw: raw.length }));
    } catch (error) { console.log(JSON.stringify({ source: name, status: "failed", error: error instanceof Error ? error.message : String(error) })); }
  }
} finally { await browser.shutdown(); }
console.log(JSON.stringify({ coverage: "after", before, after: await repository.visualCounts() }));

import { HttpRequestError, RequestGovernor, requestGovernorFor, retryAfterMs } from "../../scheduler/requests.js";
import type { HealthStatus } from "../../health/types.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";

const RECOVERY_HOST = "https://1xbet.co.ke";
const LINE_URL = `${RECOVERY_HOST}/en/line/trotting`;
const REQUEST_HEADERS = { Accept: "application/json, text/html;q=0.9, */*;q=0.8", "User-Agent": "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.1; source-registry-recovery)" };

export type OneXBetTrottingLink = { eventId: string; url: string };
type GameInfo = { sport?: { id?: number; name?: string }; liga?: { id?: number; name?: string }; opponent1?: { fullName?: string }; id?: number; constId?: number; startTs?: number; dopInfo?: string; kind?: number };
type EventPrice = { type?: number; cf?: number; cfView?: string; player?: { id?: number; name?: string }; eventParams?: { playerNames?: string[] } };
type EventGroup = { groupId?: number; shortGroupId?: number; events?: EventPrice[][] };
type GameEvents = { eventGroups?: EventGroup[]; constId?: number; id?: number; startTs?: number; dopInfo?: string };
type PriceRow = { groupId: number; shortGroupId: number; type: number; selectionId: string; selection: string; decimalOdds: number };
type Race = { eventId: string; eventUrl: string; info: GameInfo; prices: PriceRow[] };

const decode = (value: string): string => value.replace(/&amp;/gi, "&").replace(/&#39;|&apos;/gi, "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && Number.isFinite(Number(value)) ? Number(value) : null;

/** Parses server-rendered race links; the public event JSON is fetched separately. */
export function parseOneXBetTrottingLinks(html: string): OneXBetTrottingLink[] {
  const found = [...html.matchAll(/href=["']([^"']*\/en\/line\/trotting\/[^"']*\/(\d+)-[^"']*)["']/gi)].map((match) => ({ eventId: match[2]!, url: new URL(decode(match[1]!), RECOVERY_HOST).toString() }));
  return [...new Map(found.map((item) => [item.eventId, item])).values()];
}

export function parseOneXBetPrices(payload: GameEvents): PriceRow[] {
  return (payload.eventGroups ?? []).flatMap((group) => (group.events ?? []).flatMap((market) => market.flatMap((item) => {
    const decimalOdds = number(item.cf ?? item.cfView);
    const selection = item.player?.name ?? item.eventParams?.playerNames?.[0] ?? null;
    if (!selection || !decimalOdds || decimalOdds <= 1 || group.groupId === undefined || group.shortGroupId === undefined || item.type === undefined) return [];
    return [{ groupId: group.groupId, shortGroupId: group.shortGroupId, type: item.type, selectionId: String(item.player?.id ?? `${group.groupId}:${item.type}:${selection}`), selection: decode(selection), decimalOdds }];
  })));
}

export class OneXBetTrottingConnector implements SportsbookConnector {
  readonly id = "1xbet-ke-public-json";
  readonly context: ConnectorContext = { sportsbook: "1xbet", accountAlias: "public" };
  private readonly requests: RequestGovernor;
  constructor(private readonly timeoutMs = 30_000, requests?: RequestGovernor) { this.requests = requests ?? requestGovernorFor("1xbet"); }
  async initialize(): Promise<void> {}
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> {}
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async validateSession(): Promise<boolean> { return ((await this.collect()).normalizedRecords ?? []).length > 0; }
  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try { const records = (await this.collect()).normalizedRecords ?? []; return records.length ? { status: "HEALTHY", message: `${records.length} public 1xBet Kenya prices` } : { status: "DEGRADED", message: "No current priced trotting selections" }; }
    catch (cause) { return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) }; }
  }
  collectEvents(): Promise<ConnectorCollection> { return this.collect(); }
  collectPrematch(): Promise<ConnectorCollection> { return this.collect(); }
  async collectLive(): Promise<ConnectorCollection> { return { rawPayloads: [], normalizedRecords: [] }; }

  private async collect(): Promise<ConnectorCollection> {
    const links = parseOneXBetTrottingLinks(await this.fetchText(LINE_URL));
    const races = await Promise.all(links.map(async (link) => ({ eventId: link.eventId, eventUrl: link.url, info: await this.fetchJson<GameInfo>(`/service-api/main-line-feed/v3/gameInfo?fcountry=180&gameId=${encodeURIComponent(link.eventId)}&gr=656&lng=en&ref=61`), prices: parseOneXBetPrices(await this.fetchJson<GameEvents>(`/service-api/main-line-feed/v3/gameEvents?cfView=3&countEvents=250&fcountry=180&gameId=${encodeURIComponent(link.eventId)}&gr=656&grMode=4&lng=en&marketType=1&ref=61`)) } satisfies Race)));
    const collectedAt = new Date().toISOString();
    return { rawPayloads: races.map((race) => rawFor(race, collectedAt)), normalizedRecords: races.flatMap((race) => recordsFor(race, collectedAt)) };
  }

  private fetchText(url: string): Promise<string> { return this.requests.run(async () => { const response = await fetch(url, { headers: REQUEST_HEADERS, signal: AbortSignal.timeout(this.timeoutMs) }); const text = await response.text(); if (!response.ok) throw new HttpRequestError(`1xBet Kenya HTTP ${response.status}`, response.status, retryAfterMs(response.headers.get("retry-after"))); return text; }); }
  private async fetchJson<T>(path: string): Promise<T> { const text = await this.fetchText(new URL(path, RECOVERY_HOST).toString()); try { return JSON.parse(text) as T; } catch { throw new Error(`1xBet Kenya returned non-JSON for ${path.split("?")[0]}`); } }
}

const eventName = (race: Race): string => [race.info.liga?.name ?? "Trotting", race.info.dopInfo ?? race.info.opponent1?.fullName ?? null].filter((item): item is string => Boolean(item)).join(" — ");
const startTime = (race: Race): string | null => race.info.startTs ? new Date(race.info.startTs * 1000).toISOString() : null;
const marketName = (price: PriceRow): string => `group-${price.groupId}:type-${price.type}`;
const recordsFor = (race: Race, collectedAt: string): ProviderRecord[] => race.prices.map((price) => ({
  sportsbook: "1xbet", sport: race.info.sport?.name ?? "Trotting", competition: race.info.liga?.name ?? null, eventName: eventName(race), participants: [], homeParticipant: null, awayParticipant: null, eventStartTime: startTime(race), eventStatus: startTime(race) && Date.parse(startTime(race)!) <= Date.now() ? "live" : "prematch", phase: race.info.dopInfo ?? null, market: marketName(price), marketPeriod: "race", selection: price.selection, selectionStatus: "open", line: null, decimalOdds: price.decimalOdds, rawOdds: String(price.decimalOdds), rawOddsFormat: "decimal", sourceEventId: race.eventId, sourceMarketId: `${race.eventId}:${price.groupId}:${price.type}`, sourceSelectionId: `${race.eventId}:${price.groupId}:${price.type}:${price.selectionId}`, sourceUrl: race.eventUrl, providerTimestamp: null, collectedAt, qualifiers: { observedVia: "1xbet-ke-public-json", recoveryHost: "1xbet.co.ke", groupId: String(price.groupId), shortGroupId: String(price.shortGroupId), eventType: String(price.type), originalCatalogHost: "irq.1xbet.com" }
}));
const rawFor = (race: Race, retrievedAt: string): RawPayloadInput => ({
  sportsbook: "1xbet", accountAlias: "public", sourceType: "public-json", sourceUrl: race.eventUrl, retrievedAt, providerTimestamp: null, externalEventId: race.eventId, parserVersion: "1xbet-ke-public-json-v1",
  rawPayload: { event: { id: race.eventId, name: eventName(race), sport: race.info.sport?.name ?? "Trotting", league: race.info.liga?.name ?? null, startTime: startTime(race), sourceUrl: race.eventUrl }, markets: race.prices.map((price) => ({ id: `${race.eventId}:${price.groupId}:${price.type}`, rawMarketName: marketName(price), selections: [{ id: price.selectionId, name: price.selection, decimal: price.decimalOdds, price: price.decimalOdds }] })) }, normalizedRecordCount: race.prices.length
});

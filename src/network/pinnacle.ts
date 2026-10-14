import { oddsToDecimal } from "../normalization/odds.js";
import type { ProviderRecord } from "../normalization/types.js";

export const PINNACLE_NETWORK_PROFILE_VERSION = "pinnacle-network-v1";
export type PinnacleCapture = { url: string; payload: unknown };
type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const id = (value: unknown): string | null => typeof value === "number" && Number.isFinite(value) ? String(value) : text(value);
const objects = (value: unknown): JsonObject[] => Array.isArray(value) ? value.map(object).filter((item): item is JsonObject => item !== null) : [];

export function isPinnacleFeedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === "guest.api.arcadia.pinnacle.com" && url.pathname.startsWith("/0.1/") && /\/(?:matchups|markets)(?:\/|$)/.test(url.pathname);
  } catch { return false; }
}

/** Arcadia sends matchup metadata and American prices in separate responses.
 * Join only observed IDs. No endpoint is requested or guessed by this adapter. */
export function extractPinnacleRecords(captures: PinnacleCapture[], collectedAt = new Date().toISOString()): ProviderRecord[] {
  const events = new Map<string, { event: JsonObject; url: string }>();
  const markets = new Map<string, { market: JsonObject; url: string }>();
  const addMarket = (market: JsonObject, url: string): void => {
    const eventId = id(market.matchupId), key = text(market.key);
    if (!eventId || !key || !Array.isArray(market.prices)) return;
    const identity = `${eventId}:${key}`;
    const previous = markets.get(identity);
    if (previous && typeof previous.market.version === "number" && typeof market.version === "number" && previous.market.version > market.version) return;
    markets.set(identity, { market, url });
  };
  for (const capture of captures) {
    if (!isPinnacleFeedUrl(capture.url)) continue;
    for (const item of objects(capture.payload)) {
      const eventId = id(item.id);
      if (eventId && objects(item.participants).length && object(item.league)) {
        const previous = events.get(eventId);
        if (!previous || typeof previous.event.version !== "number" || typeof item.version !== "number" || item.version >= previous.event.version) events.set(eventId, { event: item, url: capture.url });
        for (const market of objects(item.markets)) addMarket(market, capture.url);
      }
      addMarket(item, capture.url);
    }
  }
  const records: ProviderRecord[] = [];
  const names: Record<string, string> = { moneyline: "Moneyline", spread: "Spread", total: "Total", team_total: "Team Total" };
  for (const { market, url } of markets.values()) {
    const eventId = id(market.matchupId)!;
    const observed = events.get(eventId);
    const type = text(market.type);
    if (!observed || !type || !names[type]) continue;
    const event = observed.event, participants = objects(event.participants);
    const participantNames = participants.map(item => text(item.name)).filter((name): name is string => name !== null);
    const home = text(participants.find(item => item.alignment === "home")?.name);
    const away = text(participants.find(item => item.alignment === "away")?.name);
    const special = object(event.special);
    const eventName = text(special?.description) ?? (home && away ? `${home} vs ${away}` : null);
    if (!eventName || !participantNames.length) continue;
    const league = object(event.league), sport = object(league?.sport);
    const marketId = `${eventId}:${text(market.key)!}`;
    const team = type === "team_total" ? text(participants.find(item => item.alignment === market.side)?.name) : null;
    if (type === "team_total" && !team) continue;
    for (const price of objects(market.prices)) {
      if (typeof price.price !== "number" || !Number.isFinite(price.price) || Math.abs(price.price) < 100) continue;
      const participantId = id(price.participantId), designation = text(price.designation);
      let selection: string | null = participantId ? text(participants.find(item => id(item.id) === participantId)?.name) : null;
      if (!participantId) {
        if (designation === "home") selection = home;
        else if (designation === "away") selection = away;
        else if (designation === "draw" && type === "moneyline") selection = "Draw";
        else if (["total", "team_total"].includes(type) && (designation === "over" || designation === "under")) selection = `${team ? `${team} ` : ""}${designation === "over" ? "Over" : "Under"}`;
      }
      const line = typeof price.points === "number" && Number.isFinite(price.points) ? String(price.points) : null;
      if (!selection || (!participantId && !designation) || (type !== "moneyline" && line === null)) continue;
      const rawOdds = price.price > 0 ? `+${price.price}` : String(price.price);
      const decimalOdds = oddsToDecimal(rawOdds, "american");
      if (decimalOdds === null || decimalOdds <= 1) continue;
      records.push({
        sportsbook: "pinnacle", bookmaker: "pinnacle", sport: text(sport?.name), competition: text(league?.name),
        sportsMetadata: { competition: { name:text(league?.name)||'Competición sin nombre',id:id(league?.id)||undefined,kind:'competition' },
          participants:participants.flatMap(p=>{const name=text(p.name);return name?[{name,id:id(p.id)||undefined,kind:'team' as const,role:text(p.alignment)||undefined}]:[]}) },
        eventName, participants: participantNames, homeParticipant: home, awayParticipant: away,
        eventStartTime: text(event.startTime), eventStatus: text(event.status),
        market: names[type]!, marketPeriod: id(market.period), selection, selectionStatus: text(market.status),
        line: type === "moneyline" ? null : line, rawOdds, rawOddsFormat: "american", decimalOdds,
        sourceEventId: eventId, sourceMarketId: marketId, sourceSelectionId: `${marketId}:${participantId ?? designation}`,
        sourceUrl: url, providerTimestamp: null, collectedAt, participantPlayer: null,
        qualifiers: { extraction: "network", profileVersion: PINNACLE_NETWORK_PROFILE_VERSION,
          matchupEndpoint: observed.url, providerMarketKey: text(market.key)!, providerMarketType: type,
          ...(text(market.side) ? { side: text(market.side)! } : {}),
          ...(typeof market.version === "number" ? { marketVersion: String(market.version) } : {}),
          sourceMarketIdKind: "composite-matchup-and-market-key", sourceSelectionIdKind: "composite-market-and-provider-side" }
      });
    }
  }
  return records;
}

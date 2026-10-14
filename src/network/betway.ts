import type { ProviderRecord } from "../normalization/types.js";
export const BETWAY_NETWORK_PROFILE_VERSION = "betway-flight-v1";
export const BETWAY_ENDPOINT = "https://betway.mx/mx/es-mx/sports";
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Obj : {};
const str = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : null;
const id = (v: unknown): string | null => typeof v === "number" && Number.isSafeInteger(v) ? String(v) : str(v);
const name = (v: unknown): string | null => str(obj(v).default) ?? str(v);
/** Decode JSON literals only. Never execute site JavaScript or infer prices from accumulator legs. */
export function betwayBoardsFromHtml(html: string): Obj[] {
  const boards: Obj[] = [];
  const visit = (value: unknown): void => {
    if (value === null || typeof value !== "object") return;
    const node = obj(value);
    if (node.events && node.markets && node.outcomes) boards.push(node);
    for (const child of Object.values(value)) visit(child);
  };
  let flight = "";
  for (const match of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)/g)) {
    try { const chunk: unknown = JSON.parse(match[1]!); if (Array.isArray(chunk) && typeof chunk[1] === "string") flight += chunk[1]; } catch { /* Non-JSON scripts are not payloads. */ }
  }
  for (const row of flight.split("\n")) {
    try { visit(JSON.parse(row.slice(row.indexOf(":") + 1))); } catch { /* React references/imports are not event payloads. */ }
  }
  return boards;
}
export async function fetchBetwayFeed(timeoutMs = 20_000) {
  const response = await fetch(BETWAY_ENDPOINT, { headers: { accept: "text/html" }, signal: AbortSignal.timeout(timeoutMs) });
  const body = await response.text();
  return { url: response.url, status: response.status, contentType: response.headers.get("content-type"), body, payload: betwayBoardsFromHtml(body) };
}
export function extractBetwayRecords(boards: unknown[], sourceUrl = BETWAY_ENDPOINT, collectedAt = new Date().toISOString()): ProviderRecord[] {
  const records = new Map<string, ProviderRecord>();
  for (const value of boards) {
    const board = obj(value), events = obj(board.events), markets = obj(board.markets);
    for (const value of Object.values(obj(board.outcomes))) {
      const outcome = obj(value), eventId = id(outcome.eventId ?? outcome.EventId), marketId = id(outcome.marketId ?? outcome.MarketId), selectionId = id(outcome.id ?? outcome.Id);
      if (!eventId || !marketId || !selectionId) continue;
      const event = obj(events[eventId]), market = obj(markets[marketId]);
      if (id(market.eventId ?? market.EventId) !== eventId) continue;
      const linked = [market.outcomes ?? market.Outcomes].flat(3).map(id);
      if (!linked.includes(selectionId)) continue;
      const eventName = str(event.name ?? event.EventName), marketName = name(market.name ?? market.Title), selection = name(outcome.name ?? outcome.BetName);
      const decimalOdds = outcome.oddsDecimal ?? outcome.OddsDecimal;
      if (!eventName || !marketName || !selection || typeof decimalOdds !== "number" || !Number.isFinite(decimalOdds) || decimalOdds <= 1 || decimalOdds >= 10_000) continue;
      if (outcome.displayed === false || outcome.IsDisplay === false || outcome.suspended === true || outcome.IsActive === false || market.suspended === true || market.IsSuspended === true || event.suspended === true || event.IsSuspended === true) continue;
      const rawLine = str(outcome.handicapText ?? outcome.HandicapDisplay);
      const numericLine = outcome.handicap ?? outcome.Handicap ?? market.handicap ?? market.Handicap;
      const line = rawLine ?? (typeof numericLine === "number" ? String(numericLine) : null);
      const home = str(event.HomeTeamName), away = str(event.AwayTeamName);
      const record: ProviderRecord = {
        sportsbook: "betway", bookmaker: "betway", sport: str(event.categoryName ?? event.CategoryName), competition: str(event.groupName ?? event.GroupName), eventName,
        participants: home && away ? [home, away] : null, homeParticipant: home, awayParticipant: away,
        eventStartTime: str(event.startsAt) ?? (typeof event.Milliseconds === "number" ? new Date(event.Milliseconds).toISOString() : null),
        eventStatus: str(event.trading), market: marketName, marketPeriod: null, selection, selectionStatus: null, line,
        rawOdds: String(decimalOdds), rawOddsFormat: "decimal", decimalOdds, sourceEventId: eventId, sourceMarketId: marketId, sourceSelectionId: selectionId,
        sourceUrl, providerTimestamp: null, collectedAt, participantPlayer: null,
        qualifiers: { extraction: "network", profileVersion: BETWAY_NETWORK_PROFILE_VERSION, payloadOrigin: "server-rendered React Flight JSON" }
      };
      records.set(JSON.stringify([eventId, marketId, selectionId]), record);
    }
  }
  return [...records.values()];
}

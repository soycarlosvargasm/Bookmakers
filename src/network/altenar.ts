import type { ProviderRecord } from "../normalization/types.js";

export const ALTENAR_NETWORK_PROFILE_VERSION = "altenar-network-v1";
export type AltenarLocation = { culture: string; countryCode: string; timezoneOffset: string };
export function altenarEndpoint(integration: string, numFormat = "es-ES", location: AltenarLocation = { culture: "es-ES", countryCode: "MX", timezoneOffset: "-420" }): string {
  const url = new URL("https://sb2frontend-altenar2.biahosted.com/api/widget/GetTopEvents");
  url.search = new URLSearchParams({ culture: location.culture, timezoneOffset: location.timezoneOffset, integration, deviceType: "1", numFormat, countryCode: location.countryCode, eventCount: "0", sportId: "0", timePeriod: "0" }).toString();
  return url.href;
}
export type AltenarCapture = { url: string; payload: unknown };
type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const id = (value: unknown): string | null => typeof value === "number" && Number.isSafeInteger(value) ? String(value) : text(value);
const objects = (value: unknown): JsonObject[] => Array.isArray(value) ? value.map(object).filter((item): item is JsonObject => item !== null) : [];
const ids = (value: unknown): string[] => Array.isArray(value) ? value.map(id).filter((item): item is string => item !== null) : [];
const index = (value: unknown): Map<string, JsonObject> => new Map(objects(value).flatMap(item => id(item.id) ? [[id(item.id)!, item] as const] : []));

export function isAltenarFeedUrl(value: string, integration: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "sb2frontend-altenar2.biahosted.com" && url.pathname === "/api/widget/GetTopEvents" && url.searchParams.get("integration") === integration;
  } catch { return false; }
}

export async function fetchAltenarFeed(integration: string, timeoutMs = 20_000, numFormat = "es-ES", location?: AltenarLocation): Promise<AltenarCapture & { status: number; contentType: string | null; body: string }> {
  const response = await fetch(altenarEndpoint(integration, numFormat, location), { headers: { accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
  const body = await response.text();
  let payload: unknown = null;
  try { payload = JSON.parse(body); } catch { /* Preserve the actual body for handler diagnostics. */ }
  return { url: response.url, status: response.status, contentType: response.headers.get("content-type"), body, payload };
}

/** Only top-level odds linked by a real event and market are emitted. Teasers are not separate markets. */
export function extractAltenarRecords(captures: AltenarCapture[], options: { integration: string; sportsbook: string; profileVersion?: string }, collectedAt = new Date().toISOString()): ProviderRecord[] {
  const records = new Map<string, ProviderRecord>();
  for (const capture of captures) {
    if (!isAltenarFeedUrl(capture.url, options.integration)) continue;
    const payload = object(capture.payload);
    if (!payload) continue;
    const markets = index(payload.markets), odds = index(payload.odds), competitors = index(payload.competitors);
    const sports = index(payload.sports), champs = index(payload.champs);
    for (const event of objects(payload.events)) {
      const eventId = id(event.id), eventName = text(event.name);
      if (!eventId || !eventName) continue;
      const participants = ids(event.competitorIds).map(competitorId => text(competitors.get(competitorId)?.name)).filter((name): name is string => name !== null);
      for (const marketId of ids(event.marketIds)) {
        const market = markets.get(marketId), marketName = text(market?.name);
        if (!market || !marketName) continue;
        for (const oddId of ids(market.oddIds)) {
          const odd = odds.get(oddId), selection = text(odd?.name), price = odd?.price;
          if (!odd || !selection || typeof price !== "number" || !Number.isFinite(price) || price <= 1 || price >= 10_000) continue;
          // The selection label exposes the signed handicap; sv is the market's line.
          const marketLine = text(market.sv);
          const displayedLine = marketLine !== null ? (/\(([+-]?\d+(?:[.,]\d+)?)\)\s*$/.exec(selection)?.[1]
            ?? /^(?:Over|Under)\s+([+-]?\d+(?:[.,]\d+)?)\s*$/i.exec(selection)?.[1]) : undefined;
          const line = displayedLine?.replace(",", ".") ?? marketLine;
          const record: ProviderRecord = {
            sportsbook: options.sportsbook, bookmaker: options.sportsbook, sport: text(sports.get(id(event.sportId) ?? "")?.name), competition: text(champs.get(id(event.champId) ?? "")?.name),
            eventName, participants: participants.length ? participants : null, homeParticipant: null, awayParticipant: null,
            eventStartTime: text(event.startDate), eventStatus: id(event.status), market: marketName, marketPeriod: null,
            selection, selectionStatus: id(odd.oddStatus), line, rawOdds: String(price), rawOddsFormat: "decimal", decimalOdds: price,
            sourceEventId: eventId, sourceMarketId: marketId, sourceSelectionId: oddId, sourceUrl: capture.url,
            providerTimestamp: null, collectedAt, participantPlayer: null,
            qualifiers: { extraction: "network", profileVersion: options.profileVersion ?? ALTENAR_NETWORK_PROFILE_VERSION,
              ...(id(market.typeId) ? { marketTypeId: id(market.typeId)! } : {}),
              ...(id(odd.typeId) ? { oddTypeId: id(odd.typeId)! } : {}),
              ...(id(odd.competitorId) ? { competitorId: id(odd.competitorId)! } : {}),
              ...(line !== null ? { lineScope: displayedLine ? "selection" : "market" } : {}) }
          };
          records.set(JSON.stringify([eventId, marketId, oddId]), record);
        }
      }
    }
  }
  return [...records.values()];
}

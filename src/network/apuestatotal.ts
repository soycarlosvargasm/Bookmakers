import type { ProviderRecord } from "../normalization/types.js";

export const APUESTATOTAL_NETWORK_PROFILE_VERSION = "apuestatotal-kmianko-v1";
const marketTypesBySports = { "1": ["ML0", "ML39", "OU200", "OU249", "QA61", "QA158"], "6": ["ML0", "OU0", "HC0", "ML39", "OU39", "HC39", "ML716", "ML717", "ML718", "ML719", "ML720"], "59": ["ML587", "ML0", "OU0", "HC0", "ML39", "OU39", "HC39"], default: ["ML0", "OU0", "HC0", "ML39", "OU39", "HC39", "OU6001"] };
export const APUESTATOTAL_ENDPOINT = (() => {
  const url = new URL("https://prod20392.kmianko.com/api/sportscenter/carousels/v3/featured-carousel-items");
  url.search = new URLSearchParams({ language: "ES-PE", customerLevel: "0", epoEnabled: "true", selectedOptionId: "0", hasPlacedBets: "false", isAnonymous: "true", currencyCode: "PEN", types: "8,6,7,9", marketTypes: "ML587,ML0,OU0,HC0,ML39,OU39,HC39", marketTypesBySports: JSON.stringify(marketTypesBySports), minimumOddsRestrictedMarkets: "ML39,ML13,ML1,ML169", minimumOdds: "1.009", draft: "false" }).toString();
  return url.href;
})();

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
const array = (value: unknown): JsonObject[] => Array.isArray(value) ? value.map(object).filter((item): item is JsonObject => item !== null) : [];
const string = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const id = (value: unknown): string | null => typeof value === "number" && Number.isSafeInteger(value) ? String(value) : string(value);

export async function fetchApuestaTotalFeed(timeoutMs = 20_000): Promise<{ url: string; status: number; contentType: string | null; body: string; payload: unknown }> {
  const response = await fetch(APUESTATOTAL_ENDPOINT, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
  const body = await response.text();
  let payload: unknown = null;
  try { payload = JSON.parse(body); } catch { /* The response body is retained for diagnostics. */ }
  return { url: response.url, status: response.status, contentType: response.headers.get("content-type"), body, payload };
}

export function extractApuestaTotalRecords(payload: unknown, url: string, collectedAt = new Date().toISOString()): ProviderRecord[] {
  if (new URL(url).origin !== "https://prod20392.kmianko.com") return [];
  const records = new Map<string, ProviderRecord>();
  for (const item of array(payload)) {
    const event = object(item.event);
    const eventId = id(event?._id), eventName = string(event?.EventName);
    if (!event || !eventId || !eventName) continue;
    const participants = array(event.Participants);
    const names = participants.map(participant => string(participant.Name)).filter((name): name is string => name !== null);
    const home = participants.find(participant => participant.VenueRole === "Home");
    const away = participants.find(participant => participant.VenueRole === "Away");
    for (const market of array(item.markets)) {
      const marketId = id(market._id), marketName = string(market.Name);
      if (!marketId || !marketName || market.IsRemoved === true || market.IsSuspended === true) continue;
      for (const selection of array(market.Selections)) {
        const selectionId = id(selection._id), selectionName = string(selection.Name);
        const raw = string(object(selection.DisplayOdds)?.Decimal);
        const decimal = raw === null ? NaN : Number(raw);
        if (!selectionId || !selectionName || !Number.isFinite(decimal) || decimal <= 1 || selection.IsRemoved === true || selection.IsDisabled === true) continue;
        records.set(JSON.stringify([eventId, marketId, selectionId]), {
          sportsbook: "apuestatotal", bookmaker: "apuestatotal", sport: string(event.SportName), competition: string(event.LeagueName),
          eventName, participants: names.length ? names : null, homeParticipant: string(home?.Name), awayParticipant: string(away?.Name),
          eventStartTime: string(event.StartEventDate), eventStatus: event.IsLive === true ? "live" : event.IsLive === false ? "prematch" : null,
          market: marketName, marketPeriod: null, selection: selectionName, selectionStatus: null, line: null,
          rawOdds: raw, rawOddsFormat: "decimal", decimalOdds: decimal,
          sourceEventId: eventId, sourceMarketId: marketId, sourceSelectionId: selectionId, sourceUrl: url,
          providerTimestamp: string(market.LastUpdateDateTime), collectedAt, participantPlayer: null,
          qualifiers: { extraction: "network", profileVersion: APUESTATOTAL_NETWORK_PROFILE_VERSION }
        });
      }
    }
  }
  return [...records.values()];
}

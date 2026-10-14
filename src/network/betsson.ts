import type { ProviderRecord } from "../normalization/types.js";

export const BETSSON_NETWORK_PROFILE_VERSION = "betsson-network-v1";
export type BetssonCapture = { url: string; payload: unknown };
type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const objects = (value: unknown): JsonObject[] => Array.isArray(value) ? value.map(object).filter((item): item is JsonObject => item !== null) : [];

export function isBetssonFeedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return /(^|\.)betsson\.(?:com|mx)$/.test(url.hostname) && /^\/api\/sb\/v\d+\/widgets\/(?:view|carousel|event-market)\/v\d+$/.test(url.pathname);
  } catch { return false; }
}

/** Observed sportsbook widgets expose separate events, markets and selections.
 * IDs are joined directly; labels, lines and decimal prices remain provider data. */
export function extractBetssonRecords(captures: BetssonCapture[], collectedAt = new Date().toISOString()): ProviderRecord[] {
  const events = new Map<string, JsonObject>();
  const markets = new Map<string, JsonObject>();
  const selections = new Map<string, { selection: JsonObject; url: string }>();
  const visit = (value: unknown, url: string, depth = 0): void => {
    if (depth > 20) return;
    if (Array.isArray(value)) { for (const item of value) visit(item, url, depth + 1); return; }
    const item = object(value);
    if (!item) return;
    const id = text(item.id);
    if (id && text(item.categoryId) && Array.isArray(item.participants) && text(item.label)) events.set(id, item);
    if (id && text(item.eventId) && text(item.marketTemplateId)) markets.set(id, item);
    if (id && text(item.marketId) && typeof item.odds === "number") selections.set(id, { selection: item, url });
    for (const child of Object.values(item)) if (child && typeof child === "object") visit(child, url, depth + 1);
  };
  for (const capture of captures) if (isBetssonFeedUrl(capture.url)) visit(capture.payload, capture.url);
  const records: ProviderRecord[] = [];
  for (const [selectionId, { selection, url }] of selections) {
    const marketId = text(selection.marketId)!;
    const market = markets.get(marketId);
    const eventId = text(market?.eventId);
    const event = eventId ? events.get(eventId) : null;
    if (!market || !event || !eventId) continue;
    const eventName = text(event.label), marketName = text(market.label) ?? text(market.marketFriendlyName), selectionName = text(selection.label);
    const odds = selection.odds;
    if (!eventName || !marketName || !selectionName || typeof odds !== "number" || !Number.isFinite(odds) || odds <= 1 || odds >= 10_000) continue;
    const formats = object(selection.marketSelectionPriceFormats);
    const decimalDisplay = text(formats?.["1"]);
    if (decimalDisplay && (!Number.isFinite(Number(decimalDisplay)) || Math.abs(Number(decimalDisplay) - odds) > 0.00001)) continue;
    const participants = objects(event.participants);
    const participantNames = participants.map(item => text(item.label)).filter((name): name is string => name !== null);
    const player = objects(event.subParticipants).find(item => text(item.id) === text(selection.participantId));
    records.push({
      sportsbook: "betsson", bookmaker: "betsson", sport: text(event.categoryName), competition: text(event.competitionName),
      eventName, participants: participantNames.length ? participantNames : null,
      homeParticipant: text(participants.find(item => item.side === 1)?.label), awayParticipant: text(participants.find(item => item.side === 2)?.label),
      eventStartTime: text(event.startDate), eventStatus: text(event.phase),
      market: marketName, marketPeriod: null, selection: selectionName, selectionStatus: text(selection.status),
      // An empty lineValue with lineValueRaw=0 is not evidence of a zero line.
      line: text(market.lineValue), rawOdds: decimalDisplay ?? String(odds), rawOddsFormat: "decimal", decimalOdds: odds,
      sourceEventId: eventId, sourceMarketId: marketId, sourceSelectionId: selectionId,
      sourceUrl: url, providerTimestamp: null, collectedAt, participantPlayer: text(player?.label),
      qualifiers: { extraction: "network", profileVersion: BETSSON_NETWORK_PROFILE_VERSION,
        marketTemplateId: text(market.marketTemplateId)!,
        ...(text(selection.selectionTemplateId) ? { selectionTemplateId: text(selection.selectionTemplateId)! } : {}),
        ...(text(market.lineValue) ? { lineScope: "market" } : {}) }
    });
  }
  return records;
}

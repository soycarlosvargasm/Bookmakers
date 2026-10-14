import type { ProviderRecord } from "../normalization/types.js";
export type KambiOptions = { sportsbook: string; endpoints: readonly string[]; profileVersion: string };
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Obj : {};
const rows = (v: unknown): Obj[] => Array.isArray(v) ? v.map(obj) : [];
const str = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : null;
const id = (v: unknown): string | null => typeof v === "number" && Number.isSafeInteger(v) ? String(v) : str(v);
export type RushbetCapture = { url: string; payload: unknown };
export async function fetchKambiFeeds(options: KambiOptions, timeoutMs = 20_000) {
  const captures: Array<RushbetCapture & { status: number; contentType: string | null; body: string }> = [];
  const deadline = Date.now() + timeoutMs;
  for (const observed of options.endpoints) {
    const url = new URL(observed);
    url.searchParams.set("ncid", String(Date.now()));
    const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
    const body = await response.text();
    let payload: unknown = null;
    try { payload = JSON.parse(body); } catch { /* Preserve raw failed responses. */ }
    captures.push({ url: response.url, status: response.status, contentType: response.headers.get("content-type"), body, payload });
  }
  return captures;
}
export function extractKambiRecords(captures: RushbetCapture[], options: KambiOptions, collectedAt = new Date().toISOString()): ProviderRecord[] {
  const records = new Map<string, ProviderRecord>();
  for (const capture of captures) {
    let url: URL;
    try { url = new URL(capture.url); } catch { continue; }
    if (url.hostname !== "us.offering-api.kambicdn.com" || !options.endpoints.some(endpoint => { const expected = new URL(endpoint); return expected.pathname === url.pathname && ["client_id", "market", "lang", "channel_id"].every(key => expected.searchParams.get(key) === url.searchParams.get(key)); })) continue;
    const payload = obj(capture.payload);
    for (const row of [...rows(payload.events), ...rows(payload.liveEvents)]) {
      const event = obj(row.event), eventId = id(event.id), eventName = str(event.name);
      if (!eventId || !eventName) continue;
      const home = str(event.homeName), away = str(event.awayName);
      const offers = [...rows(row.betOffers), ...(row.mainBetOffer ? [obj(row.mainBetOffer)] : [])];
      for (const market of offers) {
        const marketId = id(market.id), marketName = str(obj(market.criterion).label);
        if (!marketId || !marketName || id(market.eventId) !== eventId || market.suspended === true) continue;
        for (const outcome of rows(market.outcomes)) {
          const selectionId = id(outcome.id), selection = str(outcome.participant) ?? str(outcome.label);
          if (!selectionId || !selection || id(outcome.betOfferId) !== marketId || outcome.status !== "OPEN" || typeof outcome.odds !== "number") continue;
          // Kambi's integer odds and line values are thousandths, as confirmed by the visible Liga MX board.
          const decimalOdds = outcome.odds / 1000;
          if (!Number.isFinite(decimalOdds) || decimalOdds <= 1 || decimalOdds >= 10_000) continue;
          const record: ProviderRecord = {
            sportsbook: options.sportsbook, bookmaker: options.sportsbook, sport: str(event.sport), competition: str(event.group), eventName,
            participants: home && away ? [home, away] : null, homeParticipant: home, awayParticipant: away,
            eventStartTime: str(event.start), eventStatus: str(event.state), market: marketName, marketPeriod: str(obj(market.criterion).lifetime),
            selection, selectionStatus: str(outcome.status), line: typeof outcome.line === "number" ? String(outcome.line / 1000) : null,
            rawOdds: String(decimalOdds), rawOddsFormat: "decimal", decimalOdds, sourceEventId: eventId, sourceMarketId: marketId, sourceSelectionId: selectionId,
            sourceUrl: capture.url, providerTimestamp: str(outcome.changedDate), collectedAt, participantPlayer: null,
            qualifiers: { extraction: "network", profileVersion: options.profileVersion }
          };
          records.set(JSON.stringify([eventId, marketId, selectionId]), record);
        }
      }
    }
  }
  return [...records.values()];
}

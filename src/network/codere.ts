import type { ProviderRecord } from "../normalization/types.js";
export const CODERE_NETWORK_PROFILE_VERSION = "codere-contentapi-v1";
// Both URLs were requested by the public Mexican homepage, not guessed from league IDs.
export const CODERE_ENDPOINTS = [
  "https://codere-sbs-es.azurewebsites.net/getMatchMarketsForType/45349/MRES",
  "https://codere-sbs-es.azurewebsites.net/getMatchMarketsForType/19157/MRES"
];
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Obj : {};
const rows = (v: unknown): Obj[] => Array.isArray(v) ? v.map(obj) : [];
const str = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : null;
export type CodereCapture = { url: string; payload: unknown };
export async function fetchCodereFeeds(timeoutMs = 20_000) {
  const captures: Array<CodereCapture & { status: number; contentType: string | null; body: string }> = [];
  const deadline = Date.now() + timeoutMs;
  for (const url of CODERE_ENDPOINTS) {
    const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
    const body = await response.text();
    let payload: unknown = null;
    try { payload = JSON.parse(body); } catch { /* Retain the raw error response. */ }
    captures.push({ url: response.url, status: response.status, contentType: response.headers.get("content-type"), body, payload });
  }
  return captures;
}
export function extractCodereRecords(captures: CodereCapture[], collectedAt = new Date().toISOString()): ProviderRecord[] {
  const records = new Map<string, ProviderRecord>();
  for (const capture of captures) {
    if (!CODERE_ENDPOINTS.includes(capture.url)) continue;
    const api = obj(obj(capture.payload).ContentAPI);
    if (api["@status"] !== "OK") continue;
    for (const sport of rows(api.Sport)) for (const category of rows(sport.SBClass)) for (const competition of rows(category.SBType)) for (const event of rows(competition.Ev)) {
      const eventId = str(event["@ev_id"]), eventName = str(event["@name"]);
      if (!eventId || !eventName) continue;
      const teams = rows(event.Teams).flatMap(group => rows(group.Team));
      const participants = teams.map(team => str(team["@name"])).filter((name): name is string => name !== null);
      const home = str(teams.find(team => team["@team_order"] === "0")?.["@name"]);
      const away = str(teams.find(team => team["@team_order"] === "1")?.["@name"]);
      for (const market of rows(event.Mkt)) for (const selection of rows(market.Seln)) for (const price of rows(selection.Price)) {
        const marketId = str(market["@mkt_id"]), selectionId = str(selection["@seln_id"]);
        const marketName = str(market["@name"]), selectionName = str(selection["@name"]), rawOdds = str(price["@dec_prc"]);
        const decimalOdds = rawOdds === null ? NaN : Number(rawOdds);
        if (!marketId || !selectionId || !marketName || !selectionName || !rawOdds || !Number.isFinite(decimalOdds) || decimalOdds <= 1 || decimalOdds >= 10_000) continue;
        const record: ProviderRecord = {
          sportsbook: "codere", bookmaker: "codere", sport: str(sport["@name"]), competition: str(competition["@name"]), eventName,
          participants: participants.length ? participants : null, homeParticipant: home, awayParticipant: away,
          eventStartTime: str(event["@start_time"]), eventStatus: str(event["@status"]), market: marketName, marketPeriod: null,
          selection: selectionName, selectionStatus: str(selection["@status"]), line: null, rawOdds, rawOddsFormat: "decimal", decimalOdds,
          sourceEventId: eventId, sourceMarketId: marketId, sourceSelectionId: selectionId, sourceUrl: capture.url,
          providerTimestamp: str(price["@last_change"]), collectedAt, participantPlayer: null,
          qualifiers: { extraction: "network", profileVersion: CODERE_NETWORK_PROFILE_VERSION,
            ...(str(event["@ev_timezone"]) ? { eventTimezone: str(event["@ev_timezone"])! } : {}),
            ...(str(api["@timezone"]) ? { providerTimezone: str(api["@timezone"])! } : {}) }
        };
        records.set(JSON.stringify([eventId, marketId, selectionId]), record);
      }
    }
  }
  return [...records.values()];
}

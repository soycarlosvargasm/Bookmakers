import type { ProviderRecord } from "../normalization/types.js";

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
const string = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const id = (value: unknown): string | null => typeof value === "number" && Number.isSafeInteger(value) ? String(value) : string(value);
const list = (value: unknown): JsonObject[] => Array.isArray(value) ? value.map(object).filter((entry): entry is JsonObject => entry !== null) : [];

/**
 * BetB2B regional feed settings. A future 22bet adapter can reuse this parser
 * with its own baseUrl, fcountry (country), gr (feed grouping), and ref (site
 * reference). These values are explicit because they vary by integration.
 */
export type BetB2BOptions = {
  baseUrl: string;
  sportsbook: string;
  profileVersion: string;
  fcountry: string;
  gr: string;
  ref: string;
  lng?: string;
  cfView?: string;
};
export type BetB2BCapture = { url: string; status: number; contentType: string | null; body: string; payload: unknown; mode: "line" | "live" };
export type BetB2BDictionary = { url: string; type: string; status: number; payload: unknown };

export function betB2BEndpoint(options: BetB2BOptions, mode: "line" | "live"): string {
  const url = new URL(`/service-api/main-${mode}-feed/v3/expressDay`, options.baseUrl);
  url.search = new URLSearchParams({ cfView: options.cfView ?? "3", fcountry: options.fcountry, gr: options.gr, lng: options.lng ?? "en", ref: options.ref }).toString();
  return url.href;
}

export async function fetchBetB2BFeeds(options: BetB2BOptions, timeoutMs = 20_000): Promise<BetB2BCapture[]> {
  return Promise.all((["line", "live"] as const).map(async (mode) => {
    const response = await fetch(betB2BEndpoint(options, mode), { signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.text();
    let payload: unknown = null;
    try { payload = JSON.parse(body); } catch { /* Retain body for diagnostics. */ }
    return { url: response.url, status: response.status, contentType: response.headers.get("content-type"), body, payload, mode };
  }));
}

export async function fetchBetB2BDictionaries(options: BetB2BOptions, captures: BetB2BCapture[], timeoutMs = 20_000): Promise<Map<string, BetB2BDictionary>> {
  const types = new Set<string>();
  for (const capture of captures) for (const block of list(capture.payload)) {
    for (const entry of list(block.events)) {
      const type = id(object(entry.event)?.type);
      if (type) types.add(type);
    }
  }
  const results = await Promise.all([...types].map(async (type): Promise<BetB2BDictionary> => {
    const url = new URL(`/genfiles/cms/betstemplates/bets_model_short_en_${type}.json`, options.baseUrl).href;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      const body = await response.text();
      let payload: unknown = null;
      if (response.ok) try { payload = JSON.parse(body); } catch { /* Missing or invalid dictionary. */ }
      return { url: response.url, type, status: response.status, payload };
    } catch { return { url, type, status: 0, payload: null }; }
  }));
  return new Map(results.map((item) => [item.type, item]));
}

function dictionaryLabels(dictionary: unknown, type: string, groupId: string | null): { market: string | null; selection: string | null } {
  const root = object(dictionary);
  const own = object(root?.[type]);
  if (!own) return { market: null, selection: null };
  // A dictionary may name a market directly or nest it under a group. Never
  // select an unrelated group's label merely because its file exists.
  const group = groupId ? object(own[groupId]) : null;
  const selection = string(object(group?.M)?.[type] && object(object(group?.M)?.[type])?.N);
  return { market: string(group?.N) ?? string(own.N), selection };
}

function opponentId(value: unknown): string | null {
  return id(list(object(value)?.opps)[0]?.id);
}

/** Each priced element in a block is one selection. Unpriced summaries are skipped. */
export function extractBetB2BRecords(captures: BetB2BCapture[], dictionaries: Map<string, BetB2BDictionary>, options: BetB2BOptions, collectedAt = new Date().toISOString()): ProviderRecord[] {
  const records = new Map<string, ProviderRecord>();
  for (const capture of captures) {
    if (capture.status < 200 || capture.status >= 300) continue;
    for (const block of list(capture.payload)) {
      for (const entry of list(block.events)) {
        const event = object(entry.event);
        const eventId = id(entry.id);
        const sport = object(entry.sport), liga = object(entry.liga);
        const home = object(entry.opponent1), away = object(entry.opponent2);
        const homeName = string(home?.fullName), awayName = string(away?.fullName);
        const homeId = opponentId(home), awayId = opponentId(away);
        if (!eventId || !homeName || !awayName) continue;
        const startTs = typeof entry.startTs === "number" && Number.isSafeInteger(entry.startTs) ? entry.startTs : null;
        const start = startTs === null ? null : new Date(startTs * 1_000);
        const emit = (quote: JsonObject | null, groupId: string | null, nested: boolean): void => {
          const type = id(quote?.type);
          const rawOdds = typeof quote?.cf === "number" || typeof quote?.cf === "string" ? String(quote.cf) : null;
          const decimalOdds = rawOdds === null ? NaN : Number(rawOdds);
          if (!type || !rawOdds || !Number.isFinite(decimalOdds) || decimalOdds <= 1 || decimalOdds >= 10_000) return;
          const sourceSelectionId = `${type}:${homeId ?? "unknown"}:${awayId ?? "unknown"}`;
          const key = JSON.stringify([eventId, type, sourceSelectionId]);
          if (records.has(key)) return;
          const labels = dictionaryLabels(dictionaries.get(type)?.payload, type, groupId);
          const selection = labels.selection ?? (nested ? `type_${type}` : type === "1" ? homeName : type === "3" ? awayName : type === "2" ? "X" : `type_${type}`);
          records.set(key, {
            sportsbook: options.sportsbook, bookmaker: options.sportsbook,
            sport: string(sport?.name), competition: string(liga?.name),
            eventName: `${homeName} v ${awayName}`, participants: [homeName, awayName],
            homeParticipant: homeName, awayParticipant: awayName,
            eventStartTime: start && !Number.isNaN(start.valueOf()) ? start.toISOString() : null,
            eventStatus: capture.mode === "live" ? "live" : "prematch",
            market: labels.market ?? `type_${type}`, marketPeriod: null,
            selection, line: quote?.parameter === undefined || quote.parameter === null ? null : String(quote.parameter),
            decimalOdds, rawOdds, rawOddsFormat: "decimal",
            sourceEventId: eventId, sourceMarketId: type, sourceSelectionId,
            sourceUrl: capture.url, providerTimestamp: null, collectedAt,
            qualifiers: {
              extraction: "network", profileVersion: options.profileVersion,
              marketId: `${options.sportsbook}_type_${type}`,
              ...(id(sport?.id) ? { sportId: id(sport?.id)! } : {}),
              ...(id(liga?.id) ? { ligaId: id(liga?.id)! } : {}),
              ...(homeId ? { opponent1Id: homeId } : {}),
              ...(awayId ? { opponent2Id: awayId } : {}),
              ...(groupId ? { groupId } : {})
            }
          });
        };
        emit(event, id(event?.groupId), false);
        for (const group of list(entry.eventGroups)) {
          if (!Array.isArray(group.events)) continue;
          for (const subArray of group.events) {
            for (const quote of list(subArray)) emit(quote, id(group.groupId), true);
          }
        }
      }
    }
  }
  return [...records.values()];
}

/** Legacy BetB2B Get1x2_VZip uses country/partner rather than fcountry/ref. */
export function betB2B22Endpoint(options: BetB2BOptions, mode: "line" | "live"): string {
  const path = mode === "line" ? "/service-api/LineFeed/Get1x2_VZip" : "/service-api/LiveFeed/Get1x2_VZip";
  const url = new URL(path, options.baseUrl);
  url.search = new URLSearchParams(mode === "line"
    ? { count: "1000", lng: "en_GB", tz: "7", mode: "4", country: options.fcountry, partner: options.ref, gr: options.gr }
    : { count: "1000", lng: "en_GB", gr: options.gr, mode: "4", country: options.fcountry, partner: options.ref }).toString();
  return url.href;
}

export async function fetchBetB2B22Feeds(options: BetB2BOptions, timeoutMs = 20_000): Promise<BetB2BCapture[]> {
  return Promise.all((["line", "live"] as const).map(async (mode) => {
    const response = await fetch(betB2B22Endpoint(options, mode), { signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.text();
    let payload: unknown = null;
    try { payload = JSON.parse(body); } catch { /* Retain body for diagnostics. */ }
    return { url: response.url, status: response.status, contentType: response.headers.get("content-type"), body, payload, mode };
  }));
}

/** One record per priced E[] entry in the abbreviated Get1x2_VZip dialect. */
export function extractBetB2B22Records(captures: BetB2BCapture[], options: BetB2BOptions, collectedAt = new Date().toISOString()): ProviderRecord[] {
  const records: ProviderRecord[] = [];
  for (const capture of captures) {
    if (capture.status < 200 || capture.status >= 300) continue;
    const root = object(capture.payload);
    if (!root || root.Success === false) continue;
    for (const event of list(root.Value)) {
      const eventId = id(event.I), homeName = string(event.O1), awayName = string(event.O2);
      if (!eventId || !homeName || !awayName) continue;
      const homeId = id(event.O1I), awayId = id(event.O2I);
      const startTs = typeof event.S === "number" && Number.isSafeInteger(event.S) ? event.S : null;
      const start = startTs === null ? null : new Date(startTs * 1_000);
      for (const quote of list(event.E)) {
        const type = id(quote.T);
        const decimalOdds = typeof quote.C === "number" ? quote.C : Number(quote.C);
        if (!type || !Number.isFinite(decimalOdds) || decimalOdds <= 1 || decimalOdds >= 10_000) continue;
        const rawOdds = string(quote.CV) ?? String(quote.C);
        const groupId = id(quote.G);
        records.push({
          sportsbook: options.sportsbook, bookmaker: options.sportsbook,
          sport: string(event.SN), competition: string(event.L),
          eventName: `${homeName} v ${awayName}`, participants: [homeName, awayName],
          homeParticipant: homeName, awayParticipant: awayName,
          eventStartTime: start && !Number.isNaN(start.valueOf()) ? start.toISOString() : null,
          eventStatus: capture.mode === "live" ? "live" : "prematch",
          market: `type_${type}`, marketPeriod: null, selection: `type_${type}`,
          line: quote.P === undefined || quote.P === null ? null : String(quote.P),
          decimalOdds, rawOdds, rawOddsFormat: "decimal",
          sourceEventId: eventId, sourceMarketId: type,
          sourceSelectionId: `${type}:${homeId ?? "unknown"}:${awayId ?? "unknown"}`,
          sourceUrl: capture.url, providerTimestamp: null, collectedAt,
          qualifiers: {
            extraction: "network", profileVersion: options.profileVersion,
            marketId: `${options.sportsbook}_type_${type}`,
            ...(id(event.SI) ? { sportId: id(event.SI)! } : {}),
            ...(id(event.LI) ? { ligaId: id(event.LI)! } : {}),
            ...(homeId ? { opponent1Id: homeId } : {}),
            ...(awayId ? { opponent2Id: awayId } : {}),
            ...(groupId ? { groupId } : {})
          }
        });
      }
    }
  }
  return records;
}

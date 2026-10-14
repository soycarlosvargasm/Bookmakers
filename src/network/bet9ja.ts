import type { Page } from "playwright";
import type { ProviderRecord } from "../normalization/types.js";

export const BET9JA_NETWORK_PROFILE_VERSION = "bet9ja-feapi-v1";
const BASE = "https://sports.bet9ja.com";
const CACHE_VERSION = "1.328.0.248";
export const BET9JA_ENDPOINTS = {
  sports: `${BASE}/desktop/feapi/PalimpsestAjax/GetSports?DISP=0&v_cache_version=${CACHE_VERSION}`,
  prematch: `${BASE}/desktop/feapi/PalimpsestAjax/GetEventsInDailyBundleV3?DISP=1000&DISPH=0&SPORTID=1&LIMIT=10&v_cache_version=${CACHE_VERSION}`,
  live: `${BASE}/desktop/feapi/PalimpsestLiveAjax/GetLiveEventsV3?v_cache_version=${CACHE_VERSION}`,
} as const;

export type Bet9jaFeed = {
  mode: "sports" | "prematch" | "live";
  url: string;
  status: number;
  contentType: string | null;
  body: string;
  payload: unknown;
};

const safeJson = (text: string): unknown => { try { return JSON.parse(text) as unknown; } catch { return null; } };

export async function fetchBet9jaFeeds(timeoutMs = 20_000, page?: Page): Promise<Bet9jaFeed[]> {
  return Promise.all((Object.entries(BET9JA_ENDPOINTS) as Array<[Bet9jaFeed["mode"], string]>).map(async ([mode, url]) => {
    if (page) {
      const result = await page.evaluate(async (url) => {
        const res = await fetch(url, { headers: { accept: "application/json" } });
        return { url: res.url, status: res.status, contentType: res.headers.get("content-type"), body: await res.text() };
      }, url);
      return { mode, ...result, payload: safeJson(result.body) };
    }
    const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.text();
    let payload: unknown = null;
    try { payload = JSON.parse(body) as unknown; } catch { /* Keep the HTTP response for engine diagnostics. */ }
    return { mode, url: response.url, status: response.status, contentType: response.headers.get("content-type"), body, payload };
  }));
}

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const string = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : null;
const entries = (value: unknown): Array<[string, unknown]> => Object.entries(object(value) ?? {});
const field = (record: Record<string, unknown> | null, key: string): string | null => string(record?.[key]);

function marketFor(selectionId: string, markets: Map<string, Record<string, unknown>>): {
  id: string; label: string; line: string | null; code: string;
} | null {
  for (const [id, market] of markets) {
    if (!selectionId.startsWith(`${id}_`) && !selectionId.startsWith(`${id}@`)) continue;
    const tail = selectionId.slice(id.length);
    const separator = tail.indexOf("_");
    if (separator < 0) continue;
    const line = tail.startsWith("@") ? tail.slice(1, separator) : null;
    const code = tail.slice(separator + 1);
    if (!code) continue;
    return { id, label: field(market, "NAME") ?? field(market, "M_LABEL") ?? id, line, code };
  }
  return null;
}

function selectionName(translations: Record<string, unknown> | null, selectionId: string, marketId: string, code: string): string {
  const full = translations?.[`M#${selectionId}`];
  const base = translations?.[`M#${marketId}_${code}`];
  return string(full) ?? field(object(full), "NAME") ?? string(base) ?? field(object(base), "NAME") ?? code;
}

function participants(name: string): { home: string | null; away: string | null; pair: string[] | null } {
  const parts = name.split(" - ");
  if (parts.length !== 2 || !parts[0]?.trim() || !parts[1]?.trim()) return { home: null, away: null, pair: null };
  return { home: parts[0], away: parts[1], pair: parts };
}

export function extractBet9jaRecords(feeds: Array<Pick<Bet9jaFeed, "mode" | "url" | "payload">>): ProviderRecord[] {
  const catalogue = object(object(feeds.find(feed => feed.mode === "sports")?.payload)?.D);
  const sports = object(catalogue?.PAL);
  const rows: ProviderRecord[] = [];
  const collectedAt = new Date().toISOString();

  for (const feed of feeds) {
    if (feed.mode === "sports") continue;
    const data = object(object(feed.payload)?.D);
    if (!data) continue;
    const marketValues = feed.mode === "prematch" ? (Array.isArray(data.MK) ? data.MK : []) : Object.values(object(data.MK) ?? {});
    const markets = new Map(marketValues.map(value => object(value)).filter((value): value is Record<string, unknown> => Boolean(value))
      .map(value => [string(value.ID), value] as const).filter((item): item is [string, Record<string, unknown>] => item[0] !== null)
      .sort((left, right) => right[0].length - left[0].length));
    const translations = object(data.TRANS);
    const groups = object(data.G);
    const liveSports = object(data.S);
    const eventValues = Array.isArray(data.E) ? data.E : Object.values(object(data.E) ?? {});
    const prematchSportId = feed.mode === "prematch" ? new URL(feed.url).searchParams.get("SPORTID") : null;

    for (const value of eventValues) {
      const event = object(value);
      if (!event) continue;
      const eventId = field(event, "ID");
      const eventName = field(event, feed.mode === "prematch" ? "N" : "DS");
      if (!eventId || !eventName) continue;
      const group = object(groups?.[field(event, "GID") ?? ""]);
      const sportId = feed.mode === "prematch" ? prematchSportId : field(event, "SID");
      const sport = feed.mode === "prematch" ? field(object(sports?.[sportId ?? ""]), "S_DESC")
        : field(object(liveSports?.[sportId ?? ""]), "S_DESC") ?? field(group, "SPORT");
      const competition = feed.mode === "prematch" ? field(group, "N") : field(group, "CATEGORY");
      const start = field(event, feed.mode === "prematch" ? "D" : "STARTDATEUTC");
      const sides = participants(eventName);
      const odds = feed.mode === "prematch" ? object(event.O) : object(object(event.EOD)?.OD);

      for (const [selectionId, quoteValue] of entries(odds)) {
        const market = marketFor(selectionId, markets);
        if (!market) continue;
        const raw = feed.mode === "prematch" ? string(quoteValue) : string(object(quoteValue)?.v);
        const decimal = raw === null ? NaN : Number(raw);
        if (!Number.isFinite(decimal) || decimal <= 1 || decimal >= 10_000) continue;
        rows.push({
          sportsbook: "bet9ja", sport, competition, eventName,
          participants: sides.pair, homeParticipant: sides.home, awayParticipant: sides.away,
          eventStartTime: start, eventStatus: feed.mode === "live" ? "live" : "prematch",
          market: market.label, selection: selectionName(translations, selectionId, market.id, market.code),
          line: market.line, decimalOdds: decimal, rawOdds: raw, rawOddsFormat: "decimal",
          sourceEventId: eventId, sourceMarketId: market.id, sourceSelectionId: selectionId,
          sourceUrl: feed.url, collectedAt,
          qualifiers: Object.fromEntries([["sportId", sportId], ["groupId", field(event, "GID")], ["externalId", field(event, "EXTID")]]
            .filter((item): item is [string, string] => item[1] !== null)),
        });
      }
    }
  }
  return [...new Map(rows.map(row => [`${row.sourceEventId}|${row.sourceMarketId}|${row.sourceSelectionId}`, row])).values()];
}

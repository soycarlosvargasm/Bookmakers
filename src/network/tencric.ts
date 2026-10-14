import type { Page } from "playwright";
import type { ProviderRecord } from "../normalization/types.js";

export const TENCRIC_NETWORK_PROFILE_VERSION = "10cric-graphql-v1";
export const TENCRIC_GRAPHQL_URL = "https://www.10cric2026.com/graphql";

// Exact listContentCards operation observed by the engine's network discovery
// on /sports/. The body is replayed as a public GraphQL request.
export const TENCRIC_REQUEST = {
  "operationName": "listContentCards",
  "variables": {},
  "query": "query listContentCards {\n  listContentCards {\n    contentCards {\n      ...Card\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment Card on ContentCard {\n  type\n  card {\n    ... on NormalCard {\n      id\n      name\n      selections {\n        id\n        name\n        odds\n        eventId\n        marketId\n        marketLineId\n        sportId\n        eventName\n        participantHomeName\n        participantAwayName\n        marketName\n        eventStartDate\n        leagueId\n        leagueName\n        sportName\n        status\n        eventUrlPath\n        isLive\n        __typename\n      }\n      label {\n        name\n        type\n        __typename\n      }\n      imageUrl\n      betsCount\n      colorOptions {\n        backgroundColorHex\n        useDarkVersion\n        fontColorHex\n        __typename\n      }\n      __typename\n    }\n    ... on BoostedCard {\n      id\n      name\n      percentage\n      selections {\n        id\n        name\n        odds\n        eventId\n        marketId\n        marketLineId\n        sportId\n        eventName\n        participantHomeName\n        participantAwayName\n        marketName\n        eventStartDate\n        leagueId\n        leagueName\n        sportName\n        status\n        eventUrlPath\n        isLive\n        __typename\n      }\n      imageUrl\n      betsCount\n      colorOptions {\n        backgroundColorHex\n        useDarkVersion\n        fontColorHex\n        __typename\n      }\n      activeOnLive\n      __typename\n    }\n    ... on MoneyLineCard {\n      id\n      name\n      regionId\n      away {\n        id\n        isBatting\n        name\n        __typename\n      }\n      home {\n        id\n        isBatting\n        name\n        __typename\n      }\n      awayScore\n      homeScore\n      homeDismissals\n      awayDismissals\n      eventPhase {\n        description\n        showPhase\n        __typename\n      }\n      selections {\n        id\n        name\n        odds\n        eventId\n        marketId\n        marketLineId\n        sportId\n        eventName\n        participantHomeName\n        participantAwayName\n        marketName\n        eventStartDate\n        leagueId\n        leagueName\n        sportName\n        status\n        eventUrlPath\n        isLive\n        __typename\n      }\n      activeOnLive\n      earlyPayoutId\n      __typename\n    }\n    __typename\n  }\n  __typename\n}"
} as const;

export const TENCRIC_HEADERS = {
  accept: "*/*",
  "apollo-require-preflight": "true",
  "apollographql-client-name": "frontoffice-client",
  "content-type": "application/json",
  origin: "https://www.10cric2026.com",
  referer: "https://www.10cric2026.com/sports/",
  "x-language": "en",
  "x-operation-name": "listContentCards",
  "x-tenant": "10CRIC",
} as const;

export type TencricFeed = {
  url: string;
  status: number;
  contentType: string | null;
  requestBody: string;
  body: string;
  payload: unknown;
};

const safeJson = (text: string): unknown => { try { return JSON.parse(text) as unknown; } catch { return null; } };

export async function fetchTencricFeed(timeoutMs = 20_000, page?: Page): Promise<TencricFeed> {
  const requestBody = JSON.stringify(TENCRIC_REQUEST);
  if (page) {
    const result = await page.evaluate(async (opts) => {
      const res = await fetch(opts.url, { method: "POST", headers: opts.headers, body: opts.body });
      return { url: res.url, status: res.status, contentType: res.headers.get("content-type"), body: await res.text() };
    }, { url: TENCRIC_GRAPHQL_URL, headers: TENCRIC_HEADERS, body: requestBody });
    return { ...result, requestBody, payload: safeJson(result.body) };
  }
  const response = await fetch(TENCRIC_GRAPHQL_URL, {
    method: "POST",
    headers: TENCRIC_HEADERS,
    body: requestBody,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  let payload: unknown = null;
  try { payload = JSON.parse(body) as unknown; } catch { /* Preserve HTTP evidence. */ }
  return { url: response.url, status: response.status, contentType: response.headers.get("content-type"), requestBody, body, payload };
}

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const string = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : null;
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export function extractTencricRecords(payload: unknown, sourceUrl = TENCRIC_GRAPHQL_URL): ProviderRecord[] {
  const data = object(object(payload)?.data);
  const list = object(data?.listContentCards);
  const rows: ProviderRecord[] = [];
  const collectedAt = new Date().toISOString();
  for (const contentCard of array(list?.contentCards)) {
    const card = object(object(contentCard)?.card);
    for (const item of array(card?.selections)) {
      const selection = object(item);
      if (!selection) continue;
      const eventId = string(selection.eventId);
      const marketId = string(selection.marketId);
      const selectionId = string(selection.id);
      const eventName = string(selection.eventName);
      const marketName = string(selection.marketName);
      const selectionName = string(selection.name);
      const odds = Number(selection.odds);
      if (!eventId || !marketId || !selectionId || !eventName || !marketName || !selectionName ||
          !Number.isFinite(odds) || odds <= 1 || odds >= 10_000) continue;
      const home = string(selection.participantHomeName);
      const away = string(selection.participantAwayName);
      const startMs = Number(selection.eventStartDate);
      const start = Number.isFinite(startMs) && startMs > 0 ? new Date(startMs).toISOString() : null;
      rows.push({
        sportsbook: "10cric",
        sport: string(selection.sportName),
        competition: string(selection.leagueName),
        eventName,
        participants: home && away ? [home, away] : null,
        homeParticipant: home,
        awayParticipant: away,
        eventStartTime: start,
        eventStatus: selection.isLive === true ? "live" : selection.isLive === false ? "prematch" : null,
        market: marketName,
        selection: selectionName,
        selectionStatus: string(selection.status),
        decimalOdds: odds,
        rawOdds: string(selection.odds),
        rawOddsFormat: "decimal",
        sourceEventId: eventId,
        sourceMarketId: marketId,
        sourceSelectionId: selectionId,
        sourceUrl,
        collectedAt,
        qualifiers: Object.fromEntries([
          ["sportId", string(selection.sportId)],
          ["leagueId", string(selection.leagueId)],
          ["marketLineId", string(selection.marketLineId)],
        ].filter((entry): entry is [string, string] => entry[1] !== null)),
      });
    }
  }
  return [...new Map(rows.map(row => [`${row.sourceEventId}|${row.sourceMarketId}|${row.sourceSelectionId}`, row])).values()];
}

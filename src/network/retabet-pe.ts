import type { Page } from "playwright";
import type { ProviderRecord } from "../normalization/types.js";

export const RETABET_PE_NETWORK_PROFILE_VERSION = "retabet-pe-server-html-v1";
export const RETABET_PE_ENDPOINT = "https://www.retabet.pe/";

const decode = (value: string): string => value.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, entity => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " })[entity] ?? entity).trim();
const content = (value: string): string => decode(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));

export async function fetchRetabetPeFeed(timeoutMs = 20_000, page?: Page): Promise<{ url: string; status: number; contentType: string | null; body: string }> {
  if (page) {
    return page.evaluate(async (url) => {
      const res = await fetch(url, { headers: { accept: "text/html" } });
      return { url: res.url, status: res.status, contentType: res.headers.get("content-type"), body: await res.text() };
    }, RETABET_PE_ENDPOINT);
  }
  const response = await fetch(RETABET_PE_ENDPOINT, { headers: { accept: "text/html" }, signal: AbortSignal.timeout(timeoutMs) });
  return { url: response.url, status: response.status, contentType: response.headers.get("content-type"), body: await response.text() };
}

/** The public Retabet homepage renders featured event prices in HTML, without a Kambi client feed. */
export function extractRetabetPeRecords(html: string, url: string, collectedAt = new Date().toISOString()): ProviderRecord[] {
  if (new URL(url).hostname !== "www.retabet.pe") return [];
  const records = new Map<string, ProviderRecord>();
  const eventPattern = /<div class="jt_hos[^"]*"[^>]*data-u="([^"]+)"[^>]*data-i="(\d+)"[^>]*>([\s\S]*?)(?=<div class="jt_hos|$)/g;
  for (const match of html.matchAll(eventPattern)) {
    const path = match[1]!, eventId = match[2]!, block = match[3]!;
    const names = [...block.matchAll(/<span class="module__player-name"[^>]*>([\s\S]*?)<\/span>/g)].slice(0, 2).map(item => content(item[1]!));
    if (names.length !== 2 || !names[0] || !names[1]) continue;
    const tournament = /<span class="event__tournament-name">([\s\S]*?)<\/span>/.exec(block);
    const marketBlock = /<div class="bets__column">([\s\S]*?)<\/ul>/.exec(block)?.[1];
    if (!marketBlock) continue;
    const market = /<span class="module__bets-op-tit"><span>([\s\S]*?)<\/span>/.exec(marketBlock)?.[1];
    const marketName = market ? content(market) : null;
    if (!marketName) continue;
    for (const odd of marketBlock.matchAll(/<li class="jopc opcion betbox[^"]*" data-i="(\d+)">([\s\S]*?)<\/li>/g)) {
      const selectionId = odd[1]!, oddBlock = odd[2]!;
      const label = /<span class="jqt betbox__option">([\s\S]*?)<\/span>/.exec(oddBlock)?.[1];
      const odds = /<span class="[^"]*jpr betbox__odd">([\s\S]*?)<\/span>/.exec(oddBlock)?.[1];
      const selection = label ? content(label) : null, rawOdds = odds ? content(odds) : null;
      const decimalOdds = Number(rawOdds);
      if (!selection || !rawOdds || !Number.isFinite(decimalOdds) || decimalOdds <= 1) continue;
      records.set(JSON.stringify([eventId, selectionId]), {
        sportsbook: "retabet-pe", bookmaker: "retabet-pe", sport: path.includes("/futbol/") ? "Fútbol" : null,
        competition: tournament ? content(tournament[1]!) : null, eventName: `${names[0]} - ${names[1]}`,
        participants: names, homeParticipant: names[0], awayParticipant: names[1], eventStartTime: null, eventStatus: path.endsWith("/live") ? "live" : null,
        market: marketName, marketPeriod: null, selection, selectionStatus: null, line: null,
        rawOdds, rawOddsFormat: "decimal", decimalOdds, sourceEventId: eventId, sourceMarketId: null, sourceSelectionId: selectionId,
        sourceUrl: new URL(path, url).href, providerTimestamp: null, collectedAt, participantPlayer: null,
        qualifiers: { extraction: "server-html", profileVersion: RETABET_PE_NETWORK_PROFILE_VERSION }
      });
    }
  }
  return [...records.values()];
}

import { HttpRequestError, RequestGovernor, requestGovernorFor, retryAfterMs } from "../../scheduler/requests.js";
import type { HealthStatus } from "../../health/types.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";

export type EsportsInsiderMatch = { id: string; url: string; startLabel: string | null; teamOne: string; teamTwo: string; competition: string | null; seriesFormat: string | null; oddsOne: number; oddsTwo: number };
export type EsportsInsiderBookQuote = { bookmaker: string; oddsOne: number; oddsTwo: number };

export class EsportsInsiderConnector implements SportsbookConnector {
  readonly id = "esportsinsider-html";
  readonly context: ConnectorContext = { sportsbook: "esportsinsider-best", accountAlias: "public" };
  private readonly requests: RequestGovernor;
  constructor(private readonly sourceUrl: string, private readonly timeoutMs = 30_000, requests?: RequestGovernor) { this.requests = requests ?? requestGovernorFor("esportsinsider"); }
  async initialize(): Promise<void> {}
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> {}
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async validateSession(): Promise<boolean> { return parseEsportsInsiderMatches(await this.fetchHtml()).length > 0; }
  async health(): Promise<{ status: HealthStatus; message?: string }> { try { const matches = parseEsportsInsiderMatches(await this.fetchHtml()); return matches.length ? { status: "HEALTHY", message: `${matches.length} match-winner boards` } : { status: "DEGRADED", message: "No priced match rows in HTML" }; } catch (cause) { return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) }; } }
  collectEvents(): Promise<ConnectorCollection> { return this.collect(); }
  collectPrematch(): Promise<ConnectorCollection> { return this.collect(); }
  async collectLive(): Promise<ConnectorCollection> { return { rawPayloads: [], normalizedRecords: [] }; }
  private async collect(): Promise<ConnectorCollection> {
    const matches = parseEsportsInsiderMatches(await this.fetchHtml());
    const collectedAt = new Date().toISOString();
    const details = new Map<string, EsportsInsiderBookQuote[]>();
    for (const match of matches) {
      try { details.set(match.id, parseEsportsInsiderBookQuotes(await this.fetchHtml(match.url))); }
      catch { details.set(match.id, []); }
    }
    return {
      rawPayloads: matches.map((match) => rawFor(match, details.get(match.id) ?? [], this.sourceUrl, collectedAt)),
      normalizedRecords: matches.flatMap((match) => [...recordsFor(match, this.sourceUrl, collectedAt), ...bookRecordsFor(match, details.get(match.id) ?? [], collectedAt)])
    };
  }
  private fetchHtml(url = this.sourceUrl): Promise<string> { return this.requests.run(async () => { const response = await fetch(url, { headers: { Accept: "text/html", "Accept-Language": "en-US,en;q=0.8", "User-Agent": "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.1; source-registry-audit)" }, signal: AbortSignal.timeout(this.timeoutMs) }); const text = await response.text(); if (!response.ok) throw new HttpRequestError(`EsportsInsider HTTP ${response.status}`, response.status, retryAfterMs(response.headers.get("retry-after"))); if (/just a moment|cf-chl-|enable javascript and cookies/i.test(text)) throw new HttpRequestError("EsportsInsider returned a Cloudflare browser challenge", 403); return text; }); }
}

export function parseEsportsInsiderBookQuotes(html: string): EsportsInsiderBookQuote[] {
  const starts = [...html.matchAll(/<div\s+[^>]*class="[^"]*esi-row\s+esi-bookrow[^"]*"[^>]*>/gi)];
  return starts.flatMap((match, index) => {
    const block = html.slice(match.index, starts[index + 1]?.index ?? html.length);
    const bookmaker = /<span style="font:700 14px var\(--esi-fb\);color:var\(--esi-ink,[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(block);
    const prices = [...block.matchAll(/data-odds="([0-9]+(?:\.[0-9]+)?)"/gi)].map((item) => Number(item[1])).filter((value) => Number.isFinite(value) && value > 1);
    return bookmaker && prices.length >= 2 ? [{ bookmaker: clean(bookmaker[1]!), oddsOne: prices[0]!, oddsTwo: prices[1]! }] : [];
  });
}

const clean = (value: string): string => value.replace(/<[^>]+>/g, " ").replace(/&amp;/gi, "&").replace(/&#038;/gi, "&").replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
export function parseEsportsInsiderMatches(html: string): EsportsInsiderMatch[] {
  const starts = [...html.matchAll(/<a\s+([^>]*class="[^"]*esi-row\s+esi-mbrow[^"]*"[^>]*data-esi-m="([^"]+)"[^>]*)>/gi)];
  return starts.flatMap((match, index) => {
    const block = html.slice(match.index, starts[index + 1]?.index ?? html.length);
    const href = /href="([^"]+)"/i.exec(match[1]!)?.[1];
    const teamMatches = [...block.matchAll(/<span style="font:700 13px var\(--esi-fb\);color:var\(--esi-ink,[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)].map((item) => clean(item[1]!)).filter(Boolean);
    const prices = [...block.matchAll(/class="esi-o--l[^>]*data-odds="([0-9]+(?:\.[0-9]+)?)"/gi)].map((item) => Number(item[1])).filter((value) => Number.isFinite(value) && value > 1);
    if (!href || teamMatches.length < 2 || prices.length < 2) return [];
    const startLabel = /data-esi-live="when"[^>]*>([\s\S]*?)<\/span>/i.exec(block);
    const competition = /<span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">([\s\S]*?)<\/span>/i.exec(block);
    const seriesFormat = /<span style="font:700 11px var\(--esi-fh\);color:var\(--esi-ink-3,[^"]*"[^>]*>(BO\d+)<\/span>/i.exec(block);
    return [{ id: match[2]!, url: href, startLabel: startLabel ? clean(startLabel[1]!) : null, teamOne: teamMatches[0]!, teamTwo: teamMatches[1]!, competition: competition ? clean(competition[1]!) : null, seriesFormat: seriesFormat?.[1] ?? null, oddsOne: prices[0]!, oddsTwo: prices[1]! }];
  });
}

const recordsFor = (match: EsportsInsiderMatch, sourceUrl: string, collectedAt: string): ProviderRecord[] => ([{ side: "team-1", name: match.teamOne, odds: match.oddsOne }, { side: "team-2", name: match.teamTwo, odds: match.oddsTwo }]).map(({ side, name, odds }) => ({ sportsbook: "esportsinsider-best", sport: "Rainbow Six", competition: match.competition, eventName: `${match.teamOne} vs ${match.teamTwo}`, participants: [match.teamOne, match.teamTwo], homeParticipant: match.teamOne, awayParticipant: match.teamTwo, eventStartTime: null, eventStatus: /^live/i.test(match.startLabel ?? "") ? "live" : "prematch", phase: match.seriesFormat, market: "match_winner", marketPeriod: "full_event", selection: name, selectionStatus: "open", line: null, decimalOdds: odds, rawOdds: String(odds), rawOddsFormat: "decimal", sourceEventId: match.id, sourceMarketId: `${match.id}:match-winner`, sourceSelectionId: `${match.id}:match-winner:${side}`, sourceUrl, providerTimestamp: null, collectedAt, qualifiers: { observedVia: "esportsinsider-html", quoteScope: "best-price-across-books", rawStartLabel: match.startLabel ?? "", matchDetailUrl: match.url } }));
const slug = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const bookRecordsFor = (match: EsportsInsiderMatch, quotes: EsportsInsiderBookQuote[], collectedAt: string): ProviderRecord[] => quotes.flatMap((quote) => ([{ side: "team-1", name: match.teamOne, odds: quote.oddsOne }, { side: "team-2", name: match.teamTwo, odds: quote.oddsTwo }]).map(({ side, name, odds }) => ({ sportsbook: `esportsinsider-${slug(quote.bookmaker)}`, sport: "Rainbow Six", competition: match.competition, eventName: `${match.teamOne} vs ${match.teamTwo}`, participants: [match.teamOne, match.teamTwo], homeParticipant: match.teamOne, awayParticipant: match.teamTwo, eventStartTime: null, eventStatus: /^live/i.test(match.startLabel ?? "") ? "live" : "prematch", phase: match.seriesFormat, market: "match_winner", marketPeriod: "full_event", selection: name, selectionStatus: "open", line: null, decimalOdds: odds, rawOdds: String(odds), rawOddsFormat: "decimal", sourceEventId: match.id, sourceMarketId: `${match.id}:match-winner`, sourceSelectionId: `${match.id}:match-winner:${side}:${quote.bookmaker}`, sourceUrl: match.url, providerTimestamp: null, collectedAt, qualifiers: { observedVia: "esportsinsider-match-html", displayedBook: quote.bookmaker, rawStartLabel: match.startLabel ?? "" } })));
const rawFor = (match: EsportsInsiderMatch, quotes: EsportsInsiderBookQuote[], sourceUrl: string, retrievedAt: string): RawPayloadInput => ({ sportsbook: "esportsinsider-best", accountAlias: "public", sourceType: "html-fields", sourceUrl, retrievedAt, providerTimestamp: null, externalEventId: match.id, parserVersion: "esportsinsider-html-v1", rawPayload: { event: match, prices: quotes }, normalizedRecordCount: 2 + quotes.length * 2 });

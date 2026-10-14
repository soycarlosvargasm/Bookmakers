import { HttpRequestError, RequestGovernor, requestGovernorFor, retryAfterMs } from "../../scheduler/requests.js";
import type { HealthStatus } from "../../health/types.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";

type Bout = { card: string; venue: string; time: string; date: string | null; order: number; weight: string | null; red: string; blue: string; priceSide: "Red" | "Blue"; price: string };

export class MuayThai2000Connector implements SportsbookConnector {
  readonly id = "muaythai2000-html";
  readonly context: ConnectorContext = { sportsbook: "muaythai2000", accountAlias: "public" };
  private readonly requests: RequestGovernor;
  constructor(private readonly sourceUrl = "https://www.muaythai2000.com/en/", private readonly timeoutMs = 30_000, requests?: RequestGovernor) { this.requests = requests ?? requestGovernorFor("muaythai2000"); }
  async initialize(): Promise<void> {}
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> {}
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async validateSession(): Promise<boolean> { return parseBouts(await this.fetchHtml()).length > 0; }
  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try { const bouts = parseBouts(await this.fetchHtml()); return bouts.length ? { status: "HEALTHY", message: `${bouts.length} visible bout prices` } : { status: "DEGRADED", message: "No current bout price rows in HTML" }; }
    catch (cause) { return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) }; }
  }
  collectEvents(): Promise<ConnectorCollection> { return this.collect(); }
  collectPrematch(): Promise<ConnectorCollection> { return this.collect(); }
  async collectLive(): Promise<ConnectorCollection> { return { rawPayloads: [], normalizedRecords: [] }; }

  private async collect(): Promise<ConnectorCollection> {
    const bouts = parseBouts(await this.fetchHtml());
    const collectedAt = new Date().toISOString();
    return { rawPayloads: bouts.map((bout) => rawFor(bout, this.sourceUrl, collectedAt)), normalizedRecords: bouts.map((bout) => recordFor(bout, this.sourceUrl, collectedAt)) };
  }
  private fetchHtml(): Promise<string> { return this.requests.run(async () => { const response = await fetch(this.sourceUrl, { headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.1)" }, signal: AbortSignal.timeout(this.timeoutMs) }); const text = await response.text(); if (!response.ok) throw new HttpRequestError(`MuayThai2000 HTTP ${response.status}`, response.status, retryAfterMs(response.headers.get("retry-after"))); return text; }); }
}

const clean = (value: string): string => value.replace(/<[^>]+>/g, " ").replace(/&mdash;/gi, "—").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
const one = (pattern: RegExp, value: string): string | null => { const match = pattern.exec(value); return match ? clean(match[1]!) : null; };
export function parseBouts(html: string): Bout[] {
  const sectionStart = html.indexOf("Tonight's Odds");
  if (sectionStart < 0) return [];
  const sectionEnd = html.indexOf("<!-- RIGHT SIDEBAR", sectionStart);
  const section = html.slice(sectionStart, sectionEnd < 0 ? undefined : sectionEnd);
  const card = one(/<h3[^>]*>([\s\S]*?)<\/h3>/i, section) ?? "Muay Thai";
  const venue = one(/fa-map-marker-alt[\s\S]*?<\/i>\s*([^<]+)/i, section) ?? "Thailand";
  const time = one(/fa-clock[\s\S]*?<\/i>\s*([^<]+)/i, section) ?? "";
  const date = /[?&]date=(\d{4}-\d{2}-\d{2})/i.exec(section)?.[1] ?? null;
  const starts = [...section.matchAll(/<span class="font-bold text-gray-400">Bout\s+(\d+)<\/span>/gi)];
  return starts.flatMap((match, index) => {
    const block = section.slice(match.index, starts[index + 1]?.index ?? section.length);
    const red = one(/class="text-red-500[^>]*>([\s\S]*?)<\/span>/i, block);
    const blue = one(/class="text-blue-500[^>]*>([\s\S]*?)<\/span>/i, block);
    const weight = one(/fa-balance-scale[\s\S]*?<\/i>\s*([^<]+)/i, block);
    const prices = [...block.matchAll(/class="inline-flex[^>]*>([\s\S]*?)<\/span>/gi)].map((item) => clean(item[1]!));
    const latest = prices.at(-1)?.match(/^(Red|Blue)\s+(เสมอ|\d+\s*\/\s*\d+)$/i);
    if (!red || !blue || !latest) return [];
    return [{ card, venue, time, date, order: Number(match[1]), weight, red, blue, priceSide: latest[1]!.toLocaleLowerCase() === "red" ? "Red" : "Blue", price: latest[2]!.replace(/\s+/g, "") }];
  });
}

const eventId = (bout: Bout): string => `${bout.date ?? "unknown"}:${bout.card}:${bout.order}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const startTime = (bout: Bout): string | null => {
  if (!bout.date) return null;
  const match = /(\d{1,2}):(\d{2})/.exec(bout.time);
  if (!match) return `${bout.date}T00:00:00+07:00`;
  return `${bout.date}T${match[1]!.padStart(2, "0")}:${match[2]}:00+07:00`;
};
const decimal = (price: string): number => { if (price === "เสมอ") return 2; const [a, b] = price.split("/").map(Number); return 1 + a! / b!; };
const recordFor = (bout: Bout, sourceUrl: string, collectedAt: string): ProviderRecord => ({ sportsbook: "muaythai2000", sport: "Muay Thai", competition: `${bout.card} — ${bout.venue}`, eventName: `${bout.red} vs ${bout.blue}`, participants: [bout.red, bout.blue], homeParticipant: bout.red, awayParticipant: bout.blue, eventStartTime: startTime(bout), eventStatus: startTime(bout) && Date.parse(startTime(bout)!) < Date.now() ? "closed" : "prematch", phase: bout.weight, market: "moneyline", marketPeriod: "bout", selection: bout.priceSide === "Red" ? bout.red : bout.blue, selectionStatus: "open", line: null, decimalOdds: decimal(bout.price), rawOdds: bout.price === "เสมอ" ? "1/1" : bout.price, rawOddsFormat: "fractional", sourceEventId: eventId(bout), sourceMarketId: `${eventId(bout)}:moneyline`, sourceSelectionId: `${eventId(bout)}:moneyline:${bout.priceSide.toLowerCase()}`, sourceUrl, providerTimestamp: null, collectedAt, qualifiers: { observedVia: "muaythai2000-html", corner: bout.priceSide, rawDisplayedPrice: bout.price, boutOrder: String(bout.order), weight: bout.weight ?? "" } });
const rawFor = (bout: Bout, sourceUrl: string, retrievedAt: string): RawPayloadInput => ({ sportsbook: "muaythai2000", accountAlias: "public", sourceType: "html-fields", sourceUrl, retrievedAt, providerTimestamp: null, externalEventId: eventId(bout), parserVersion: "muaythai2000-html-v1", rawPayload: { event: bout }, normalizedRecordCount: 1 });

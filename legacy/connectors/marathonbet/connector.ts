import { HttpRequestError, RequestGovernor, requestGovernorFor, retryAfterMs } from "../../scheduler/requests.js";
import type { HealthStatus } from "../../health/types.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";

type Selection = { id: string; market: string; name: string; line: string | null; price: number; key: string };
type EventRow = { id: string; treeId: string; name: string; sport: string; live: boolean; participants: string[]; selections: Selection[] };

export class MarathonbetConnector implements SportsbookConnector {
  readonly id = "marathonbet-html";
  readonly context: ConnectorContext = { sportsbook: "marathonbet", accountAlias: "public" };
  private readonly requests: RequestGovernor;
  constructor(private readonly sourceUrl: string, private readonly timeoutMs = 30_000, requests?: RequestGovernor) { this.requests = requests ?? requestGovernorFor("marathonbet"); }
  async initialize(): Promise<void> {}
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> {}
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async validateSession(): Promise<boolean> { return parseMarathonEvents(await this.fetchHtml()).some((event) => event.selections.length); }
  async health(): Promise<{ status: HealthStatus; message?: string }> { try { const rows = parseMarathonEvents(await this.fetchHtml()); const prices = rows.reduce((n, row) => n + row.selections.length, 0); return prices ? { status: "HEALTHY", message: `${rows.length} events and ${prices} prices in public HTML` } : { status: "DEGRADED", message: "No prices in public HTML" }; } catch (cause) { return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) }; } }
  collectEvents(): Promise<ConnectorCollection> { return this.collect(); }
  collectPrematch(): Promise<ConnectorCollection> { return this.collect(); }
  collectLive(): Promise<ConnectorCollection> { return this.collect(true); }
  private async collect(liveOnly = false): Promise<ConnectorCollection> { const rows = parseMarathonEvents(await this.fetchHtml()).filter((event) => !liveOnly || event.live); const collectedAt = new Date().toISOString(); return { rawPayloads: rows.map((event) => rawFor(event, this.sourceUrl, collectedAt)), normalizedRecords: rows.flatMap((event) => recordsFor(event, this.sourceUrl, collectedAt)) }; }
  private fetchHtml(): Promise<string> { return this.requests.run(async () => { const response = await fetch(this.sourceUrl, { redirect: "follow", headers: { Accept: "text/html", "Accept-Language": "en-US,en;q=0.8", "User-Agent": "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.1)" }, signal: AbortSignal.timeout(this.timeoutMs) }); const text = await response.text(); if (!response.ok) throw new HttpRequestError(`Marathonbet HTTP ${response.status}`, response.status, retryAfterMs(response.headers.get("retry-after"))); return text; }); }
}

const decode = (value: string): string => value.replace(/<[^>]+>/g, " ").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, "&").replace(/&mdash;/gi, "—").replace(/\s+/g, " ").trim();
const attr = (attributes: string, name: string): string | null => { const match = new RegExp(`${name}=(?:"([^"]*)"|'([^']*)')`, "i").exec(attributes); return match ? decode(match[1] ?? match[2] ?? "") : null; };
export function parseMarathonEvents(html: string): EventRow[] {
  const starts = [...html.matchAll(/<div\s+([^>]*class=(?:"[^"]*coupon-row[^"]*"|'[^']*coupon-row[^']*')[^>]*)>/gi)].filter((match) => attr(match[1]!, "data-event-eventId"));
  return starts.flatMap((match, index) => {
    const attributes = match[1]!;
    const id = attr(attributes, "data-event-eventId");
    const name = attr(attributes, "data-event-name");
    if (!id || !name) return [];
    const block = html.slice(match.index, starts[index + 1]?.index ?? html.length);
    const prefix = html.slice(Math.max(0, match.index - 40_000), match.index);
    const sports = [...prefix.matchAll(/data-sport-type=(?:"([^"]+)"|'([^']+)')/gi)];
    const sport = decode(sports.at(-1)?.[1] ?? sports.at(-1)?.[2] ?? "Unknown");
    const selections: Selection[] = [];
    for (const cell of block.matchAll(/<td\s+([^>]*class=(?:"[^"]*\bprice\b[^"]*"|'[^']*\bprice\b[^']*')[^>]*)>([\s\S]*?)<\/td>/gi)) {
      const market = attr(cell[1]!, "data-market-type");
      const priceMatch = /data-selection-price="([^"]+)"[\s\S]*?data-selection-key="([^"]+)"/i.exec(cell[2]!);
      const selection = /<span class="left-simple"[^>]*>([\s\S]*?)<\/span>/i.exec(cell[2]!);
      if (!market || !priceMatch || !selection) continue;
      const price = Number(priceMatch[1]);
      if (!Number.isFinite(price) || price <= 1) continue;
      const line = /<span class="middle-simple"[^>]*>([\s\S]*?)<\/span>/i.exec(cell[2]!);
      selections.push({ id: attr(cell[1]!, "data-coeff-uuid") ?? priceMatch[2]!, market, name: decode(selection[1]!), line: line ? decode(line[1]!).replace(/^\(|\)$/g, "") : null, price, key: decode(priceMatch[2]!) });
    }
    const participants = name.split(/\s+vs\s+/i).map(decode).filter(Boolean);
    return [{ id, treeId: attr(attributes, "data-event-treeId") ?? id, name, sport, live: attr(attributes, "data-live") === "true", participants, selections }];
  });
}

const recordsFor = (event: EventRow, sourceUrl: string, collectedAt: string): ProviderRecord[] => event.selections.map((selection) => ({ sportsbook: "marathonbet", sport: event.sport, competition: null, eventName: event.name, participants: event.participants, homeParticipant: event.participants[0] ?? null, awayParticipant: event.participants[1] ?? null, eventStartTime: null, eventStatus: event.live ? "live" : "prematch", market: selection.market.toLowerCase(), marketPeriod: "full_event", selection: selection.name, selectionStatus: "open", line: selection.line, decimalOdds: selection.price, rawOdds: String(selection.price), rawOddsFormat: "decimal", sourceEventId: event.id, sourceMarketId: `${event.id}:${selection.market}`, sourceSelectionId: selection.id, sourceUrl, providerTimestamp: null, collectedAt, qualifiers: { observedVia: "marathonbet-html", selectionKey: selection.key, treeId: event.treeId, rawMarketName: selection.market } }));
const rawFor = (event: EventRow, sourceUrl: string, retrievedAt: string): RawPayloadInput => ({ sportsbook: "marathonbet", accountAlias: "public", sourceType: "html-fields", sourceUrl, retrievedAt, providerTimestamp: null, externalEventId: event.id, parserVersion: "marathonbet-html-v1", rawPayload: { event }, normalizedRecordCount: event.selections.length });

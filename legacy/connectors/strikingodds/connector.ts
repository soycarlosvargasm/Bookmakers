import { HttpRequestError, RequestGovernor, requestGovernorFor, retryAfterMs } from "../../scheduler/requests.js";
import type { HealthStatus } from "../../health/types.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";

type Fighter = { id?: string; name?: string };
type Quote = { sportsbook?: string; moneylineA?: number; moneylineB?: number; openingMoneylineA?: number; openingMoneylineB?: number; capturedAt?: string; updatedAt?: string };
type Bout = { id?: string; slug?: string; weightClass?: string; fighterA?: Fighter; fighterB?: Fighter; odds?: Quote[] };
type Event = { id?: string; slug?: string; title?: string; promotion?: string; startsAt?: string; status?: string; bouts?: Bout[] };
type Board = { generatedAt?: string; events?: Event[]; integrity?: unknown; withheld?: unknown[] };

export class StrikingOddsConnector implements SportsbookConnector {
  readonly id = "strikingodds-public-api";
  readonly context: ConnectorContext = { sportsbook: "strikingodds", accountAlias: "public" };
  private readonly endpoint: string;
  private readonly requests: RequestGovernor;
  constructor(private readonly sourceUrl = "https://www.strikingodds.io/", private readonly timeoutMs = 30_000, requests?: RequestGovernor) {
    this.endpoint = new URL("/api/odds", sourceUrl).toString();
    this.requests = requests ?? requestGovernorFor("strikingodds");
  }
  async initialize(): Promise<void> {}
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> {}
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async validateSession(): Promise<boolean> { return Array.isArray((await this.fetchBoard()).events); }
  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try { const board = await this.fetchBoard(); const quotes = board.events?.reduce((count, event) => count + (event.bouts ?? []).reduce((sum, bout) => sum + (bout.odds?.length ?? 0), 0), 0) ?? 0; return { status: "HEALTHY", message: `${board.events?.length ?? 0} events and ${quotes} two-way quotes` }; }
    catch (cause) { return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) }; }
  }
  collectEvents(): Promise<ConnectorCollection> { return this.collect(); }
  collectPrematch(): Promise<ConnectorCollection> { return this.collect(); }
  async collectLive(): Promise<ConnectorCollection> { return { rawPayloads: [], normalizedRecords: [] }; }

  private async collect(): Promise<ConnectorCollection> {
    const board = await this.fetchBoard();
    const collectedAt = new Date().toISOString();
    const events = board.events ?? [];
    const normalizedRecords = events.flatMap((event) => recordsFor(event, board, this.sourceUrl, collectedAt));
    const rawPayloads: RawPayloadInput[] = events.map((event) => ({ sportsbook: "strikingodds", accountAlias: "public", sourceType: "public-json-api", sourceUrl: this.endpoint, retrievedAt: collectedAt, providerTimestamp: board.generatedAt ?? null, externalEventId: event.id ?? null, parserVersion: "strikingodds-public-api-v1", rawPayload: { generatedAt: board.generatedAt, event }, normalizedRecordCount: recordsFor(event, board, this.sourceUrl, collectedAt).length }));
    return { rawPayloads, normalizedRecords };
  }

  private async fetchBoard(): Promise<Board> {
    return this.requests.run(async () => {
      const response = await fetch(this.endpoint, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.1)" }, signal: AbortSignal.timeout(this.timeoutMs) });
      const text = await response.text();
      if (!response.ok) throw new HttpRequestError(`StrikingOdds API HTTP ${response.status}`, response.status, retryAfterMs(response.headers.get("retry-after")));
      let board: Board;
      try { board = JSON.parse(text) as Board; } catch { throw new Error("StrikingOdds API did not return valid JSON"); }
      if (!Array.isArray(board.events)) throw new Error("StrikingOdds API did not contain events");
      return board;
    });
  }
}

const slug = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const validAmerican = (value: number | undefined): value is number => typeof value === "number" && Number.isFinite(value) && value !== 0;
const recordsFor = (event: Event, board: Board, sourceUrl: string, collectedAt: string): ProviderRecord[] => (event.bouts ?? []).flatMap((bout) => (bout.odds ?? []).flatMap((quote) => {
  if (!event.id || !bout.id || !quote.sportsbook) return [];
  const parentEventId = event.id;
  const displayedBook = quote.sportsbook;
  const book = slug(displayedBook);
  return ([{ side: "A", fighter: bout.fighterA, odds: quote.moneylineA }, { side: "B", fighter: bout.fighterB, odds: quote.moneylineB }] as const).flatMap(({ side, fighter, odds }) => {
    if (!fighter?.name || !validAmerican(odds)) return [];
    return [{ sportsbook: `strikingodds-${book}`, sport: "Combat Sports", competition: event.promotion ?? null,
      eventName: `${bout.fighterA?.name ?? "TBD"} vs ${bout.fighterB?.name ?? "TBD"}`, participants: [bout.fighterA?.name, bout.fighterB?.name].filter((name): name is string => Boolean(name)),
      homeParticipant: bout.fighterA?.name ?? null, awayParticipant: bout.fighterB?.name ?? null, eventStartTime: event.startsAt ?? null,
      eventStatus: /final|complete/i.test(event.status ?? "") ? "closed" : "prematch", phase: bout.weightClass ?? null, market: "moneyline", marketPeriod: "bout",
      selection: fighter.name, selectionStatus: "open", line: null, rawOdds: String(odds), rawOddsFormat: "american", sourceEventId: bout.id,
      sourceMarketId: `${bout.id}:moneyline`, sourceSelectionId: `${bout.id}:moneyline:${side}:${quote.sportsbook}`, sourceUrl,
      providerTimestamp: quote.updatedAt ?? quote.capturedAt ?? board.generatedAt ?? null, collectedAt,
      qualifiers: { observedVia: "strikingodds-public-api", displayedBook, parentEventId, parentEventTitle: event.title ?? "" } }];
  });
}));

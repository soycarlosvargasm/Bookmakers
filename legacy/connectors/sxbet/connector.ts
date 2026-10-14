import { RequestGovernor, requestGovernorFor, HttpRequestError, retryAfterMs } from "../../scheduler/requests.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";
import type { HealthStatus } from "../../health/types.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";

type SxLevel = { percentageOdds: string; size: string };
type SxMarket = {
  status: string; marketHash: string; outcomeOneName?: string; outcomeTwoName?: string;
  teamOneName?: string; teamTwoName?: string; type?: number; gameTime?: number; line?: number | string;
  sportXeventId?: string; liveEnabled?: boolean; sportLabel?: string; leagueId?: number;
  leagueLabel?: string; mainLine?: boolean;
};
type SxMarketsPage = { status: string; data?: { markets?: SxMarket[]; nextKey?: string | null } };
type SxBook = { status: string; data?: { marketHash: string; outcomeOne?: SxLevel[]; outcomeTwo?: SxLevel[]; version?: string } };
type HttpResult = { url: string; status: number; body: string; contentType: string };

export type SxBetConnectorOptions = {
  baseUrl?: string;
  maxMarkets?: number;
  requestTimeoutMs?: number;
  requestGovernor?: RequestGovernor;
};

/** Public REST collector for SX Bet's exchange markets and taker-side book. */
export class SxBetConnector implements SportsbookConnector {
  readonly id = "sxbet";
  readonly context: ConnectorContext = { sportsbook: "sxbet", accountAlias: "public" };
  private readonly baseUrl: string;
  private readonly maxMarkets: number;
  private readonly requestTimeoutMs: number;
  private readonly requests: RequestGovernor;

  constructor(options: SxBetConnectorOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://api.sx.bet").replace(/\/$/, "");
    this.maxMarkets = options.maxMarkets ?? 100;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
    this.requests = options.requestGovernor ?? requestGovernorFor("sxbet");
  }

  async initialize(): Promise<void> {}
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> {}
  async validateSession(): Promise<boolean> { return (await this.request("/sports")).status === 200; }
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}

  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try {
      const response = await this.request("/sports");
      return response.status === 200 ? { status: "HEALTHY" } : { status: "DEGRADED", message: `HTTP ${response.status}` };
    } catch (cause) {
      return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) };
    }
  }

  async collectEvents(): Promise<ConnectorCollection> { return this.collect(false); }
  async collectPrematch(): Promise<ConnectorCollection> { return this.collect(false); }
  async collectLive(): Promise<ConnectorCollection> { return this.collect(true); }

  private async collect(liveOnly: boolean): Promise<ConnectorCollection> {
    const marketResponse = await this.request("/markets/active", { pageSize: String(this.maxMarkets), ...(liveOnly ? { liveOnly: "true" } : {}) });
    const page = JSON.parse(marketResponse.body) as SxMarketsPage;
    const markets = (page.data?.markets ?? []).slice(0, this.maxMarkets);
    const rawPayloads: RawPayloadInput[] = [this.raw("markets-active", marketResponse)];
    const books = await Promise.all(markets.map(async (market) => {
      try {
        const response = await this.request("/orderbook-v3/snapshot", { marketHash: market.marketHash, showTakerPerspective: "true" });
        rawPayloads.push(this.raw("orderbook-snapshot", response, market.marketHash));
        return { market, book: JSON.parse(response.body) as SxBook };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        rawPayloads.push(this.failureRaw(market.marketHash, message));
        return { market, book: null };
      }
    }));
    const collectedAt = new Date().toISOString();
    return { rawPayloads, normalizedRecords: books.flatMap(({ market, book }) => this.recordsFor(market, book, liveOnly, collectedAt)) };
  }

  private recordsFor(market: SxMarket, book: SxBook | null, liveOnly: boolean, collectedAt: string): ProviderRecord[] {
    const data = book?.data;
    const eventName = [market.teamOneName, market.teamTwoName].filter(Boolean).join(" vs ") || null;
    const sourceUrl = this.url("/orderbook-v3/snapshot", { marketHash: market.marketHash, showTakerPerspective: "true" });
    const common = {
      sportsbook: "sxbet", sport: market.sportLabel ?? null, competition: market.leagueLabel ?? null,
      eventName, participants: [market.teamOneName, market.teamTwoName].filter((name): name is string => Boolean(name)),
      homeParticipant: null, awayParticipant: null,
      eventStartTime: market.gameTime ? new Date(market.gameTime * 1000).toISOString() : null,
      eventStatus: liveOnly ? "live" : null, phase: null, market: market.type === undefined ? null : String(market.type),
      marketPeriod: null, line: market.line === undefined ? null : String(market.line), sourceEventId: market.sportXeventId ?? null,
      sourceMarketId: market.marketHash, sourceUrl, providerTimestamp: null, participantPlayer: null, collectedAt,
      qualifiers: { sourceKind: "exchange", marketStatus: market.status, marketType: market.type === undefined ? "" : String(market.type), mainLine: String(Boolean(market.mainLine)), orderbookVersion: data?.version ?? "" }
    };
    return [
      this.recordForSide(common, "one", market.outcomeOneName, data?.outcomeOne?.[0] ?? null),
      this.recordForSide(common, "two", market.outcomeTwoName, data?.outcomeTwo?.[0] ?? null)
    ];
  }

  private recordForSide(common: Omit<ProviderRecord, "selection" | "selectionStatus" | "sourceSelectionId" | "rawOdds" | "rawOddsFormat" | "decimalOdds">, side: "one" | "two", selection: string | undefined, level: SxLevel | null): ProviderRecord {
    const percentage = level ? this.percentage(level.percentageOdds) : null;
    return {
      ...common,
      selection: selection ?? null,
      selectionStatus: level ? "active" : "unavailable",
      sourceSelectionId: `${common.sourceMarketId}:${side}`,
      rawOdds: percentage === null ? null : `${percentage}%`,
      rawOddsFormat: null,
      decimalOdds: percentage !== null && percentage > 0 ? 100 / percentage : null,
      qualifiers: { ...(common.qualifiers ?? {}), availableSize: level?.size ?? "", oddsPerspective: "taker", probabilityPercent: percentage === null ? "" : String(percentage) }
    };
  }

  private percentage(raw: string): number | null {
    try {
      const scaled = BigInt(raw);
      const value = Number(scaled / 100_000_000_000_000n) / 10_000;
      return Number.isFinite(value) && value > 0 && value <= 100 ? value : null;
    } catch { return null; }
  }

  private raw(sourceType: string, response: HttpResult, externalEventId: string | null = null): RawPayloadInput {
    return { sportsbook: "sxbet", accountAlias: "public", sourceType, sourceUrl: response.url, retrievedAt: new Date().toISOString(), providerTimestamp: null, externalEventId, rawPayload: { status: response.status, contentType: response.contentType, body: response.body }, parserVersion: "sxbet-v1" };
  }

  private failureRaw(marketHash: string, message: string): RawPayloadInput {
    return { sportsbook: "sxbet", accountAlias: "public", sourceType: "fetch-error", sourceUrl: this.url("/orderbook-v3/snapshot", { marketHash, showTakerPerspective: "true" }), retrievedAt: new Date().toISOString(), providerTimestamp: null, externalEventId: marketHash, rawPayload: { marketHash, error: message }, parserVersion: "sxbet-v1" };
  }

  private url(path: string, query: Record<string, string> = {}): string {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return url.toString();
  }

  private async request(path: string, query: Record<string, string> = {}): Promise<HttpResult> {
    const url = this.url(path, query);
    return this.requests.run(async () => {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(this.requestTimeoutMs) });
    const body = await response.text();
    if (!response.ok) throw new HttpRequestError(`SX Bet HTTP ${response.status}`, response.status, retryAfterMs(response.headers.get("retry-after")));
    return { url: response.url, status: response.status, contentType: response.headers.get("content-type") ?? "", body };
    });
  }
}

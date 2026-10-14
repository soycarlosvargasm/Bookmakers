import { RequestGovernor, requestGovernorFor, HttpRequestError, retryAfterMs } from "../../scheduler/requests.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";
import type { HealthStatus } from "../../health/types.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";

type Team = { id: number; full_name?: string };
type Odds = { book_id: number; type?: string; inserted?: string; ml_away?: number | null; ml_home?: number | null; draw?: number | null; spread_away?: number | null; spread_home?: number | null; spread_away_line?: number | null; spread_home_line?: number | null; over?: number | null; under?: number | null; total?: number | null };
type Game = { id: number; status?: string; start_time?: string; league_name?: string; away_team_id?: number; home_team_id?: number; teams?: Team[]; odds?: Odds[] };
type Scoreboard = { league?: { sport?: string; name?: string }; games?: Game[] };
type AllScoreboard = { all_games?: Array<{ league_name?: string; games?: Game[] }> };
type Response = { url: string; status: number; contentType: string; body: string };

export type ActionNetworkConnectorOptions = { baseUrl?: string; leagues?: string[]; bookIds?: number[]; requestTimeoutMs?: number; requestGovernor?: RequestGovernor };
export const DEFAULT_ACTION_LEAGUES = ["nfl", "ncaaf", "nba", "wnba", "mlb", "nhl"] as const;
export const DEFAULT_ACTION_BOOK_IDS = [3, 13, 21, 24, 68, 69, 75] as const;

/** Read-only connector for the public Action Network scoreboard feed. */
export class ActionNetworkConnector implements SportsbookConnector {
  readonly id = "actionnetwork";
  readonly context: ConnectorContext = { sportsbook: "actionnetwork", accountAlias: "public" };
  private readonly baseUrl: string;
  private readonly leagues: string[];
  private readonly bookIds: number[];
  private readonly requestTimeoutMs: number;
  private readonly requests: RequestGovernor;
  constructor(options: ActionNetworkConnectorOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://api.actionnetwork.com").replace(/\/$/, "");
    // The former /all endpoint now returns HTTP 200 with an empty object in
    // production. Start with the independently verified league endpoints;
    // callers can still request /all explicitly by passing leagues: [].
    this.leagues = options.leagues ?? [...DEFAULT_ACTION_LEAGUES];
    this.bookIds = options.bookIds?.length ? options.bookIds : [...DEFAULT_ACTION_BOOK_IDS];
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
    this.requests = options.requestGovernor ?? requestGovernorFor("actionnetwork");
  }
  async initialize(): Promise<void> {}
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> {}
  async validateSession(): Promise<boolean> { return (await this.scoreboardHealth()).status === "HEALTHY"; }
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try { return await this.scoreboardHealth(); }
    catch (cause) { return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) }; }
  }
  async collectEvents(): Promise<ConnectorCollection> { return this.collect(false); }
  async collectPrematch(): Promise<ConnectorCollection> { return this.collect(false); }
  async collectLive(): Promise<ConnectorCollection> { return this.collect(true); }

  private async collect(liveOnly: boolean): Promise<ConnectorCollection> {
    const responses = this.leagues.length
      ? await Promise.all(this.leagues.map((league) => this.request(`/web/v1/scoreboard/${league}`, { bookIds: this.bookIds.join(",") })))
      : [await this.request("/web/v1/scoreboard/all", { bookIds: this.bookIds.join(",") })];
    const boards = responses.map((response) => this.parseBoard(response));
    const rawPayloads = responses.map((response) => ({ sportsbook: "actionnetwork", accountAlias: "public", sourceType: "scoreboard-json", sourceUrl: response.url, retrievedAt: new Date().toISOString(), providerTimestamp: null, externalEventId: null, rawPayload: { status: response.status, contentType: response.contentType, body: response.body }, parserVersion: "actionnetwork-v2" } satisfies RawPayloadInput));
    const collectedAt = new Date().toISOString();
    const normalizedRecords = this.leagues.length
      ? responses.flatMap((response, index) => this.records(boards[index]! as Scoreboard, liveOnly, response.url, collectedAt))
      : responses.flatMap((response, index) => this.recordsFromAll(boards[index]! as AllScoreboard, liveOnly, response.url, collectedAt));
    return { rawPayloads, normalizedRecords };
  }
  /** HTTP 200 from /books is insufficient: the feed can return an empty object. */
  private async scoreboardHealth(): Promise<{ status: HealthStatus; message?: string }> {
    const path = this.leagues.length ? `/web/v1/scoreboard/${this.leagues[0]}` : "/web/v1/scoreboard/all";
    const board = this.parseBoard(await this.request(path, { bookIds: this.bookIds.join(",") }));
    const valid = this.leagues.length ? Array.isArray((board as Scoreboard).games) : Array.isArray((board as AllScoreboard).all_games);
    return valid ? { status: "HEALTHY" } : { status: "DEGRADED", message: "Action Network scoreboard response did not contain the expected games schema" };
  }
  private parseBoard(response: Response): Scoreboard | AllScoreboard {
    try {
      const board: unknown = JSON.parse(response.body);
      if (!board || typeof board !== "object") throw new Error("not an object");
      const candidate = board as Scoreboard & AllScoreboard;
      if (!Array.isArray(candidate.games) && !Array.isArray(candidate.all_games)) throw new Error("missing games/all_games");
      return candidate;
    } catch (cause) {
      throw new Error(`Action Network scoreboard schema invalid at ${response.url}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }
  private recordsFromAll(board: AllScoreboard, liveOnly: boolean, sourceUrl: string, collectedAt: string): ProviderRecord[] {
    return (board.all_games ?? []).flatMap((group) => (group.games ?? []).flatMap((game) => this.records({ league: { sport: group.league_name, name: game.league_name ?? group.league_name }, games: [game] }, liveOnly, sourceUrl, collectedAt)));
  }
  private records(board: Scoreboard, liveOnly: boolean, sourceUrl: string, collectedAt: string): ProviderRecord[] {
    return (board.games ?? []).flatMap((game) => {
      const status = game.status?.toLowerCase() ?? null;
      if (liveOnly && status !== "in_progress" && status !== "live") return [];
      if (!liveOnly && (status === "complete" || status === "final" || status === "closed")) return [];
      const away = game.teams?.find((team) => team.id === game.away_team_id)?.full_name ?? null;
      const home = game.teams?.find((team) => team.id === game.home_team_id)?.full_name ?? null;
      const common = { sport: board.league?.sport ?? null, competition: board.league?.name ?? null, eventName: [away, home].filter(Boolean).join(" @ ") || null, participants: [away, home].filter((name): name is string => Boolean(name)), homeParticipant: home, awayParticipant: away, eventStartTime: game.start_time ?? null, eventStatus: status, phase: null, sourceEventId: String(game.id), sourceUrl, participantPlayer: null, collectedAt };
      return (game.odds ?? []).flatMap((odds) => this.recordsForOdds(common, odds));
    });
  }
  private recordsForOdds(common: Omit<ProviderRecord, "sportsbook" | "market" | "marketPeriod" | "selection" | "line" | "rawOdds" | "rawOddsFormat" | "sourceMarketId" | "sourceSelectionId" | "providerTimestamp" | "qualifiers">, odds: Odds): ProviderRecord[] {
    const sportsbook = `actionnetwork-${odds.book_id}`;
    const qualifier = { sourceKind: "scoreboard", actionNetworkBookId: String(odds.book_id), feedType: odds.type ?? "", insertedAt: odds.inserted ?? "" };
    // The live scoreboard uses spread_* for the handicap and
    // spread_*_line for the American price (verified against current RAW).
    const rows: Array<[string, string, number | null | undefined, number | null | undefined]> = [["moneyline", "Away", odds.ml_away, null], ["moneyline", "Home", odds.ml_home, null], ["moneyline", "Draw", odds.draw, null], ["spread", "Away", odds.spread_away_line, odds.spread_away], ["spread", "Home", odds.spread_home_line, odds.spread_home], ["total", "Over", odds.over, odds.total], ["total", "Under", odds.under, odds.total]];
    return rows.filter(([, , price]) => price !== null && price !== undefined).map(([market, selection, price, line]) => ({ ...common, sportsbook, market, marketPeriod: odds.type ?? "game", selection, line: line === null || line === undefined ? null : String(line), rawOdds: String(price), rawOddsFormat: "american", sourceMarketId: `${gameKey(common.sourceEventId)}:${odds.book_id}:${odds.type ?? "game"}:${market}`, sourceSelectionId: `${odds.book_id}:${odds.type ?? "game"}:${market}:${selection}`, providerTimestamp: odds.inserted ?? null, qualifiers: qualifier }));
  }
  private url(path: string, query: Record<string, string> = {}): string { const url = new URL(path, this.baseUrl); for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value); return url.toString(); }
  private async request(path: string, query: Record<string, string> = {}): Promise<Response> { const url = this.url(path, query); return this.requests.run(async () => { const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(this.requestTimeoutMs) }); const body = await response.text(); if (!response.ok) throw new HttpRequestError(`Action Network HTTP ${response.status}`, response.status, retryAfterMs(response.headers.get("retry-after"))); return { url: response.url, status: response.status, contentType: response.headers.get("content-type") ?? "", body }; }); }
}
const gameKey = (id: string | null | undefined): string => id ?? "unknown";

import { HttpRequestError, RequestGovernor, requestGovernorFor, retryAfterMs } from "../../scheduler/requests.js";
import type { HealthStatus } from "../../health/types.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";

type Side = { best_book?: string; best_price?: number; name?: string; side?: string };
type Game = { id?: string; home?: string; away?: string; sport?: string; sport_key?: string; competition?: string; commence_time?: string; stale?: boolean; sides?: Side[] };
type Runner = { best_book?: string; best_win?: number; name?: string; number?: number };
type Race = { id?: string; category?: string; category_label?: string; country?: string; distance_m?: number; race_name?: string; race_number?: number; runner_names?: string[]; start_time?: string; stale?: boolean; top?: Runner[]; venue?: string };
type Board = { generated_at?: string; books_names?: Record<string, string>; sports?: { games?: Game[] }; racing?: { races?: Race[] } };

export class PuntersEdgeConnector implements SportsbookConnector {
  readonly id = "puntersedge-embedded-json";
  readonly context: ConnectorContext = { sportsbook: "puntersedge", accountAlias: "public" };
  private readonly requests: RequestGovernor;
  constructor(private readonly sourceUrl = "https://puntersedge.online/best-odds", private readonly timeoutMs = 30_000, requests?: RequestGovernor) {
    this.requests = requests ?? requestGovernorFor("puntersedge");
  }
  async initialize(): Promise<void> {}
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> {}
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async validateSession(): Promise<boolean> { return Boolean((await this.fetchBoard()).sports?.games); }
  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try { const board = await this.fetchBoard(); return { status: "HEALTHY", message: `${board.sports?.games?.length ?? 0} games and ${board.racing?.races?.length ?? 0} races` }; }
    catch (cause) { return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) }; }
  }
  collectEvents(): Promise<ConnectorCollection> { return this.collect(); }
  collectPrematch(): Promise<ConnectorCollection> { return this.collect(); }
  async collectLive(): Promise<ConnectorCollection> { return { rawPayloads: [], normalizedRecords: [] }; }

  private async collect(): Promise<ConnectorCollection> {
    const board = await this.fetchBoard();
    const collectedAt = new Date().toISOString();
    const games = board.sports?.games ?? [];
    const races = board.racing?.races ?? [];
    return {
      rawPayloads: [...games.map((game) => rawGame(game, board, this.sourceUrl, collectedAt)), ...races.map((race) => rawRace(race, board, this.sourceUrl, collectedAt))],
      normalizedRecords: [...games.flatMap((game) => gameRecords(game, board, this.sourceUrl, collectedAt)), ...races.flatMap((race) => raceRecords(race, board, this.sourceUrl, collectedAt))]
    };
  }

  private async fetchBoard(): Promise<Board> {
    const body = await this.requests.run(async () => {
      const response = await fetch(this.sourceUrl, { headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.1)" }, signal: AbortSignal.timeout(this.timeoutMs) });
      const text = await response.text();
      if (!response.ok) throw new HttpRequestError(`PuntersEdge HTTP ${response.status}`, response.status, retryAfterMs(response.headers.get("retry-after")));
      return text;
    });
    const match = /<script[^>]*id=["']bo-initial["'][^>]*>([\s\S]*?)<\/script>/i.exec(body);
    if (!match) throw new Error("PuntersEdge page did not contain bo-initial JSON");
    let parsed: { board?: Board };
    try { parsed = JSON.parse(match[1]!) as { board?: Board }; } catch { throw new Error("PuntersEdge bo-initial was not valid JSON"); }
    if (!parsed.board) throw new Error("PuntersEdge bo-initial did not contain a board");
    return parsed.board;
  }
}

const bookKey = (raw: string | undefined): string => (raw ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const displayedBook = (board: Board, raw: string | undefined): string => raw ? board.books_names?.[raw] ?? raw : "unknown";
const validPrice = (value: number | undefined): value is number => typeof value === "number" && Number.isFinite(value) && value > 1;

const gameRecords = (game: Game, board: Board, sourceUrl: string, collectedAt: string): ProviderRecord[] => (game.sides ?? []).flatMap((side) => {
  if (!game.id || !side.name || !validPrice(side.best_price)) return [];
  const book = bookKey(side.best_book);
  return [{ sportsbook: `puntersedge-${book}`, sport: game.sport ?? game.sport_key ?? null, competition: game.competition ?? null,
    eventName: [game.away, game.home].filter(Boolean).join(" @ "), participants: [game.away, game.home].filter((value): value is string => Boolean(value)),
    homeParticipant: game.home ?? null, awayParticipant: game.away ?? null, eventStartTime: game.commence_time ?? null, eventStatus: "prematch", market: "moneyline", marketPeriod: "full_event",
    selection: side.name, selectionStatus: game.stale ? "stale" : "open", line: null, decimalOdds: side.best_price, rawOdds: String(side.best_price), rawOddsFormat: "decimal",
    sourceEventId: game.id, sourceMarketId: `${game.id}:moneyline`, sourceSelectionId: `${game.id}:moneyline:${side.side ?? side.name}`, sourceUrl,
    providerTimestamp: board.generated_at ?? null, collectedAt, qualifiers: { observedVia: "puntersedge-bo-initial", rawBook: side.best_book ?? "unknown", displayedBook: displayedBook(board, side.best_book), rawSportName: game.sport ?? game.sport_key ?? "unknown" } }];
});

const raceRecords = (race: Race, board: Board, sourceUrl: string, collectedAt: string): ProviderRecord[] => (race.top ?? []).flatMap((runner) => {
  if (!race.id || !runner.name || !validPrice(runner.best_win)) return [];
  const book = bookKey(runner.best_book);
  const eventName = `${race.venue ?? "Race"} R${race.race_number ?? "?"}${race.race_name ? `: ${race.race_name}` : ""}`;
  return [{ sportsbook: `puntersedge-${book}`, sport: race.category_label ?? race.category ?? "Racing", competition: race.venue ?? race.country ?? null,
    eventName, participants: race.runner_names ?? null, eventStartTime: race.start_time ?? null, eventStatus: "prematch", market: "winner", marketPeriod: "race",
    selection: runner.name, selectionStatus: race.stale ? "stale" : "open", line: null, decimalOdds: runner.best_win, rawOdds: String(runner.best_win), rawOddsFormat: "decimal",
    sourceEventId: race.id, sourceMarketId: `${race.id}:winner`, sourceSelectionId: `${race.id}:winner:${runner.number ?? runner.name}`, sourceUrl,
    providerTimestamp: board.generated_at ?? null, collectedAt, qualifiers: { observedVia: "puntersedge-bo-initial", rawBook: runner.best_book ?? "unknown", displayedBook: displayedBook(board, runner.best_book), raceNumber: String(race.race_number ?? ""), distanceMetres: String(race.distance_m ?? "") } }];
});

const rawGame = (game: Game, board: Board, sourceUrl: string, retrievedAt: string): RawPayloadInput => ({ sportsbook: "puntersedge", accountAlias: "public", sourceType: "embedded-json", sourceUrl, retrievedAt, providerTimestamp: board.generated_at ?? null, externalEventId: game.id ?? null, parserVersion: "puntersedge-bo-initial-v1", rawPayload: { generated_at: board.generated_at, game, books_names: board.books_names }, normalizedRecordCount: gameRecords(game, board, sourceUrl, retrievedAt).length });
const rawRace = (race: Race, board: Board, sourceUrl: string, retrievedAt: string): RawPayloadInput => ({ sportsbook: "puntersedge", accountAlias: "public", sourceType: "embedded-json", sourceUrl, retrievedAt, providerTimestamp: board.generated_at ?? null, externalEventId: race.id ?? null, parserVersion: "puntersedge-bo-initial-v1", rawPayload: { generated_at: board.generated_at, race, books_names: board.books_names }, normalizedRecordCount: raceRecords(race, board, sourceUrl, retrievedAt).length });

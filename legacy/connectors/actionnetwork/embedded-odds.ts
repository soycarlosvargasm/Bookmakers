import { HttpRequestError, RequestGovernor, requestGovernorFor, retryAfterMs } from "../../scheduler/requests.js";
import type { HealthStatus } from "../../health/types.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";

type Team = { id?: number; full_name?: string };
type Outcome = { outcome_id?: string | number; market_id?: string | number; book_id?: string | number; type?: string; side?: string; period?: string; player_id?: string | number; competitor_id?: string | number; odds?: string | number | null; value?: string | number | null; is_live?: boolean; line_status?: string };
type BookMarkets = Record<string, Record<string, Outcome[] | undefined> | undefined>;
type Competitor = { id?: string | number; player_id?: string | number; side?: string; player?: { full_name?: string } };
type Competition = { id?: string | number; status?: string; start_time?: string; league_name?: string; competitors?: Competitor[]; markets?: Record<string, BookMarkets | undefined> };
type Game = { id?: string | number; status?: string; real_status?: string; start_time?: string; league_name?: string; home_team_id?: string | number; away_team_id?: string | number; teams?: Team[]; competitors?: Competitor[]; markets?: Record<string, BookMarkets | undefined>; rawCompetition?: Competition };
type Scoreboard = { games?: Game[]; competitions?: Competition[] };
type NextData = { props?: { pageProps?: { league?: string; scoreboardResponse?: Scoreboard; allBooks?: Record<string, { display_name?: string; source_name?: string }> } } };

export type ActionNetworkEmbeddedOddsOptions = {
  /** Exact public odds-page URL supplied to the collector. */
  sourceUrl?: string;
  requestTimeoutMs?: number;
  requestGovernor?: RequestGovernor;
};

const SOCCER_ODDS_URL = "https://www.actionnetwork.com/soccer/odds";

/** Captures the structured JSON embedded in an Action Network public odds page. */
export class ActionNetworkEmbeddedOddsConnector implements SportsbookConnector {
  readonly id = "actionnetwork-embedded-odds";
  readonly context: ConnectorContext = { sportsbook: "actionnetwork", accountAlias: "public" };
  private readonly sourceUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly requests: RequestGovernor;

  constructor(options: ActionNetworkEmbeddedOddsOptions = {}) {
    this.sourceUrl = options.sourceUrl ?? SOCCER_ODDS_URL;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    this.requests = options.requestGovernor ?? requestGovernorFor("actionnetwork");
  }
  async initialize(): Promise<void> {}
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> {}
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async validateSession(): Promise<boolean> { return (await this.fetchBoard()).board.games !== undefined; }
  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try { const { board } = await this.fetchBoard(); return { status: "HEALTHY", message: `embedded JSON contains ${board.games?.length ?? 0} games` }; }
    catch (cause) { return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) }; }
  }
  async collectEvents(): Promise<ConnectorCollection> { return this.collect("events"); }
  async collectPrematch(): Promise<ConnectorCollection> { return this.collect("prematch"); }
  async collectLive(): Promise<ConnectorCollection> { return this.collect("live"); }

  private async collect(mode: "events" | "prematch" | "live"): Promise<ConnectorCollection> {
    const { league, board, books } = await this.fetchBoard();
    const collectedAt = new Date().toISOString();
    const games = (board.games ?? []).filter((game) => mode === "events" || (mode === "live" ? isLive(game.status, game.real_status) : !isFinal(game.status, game.real_status) && !isLive(game.status, game.real_status)));
    return { rawPayloads: games.flatMap((game) => rawPayloadsFor(game, league, books, this.sourceUrl, collectedAt)), normalizedRecords: games.flatMap((game) => recordsFor(game, league, books, this.sourceUrl, collectedAt)) };
  }

  private async fetchBoard(): Promise<{ league: string | null; board: Scoreboard; books: Record<string, { display_name?: string; source_name?: string }> }> {
    const body = await this.requests.run(async () => {
      const response = await fetch(this.sourceUrl, { headers: { Accept: "text/html", "User-Agent": "SportsMarketDataEngine/0.1 (+https://localhost)" }, signal: AbortSignal.timeout(this.requestTimeoutMs) });
      const text = await response.text();
      if (!response.ok) throw new HttpRequestError(`Action Network odds page HTTP ${response.status}`, response.status, retryAfterMs(response.headers.get("retry-after")));
      return text;
    });
    const marker = '<script id="__NEXT_DATA__" type="application/json">';
    const start = body.indexOf(marker); const end = body.indexOf("</script>", start);
    if (start < 0 || end < 0) throw new Error("Action Network page did not contain __NEXT_DATA__");
    let data: NextData;
    try { data = JSON.parse(body.slice(start + marker.length, end)) as NextData; } catch { throw new Error("Action Network __NEXT_DATA__ was not valid JSON"); }
    const props = data.props?.pageProps;
    if (!props?.scoreboardResponse) throw new Error("Action Network __NEXT_DATA__ did not contain scoreboardResponse");
    const sourceBoard = props.scoreboardResponse;
    const games = Array.isArray(sourceBoard.games) ? sourceBoard.games : Array.isArray(sourceBoard.competitions) ? sourceBoard.competitions.map((competition) => ({ id: competition.id, status: competition.status, start_time: competition.start_time, league_name: competition.league_name, competitors: competition.competitors, markets: competition.markets, rawCompetition: competition })) : null;
    if (!games) throw new Error("Action Network scoreboard had neither games nor competitions");
    return { league: props.league ?? null, board: { games }, books: props.allBooks ?? {} };
  }
}

const rawPayloadsFor = (game: Game, league: string | null, books: Record<string, { display_name?: string; source_name?: string }>, sourceUrl: string, retrievedAt: string): RawPayloadInput[] => Object.entries(game.markets ?? {}).map(([bookId, markets]) => ({
  sportsbook: "actionnetwork", accountAlias: "public", sourceType: "embedded-json", sourceUrl, retrievedAt, providerTimestamp: null, externalEventId: stringId(game.id), parserVersion: "actionnetwork-embedded-json-v1",
  // The source keys market groups by arbitrary display/type names. Preserve
  // those names as values so the bounded RAW allowlist does not discard them.
  rawPayload: { pageLeague: league, ...(game.rawCompetition ? { competition: { ...game.rawCompetition, markets: rawMarkets(markets) } } : { game: { ...game, markets: rawMarkets(markets) } }), bookId, book: books[bookId] ?? null }
}));

const rawMarkets = (markets: BookMarkets | undefined): Array<{ rawMarketName: string; outcomes: Outcome[] | undefined }> => Object.values(markets ?? {}).flatMap((group) => Object.entries(group ?? {}).map(([rawMarketName, outcomes]) => ({ rawMarketName, outcomes })));

const recordsFor = (game: Game, league: string | null, books: Record<string, { display_name?: string; source_name?: string }>, sourceUrl: string, collectedAt: string): ProviderRecord[] => {
  const away = game.teams?.find((team) => String(team.id) === String(game.away_team_id))?.full_name ?? game.competitors?.find((competitor) => competitor.side === "away")?.player?.full_name ?? null;
  const home = game.teams?.find((team) => String(team.id) === String(game.home_team_id))?.full_name ?? game.competitors?.find((competitor) => competitor.side === "home")?.player?.full_name ?? null;
  return Object.entries(game.markets ?? {}).flatMap(([bookId, groups]) => Object.values(groups ?? {}).flatMap((marketTypes) => Object.entries(marketTypes ?? {}).flatMap(([rawMarketName, outcomes]) => (outcomes ?? []).flatMap((outcome) => {
    if (outcome.odds === null || outcome.odds === undefined || outcome.outcome_id === undefined || outcome.market_id === undefined) return [];
    const rawSelectionName = outcome.side ?? null;
    const playerSelection = game.competitors?.find((competitor) => String(competitor.player_id) === String(outcome.player_id) || String(competitor.id) === String(outcome.competitor_id))?.player?.full_name ?? null;
    const rawLine = outcome.value === null || outcome.value === undefined ? null : String(outcome.value);
    const actualBookId = String(outcome.book_id ?? bookId); const book = books[actualBookId];
    return [{ sportsbook: `actionnetwork-${actualBookId}`, sport: league, competition: game.league_name ?? null, eventName: [away, home].filter(Boolean).join(" @ ") || null, participants: [away, home].filter((name): name is string => Boolean(name)), homeParticipant: home, awayParticipant: away, eventStartTime: game.start_time ?? null, eventStatus: normalizedStatus(game.status, game.real_status), phase: outcome.period ?? null, market: rawMarketName, marketPeriod: outcome.period ?? "unknown", selection: playerSelection ?? normalizedSelection(rawSelectionName), selectionStatus: outcome.line_status ?? null, line: rawMarketName === "moneyline" ? null : rawLine, rawOdds: String(outcome.odds), rawOddsFormat: "american", sourceEventId: stringId(game.id), sourceMarketId: String(outcome.market_id), sourceSelectionId: String(outcome.outcome_id), sourceUrl, providerTimestamp: null, collectedAt, participantPlayer: playerSelection, qualifiers: compact({ observedVia: "actionnetwork-embedded-json", actionNetworkBookId: actualBookId, displayedBook: book?.display_name ?? null, displayedBookSource: book?.source_name ?? null, rawSportName: league, rawCompetitionName: game.league_name ?? null, rawEventStatus: game.status ?? null, rawRealStatus: game.real_status ?? null, rawMarketName, rawSelectionName, rawLine, lineStatus: outcome.line_status ?? null, outcomeIsLive: outcome.is_live === undefined ? null : String(outcome.is_live) }) }];
  }))));
};

/** Shared parser for the public date/week scoreboard used by the visible odds page. */
export function extractActionSchedule(payload: unknown, sport: string, sourceUrl: string, collectedAt = new Date().toISOString()): ConnectorCollection {
  if (!payload || typeof payload !== "object") throw new Error("Action Network schedule was not an object");
  const board = payload as Scoreboard;
  const games: Game[] = Array.isArray(board.games) ? board.games : Array.isArray(board.competitions) ? board.competitions.map((competition) => ({ id: competition.id, status: competition.status, start_time: competition.start_time, league_name: competition.league_name, competitors: competition.competitors, markets: competition.markets, rawCompetition: competition })) : [];
  const current = games.filter((game) => !isFinal(game.status, game.real_status));
  return { rawPayloads: current.flatMap((game) => rawPayloadsFor(game, sport, {}, sourceUrl, collectedAt).map((raw) => ({ ...raw, sourceType: "scoreboard-json", parserVersion: "actionnetwork-schedule-v1" }))), normalizedRecords: current.flatMap((game) => recordsFor(game, sport, {}, sourceUrl, collectedAt)) };
}

const compact = (value: Record<string, string | null>): Record<string, string> => Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => entry[1] !== null));
const stringId = (value: string | number | undefined): string | null => value === undefined ? null : String(value);
const isLive = (...states: Array<string | undefined>): boolean => states.some((state) => /^(live|in_progress|in progress)$/i.test(state ?? ""));
const isFinal = (...states: Array<string | undefined>): boolean => states.some((state) => /^(complete|completed|final|closed|cancelled|postponed)$/i.test(state ?? ""));
const normalizedStatus = (...states: Array<string | undefined>): string => isLive(...states) ? "live" : isFinal(...states) ? "closed" : "prematch";
const normalizedSelection = (raw: string | null): string | null => raw === null ? null : ({ home: "Home", away: "Away", draw: "Draw", over: "Over", under: "Under" }[raw.toLowerCase()] ?? raw);

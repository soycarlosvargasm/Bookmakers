import type { BrowserManager } from "../../browser/manager.js";
import { oddsToDecimal } from "../../normalization/odds.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";
import type { HealthStatus } from "../../health/types.js";

type YahooOddsConnectorOptions = {
  browserManager: BrowserManager;
  paths?: string[];
  baseUrl?: string;
  requestTimeoutMs?: number;
};

type ScrapedRow = { selection: string; spread: string | null; total: string | null; moneyline: string | null };
type ScrapedEvent = { id: string; competition: string | null; title: string; sourceUrl: string; status: string; rows: ScrapedRow[] };
// These are Yahoo's public sport boards, rather than a hand-picked subset of
// the four most popular leagues.  A board that is off-season is retained as a
// zero-result board; it must not make the rest of the collection unhealthy.
export const DEFAULT_YAHOO_ODDS_PATHS = ["nfl", "ncaaf", "nba", "ncaab", "wnba", "mlb", "nhl", "soccer", "mma", "boxing", "f1", "golf", "tennis", "nascar"];

/**
 * Browser scraper for the rendered Yahoo Sports odds boards. It extracts the
 * visible HTML table rather than assuming an undocumented JSON endpoint.
 */
export class YahooOddsConnector implements SportsbookConnector {
  readonly id = "yahoo-odds";
  readonly context: ConnectorContext = { sportsbook: "yahoo-odds", accountAlias: "public" };
  private readonly baseUrl: string;
  private readonly paths: string[];
  private readonly requestTimeoutMs: number;
  private page?: import("playwright").Page;

  constructor(private readonly options: YahooOddsConnectorOptions) {
    this.baseUrl = (options.baseUrl ?? "https://sports.yahoo.com").replace(/\/$/, "");
    this.paths = options.paths?.length ? options.paths : DEFAULT_YAHOO_ODDS_PATHS;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
  }

  async initialize(): Promise<void> {
    this.page = await this.options.browserManager.getPage(this.context.sportsbook, this.context.accountAlias);
  }
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> { await this.initialize(); }
  async validateSession(): Promise<boolean> {
    try {
      const result = await this.scrapePath(this.paths[0]!);
      return result.events.length > 0;
    } catch { return false; }
  }
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}

  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try {
      const result = await this.scrapePath(this.paths[0]!);
      // A first path can be between boards (for example NFL off-season) while
      // the remaining configured sports still have current tables. Successful
      // navigation is healthy; collection determines per-path row counts.
      return result.events.length ? { status: "HEALTHY" } : { status: "HEALTHY", message: "First Yahoo board has no current rows; remaining paths will be collected" };
    } catch (cause) {
      return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) };
    }
  }

  // The board labels its sections in the rendered DOM. Final rows are useful
  // for a human viewer but are not current market observations, so they never
  // enter the live collector.
  async collectEvents(): Promise<ConnectorCollection> { return this.collect(["live", "upcoming"]); }
  async collectPrematch(): Promise<ConnectorCollection> { return this.collect(["upcoming"]); }
  async collectLive(): Promise<ConnectorCollection> { return this.collect(["live"]); }

  private async collect(statuses: string[] = []): Promise<ConnectorCollection> {
    // A connector owns one browser page. Serial navigation avoids races where
    // simultaneous sport paths overwrite each other's DOM before extraction.
    const pages: { path: string; url: string; events: ScrapedEvent[] }[] = [];
    for (const path of this.paths) pages.push(await this.scrapePath(path));
    const collectedAt = new Date().toISOString();
    const rawPayloads: RawPayloadInput[] = pages.map((page) => ({
      sportsbook: this.context.sportsbook, accountAlias: this.context.accountAlias, sourceType: "rendered-odds-table", sourceUrl: page.url,
      retrievedAt: collectedAt, providerTimestamp: null, externalEventId: null,
      rawPayload: { path: page.path, tableCount: page.events.length, events: page.events }, parserVersion: "yahoo-dom-v1"
    }));
    return { rawPayloads, normalizedRecords: pages.flatMap((page) => page.events.filter((event) => !statuses.length || statuses.includes(event.status)).flatMap((event) => this.recordsFor(event, page.path, collectedAt))) };
  }

  private async scrapePath(path: string): Promise<{ path: string; url: string; events: ScrapedEvent[] }> {
    if (!this.page) await this.initialize();
    const url = `${this.baseUrl}/${path}/odds/`;
    await this.page!.goto(url, { waitUntil: "domcontentloaded", timeout: this.requestTimeoutMs });
    // Off-season boards can legitimately render no current tables. That is a
    // zero-result path, not a connector failure for every other sport.
    if (await this.page!.locator("table").count() === 0) return { path, url: this.page!.url(), events: [] };
    const events = await this.page!.evaluate(() => {
      const statusHeadings = [...document.querySelectorAll("h2")].filter((heading) => ["live", "upcoming", "final"].includes((heading.textContent ?? "").trim().toLowerCase()));
      return [...document.querySelectorAll("table")].flatMap((table) => {
        const section = table.closest("section");
        const link = section?.querySelector('a[href*="/"]') as HTMLAnchorElement | null;
        const id = /-(\d+)\/?$/.exec(link?.pathname ?? "")?.[1];
        const header = [...table.querySelectorAll("thead th")].map((cell) => (cell.textContent ?? "").trim().toLowerCase());
        const spreadIndex = header.findIndex((value) => value.startsWith("spread"));
        const totalIndex = header.findIndex((value) => value.startsWith("total"));
        const moneylineIndex = header.findIndex((value) => value.startsWith("money line") || value === "money");
        const rows = [...table.querySelectorAll("tbody tr")].map((row) => {
          const cells = [...row.querySelectorAll("td")];
          const selection = row.querySelector("img[alt]")?.getAttribute("alt") ?? (cells[0]?.innerText ?? "").trim();
          return {
            selection,
            spread: spreadIndex >= 0 ? [...(cells[spreadIndex]?.querySelectorAll("span") ?? [])].map((span) => (span.textContent ?? "").trim()).find((value) => /^[+-]?\d+(?:\.\d+)?$/.test(value)) ?? null : null,
            total: totalIndex >= 0 ? [...(cells[totalIndex]?.querySelectorAll("span") ?? [])].map((span) => (span.textContent ?? "").trim()).find((value) => /^[OU]\s+\d+(?:\.\d+)?$/.test(value)) ?? null : null,
            moneyline: moneylineIndex >= 0 ? [...(cells[moneylineIndex]?.querySelectorAll("span") ?? [])].map((span) => (span.textContent ?? "").trim()).find((value) => /^[+-]\d+$/.test(value)) ?? null : null
          };
        }).filter((row) => row.selection);
        if (!id || !rows.length) return [];
        const path = link?.pathname.split("/").filter(Boolean) ?? [];
        const competition = path[1] ?? null;
        const title = rows.slice(0, 2).map((row) => row.selection).join(" @ ");
        if (!title) return [];
        let status = "unknown";
        for (const heading of statusHeadings) {
          if (heading.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING) status = (heading.textContent ?? "").trim().toLowerCase();
        }
        return [{ id, competition, title, sourceUrl: link?.href ?? location.href, status, rows }];
      });
    });
    return { path, url: this.page!.url(), events };
  }

  private recordsFor(event: ScrapedEvent, sport: string, collectedAt: string): ProviderRecord[] {
    const title = event.title.replace(/^[^:]+:\s*/, "");
    const teams = title.split(" @ ").map((value) => value.trim()).filter(Boolean);
    const [away, home] = teams;
    const common = {
      sportsbook: this.context.sportsbook, sport, competition: event.competition, eventName: title,
      participants: teams.length === 2 ? teams : null, homeParticipant: home ?? null, awayParticipant: away ?? null,
      eventStartTime: null, eventStatus: event.status === "live" ? "live" : event.status === "upcoming" ? "prematch" : event.status,
      phase: null, marketPeriod: "game", sourceEventId: event.id, sourceUrl: event.sourceUrl,
      providerTimestamp: null, participantPlayer: null, collectedAt, qualifiers: { sourceKind: "rendered-dom", competitionCode: event.competition ?? "" }
    };
    return event.rows.flatMap((row) => {
      const records: ProviderRecord[] = [];
      if (row.spread) records.push({ ...common, market: "spread", selection: row.selection, line: row.spread, decimalOdds: null, rawOdds: null, rawOddsFormat: null, sourceMarketId: `${event.id}:spread`, sourceSelectionId: `${event.id}:spread:${row.selection}` });
      const total = /^(O|U)\s+(.+)$/.exec(row.total ?? "");
      if (total) records.push({ ...common, market: "total", selection: total[1] === "O" ? "Over" : "Under", line: total[2]!, decimalOdds: null, rawOdds: null, rawOddsFormat: null, sourceMarketId: `${event.id}:total`, sourceSelectionId: `${event.id}:total:${total[1]}` });
      if (row.moneyline && /^[-+]?\d+$/.test(row.moneyline)) records.push({ ...common, market: "moneyline", selection: row.selection, line: null, decimalOdds: oddsToDecimal(row.moneyline, "american"), rawOdds: row.moneyline, rawOddsFormat: "american", sourceMarketId: `${event.id}:moneyline`, sourceSelectionId: `${event.id}:moneyline:${row.selection}` });
      return records;
    });
  }
}

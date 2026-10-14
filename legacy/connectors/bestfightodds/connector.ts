import type { BrowserManager } from "../../browser/manager.js";
import { oddsToDecimal } from "../../normalization/odds.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";
import type { HealthStatus } from "../../health/types.js";

type BestFightOddsOptions = {
  browserManager: BrowserManager;
  baseUrl?: string;
  requestTimeoutMs?: number;
};

type Quote = { book: string; bookId: string; marketId: string; odds: string };
type MarketRow = { label: string; quotes: Quote[] };
type Fight = {
  matchupId: string;
  promotion: string;
  dateLabel: string | null;
  fighters: [string, string];
  sourceUrl: string;
  rows: MarketRow[];
};

/**
 * Captures BestFightOdds' rendered MMA board. Each output record carries the
 * displayed book as its source and `observedVia=bestfightodds`; it is never
 * represented as a direct authenticated sportsbook feed.
 */
export class BestFightOddsConnector implements SportsbookConnector {
  readonly id = "bestfightodds";
  readonly context: ConnectorContext = { sportsbook: "bestfightodds", accountAlias: "public" };
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private page?: import("playwright").Page;

  constructor(private readonly options: BestFightOddsOptions) {
    this.baseUrl = (options.baseUrl ?? "https://www.bestfightodds.com").replace(/\/$/, "");
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
  }

  async initialize(): Promise<void> {
    this.page = await this.options.browserManager.getPage(this.context.sportsbook, this.context.accountAlias);
  }
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> { await this.initialize(); }
  async validateSession(): Promise<boolean> { return (await this.scrape()).length > 0; }
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}

  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try {
      const fights = await this.scrape();
      return fights.length ? { status: "HEALTHY" } : { status: "DEGRADED", message: "BestFightOdds rendered no MMA price rows" };
    } catch (cause) {
      return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) };
    }
  }

  async collectEvents(): Promise<ConnectorCollection> { return this.collect(); }
  async collectPrematch(): Promise<ConnectorCollection> { return this.collect(); }
  async collectLive(): Promise<ConnectorCollection> { return { rawPayloads: [], normalizedRecords: [] }; }

  private async collect(): Promise<ConnectorCollection> {
    const fights = await this.scrape();
    const collectedAt = new Date().toISOString();
    const rawPayloads: RawPayloadInput[] = [{
      sportsbook: this.context.sportsbook,
      accountAlias: this.context.accountAlias,
      sourceType: "rendered-odds-table",
      sourceUrl: `${this.baseUrl}/`,
      retrievedAt: collectedAt,
      providerTimestamp: null,
      externalEventId: null,
      rawPayload: { title: "BestFightOdds MMA board", events: fights },
      parserVersion: "bestfightodds-dom-v1"
    }];
    return { rawPayloads, normalizedRecords: fights.flatMap((fight) => this.recordsFor(fight, collectedAt)) };
  }

  private async scrape(): Promise<Fight[]> {
    if (!this.page) await this.initialize();
    await this.page!.goto(`${this.baseUrl}/`, { waitUntil: "domcontentloaded", timeout: this.requestTimeoutMs });
    await this.page!.locator("table.odds-table").first().waitFor({ state: "attached", timeout: this.requestTimeoutMs });
    return this.page!.evaluate(() => {
      const headings = [...document.querySelectorAll("h1,h2,h3")].filter((heading) => /odds$/i.test((heading.textContent ?? "").replace(/\s+/g, " ").trim()));
      return [...document.querySelectorAll("table.odds-table")]
        .filter((table) => !table.classList.contains("odds-table-responsive-header"))
        .flatMap((table) => {
          const books = new Map<string, { id: string; name: string }>();
          for (const header of [...table.querySelectorAll("thead th[data-b]")]) {
            const id = header.getAttribute("data-b");
            const name = (header.querySelector("a")?.textContent ?? header.textContent ?? "").replace(/\s+/g, " ").trim().split(" ")[0] ?? "";
            if (id && name) books.set(id, { id, name });
          }
          let promotion = "MMA";
          for (const heading of headings) {
            if (heading.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING) promotion = (heading.textContent ?? "").replace(/\s+/g, " ").trim().replace(/\s+odds$/i, "");
          }
          const dateLabel = null;
          const rows = [...table.querySelectorAll("tbody tr")];
          const fights: Fight[] = [];
          let active: Fight | undefined;
          for (const row of rows) {
            const label = (row.querySelector("th")?.textContent ?? "").replace(/\s+/g, " ").trim().replace(/^\d+/, "").trim();
            const moneylineId = /^\[\d+,\d+,(\d+)\]$/.exec(row.querySelector<HTMLElement>("td[data-li]")?.dataset.li ?? "")?.[1];
            if (moneylineId) {
              if (!label) { active = undefined; continue; }
              if (!active || active.matchupId !== moneylineId) {
                active = { matchupId: moneylineId, promotion, dateLabel, fighters: [label, ""], sourceUrl: location.href, rows: [] };
                fights.push(active);
              } else if (!active.fighters[1]) {
                active.fighters[1] = label;
              }
            }
            if (!active || !active.fighters[1] || !label) continue;
            const quotes = [...row.querySelectorAll<HTMLElement>("td[data-li]")].flatMap((cell) => {
              const parts = (cell.dataset.li ?? "").match(/\d+/g) ?? [];
              const book = parts[0] ? books.get(parts[0]) : undefined;
              const odds = /[+-]\d+/.exec((cell.textContent ?? "").replace(/\s+/g, " ").trim())?.[0];
              // Moneyline cells have [book,outcome,matchup]; proposition cells
              // add the provider market identifier at position 3. It is part
              // of identity because identical display labels can occur in
              // different proposition markets on the same card.
              return book && odds ? [{ book: book.name, bookId: book.id, marketId: parts[3] ?? "moneyline", odds }] : [];
            });
            if (quotes.length) active.rows.push({ label, quotes });
          }
          return fights;
        });
    });
  }

  private recordsFor(fight: Fight, collectedAt: string): ProviderRecord[] {
    return fight.rows.flatMap((row) => {
      const market = this.marketFor(row.label, fight.fighters);
      return row.quotes.map((quote) => ({
        sportsbook: `bfo-${slug(quote.book)}`,
        sport: "mma",
        competition: slug(fight.promotion),
        eventName: `${fight.fighters[0]} @ ${fight.fighters[1]}`,
        participants: fight.fighters,
        awayParticipant: fight.fighters[0],
        homeParticipant: fight.fighters[1],
        eventStartTime: null,
        eventStatus: "prematch",
        phase: null,
        market: market.market,
        marketPeriod: "fight",
        selection: market.selection,
        line: market.line,
        decimalOdds: oddsToDecimal(quote.odds, "american"),
        rawOdds: quote.odds,
        rawOddsFormat: "american",
        sourceEventId: fight.matchupId,
        sourceMarketId: `${fight.matchupId}:${quote.marketId}:${market.market}:${market.line ?? ""}`,
        sourceSelectionId: `${fight.matchupId}:${quote.marketId}:${market.market}:${market.line ?? ""}:${market.selection}`,
        sourceUrl: fight.sourceUrl,
        providerTimestamp: null,
        collectedAt,
        participantPlayer: null,
        qualifiers: {
          observedVia: "bestfightodds",
          displayedBook: quote.book,
          displayedBookId: quote.bookId,
          displayedMarketId: quote.marketId,
          promotion: fight.promotion,
          ...(fight.dateLabel ? { displayedDate: fight.dateLabel } : {})
        }
      }));
    });
  }

  private marketFor(label: string, fighters: [string, string]): { market: string; selection: string; line: string | null } {
    if (fighters.includes(label)) return { market: "moneyline", selection: label, line: null };
    const total = /^(Over|Under)\s+(\d+(?:[½¼¾]|\.\d+)?)\s+rounds?$/i.exec(label);
    if (total) return { market: "total_rounds", selection: total[1]!.toLowerCase() === "over" ? "Over" : "Under", line: halfToDecimal(total[2]!) };
    // Props retain the exact displayed proposition as the selection. This is
    // deliberately stricter than trying to infer equivalence across books.
    return { market: `mma_prop_${slug(label)}`, selection: label, line: null };
  }
}

const slug = (value: string): string => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const halfToDecimal = (value: string): string => value.replace("½", ".5").replace("¼", ".25").replace("¾", ".75");

import type { BrowserManager } from "../../browser/manager.js";
import { oddsToDecimal } from "../../normalization/odds.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";
import type { HealthStatus } from "../../health/types.js";

type FightOddsOptions = { browserManager: BrowserManager; baseUrl?: string; requestTimeoutMs?: number };
type FightOddsFight = { eventId: string; eventName: string; promotion: string; fighters: [string, string]; sourceUrl: string; quotes: { book: string; odds: [string | null, string | null] }[] };

/** Public rendered FightOdds MMA board; bookmaker columns remain distinct and
 * retain the aggregator provenance in qualifiers. */
export class FightOddsConnector implements SportsbookConnector {
  readonly id = "fightodds";
  readonly context: ConnectorContext = { sportsbook: "fightodds", accountAlias: "public" };
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private page?: import("playwright").Page;

  constructor(private readonly options: FightOddsOptions) {
    this.baseUrl = (options.baseUrl ?? "https://fightodds.io").replace(/\/$/, "");
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
  }

  async initialize(): Promise<void> { this.page = await this.options.browserManager.getPage(this.context.sportsbook, this.context.accountAlias); }
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> { await this.initialize(); }
  async validateSession(): Promise<boolean> { return (await this.scrape()).length > 0; }
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try { return (await this.scrape()).length ? { status: "HEALTHY" } : { status: "DEGRADED", message: "FightOdds rendered no MMA moneylines" }; }
    catch (cause) { return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) }; }
  }
  async collectEvents(): Promise<ConnectorCollection> { return this.collect(); }
  async collectPrematch(): Promise<ConnectorCollection> { return this.collect(); }
  async collectLive(): Promise<ConnectorCollection> { return { rawPayloads: [], normalizedRecords: [] }; }

  private async collect(): Promise<ConnectorCollection> {
    const fights = await this.scrape();
    const collectedAt = new Date().toISOString();
    const rawPayloads: RawPayloadInput[] = [{ sportsbook: this.context.sportsbook, accountAlias: this.context.accountAlias, sourceType: "rendered-odds-table", sourceUrl: `${this.baseUrl}/odds`, retrievedAt: collectedAt, providerTimestamp: null, externalEventId: null, rawPayload: { title: "FightOdds MMA board", events: fights }, parserVersion: "fightodds-dom-v1" }];
    return { rawPayloads, normalizedRecords: fights.flatMap((fight) => this.recordsFor(fight, collectedAt)) };
  }

  private async scrape(): Promise<FightOddsFight[]> {
    if (!this.page) await this.initialize();
    await this.page!.goto(`${this.baseUrl}/odds`, { waitUntil: "domcontentloaded", timeout: this.requestTimeoutMs });
    await this.page!.locator("table").first().waitFor({ state: "attached", timeout: this.requestTimeoutMs });
    // Material UI mounts the table shell before the odds rows. Waiting for a
    // row prevents an intermittent empty snapshot during client hydration.
    await this.page!.locator("table tbody tr").first().waitFor({ state: "attached", timeout: this.requestTimeoutMs });
    return this.page!.evaluate(() => {
      const table = document.querySelector("table");
      if (!table) return [];
      const container = table.closest(".MuiList-root");
      const eventLink = container?.querySelector<HTMLAnchorElement>('a[href^="/odds/"]');
      const eventId = /^\/odds\/(\d+)/.exec(eventLink?.getAttribute("href") ?? "")?.[1];
      const eventName = (eventLink?.textContent ?? "MMA").replace(/\s+/g, " ").trim();
      if (!eventId) return [];
      const headers = [...table.querySelectorAll("thead th")].slice(1).map((header) => (header.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean);
      const rows = [...table.querySelectorAll("tbody tr")].map((row) => ({
        fighter: (row.querySelector("td")?.textContent ?? "").replace(/\s+/g, " ").trim(),
        odds: [...row.querySelectorAll("td")].slice(1).map((cell) => /[+-]\d+/.exec((cell.textContent ?? "").replace(/\s+/g, " ").trim())?.[0] ?? null)
      })).filter((row) => row.fighter);
      const fights: FightOddsFight[] = [];
      for (let i = 0; i + 1 < rows.length; i += 2) {
        const left = rows[i]!;
        const right = rows[i + 1]!;
        const quotes = headers.map((book, index) => ({ book, odds: [left.odds[index] ?? null, right.odds[index] ?? null] as [string | null, string | null] })).filter((quote) => quote.odds[0] || quote.odds[1]);
        if (quotes.length) fights.push({ eventId: `${eventId}:${i / 2}`, eventName, promotion: eventName.split(":")[0]!.trim(), fighters: [left.fighter, right.fighter], sourceUrl: location.href, quotes });
      }
      return fights;
    });
  }

  private recordsFor(fight: FightOddsFight, collectedAt: string): ProviderRecord[] {
    return fight.quotes.flatMap((quote) => quote.odds.flatMap((odds, index) => {
      if (!odds) return [];
      const selection = fight.fighters[index]!;
      return [{
        sportsbook: `fightodds-${slug(quote.book)}`, sport: "mma", competition: slug(fight.promotion), eventName: `${fight.fighters[0]} @ ${fight.fighters[1]}`,
        participants: fight.fighters, awayParticipant: fight.fighters[0], homeParticipant: fight.fighters[1], eventStartTime: null, eventStatus: "prematch", phase: null,
        market: "moneyline", marketPeriod: "fight", selection, line: null, decimalOdds: oddsToDecimal(odds, "american"), rawOdds: odds, rawOddsFormat: "american",
        sourceEventId: fight.eventId, sourceMarketId: `${fight.eventId}:moneyline`, sourceSelectionId: `${fight.eventId}:moneyline:${selection}`, sourceUrl: fight.sourceUrl, providerTimestamp: null, collectedAt, participantPlayer: null,
        qualifiers: { observedVia: "fightodds", displayedBook: quote.book, displayedEvent: fight.eventName }
      }];
    }));
  }
}
const slug = (value: string): string => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

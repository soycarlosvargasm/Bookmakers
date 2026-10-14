import type { Page } from "playwright";
import { BrowserNetworkDiagnostics } from "../../browser/diagnostics.js";
import type { BrowserManager } from "../../browser/manager.js";
import type { RawPayloadInput } from "../../normalization/types.js";
import type { HealthStatus } from "../../health/types.js";
import { classifyFailure } from "../../health/errors.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";
import { parseBetOnlinePayloads } from "./parser.js";
import type { BetOnlineConnectorOptions, BetOnlineDiagnosticsOptions, BetOnlineNetworkReport } from "./types.js";
import { BrowserObserver } from "../../browser/observer.js";

const DEFAULT_BASE_URL = "https://www.betonline.ag";
const BETONLINE_HOSTS = ["betonline.ag", "www.betonline.ag", "api-offering.betonline.ag", "api.betonline.ag"] as const;
const PARSER_VERSION = "betonline-v2";

export type BetOnlinePageState = {
  loginForm: boolean;
  loginText: boolean;
  challenge: boolean;
  regionalBlock: boolean;
  serverError: boolean;
  eventCards: number;
};

export const classifyBetOnlinePageState = (body: string, eventCards: number, loginForm = false): BetOnlinePageState => ({
  loginForm,
  loginText: /\b(sign in|log in|login)\b/i.test(body),
  challenge: /checking your browser|just a moment|cf-chl-|enable javascript/i.test(body),
  regionalBlock: /betonline\s+is\s+not\s+available\s+in\s+your\s+region|not\s+available\s+in\s+your\s+region|service\s+is\s+not\s+available\s+in\s+your\s+(country|region)/i.test(body),
  serverError: /internal server problem|sorry, it.?s not you\. it.?s us|try again later/i.test(body),
  eventCards
});

const isBetOnlineUrl = (value: string, baseUrl: string): boolean => {
  try {
    const url = new URL(value);
    const base = new URL(baseUrl);
    return [base.hostname, ...BETONLINE_HOSTS].includes(url.hostname) && url.protocol === "https:";
  } catch {
    return false;
  }
};

const classifyDiagnostics = (entries: BetOnlineNetworkReport["entries"]): string[] => {
  const found = new Set<string>();
  for (const entry of entries) {
    const text = `${entry.errorText ?? ""} ${entry.message ?? ""}`.toLowerCase();
    if (/name_not_resolved|dns|getaddrinfo|internet_disconnected/.test(text)) found.add("dns");
    if (/cert|ssl|tls|handshake|protocol_error/.test(text)) found.add("tls");
    if (/proxy|tunnel|connection_closed|connection_reset/.test(text)) found.add("proxy-or-network");
    if (/cors|cross.?origin|access-control-allow-origin/.test(text)) found.add("cors");
    if (entry.status === 401 || entry.status === 403) found.add("authentication-or-site-block");
    if (entry.headers?.["cf-mitigated"] === "challenge") found.add("cloudflare-challenge");
    if (/websocket|websocket/.test(text) || entry.resourceType === "websocket") found.add("websocket");
    if (/failed to fetch|blocked|access.?denied/.test(text)) found.add("browser-or-site-block");
  }
  return [...found];
};

export class BetOnlineConnector implements SportsbookConnector {
  readonly id = "betonline";
  readonly context: ConnectorContext;
  private readonly baseUrl: string;
  private readonly waitForTrafficMs: number;
  private readonly refreshBeforeCollect: boolean;
  private page?: Page;
  private observer?: BrowserObserver;
  private readonly captured: RawPayloadInput[] = [];
  private lastParserFailure?: string;

  constructor(private readonly options: BetOnlineConnectorOptions) {
    this.context = { sportsbook: "betonline", accountAlias: options.accountAlias ?? "personal" };
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.waitForTrafficMs = options.waitForTrafficMs ?? 1_500;
    this.refreshBeforeCollect = options.refreshBeforeCollect ?? false;
  }

  async initialize(): Promise<void> {
    if (this.page?.isClosed()) {
      this.observer?.stop();
      this.observer = undefined;
      this.page = undefined;
    }
    if (this.page && !this.page.isClosed()) return;
    this.page = await this.options.browserManager.getPage(this.context.sportsbook, this.context.accountAlias, {
      urlPrefixes: [`${this.baseUrl}/sportsbook`, "https://betonline.ag/sportsbook", "https://www.betonline.ag/sportsbook"],
      // CDP is attached only to the user-provided Edge tab. Never create a
      // page in that browser as a recovery action.
      createIfMissing: !this.options.browserManager.isConfiguredForCdp()
    });
    if (!this.observer) {
      this.observer = new BrowserObserver({
        sportsbook: this.context.sportsbook,
        accountAlias: this.context.accountAlias,
        parserVersion: PARSER_VERSION,
        sink: { saveRawPayload: async (payload) => { this.captured.push(payload); } }
      });
      await this.observer.attach(this.page);
    }
    if (!isBetOnlineUrl(this.page.url(), this.baseUrl)) {
      if (this.options.browserManager.isUsingCdp()) throw new Error("The authorized BetOnline sportsbook tab was not found; no page was created or navigated");
      await this.page.goto(`${this.baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    }
    if (this.options.browserManager.isUsingCdp()) {
      const userAgent = await this.page.evaluate(() => navigator.userAgent);
      if (!/Edg\//i.test(userAgent)) throw new Error("The CDP endpoint is not Microsoft Edge; refusing to use another browser");
    }
  }

  async login(): Promise<void> { /* Normal login is performed by the visible browser session. */ }
  async restoreSession(): Promise<void> { await this.initialize(); }

  async validateSession(): Promise<boolean> {
    await this.initialize();
    const page = this.page!;
    if (!isBetOnlineUrl(page.url(), this.baseUrl)) return false;
    const signals = await this.readPageState();
    if (signals.loginForm || signals.loginText || signals.challenge) return false;
    try {
      const probe = await page.evaluate(async (target) => {
        try {
          const response = await fetch(target, { credentials: "include", headers: { Accept: "application/json, text/plain, */*" }, cache: "no-store" });
          return { status: response.status, challenge: response.headers.get("cf-mitigated") === "challenge" };
        } catch { return { status: null, challenge: false }; }
      }, new URL("/get-token", page.url()).toString());
      return probe.status !== null && probe.status >= 200 && probe.status < 300 && !probe.challenge;
    } catch {
      return false;
    }
  }

  private async readPageState(): Promise<BetOnlinePageState> {
    const snapshot = await this.page!.evaluate(() => {
      const body = (document.body?.innerText ?? "").slice(0, 50_000);
      return { body, eventCards: document.querySelectorAll("a.card-container").length, loginForm: Boolean(document.querySelector('input[type="password"], form[action*="login" i]')) };
    });
    return classifyBetOnlinePageState(snapshot.body, snapshot.eventCards, snapshot.loginForm);
  }

  async collectEvents(): Promise<ConnectorCollection> { return this.collect(); }
  async collectPrematch(): Promise<ConnectorCollection> { return this.collect((record) => record.eventStatus !== "live" && record.phase !== "live"); }
  async collectLive(): Promise<ConnectorCollection> { return this.collect((record) => record.eventStatus === "live" || record.phase === "live"); }

  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try {
      await this.initialize();
      const pageState = await this.readPageState();
      if (pageState.regionalBlock) return { status: "DEGRADED", message: "BetOnline is temporarily unavailable from the current region" };
      if (pageState.challenge) return { status: "DEGRADED", message: "BetOnline returned a browser challenge" };
      const valid = await this.validateSession();
      if (valid) {
        if (pageState.serverError) return { status: "DEGRADED", message: "BetOnline sportsbook is displaying an upstream server error" };
        if (pageState.eventCards === 0) return { status: "DEGRADED", message: "BetOnline session is active but the sportsbook has no visible event cards" };
        // Let the already-live page deliver a frame; this does not navigate,
        // reload, or subscribe on behalf of the user.
        if (!this.observer?.hasRecentDiffusionActivity()) await this.page!.waitForTimeout(Math.min(this.waitForTrafficMs, 1_500));
        if (this.lastParserFailure) return { status: "DEGRADED", message: this.lastParserFailure };
        if (!this.observer?.hasRecentDiffusionActivity()) return { status: "DEGRADED", message: "BetOnline session is active but no recent Diffusion frame was observed" };
        return { status: "HEALTHY" };
      }
      const report = await this.diagnose({ durationMs: 0, reload: false });
      if (report.classification.includes("cloudflare-challenge")) return { status: "DEGRADED", message: "BetOnline returned a Cloudflare challenge" };
      return { status: "AUTH_REQUIRED", message: "BetOnline session is not validated" };
    } catch (cause) {
      const failure = classifyFailure(cause);
      return { status: failure.kind === "auth_required" ? "AUTH_REQUIRED" : "UNHEALTHY", message: failure.message };
    }
  }

  async diagnose(options: BetOnlineDiagnosticsOptions = {}): Promise<BetOnlineNetworkReport> {
    await this.initialize();
    const diagnostics = new BrowserNetworkDiagnostics(BETONLINE_HOSTS);
    await diagnostics.attach(this.page!);
    const probes = await diagnostics.probeHosts(this.page!);
    // Diagnostics are intentionally passive. A reload can disrupt the live
    // Diffusion subscription and is not a permitted recovery operation.
    const reloadError = options.reload ? "reload disabled: diagnostics are passive" : undefined;
    if ((options.durationMs ?? 10_000) > 0) await this.page!.waitForTimeout(options.durationMs ?? 10_000);
    const entries = diagnostics.snapshot();
    diagnostics.stop();
    const classification = classifyDiagnostics(entries);
    if (reloadError) classification.push("navigation-error");
    return { checkedAt: new Date().toISOString(), pageUrl: this.page!.url(), probes, entries, classification: [...new Set(classification)] };
  }

  async logout(): Promise<void> { /* Do not log out or destroy the user's authorized Edge session. */ }
  async shutdown(): Promise<void> { this.observer?.stop(); this.observer = undefined; this.page = undefined; }

  private async collect(filter?: (record: ReturnType<typeof parseBetOnlinePayloads>[number]) => boolean): Promise<ConnectorCollection> {
    await this.initialize();
    // A live Edge session owns navigation. Collection only observes it.
    void this.refreshBeforeCollect;
    if (this.waitForTrafficMs > 0) await this.page!.waitForTimeout(this.waitForTrafficMs);
    const domEventCount = await this.captureCurrentDomSnapshot();
    let parserFailure: string | undefined;
    const rawPayloads = this.captured.splice(0).map((payload) => {
      let records: ReturnType<typeof parseBetOnlinePayloads> = [];
      try { records = parseBetOnlinePayloads([payload]); }
      catch (error) { parserFailure = error instanceof Error ? error.message : String(error); }
      const eventIds = [...new Set(records.map((record) => record.sourceEventId).filter((value): value is string => value !== null))];
      const providerTimestamps = [...new Set(records.map((record) => record.providerTimestamp).filter((value): value is string => value !== null))];
      return { ...payload, externalEventId: eventIds.length === 1 ? eventIds[0] : payload.externalEventId ?? null, providerTimestamp: providerTimestamps.length === 1 ? providerTimestamps[0] : payload.providerTimestamp ?? null, normalizedRecordCount: records.length };
    });
    let normalizedRecords: ReturnType<typeof parseBetOnlinePayloads> = [];
    try { normalizedRecords = parseBetOnlinePayloads(rawPayloads).filter((record) => !filter || filter(record)); }
    catch (error) { parserFailure = error instanceof Error ? error.message : String(error); }
    this.lastParserFailure = parserFailure ?? (domEventCount === 0
      ? "BetOnline sportsbook DOM did not contain event cards"
      : rawPayloads.some((payload) => payload.sourceType === "diffusion") && normalizedRecords.length === 0
        ? "Diffusion frames were captured but no normalized DOM market records were produced" : undefined);
    return { rawPayloads, normalizedRecords };
  }

  private async captureCurrentDomSnapshot(): Promise<number> {
    const page = this.page!;
    const snapshot = await page.evaluate<{ events: unknown[] }>(`(() => {
      const text = (value) => {
        const result = (value || "").replace(/\\s+/g, " ").trim();
        return result || null;
      };
      const cards = Array.from(document.querySelectorAll("a.card-container"));
      const events = cards.map((card) => {
        const anchor = card;
        const url = new URL(anchor.href, window.location.href);
        const pathParts = url.pathname.split("/").filter(Boolean);
        const eventId = pathParts.at(-1) || null;
        const live = pathParts.includes("live") || Boolean(card.querySelector('[data-testid="period-text-id"]'));
        const sportNode = card.querySelector('[data-testid^="icon-"][data-testid$="-color"]');
        const sportTestId = sportNode?.getAttribute("data-testid") || "";
        const sport = sportTestId.replace(/^icon-/, "").replace(/-color$/, "") || null;
        const participants = Array.from(card.querySelectorAll('[data-testid="participant-name"]'))
          .map((node) => text(node.textContent)).filter((value) => value !== null);
        const league = text(card.querySelector('[data-testid="sport-league-component"]')?.textContent);
        const eventName = participants.length ? participants.join(" vs ") : text(card.querySelector(".card-header")?.textContent);
        const period = text(card.querySelector('[data-testid="period-text-id"]')?.textContent);
        const score = Array.from(card.querySelectorAll('[data-testid="total-score-component"] p')).map((node) => text(node.textContent)).filter((value) => value !== null);
        const markets = Array.from(card.querySelectorAll('[data-testid="vertical-market-type"]')).map((market) => {
          const marketName = text(market.querySelector(":scope > p")?.textContent) || "Unknown market";
          const selections = Array.from(market.querySelectorAll(":scope > button[data-testid^=pick-component]"))
            .map((button, index) => {
              const values = Array.from(button.querySelectorAll("p"))
                .map((node) => text(node.textContent)).filter((value) => value !== null);
              const value = values.at(-1) || null;
              const lineValue = values.length > 1 ? values[0] : null;
              const totalMatch = lineValue?.match(/^([OU])\\s+(.+)$/i);
              const selectionName = totalMatch
                ? (totalMatch[1].toUpperCase() === "O" ? "Over" : "Under")
                : participants[index] || ("Selection " + (index + 1));
              return { selectionName, line: totalMatch?.[2] || lineValue, odds: value ? { american: value } : null, suspended: Boolean(button.closest('.lock-button')) };
            });
          return { marketName, period: live ? "Live" : "Game", selections };
        }).filter((market) => market.selections.length > 0);
        return {
          eventId, eventName, sport, competition: league, participants,
          homeParticipant: participants[0] || null, awayParticipant: participants[1] || null,
          period, live, score: score.length ? score : null, liveClock: live ? period : null, markets, sourceUrl: url.toString()
        };
      }).filter((event) => event.eventId !== null && event.markets.length > 0);
      return { events };
    })()`);
    if (snapshot.events.length === 0) return 0;
    this.captured.push({
      sportsbook: this.context.sportsbook,
      accountAlias: this.context.accountAlias,
      sourceType: "dom",
      sourceUrl: page.url(),
      retrievedAt: new Date().toISOString(),
      providerTimestamp: null,
      externalEventId: null,
      rawPayload: snapshot,
      parserVersion: PARSER_VERSION
    });
    return snapshot.events.length;
  }
}

export { BETONLINE_HOSTS, PARSER_VERSION };

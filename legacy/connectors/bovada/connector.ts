import { RequestGovernor, requestGovernorFor, HttpRequestError, retryAfterMs } from "../../scheduler/requests.js";
import type { BrowserManager } from "../../browser/manager.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";
import { classifyFailure } from "../../health/errors.js";
import type { HealthStatus } from "../../health/types.js";
import type { RawPayloadInput } from "../../normalization/types.js";
import { parseCoupon } from "./parser.js";
import type { BovadaCouponItem } from "./types.js";

type BovadaConnectorOptions = {
  browserManager: BrowserManager;
  accountAlias?: string;
  baseUrl?: string;
  sportPaths?: string[];
  requestTimeoutMs?: number;
  requestGovernor?: RequestGovernor;
};

type BrowserResponse = { status: number; contentType: string; body: string; url: string };

/**
 * An empty default means that the browser crawler discovers the categories
 * currently exposed by the sportsbook. BOVADA_SPORT_PATHS remains an
 * explicit override for a deliberately scoped run.
 */
export const DEFAULT_BOVADA_SPORT_PATHS = [] as const;

type SportDiscovery = { paths: string[]; raw?: RawPayloadInput };

export class BovadaConnector implements SportsbookConnector {
  readonly id = "bovada";
  readonly context: ConnectorContext;
  private readonly baseUrl: string;
  private readonly sportPaths?: string[];
  private readonly requestTimeoutMs: number;
  private readonly requests: RequestGovernor;
  private page?: import("playwright").Page;
  private cachedDiscovery?: { expiresAt: number; paths: string[] };

  constructor(private readonly options: BovadaConnectorOptions) {
    this.context = { sportsbook: "bovada", accountAlias: options.accountAlias ?? "public" };
    this.baseUrl = (options.baseUrl ?? "https://www.bovada.lv").replace(/\/$/, "");
    this.sportPaths = options.sportPaths?.length ? options.sportPaths : undefined;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
    this.requests = options.requestGovernor ?? requestGovernorFor("bovada");
  }

  async initialize(): Promise<void> {
    this.page = await this.options.browserManager.getPage(this.context.sportsbook, this.context.accountAlias);
    if (!this.page.url().startsWith(this.baseUrl)) await this.page.goto(`${this.baseUrl}/sports/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  }

  async login(): Promise<void> { /* Bovada public coupon data does not require account authentication. */ }
  async restoreSession(): Promise<void> { await this.initialize(); }
  async validateSession(): Promise<boolean> { return (await this.request("/services/sports/config/site")).status === 200; }

  async collectEvents(): Promise<ConnectorCollection> {
    const discovery = await this.discoverSportPaths();
    return this.collectPaths({}, discovery.paths, discovery.raw);
  }
  async collectPrematch(): Promise<ConnectorCollection> {
    const discovery = await this.discoverSportPaths();
    return this.collectPaths({ preMatchOnly: "true" }, discovery.paths, discovery.raw);
  }
  async collectLive(): Promise<ConnectorCollection> {
    const discovery = await this.discoverSportPaths();
    const livePaths = [...new Set(discovery.paths.map((path) => path.split("/")[0]))];
    return this.collectPaths({ liveOnly: "true" }, livePaths, discovery.raw);
  }

  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try {
      const response = await this.request("/services/sports/config/site");
      return response.status === 200 ? { status: "HEALTHY" } : { status: "DEGRADED", message: `HTTP ${response.status}` };
    } catch (cause) {
      const failure = classifyFailure(cause);
      return { status: failure.kind === "auth_required" ? "AUTH_REQUIRED" : "UNHEALTHY", message: failure.message };
    }
  }

  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}

  private async discoverSportPaths(): Promise<SportDiscovery> {
    if (this.sportPaths?.length) return { paths: this.sportPaths };
    if (this.cachedDiscovery && this.cachedDiscovery.expiresAt > Date.now()) return { paths: this.cachedDiscovery.paths };
    if (!this.page) await this.initialize();
    const landingUrl = `${this.baseUrl}/sports`;
    await this.page!.goto(landingUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const links = await this.page!.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => ({ href: (anchor as HTMLAnchorElement).href, text: anchor.textContent?.trim() ?? "" })));
    const root = new URL(this.baseUrl);
    const excluded = new Set(["live", "my-bets", "player-props"]);
    const paths = [...new Set(links.flatMap(({ href }) => {
      try {
        const url = new URL(href);
        if (url.origin !== root.origin) return [];
        const match = /^\/sports\/([^/]+)\/?$/.exec(url.pathname);
        const path = match?.[1];
        return path && !excluded.has(path) ? [path] : [];
      } catch { return []; }
    }))].sort();
    if (!paths.length) throw new Error("Bovada crawler found no top-level sportsbook categories");
    this.cachedDiscovery = { paths, expiresAt: Date.now() + 10 * 60_000 };
    return {
      paths,
      raw: {
        sportsbook: "bovada", accountAlias: this.context.accountAlias, sourceType: "rendered-navigation", sourceUrl: landingUrl,
        retrievedAt: new Date().toISOString(), providerTimestamp: null, externalEventId: null,
        rawPayload: { categoryPaths: paths, linkCount: links.length }, parserVersion: "bovada-web-crawler-v1"
      }
    };
  }

  private async collectPaths(query: Record<string, string>, paths: string[], discoveryRaw?: RawPayloadInput): Promise<ConnectorCollection> {
    const rawPayloads: RawPayloadInput[] = discoveryRaw ? [discoveryRaw] : [];
    const normalizedRecords = [];
    const failures: string[] = [];
    for (const sportPath of paths) {
      const endpoint = `/services/sports/event/coupon/events/A/description/${sportPath}`;
      try {
        const response = await this.request(endpoint, query);
        rawPayloads.push(this.raw(response));
        const parsed = JSON.parse(response.body) as BovadaCouponItem[];
        normalizedRecords.push(...parseCoupon(parsed, this.baseUrl, new Date().toISOString()));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        failures.push(`${sportPath}: ${message}`);
        // Preserve an observed transport failure beside successful coupons;
        // it is evidence, not a fabricated replacement data set.
        rawPayloads.push(this.failureRaw(endpoint, sportPath, query, message));
      }
    }
    if (failures.length === paths.length) throw new Error(`All Bovada coupon paths failed: ${failures.join("; ")}`);
    return { rawPayloads, normalizedRecords };
  }

  private raw(response: BrowserResponse): RawPayloadInput {
    return { sportsbook: "bovada", accountAlias: this.context.accountAlias, sourceType: "fetch-json", sourceUrl: response.url, retrievedAt: new Date().toISOString(), providerTimestamp: null, externalEventId: null, rawPayload: { status: response.status, contentType: response.contentType, body: response.body }, parserVersion: "bovada-v1" };
  }

  private failureRaw(endpoint: string, sportPath: string, query: Record<string, string>, message: string): RawPayloadInput {
    const url = new URL(endpoint, this.baseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return {
      sportsbook: "bovada",
      accountAlias: this.context.accountAlias,
      sourceType: "fetch-error",
      sourceUrl: url.toString(),
      retrievedAt: new Date().toISOString(),
      providerTimestamp: null,
      externalEventId: null,
      rawPayload: { configuredPath: sportPath, query, error: message },
      parserVersion: "bovada-v1"
    };
  }

  private async request(path: string, query: Record<string, string> = {}): Promise<BrowserResponse> {
    if (!this.page) await this.initialize();
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return this.requests.run(async () => {
    const response = await this.page!.evaluate(async ({ target, timeoutMs }) => {
      const controller = new AbortController();
      let timer: number | undefined;
      const request = (async () => {
        const result = await fetch(target, { credentials: "include", headers: { Accept: "application/json" }, signal: controller.signal });
        return { status: result.status, retryAfter: result.headers.get("retry-after"), contentType: result.headers.get("content-type") ?? "", body: await result.text(), url: result.url };
      })();
      const timeout = new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => {
          controller.abort();
          reject(new Error(`Bovada request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });
      try {
        return await Promise.race([request, timeout]);
      } finally {
        if (timer !== undefined) window.clearTimeout(timer);
      }
    }, { target: url.toString(), timeoutMs: this.requestTimeoutMs });
    if (response.status < 200 || response.status >= 300) {
      throw new HttpRequestError(`Bovada HTTP ${response.status}`, response.status, retryAfterMs(response.retryAfter));
    }
    return response;
    });
  }
}

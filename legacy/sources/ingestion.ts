import { createHash } from "node:crypto";
import { chromium, type Browser } from "playwright";
import { RequestGovernor, HttpRequestError, retryAfterMs } from "../scheduler/requests.js";
import { ActionNetworkEmbeddedOddsConnector } from "../connectors/actionnetwork/embedded-odds.js";
import { BestFightOddsConnector } from "../connectors/bestfightodds/connector.js";
import { PuntersEdgeConnector } from "../connectors/puntersedge/connector.js";
import { RaceHubConnector } from "../connectors/racehub/connector.js";
import { StrikingOddsConnector } from "../connectors/strikingodds/connector.js";
import { MuayThai2000Connector } from "../connectors/muaythai2000/connector.js";
import { MarathonbetConnector } from "../connectors/marathonbet/connector.js";
import { EsportsInsiderConnector } from "../connectors/esportsinsider/connector.js";
import { OneXBetTrottingConnector } from "../connectors/onexbet/connector.js";
import { BrowserManager } from "../browser/manager.js";
import { CollectorService } from "../collectors/service.js";
import type { PostgresStorage } from "../storage/postgres.js";
import type { AttemptResult, RegistryUrl, RuntimeStatus, SourceRegistryRepository } from "./registry.js";

type ProbeOptions = {
  concurrency: number;
  perDomainConcurrency: number;
  requestsPerMinute: number;
  timeoutMs: number;
  browserFallback: boolean;
  maxBodyBytes: number;
};

type HttpCapture = { status: number; finalUrl: string; contentType: string; body: string; truncated: boolean };
type Analysis = { status: RuntimeStatus; reason: string | null; evidence: Record<string, unknown> };

const DEFAULT_OPTIONS: ProbeOptions = { concurrency: 12, perDomainConcurrency: 2, requestsPerMinute: 30, timeoutMs: 12_000, browserFallback: true, maxBodyBytes: 2 * 1024 * 1024 };
const BLOCK_MARKERS = /captcha|access denied|request blocked|temporarily blocked|cloudflare|just a moment|enable javascript and cookies to continue|verify (?:you are|that you)|unusual traffic|not available in your (?:country|region)|geo.?block|forbidden|truecybersecure|<title[^>]*>\s*caution\s*<\/title>/i;
const MISSING_MARKERS = /(?:404|page not found|doesn.t exist|content unavailable|event not found|something went wrong)/i;
const EMPTY_MARKERS = /no (?:events|matches|markets|odds|bets) (?:available|found|right now)|there are no upcoming|currently no (?:events|markets)/i;
const MARKET_MARKERS = /\b(?:odds|moneyline|spread|over\/under|total|handicap|market|betting|sportsbook|back|lay)\b/i;
const DYNAMIC_MARKERS = /__NEXT_DATA__|__INITIAL_STATE__|__NUXT__|application\/ld\+json|data-reactroot|id=["']app["']|enable javascript/i;

const errorMessage = (cause: unknown): string => cause instanceof Error ? cause.message : String(cause);
const clamp = (value: string, max = 500): string => value.replace(/\s+/g, " ").trim().slice(0, max);
const titleOf = (body: string): string | null => { const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body); return match ? clamp(match[1]!.replace(/<[^>]*>/g, " "), 240) : null; };
const textOf = (body: string): string => body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&");

export function analyzePage(body: string, contentType: string, sports: string[]): Analysis {
  const title = titleOf(body);
  const visible = textOf(body);
  const sample = clamp(visible, 20_000);
  const combined = `${title ?? ""} ${sample}`;
  const americanOdds = body.match(/(?:^|[^\d])(?:[+-]\d{3,5})(?:[^\d]|$)/g)?.length ?? 0;
  const decimalOdds = body.match(/(?:^|[^\d])(?:1\.\d{2}|[2-9]\d?\.\d{2})(?:[^\d]|$)/g)?.length ?? 0;
  const sportHits = sports.filter((sport) => combined.toLocaleLowerCase().includes(sport.toLocaleLowerCase())).length;
  const markers = [MARKET_MARKERS.test(combined) ? "market-terms" : null,DYNAMIC_MARKERS.test(body) ? "structured-or-dynamic" : null,americanOdds + decimalOdds >= 2 ? "price-shaped-values" : null,sportHits ? "sport-name" : null].filter(Boolean);
  const evidence = { title, contentType, bodyBytes: Buffer.byteLength(body), bodySha256: createHash("sha256").update(body).digest("hex"), markers, sportHits, priceShapeCount: americanOdds + decimalOdds };
  if (BLOCK_MARKERS.test(`${body} ${combined}`)) return { status: "BLOCKED", reason: "Page returned an access-control, CAPTCHA, geographic-block, or network-interstitial message", evidence };
  if (MISSING_MARKERS.test(`${title ?? ""} ${sample.slice(0, 3000)}`)) return { status: "BROKEN", reason: "Page content reports a missing or unavailable resource", evidence };
  if (EMPTY_MARKERS.test(combined)) return { status: "NO_CURRENT_MARKETS", reason: "Page explicitly reports no current events or markets", evidence };
  if ((americanOdds + decimalOdds >= 2 && MARKET_MARKERS.test(combined)) || (DYNAMIC_MARKERS.test(body) && MARKET_MARKERS.test(body))) return { status: "PARTIAL", reason: "Sports/market content detected but no source-specific parser produced normalized odds", evidence };
  return { status: "NO_CURRENT_MARKETS", reason: "No extractable current market rows were detected", evidence };
}

class BrowserFallback {
  private browser?: Browser;
  private active = 0;
  private readonly waiters: Array<() => void> = [];
  constructor(private readonly concurrency: number, private readonly timeoutMs: number) {}
  private async acquire(): Promise<void> { if (this.active < this.concurrency) { this.active += 1; return; } await new Promise<void>((resolve) => this.waiters.push(resolve)); this.active += 1; }
  private release(): void { this.active -= 1; this.waiters.shift()?.(); }
  async capture(url: string): Promise<HttpCapture> {
    await this.acquire();
    try {
      this.browser ??= await chromium.launch({ headless: true });
      const context = await this.browser.newContext({ userAgent: "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.1; source-registry-audit)" });
      try {
        const page = await context.newPage();
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: this.timeoutMs });
        await page.waitForTimeout(750);
        const body = await page.content();
        return { status: response?.status() ?? 0, finalUrl: page.url(), contentType: response?.headers()["content-type"] ?? "text/html", body, truncated: false };
      } finally { await context.close(); }
    } finally { this.release(); }
  }
  async close(): Promise<void> { await this.browser?.close(); }
}

export class SourceIngestionEngine {
  private readonly options: ProbeOptions;
  private readonly governors = new Map<string, RequestGovernor>();
  private readonly collectorTails = new Map<string, Promise<void>>();
  private readonly browser: BrowserFallback;
  constructor(private readonly repository: SourceRegistryRepository, private readonly storage: PostgresStorage, options: Partial<ProbeOptions> = {}, private readonly log?: (line: string) => void) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.browser = new BrowserFallback(Math.min(4, this.options.concurrency), this.options.timeoutMs);
  }

  async run(runId: number, sources: RegistryUrl[]): Promise<Record<string, number>> {
    try {
      await mapConcurrent(sources, this.options.concurrency, async (source, index) => {
        let result: AttemptResult;
        try { result = await this.attempt(source); }
        catch (cause) {
          const now = new Date().toISOString();
          result = { status: "BROKEN", strategy: "engine", startedAt: now, finishedAt: now, httpStatus: null, finalUrl: source.url, recordCount: 0, rawCount: 1, failureReason: errorMessage(cause), evidence: { engineFailure: true } };
        }
        await this.repository.saveAttempt(runId, source, result);
        this.log?.(JSON.stringify({ runId, progress: `${index + 1}/${sources.length}`, domain: source.domain, url: source.url, status: result.status, strategy: result.strategy, records: result.recordCount, reason: result.failureReason }));
      });
      return await this.repository.summary(runId);
    } finally { await this.browser.close(); }
  }

  private async attempt(source: RegistryUrl): Promise<AttemptResult> {
    const startedAt = new Date().toISOString();
    try {
      if (source.domain === "www.actionnetwork.com") return await this.actionNetwork(source, startedAt);
      if (source.domain === "www.bestfightodds.com") return await this.bestFightOdds(source, startedAt);
      if (source.domain === "puntersedge.online") return await this.collectConnector(source, startedAt, new PuntersEdgeConnector(source.url, this.options.timeoutMs, this.governor(source.domain)), "puntersedge-bo-initial");
      if (source.domain === "racehub.com.au") return await this.collectConnector(source, startedAt, new RaceHubConnector(source.url, this.options.timeoutMs, this.governor(source.domain)), "racehub-next-flight");
      if (source.domain === "www.strikingodds.io") return await this.collectConnector(source, startedAt, new StrikingOddsConnector(source.url, this.options.timeoutMs, this.governor(source.domain)), "strikingodds-public-api");
      if (source.domain === "www.muaythai2000.com") return await this.collectConnector(source, startedAt, new MuayThai2000Connector(source.url, this.options.timeoutMs, this.governor(source.domain)), "muaythai2000-html");
      if (source.domain === "www.marathonbet.com") return await this.collectConnector(source, startedAt, new MarathonbetConnector(source.url, this.options.timeoutMs, this.governor(source.domain)), "marathonbet-html");
      if (source.domain === "esportsinsider.com") return await this.collectConnector(source, startedAt, new EsportsInsiderConnector(source.url, this.options.timeoutMs, this.governor(source.domain)), "esportsinsider-html");
      if (source.domain === "irq.1xbet.com") return await this.collectConnector(source, startedAt, new OneXBetTrottingConnector(this.options.timeoutMs, this.governor(source.domain)), "1xbet-ke-public-json");
      if (source.domain === "www.oddshub.io") return await this.oddsHub(source, startedAt);
      if (["esportsbetting.gg", "kh8.bio", "m71p.io", "tk791.io", "top99.im"].includes(source.domain)) return await this.informationalPageAudit(source, startedAt);
      return await this.generic(source, startedAt);
    } catch (cause) {
      this.log?.(JSON.stringify({ url: source.url, specializedAdapterFailed: errorMessage(cause), fallback: "generic" }));
      return this.generic(source, startedAt, errorMessage(cause));
    }
  }

  private async informationalPageAudit(source: RegistryUrl, startedAt: string): Promise<AttemptResult> {
    const result = await this.generic(source, startedAt);
    if (result.status !== "PARTIAL") return result;
    return { ...result, status: "NO_CURRENT_MARKETS", strategy: "domain-content-audit", failureReason: "Domain page was inspected and contains promotional/editorial content but no event-market-selection-price structure", evidence: { ...result.evidence, domainAudit: "no structured current market rows in HTML, embedded JSON, JSON-LD, or rendered DOM" } };
  }

  private async oddsHub(source: RegistryUrl, startedAt: string): Promise<AttemptResult> {
    const sport = new URL(source.url).pathname.split("/").filter(Boolean)[0] ?? "";
    const captureJson = async (url: string): Promise<{ status: number; body: unknown; text: string }> => this.governor(source.domain).run(async () => {
      const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.1)" }, signal: AbortSignal.timeout(this.options.timeoutMs) });
      const text = await response.text();
      let body: unknown = null;
      try { body = JSON.parse(text); } catch { /* Preserve the response text as evidence only. */ }
      return { status: response.status, body, text };
    });
    try {
      const leaguesUrl = new URL(`/api/leagues?sport=${encodeURIComponent(sport)}`, source.url).toString();
      const leaguesResponse = await captureJson(leaguesUrl);
      const leagues = Array.isArray(leaguesResponse.body) ? leaguesResponse.body as Array<{ slug?: string; eventsCount?: number }> : [];
      if (leaguesResponse.status !== 200) return { status: "BLOCKED", strategy: "oddshub-public-api", startedAt, finishedAt: new Date().toISOString(), httpStatus: leaguesResponse.status, finalUrl: leaguesUrl, recordCount: 0, rawCount: 1, failureReason: `OddsHub leagues endpoint returned HTTP ${leaguesResponse.status}`, evidence: { sport, endpoint: "/api/leagues", response: clamp(leaguesResponse.text, 300) } };
      const league = leagues.find((item) => item.slug && (item.eventsCount ?? 0) > 0);
      if (!league?.slug) return { status: "NO_CURRENT_MARKETS", strategy: "oddshub-public-api", startedAt, finishedAt: new Date().toISOString(), httpStatus: 200, finalUrl: leaguesUrl, recordCount: 0, rawCount: 1, failureReason: "Public leagues endpoint reports no current events for this sport", evidence: { sport, endpoint: "/api/leagues", leagueCount: leagues.length } };
      const eventsUrl = new URL(`/api/events/${encodeURIComponent(sport)}/${encodeURIComponent(league.slug)}?status=live,pending`, source.url).toString();
      const eventsResponse = await captureJson(eventsUrl);
      const events = Array.isArray(eventsResponse.body) ? eventsResponse.body as Array<{ id?: string | number }> : [];
      if (eventsResponse.status !== 200 || !events[0]?.id) return { status: eventsResponse.status === 200 ? "NO_CURRENT_MARKETS" : "BLOCKED", strategy: "oddshub-public-api", startedAt, finishedAt: new Date().toISOString(), httpStatus: eventsResponse.status, finalUrl: eventsUrl, recordCount: 0, rawCount: 1, failureReason: eventsResponse.status === 200 ? "No live or pending events returned" : `OddsHub events endpoint returned HTTP ${eventsResponse.status}`, evidence: { sport, league: league.slug, eventCount: events.length } };
      const oddsUrl = new URL(`/api/odds/${events[0].id}`, source.url).toString();
      const oddsResponse = await captureJson(oddsUrl);
      if (oddsResponse.status === 403) return { status: "BLOCKED", strategy: "oddshub-public-api", startedAt, finishedAt: new Date().toISOString(), httpStatus: 403, finalUrl: oddsUrl, recordCount: 0, rawCount: 1, failureReason: "OddsHub permits public event discovery but explicitly denies automated odds access and directs clients to its licensed API", evidence: { sport, league: league.slug, eventCount: events.length, endpoint: "/api/odds/:eventId", response: clamp(oddsResponse.text, 300), accessControlNotBypassed: true } };
      return { status: "PARTIAL", strategy: "oddshub-public-api", startedAt, finishedAt: new Date().toISOString(), httpStatus: oddsResponse.status, finalUrl: oddsUrl, recordCount: 0, rawCount: 1, failureReason: `Odds endpoint returned HTTP ${oddsResponse.status}; response schema requires an adapter`, evidence: { sport, league: league.slug, eventCount: events.length, responseBytes: Buffer.byteLength(oddsResponse.text) } };
    } catch (cause) {
      return this.generic(source, startedAt, `OddsHub public API audit failed: ${errorMessage(cause)}`);
    }
  }

  private async collectConnector(source: RegistryUrl, startedAt: string, connector: import("../connectors/types.js").SportsbookConnector, strategy: string): Promise<AttemptResult> {
    try {
      const collection = await this.withCollectorLock(connector.context.sportsbook, () => new CollectorService(undefined, undefined, this.storage, this.storage, this.log, this.storage).collect(connector, "events"));
      const records = collection.changes.length;
      return { status: records ? "WORKING" : "NO_CURRENT_MARKETS", strategy, startedAt, finishedAt: new Date().toISOString(), httpStatus: 200, finalUrl: source.url, recordCount: records, rawCount: collection.rawPayloads.length + 1, failureReason: records ? null : "Domain adapter completed successfully but the current feed contained no prices", evidence: { parserCompleted: true, sourceAdapter: connector.id, sports: source.sports } };
    } finally { await connector.shutdown(); }
  }

  private async actionNetwork(source: RegistryUrl, startedAt: string): Promise<AttemptResult> {
    const connector = new ActionNetworkEmbeddedOddsConnector({ sourceUrl: source.url, requestTimeoutMs: this.options.timeoutMs, requestGovernor: this.governor(source.domain) });
    const collection = await this.withCollectorLock(connector.context.sportsbook, () => new CollectorService(undefined, undefined, this.storage, this.storage, this.log, this.storage).collect(connector, "events"));
    const records = collection.changes.length;
    return { status: records ? "WORKING" : "NO_CURRENT_MARKETS", strategy: "actionnetwork-embedded-json", startedAt, finishedAt: new Date().toISOString(), httpStatus: 200, finalUrl: source.url, recordCount: records, rawCount: collection.rawPayloads.length + 1, failureReason: records ? null : "Adapter found no current market rows", evidence: { parserCompleted: true, sourceAdapter: "actionnetwork", sports: source.sports } };
  }

  private async bestFightOdds(source: RegistryUrl, startedAt: string): Promise<AttemptResult> {
    const manager = new BrowserManager({ headless: true, sessionStoragePath: process.env.SESSION_STORAGE_PATH ?? ".sessions" });
    const connector = new BestFightOddsConnector({ browserManager: manager, requestTimeoutMs: this.options.timeoutMs });
    try {
      const collection = await new CollectorService(undefined, undefined, this.storage, this.storage, this.log, this.storage).collect(connector, "events");
      const records = collection.changes.length;
      return { status: records ? "WORKING" : "NO_CURRENT_MARKETS", strategy: "bestfightodds-browser-dom", startedAt, finishedAt: new Date().toISOString(), httpStatus: 200, finalUrl: source.url, recordCount: records, rawCount: collection.rawPayloads.length + 1, failureReason: records ? null : "Adapter found no current market rows", evidence: { parserCompleted: true, sourceAdapter: "bestfightodds", sports: source.sports } };
    } finally { await connector.shutdown(); await manager.shutdown(); }
  }

  private async generic(source: RegistryUrl, startedAt: string, specializedFailure?: string): Promise<AttemptResult> {
    let capture: HttpCapture;
    try { capture = await this.fetch(source); }
    catch (cause) {
      const message = errorMessage(cause);
      const httpStatus = cause instanceof HttpRequestError ? cause.status : null;
      const blocked = httpStatus !== null && [401,403,407,429,451].includes(httpStatus);
      const invalid = cause instanceof TypeError && /invalid url/i.test(message);
      if (!invalid && this.options.browserFallback) {
        try {
          const rendered = await this.governor(source.domain).run(() => this.browser.capture(source.url));
          if ([401,403,407,429,451].includes(rendered.status)) {
            return this.fromHttp(source, startedAt, rendered, "BLOCKED", `HTTP ${rendered.status} in a normal browser session`, specializedFailure);
          }
          const renderedAnalysis = analyzePage(rendered.body, rendered.contentType, source.sports);
          return { status: renderedAnalysis.status, strategy: "http-failed+browser-dom", startedAt, finishedAt: new Date().toISOString(), httpStatus: rendered.status || httpStatus, finalUrl: rendered.finalUrl, recordCount: 0, rawCount: 1, failureReason: renderedAnalysis.reason, evidence: { ...renderedAnalysis.evidence, httpFailure: message, specializedFailure: specializedFailure ?? null, adapterKey: source.adapterKey } };
        } catch (browserCause) {
          return { status: blocked || /timeout|aborted|fetch failed|econnreset/i.test(message) ? "BLOCKED" : "BROKEN", strategy: "http+browser-failed", startedAt, finishedAt: new Date().toISOString(), httpStatus, finalUrl: source.url, recordCount: 0, rawCount: 1, failureReason: `${message}; browser: ${errorMessage(browserCause)}`, evidence: { httpFailure: message, browserFailure: errorMessage(browserCause), specializedFailure: specializedFailure ?? null } };
        }
      }
      return { status: invalid ? "INVALID_URL" : blocked || /timeout|aborted|fetch failed|econnreset/i.test(message) ? "BLOCKED" : "BROKEN", strategy: "http", startedAt, finishedAt: new Date().toISOString(), httpStatus, finalUrl: source.url, recordCount: 0, rawCount: 1, failureReason: message, evidence: { specializedFailure: specializedFailure ?? null } };
    }
    if ([401,403,407,429,451].includes(capture.status)) return this.fromHttp(source, startedAt, capture, "BLOCKED", `HTTP ${capture.status}`, specializedFailure);
    if (capture.status === 404 || capture.status === 410 || capture.status >= 500) return this.fromHttp(source, startedAt, capture, "BROKEN", `HTTP ${capture.status}`, specializedFailure);
    if (capture.status < 200 || capture.status >= 400) return this.fromHttp(source, startedAt, capture, "BROKEN", `Unexpected HTTP ${capture.status}`, specializedFailure);
    let analysis = analyzePage(capture.body, capture.contentType, source.sports);
    let strategy = "http-html";
    if (this.options.browserFallback && analysis.status === "NO_CURRENT_MARKETS" && DYNAMIC_MARKERS.test(capture.body)) {
      try {
        const rendered = await this.governor(source.domain).run(() => this.browser.capture(source.url));
        const renderedAnalysis = analyzePage(rendered.body, rendered.contentType, source.sports);
        if (renderedAnalysis.status !== "NO_CURRENT_MARKETS" || rendered.body.length > capture.body.length) { capture = rendered; analysis = renderedAnalysis; }
        strategy = "http+browser-dom";
      } catch (cause) { analysis.evidence.browserFailure = errorMessage(cause); strategy = "http+browser-failed"; }
    }
    return { status: analysis.status, strategy, startedAt, finishedAt: new Date().toISOString(), httpStatus: capture.status, finalUrl: capture.finalUrl, recordCount: 0, rawCount: 1, failureReason: analysis.reason, evidence: { ...analysis.evidence, truncated: capture.truncated, specializedFailure: specializedFailure ?? null, adapterKey: source.adapterKey } };
  }

  private fromHttp(source: RegistryUrl, startedAt: string, capture: HttpCapture, status: RuntimeStatus, reason: string, specializedFailure?: string): AttemptResult {
    return { status, strategy: "http", startedAt, finishedAt: new Date().toISOString(), httpStatus: capture.status, finalUrl: capture.finalUrl, recordCount: 0, rawCount: 1, failureReason: reason, evidence: { bodyBytes: Buffer.byteLength(capture.body), bodySha256: createHash("sha256").update(capture.body).digest("hex"), title: titleOf(capture.body), truncated: capture.truncated, specializedFailure: specializedFailure ?? null, adapterKey: source.adapterKey } };
  }

  private async fetch(source: RegistryUrl): Promise<HttpCapture> {
    return this.governor(source.domain).run(async () => {
      const response = await fetch(source.url, { redirect: "follow", headers: { Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.8", "User-Agent": "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.1; source-registry-audit)" }, signal: AbortSignal.timeout(this.options.timeoutMs) });
      const body = await readLimited(response, this.options.maxBodyBytes);
      if (!response.ok) throw new HttpRequestError(`HTTP ${response.status}`, response.status, retryAfterMs(response.headers.get("retry-after")));
      return { status: response.status, finalUrl: response.url, contentType: response.headers.get("content-type") ?? "", body: body.text, truncated: body.truncated };
    });
  }

  private governor(domain: string): RequestGovernor {
    let governor = this.governors.get(domain);
    if (!governor) {
      governor = new RequestGovernor({ maxRequestsPerMinute: this.options.requestsPerMinute, maxConcurrency: this.options.perDomainConcurrency, maxRetries: 1, baseBackoffMs: 500, maxBackoffMs: 5_000 });
      this.governors.set(domain, governor);
    }
    return governor;
  }

  private async withCollectorLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.collectorTails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.catch(() => undefined).then(() => gate);
    this.collectorTails.set(key, tail);
    await previous.catch(() => undefined);
    try { return await task(); }
    finally {
      release();
      if (this.collectorTails.get(key) === tail) this.collectorTails.delete(key);
    }
  }
}

async function readLimited(response: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) return { text: "", truncated: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = maxBytes - size;
    if (value.byteLength > remaining) { chunks.push(value.slice(0, Math.max(0, remaining))); truncated = true; await reader.cancel(); break; }
    chunks.push(value); size += value.byteLength;
    if (size >= maxBytes) { truncated = true; await reader.cancel(); break; }
  }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  return { text: new TextDecoder().decode(bytes), truncated };
}

async function mapConcurrent<T>(items: T[], concurrency: number, task: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      await task(items[index]!, index);
    }
  }));
}

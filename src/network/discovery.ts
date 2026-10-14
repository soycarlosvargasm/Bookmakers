import { createHash } from "node:crypto";
import { chromium, type Browser, type CDPSession, type Page, type Request, type Response } from "playwright";
import { normalizeRecord } from "../normalization/normalize.js";
import type { ProviderRecord, RawPayloadInput } from "../normalization/types.js";
import { sanitizeRawPayload } from "../collectors/raw-policy.js";
import { redactSecrets } from "../health/logger.js";
import type { PostgresStorage } from "../storage/postgres.js";
import type { RegistryUrl } from "../sources/registry.js";

export const DISCOVERY_KINDS = ["EVENT_FEED", "MARKET_FEED", "ODDS_FEED", "LIVE_FEED", "SPORTS_MENU", "UNKNOWN"] as const;
export type DiscoveryKind = typeof DISCOVERY_KINDS[number];
export type DiscoveryTransport = "xhr" | "fetch" | "graphql" | "sse" | "websocket" | "html" | "script";
export type DiscoveryCandidate = {
  domain: string; url: string; path: string; method: string; status: number | null; contentType: string | null;
  transport: DiscoveryTransport; timestamp: string; sizeBytes: number; requestType: string; navigationRelation: "navigation" | "subresource" | "interaction";
  category: DiscoveryKind; confidence: number; reasons: string[]; detectedFields: string[]; structuralExample: unknown;
  operationName?: string | null; topic?: string | null; frequency?: number; redirects?: string[];
};
export type DiscoveryReport = { domain: string; pageUrl: string; loaded: boolean; candidates: DiscoveryCandidate[]; rawSaved: number; normalizedRecords: number; status: "RECOVERED" | "NO_USABLE_FEED" | "PAGE_UNAVAILABLE" | "NEEDS_OTHER_TECHNIQUE"; error?: string };

const SPORT = /sport|league|competition|tournament|category/i;
const EVENT = /event|fixture|game|match|contest|race/i;
const MARKET = /market|betting|moneyline|spread|handicap|total|over.?under/i;
const SELECTION = /selection|outcome|runner|competitor|participant|side|team/i;
const ODDS = /odds|price|decimal|american|fractional|coefficient|probability/i;
const LIVE = /live|score|clock|period|in.?play|status/i;
const SENSITIVE = /authorization|cookie|token|secret|password|session|email|phone|account|customer/i;
const safeUrl = (value: string): string => { try { const url = new URL(value); url.username=""; url.password=""; url.hash=""; for (const key of [...url.searchParams.keys()]) if (SENSITIVE.test(key)) url.searchParams.set(key,"[REDACTED]"); return url.toString(); } catch { return value; } };
const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const keysOf = (value: unknown): string[] => { const record = object(value); return record ? Object.keys(record).filter((key) => !SENSITIVE.test(key)).slice(0, 40) : []; };
const has = (keys: string[], matcher: RegExp): boolean => keys.some((key) => matcher.test(key));
const sample = (value: unknown, depth = 0): unknown => {
  if (depth > 3) return "…";
  if (Array.isArray(value)) return value.slice(0, 2).map((item) => sample(item, depth + 1));
  const record = object(value); if (!record) return typeof value === "string" ? String(redactSecrets(/^https?:\/\//i.test(value) ? safeUrl(value) : value)).slice(0, 120) : value;
  return Object.fromEntries(Object.entries(record).filter(([key]) => !SENSITIVE.test(key)).slice(0, 12).map(([key, item]) => [key, sample(item, depth + 1)]));
};
const parseJson = (text: string): unknown | null => { try { return JSON.parse(text) as unknown; } catch { return null; } };
const primitive = (value: unknown): string | null => typeof value === "string" || typeof value === "number" ? String(value) : null;
const lookup = (record: Record<string, unknown> | null, names: RegExp): string | null => record ? primitive(Object.entries(record).find(([key]) => names.test(key))?.[1]) : null;
const findArray = (record: Record<string, unknown> | null, names: RegExp): unknown[] => {
  if (!record) return []; const item = Object.entries(record).find(([key, value]) => names.test(key) && Array.isArray(value))?.[1]; return Array.isArray(item) ? item : [];
};
const price = (record: Record<string, unknown>): { raw: string; decimal: number | null; format: string } | null => {
  const value = lookup(record, /^(odds|price|decimalOdds|decimal|americanOdds|coefficient|cf)$/i); if (value === null) return null;
  if (/^[+-]\d{2,5}$/.test(value)) return { raw: value, decimal: null, format: "american" };
  const decimal = Number(value); return Number.isFinite(decimal) && decimal > 1 && decimal < 10_000 ? { raw: value, decimal, format: "decimal" } : null;
};

export function classifyPayload(payload: unknown, transport: DiscoveryTransport, url: string, extra: Partial<Pick<DiscoveryCandidate, "method" | "status" | "contentType" | "requestType" | "operationName" | "topic">> = {}): DiscoveryCandidate {
  const fields = new Set<string>(); let nodes = 0; let eventHits = 0; let marketHits = 0; let selectionHits = 0; let oddsHits = 0; let liveHits = 0; let sportHits = 0;
  const walk = (value: unknown, depth = 0): void => { if (depth > 12 || nodes++ > 3_000) return; if (Array.isArray(value)) { value.slice(0, 500).forEach((item) => walk(item, depth + 1)); return; } const record = object(value); if (!record) return; const keys = keysOf(record); keys.forEach((key) => fields.add(key)); eventHits += Number(has(keys, EVENT)); marketHits += Number(has(keys, MARKET)); selectionHits += Number(has(keys, SELECTION)); oddsHits += Number(has(keys, ODDS)); liveHits += Number(has(keys, LIVE)); sportHits += Number(has(keys, SPORT)); Object.values(record).forEach((item) => walk(item, depth + 1)); };
  walk(payload); const reasons: string[] = []; if (eventHits) reasons.push("event-shaped fields"); if (marketHits) reasons.push("market-shaped fields"); if (selectionHits) reasons.push("selection-shaped fields"); if (oddsHits) reasons.push("odds/price fields"); if (liveHits) reasons.push("live-update fields"); if (transport === "graphql") reasons.push("GraphQL operation");
  const score = (eventHits ? 20 : 0) + (marketHits ? 25 : 0) + (selectionHits ? 20 : 0) + (oddsHits ? 30 : 0) + (liveHits ? 10 : 0) + (sportHits ? 5 : 0);
  const category: DiscoveryKind = oddsHits && (marketHits || selectionHits) ? (liveHits ? "LIVE_FEED" : "ODDS_FEED") : marketHits ? "MARKET_FEED" : eventHits ? "EVENT_FEED" : sportHits ? "SPORTS_MENU" : "UNKNOWN";
  const parsed = new URL(url); return { domain: parsed.hostname, url: safeUrl(url), path: parsed.pathname, method: extra.method ?? "GET", status: extra.status ?? null, contentType: extra.contentType ?? null, transport, timestamp: new Date().toISOString(), sizeBytes: Buffer.byteLength(JSON.stringify(payload)), requestType: extra.requestType ?? transport, navigationRelation: "subresource", category, confidence: Math.min(1, score / 100), reasons, detectedFields: [...fields].slice(0, 60), structuralExample: sample(payload), ...(extra.operationName ? { operationName: extra.operationName } : {}), ...(extra.topic ? { topic: extra.topic } : {}) };
}

/** Conservative adapter: it emits rows only when an observed payload has an event, market, selection and price. */
export function extractGenericSportsRecords(payload: unknown, sportsbook: string, sourceUrl: string, collectedAt = new Date().toISOString()): ProviderRecord[] {
  const rows: ProviderRecord[] = [];
  const visit = (value: unknown, inherited: { sport?: string | null; competition?: string | null } = {}, depth = 0): void => {
    if (depth > 8) return; if (Array.isArray(value)) { value.slice(0, 500).forEach((item) => visit(item, inherited, depth + 1)); return; }
    const event = object(value); if (!event) return;
    const sport = lookup(event, /^(sport|sportName|sport_label)$/i) ?? inherited.sport ?? null;
    const competition = lookup(event, /^(league|competition|tournament|category|leagueName)$/i) ?? inherited.competition ?? null;
    const eventId = lookup(event, /^(eventId|event_id|fixtureId|fixture_id|gameId|game_id|matchId|match_id|id)$/i);
    const home = lookup(event, /^(home|homeTeam|home_name)$/i); const away = lookup(event, /^(away|awayTeam|away_name)$/i);
    const eventName = lookup(event, /^(eventName|event_name|name|title)$/i) ?? (home && away ? `${home} vs ${away}` : null);
    const markets = findArray(event, /^(markets|market|betOffers|offerings)$/i);
    if (eventId && eventName && markets.length) for (const marketValue of markets) {
      const market = object(marketValue); if (!market) continue; const marketId = lookup(market, /^(marketId|market_id|id)$/i); const marketName = lookup(market, /^(marketName|market_name|name|title|type)$/i);
      const selections = findArray(market, /^(selections|outcomes|runners|competitors|prices|offers)$/i);
      for (const selectionValue of selections) { const selection = object(selectionValue); if (!selection) continue; const quote = price(selection); const selectionName = lookup(selection, /^(selectionName|selection_name|outcomeName|runnerName|name|label|title)$/i); const selectionId = lookup(selection, /^(selectionId|selection_id|outcomeId|outcome_id|runnerId|runner_id|id)$/i);
        if (!quote || !selectionName || !marketName) continue;
        rows.push({ sportsbook, sport, competition, eventName, participants: home && away ? [home, away] : null, homeParticipant: home, awayParticipant: away, eventStartTime: lookup(event, /^(startTime|start_time|commence_time|scheduledAt)$/i), eventStatus: lookup(event, /^(status|eventStatus)$/i), market: marketName, marketPeriod: lookup(market, /^(period|marketPeriod)$/i), selection: selectionName, selectionStatus: lookup(selection, /^(status|selectionStatus)$/i), line: lookup(selection, /^(line|handicap|points|total)$/i), decimalOdds: quote.decimal, rawOdds: quote.raw, rawOddsFormat: quote.format, sourceEventId: eventId, sourceMarketId: marketId, sourceSelectionId: selectionId, sourceUrl: safeUrl(sourceUrl), collectedAt });
      }
    }
    Object.values(event).forEach((item) => { if (item && typeof item === "object") visit(item, { sport, competition }, depth + 1); });
  };
  visit(payload); return [...new Map(rows.map((row) => [`${row.sourceEventId}|${row.sourceMarketId}|${row.sourceSelectionId}|${row.selection}`, row])).values()];
}

type Capture = { candidate: DiscoveryCandidate; payload: unknown; sourceUrl: string };
class PageDiscoveryObserver {
  readonly captures: Capture[] = []; private cdp?: CDPSession; private readonly redirects = new Map<string, string[]>(); private readonly requestUrls = new Map<string, string>();
  async attach(page: Page): Promise<void> {
    page.on("response", (response) => { void this.response(response); });
    this.cdp = await page.context().newCDPSession(page); await this.cdp.send("Network.enable");
    this.cdp.on("Network.webSocketCreated", (event: { requestId: string; url: string }) => {
      this.redirects.set(event.requestId, [safeUrl(event.url)]);
      const candidate = classifyPayload({ connection: true }, "websocket", event.url, { requestType: "websocket" });
      candidate.reasons = ["WebSocket connection established"];
      candidate.navigationRelation = "interaction";
      this.captures.push({ candidate, payload: { connection: true }, sourceUrl: event.url });
    });
    this.cdp.on("Network.responseReceived", (event: { requestId: string; response: { url: string } }) => this.requestUrls.set(event.requestId, event.response.url));
    this.cdp.on("Network.eventSourceMessageReceived", (event: { requestId: string; eventName: string; eventId: string; data: string }) => this.sse(event));
    this.cdp.on("Network.webSocketFrameReceived", (event: { requestId: string; response: { opcode: number; payloadData: string } }) => this.frame(event.requestId, event.response));
    this.cdp.on("Network.webSocketFrameSent", (event: { requestId: string; response: { opcode: number; payloadData: string } }) => this.frame(event.requestId, event.response, true));
  }
  private async response(response: Response): Promise<void> {
    const request = response.request(); const resource = request.resourceType(); const contentType = response.headers()["content-type"] ?? "";
    const graph = /graphql/i.test(response.url()) || /graphql/i.test(request.postData() ?? ""); const transport: DiscoveryTransport | null = graph ? "graphql" : resource === "xhr" ? "xhr" : resource === "fetch" ? "fetch" : resource === "eventsource" ? "sse" : resource === "document" && /html/i.test(contentType) ? "html" : /javascript/i.test(contentType) ? "script" : null;
    if (!transport || response.status() >= 400) return;
    if (transport === "sse") { this.captures.push({ candidate: classifyPayload({ contentType, stream: true }, transport, response.url(), { method: request.method(), status: response.status(), contentType, requestType: resource }), payload: { contentType, stream: true }, sourceUrl: response.url() }); return; }
    try { const body = await response.body(); if (body.byteLength > 512 * 1024) return; const text = body.toString("utf8"); const parsed = parseJson(text); const endpoints = transport === "html" || transport === "script" ? extractEndpoints(text, response.url()) : []; const payload = parsed ?? (endpoints.length ? { endpoints } : null); if (payload === null) return; const operationName = graph ? graphqlOperation(request.postData() ?? "") : null; const candidate = classifyPayload(payload, transport, response.url(), { method: request.method(), status: response.status(), contentType, requestType: resource, operationName }); candidate.navigationRelation = resource === "document" ? "navigation" : "subresource"; this.captures.push({ candidate, payload, sourceUrl: response.url() });
      for (const endpoint of endpoints) { const discovered = classifyPayload({ endpoint }, "script", endpoint, { method: "GET", requestType: "configuration" }); discovered.confidence = .25; discovered.reasons = ["endpoint revealed by page configuration/script"]; discovered.detectedFields = ["endpoint"]; this.captures.push({ candidate: discovered, payload: { endpoint }, sourceUrl: endpoint }); }
    } catch { /* responses can disappear during navigation */ }
  }
  private frame(requestId: string, frame: { opcode: number; payloadData: string }, sent = false): void { if (sent || frame.opcode !== 1 || Buffer.byteLength(frame.payloadData) > 512 * 1024) return; const parsed = parseJson(frame.payloadData); if (!parsed) return; const url = this.redirects.get(requestId)?.[0] ?? "ws://unknown/"; const candidate = classifyPayload(parsed, "websocket", url, { requestType: "websocket", topic: lookup(object(parsed), /^(topic|channel|subscription)$/i) }); const fields = candidate.detectedFields.join(" "); if (/heartbeat|ping|pong/i.test(fields)) candidate.reasons.push("heartbeat frame"); if (/snapshot/i.test(fields)) candidate.reasons.push("snapshot frame"); if (/delta|update|patch/i.test(fields)) candidate.reasons.push("delta/update frame"); candidate.navigationRelation = "interaction"; this.captures.push({ candidate, payload: parsed, sourceUrl: url }); }
  private sse(event: { requestId: string; eventName: string; eventId: string; data: string }): void { if (Buffer.byteLength(event.data) > 512 * 1024) return; const parsed = parseJson(event.data); if (!parsed) return; const url = this.requestUrls.get(event.requestId) ?? "https://unknown.invalid/sse"; const candidate = classifyPayload(parsed, "sse", url, { requestType: "eventsource", topic: event.eventName.slice(0, 120) }); candidate.reasons.push(`SSE event: ${event.eventName.slice(0, 120)}`); this.captures.push({ candidate, payload: parsed, sourceUrl: url }); }
  async close(): Promise<void> { await this.cdp?.detach().catch(() => undefined); }
}
const graphqlOperation = (body: string): string | null => { try { const parsed = JSON.parse(body) as { operationName?: unknown }; return typeof parsed.operationName === "string" ? parsed.operationName.slice(0, 120) : null; } catch { return /(?:query|mutation|subscription)\s+(\w+)/.exec(body)?.[1] ?? null; } };
const extractEndpoints = (text: string, base: string): string[] => [...new Set([...text.matchAll(/(?:https?:)?\/\/[^\s"'<>]+|["'](\/(?:api|graphql|v\d+)[^"']*)["']/gi)].map((match) => { try { return new URL(match[1] ?? match[0]!, base).toString(); } catch { return null; } }).filter((value): value is string => Boolean(value)).slice(0, 20))];

export class NetworkDiscoveryEngine {
  private browser?: Browser;
  constructor(private readonly storage?: Pick<PostgresStorage, "saveRawPayload" | "saveNormalizedRecords">, private readonly options = { timeoutMs: 15_000, observeMs: 2_000 }) {}
  async discover(source: RegistryUrl): Promise<DiscoveryReport> {
    this.browser ??= await chromium.launch({ headless: true }); const context = await this.browser.newContext({ userAgent: "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.2; network-discovery)" });
    // A response body can remain open forever (notably on a mislabelled stream).
    // Closing this isolated context is safe and prevents one domain from stalling
    // the bounded domain queue.
    const deadline = setTimeout(() => { void context.close().catch(() => undefined); }, this.options.timeoutMs + this.options.observeMs + 5_000);
    deadline.unref();
    const page = await context.newPage(); const observer = new PageDiscoveryObserver(); await observer.attach(page);
    try { const response = await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: this.options.timeoutMs }); await page.waitForTimeout(this.options.observeMs); const grouped = groupCandidates(observer.captures.map((capture) => capture.candidate)); let rawSaved = 0; let normalizedRecords = 0;
      for (const capture of observer.captures.filter(({ candidate }) => candidate.confidence >= .55 && candidate.category !== "UNKNOWN")) { const records = extractGenericSportsRecords(capture.payload, `network:${source.adapterKey}`, capture.sourceUrl); if (!records.length) continue; const raw = this.raw(source, capture, records.length); await this.storage?.saveRawPayload(raw); rawSaved += Number(Boolean(this.storage)); await this.storage?.saveNormalizedRecords(records.map((record) => normalizeRecord(record))); normalizedRecords += records.length; }
      const loaded = Boolean(response) && response!.status() < 400; const recovered = normalizedRecords > 0; return { domain: source.domain, pageUrl: safeUrl(source.url), loaded, candidates: grouped, rawSaved, normalizedRecords, status: recovered ? "RECOVERED" : loaded ? grouped.some((item) => item.confidence >= .55) ? "NEEDS_OTHER_TECHNIQUE" : "NO_USABLE_FEED" : "PAGE_UNAVAILABLE" };
    } catch (error) { return { domain: source.domain, pageUrl: safeUrl(source.url), loaded: false, candidates: groupCandidates(observer.captures.map((capture) => capture.candidate)), rawSaved: 0, normalizedRecords: 0, status: "PAGE_UNAVAILABLE", error: error instanceof Error ? error.message : String(error) }; }
    finally { clearTimeout(deadline); await observer.close(); await context.close().catch(() => undefined); }
  }
  private raw(source: RegistryUrl, capture: Capture, normalizedRecordCount: number): RawPayloadInput { const candidate = capture.candidate; return sanitizeRawPayload({ sportsbook: `network:${source.domain}`, accountAlias: "network-discovery", sourceType: "network-discovery", sourceUrl: capture.sourceUrl, retrievedAt: candidate.timestamp, providerTimestamp: null, externalEventId: null, parserVersion: "network-discovery-v1", normalizedRecordCount, rawPayload: { method: candidate.method, path: candidate.path, contentType: candidate.contentType, requestType: candidate.requestType, transport: candidate.transport, candidates: candidate.category, confidence: candidate.confidence, reasons: candidate.reasons, detectedFields: candidate.detectedFields, structuralExample: candidate.structuralExample, sizeBytes: candidate.sizeBytes, operationName: candidate.operationName ?? null, body: capture.payload } }); }
  async close(): Promise<void> { await this.browser?.close(); this.browser = undefined; }
}
const groupCandidates = (candidates: DiscoveryCandidate[]): DiscoveryCandidate[] => [...new Map(candidates.map((candidate) => { const key = `${candidate.transport}|${candidate.method}|${candidate.url}|${candidate.category}`; const existing = candidate; existing.frequency = candidates.filter((other) => `${other.transport}|${other.method}|${other.url}|${other.category}` === key).length; return [key, existing] as const; })).values()].sort((a, b) => b.confidence - a.confidence);

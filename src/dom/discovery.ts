import { chromium, type Browser } from "playwright";
import { extractRenderedDom, type DomExtraction, type DomProfile } from "./extractor.js";
import { captureVisibleDom, profileEventCount, revealLazyContent, type DomBrowserOptions } from "./browser.js";
import { normalizeRecord } from "../normalization/normalize.js";
import type { RawPayloadInput } from "../normalization/types.js";
import type { RegistryUrl } from "../sources/registry.js";

export const DOM_DISCOVERY_STATUSES = ["DOM_RECOVERED", "DOM_NO_CURRENT_MARKETS", "DOM_NO_SPORTS_DATA", "DOM_AMBIGUOUS", "NEEDS_ACCESSIBILITY", "NEEDS_VISUAL", "PAGE_UNAVAILABLE"] as const;
export type DomDiscoveryStatus = typeof DOM_DISCOVERY_STATUSES[number];
export type DomDiscoveryReport = { domain: string; pageUrl: string; loaded: boolean; status: DomDiscoveryStatus; extraction: DomExtraction; rawSaved: number; normalizedRecords: number; scrolls: number; profileEventCount: number; error?: string };
type DomStorage = Pick<import("../storage/postgres.js").PostgresStorage, "saveRawPayload" | "saveNormalizedRecords">;

const domRaw = (source: RegistryUrl, report: DomDiscoveryReport): RawPayloadInput => ({
  sportsbook: `dom:${source.domain}`, accountAlias: "rendered-dom", sourceType: "dom-extraction", sourceUrl: source.url,
  retrievedAt: new Date().toISOString(), providerTimestamp: null, externalEventId: null, parserVersion: "rendered-dom-v1", normalizedRecordCount: report.normalizedRecords,
  rawPayload: { status: report.status, sourceUrl: report.pageUrl, parserVersion: "rendered-dom-v1", eventCards: report.extraction.detectedEventCards, visibleOdds: report.extraction.visibleOdds, scrolls: report.scrolls, profileEventCount: report.profileEventCount, candidates: report.extraction.candidates.slice(0, 100).map((candidate) => ({ status: candidate.status, confidence: candidate.confidence, reasons: candidate.reasons, evidence: candidate.evidence.slice(0, 4), record: candidate.record ? { eventName: candidate.record.eventName, market: candidate.record.market, selection: candidate.record.selection, line: candidate.record.line, odds: candidate.record.rawOdds } : null })) }
});

export class RenderedDomDiscoveryEngine {
  private browser?: Browser;
  constructor(private readonly storage?: DomStorage, private readonly options: DomBrowserOptions & { timeoutMs?: number } = {}) {}

  async discover(source: RegistryUrl, profile: DomProfile | null = null): Promise<DomDiscoveryReport> {
    this.browser ??= await chromium.launch({ headless: true });
    const context = await this.browser.newContext({ userAgent: "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.3; rendered-dom)" });
    const page = await context.newPage();
    const timeout = this.options.timeoutMs ?? 20_000;
    try {
      const response = await page.goto(source.url, { waitUntil: "domcontentloaded", timeout });
      await page.waitForTimeout(this.options.renderWaitMs ?? 1_200);
      const scrolls = await revealLazyContent(page, this.options);
      const root = await captureVisibleDom(page, this.options);
      const extraction = extractRenderedDom(root, { sportsbook: `dom:${source.domain}`, sourceUrl: page.url(), defaultSport: source.sports[0] ?? null, profile });
      const profileCount = await profileEventCount(page, profile);
      const loaded = Boolean(response) && response!.status() < 400;
      const valid = extraction.records.length;
      const statuses = new Set(extraction.candidates.map((candidate) => candidate.status));
      const status: DomDiscoveryStatus = !loaded ? "PAGE_UNAVAILABLE" : valid ? "DOM_RECOVERED" : extraction.visibleOdds === 0 && extraction.detectedEventCards === 0 ? "DOM_NO_SPORTS_DATA" : statuses.has("AMBIGUOUS") ? "DOM_AMBIGUOUS" : extraction.detectedEventCards ? "DOM_NO_CURRENT_MARKETS" : "NEEDS_ACCESSIBILITY";
      const report: DomDiscoveryReport = { domain: source.domain, pageUrl: page.url(), loaded, status, extraction, rawSaved: 0, normalizedRecords: valid, scrolls, profileEventCount: profileCount };
      // RAW precedes normalized records. Ambiguous/empty DOM captures remain
      // bounded audit evidence for the next layer; only valid candidates enter
      // event/market/selection/observation tables.
      if (loaded) { await this.storage?.saveRawPayload(domRaw(source, report)); report.rawSaved = Number(Boolean(this.storage)); }
      if (valid) await this.storage?.saveNormalizedRecords(extraction.records.map((record) => normalizeRecord(record)));
      return report;
    } catch (error) {
      return { domain: source.domain, pageUrl: source.url, loaded: false, status: "PAGE_UNAVAILABLE", extraction: { candidates: [], records: [], detectedEventCards: 0, visibleOdds: 0 }, rawSaved: 0, normalizedRecords: 0, scrolls: 0, profileEventCount: 0, error: error instanceof Error ? error.message : String(error) };
    } finally { await context.close().catch(() => undefined); }
  }
  async close(): Promise<void> { await this.browser?.close(); this.browser = undefined; }
}

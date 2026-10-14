import { createHash } from "node:crypto";
import { chromium, type Browser } from "playwright";
import { revealLazyContent } from "../dom/browser.js";
import { normalizeRecord } from "../normalization/normalize.js";
import type { RawPayloadInput } from "../normalization/types.js";
import type { RegistryUrl } from "../sources/registry.js";
import { DEFAULT_ACCESSIBILITY_PROFILE, extractAccessibility, type AccessibilityProfile, type AxExtraction, type AxNode } from "./extractor.js";

export const ACCESSIBILITY_STATUSES = ["ACCESSIBILITY_RECOVERED", "ACCESSIBILITY_PARTIAL", "NO_ACCESSIBILITY_MARKETS", "ACCESSIBILITY_UNAVAILABLE", "VISUAL_COLLECTOR_CANDIDATE"] as const;
export type AccessibilityStatus = typeof ACCESSIBILITY_STATUSES[number];
export type AccessibilityReport = { domain: string; pageUrl: string; loaded: boolean; status: AccessibilityStatus; extraction: AxExtraction; rawSaved: number; normalizedRecords: number; nodeCount: number; scrolls: number; treeHash: string | null; error?: string };
type Storage = Pick<import("../storage/postgres.js").PostgresStorage, "saveRawPayload" | "saveNormalizedRecords">;

const empty = (): AxExtraction => ({ records: [], relevantNodes: 0, eventCandidates: 0, oddsCandidates: 0, excludedIllustrative: 0, evidence: [] });

export function classifyAccessibility(nodes: AxNode[], extraction: AxExtraction, loaded: boolean): AccessibilityStatus {
  if (!loaded || !nodes.some((node) => !node.ignored && node.name)) return "ACCESSIBILITY_UNAVAILABLE";
  if (extraction.records.length) return "ACCESSIBILITY_RECOVERED";
  const visibleNames = nodes.filter((node) => !node.ignored).map((node) => node.name);
  const names = nodes.filter((node) => !node.ignored && ["heading", "columnheader", "button"].includes(node.role)).map((node) => node.name);
  const illustrative = visibleNames.some((name) => /\b(sample (?:betting )?markets|odds (?:shown )?(?:are )?(?:illustrative|indicative)|illustrative (?:markets|odds))\b/i.test(name));
  const liveMarket = names.some((name) => /^(best odds|match winner|moneyline|live odds|current odds)$/i.test(name.trim()));
  if (extraction.oddsCandidates && liveMarket && !illustrative) return "VISUAL_COLLECTOR_CANDIDATE";
  if (extraction.oddsCandidates && extraction.eventCandidates && !illustrative) return "ACCESSIBILITY_PARTIAL";
  return "NO_ACCESSIBILITY_MARKETS";
}

export class AccessibilityDiscoveryEngine {
  private browser?: Browser;
  constructor(private readonly storage?: Storage, private readonly options: { timeoutMs?: number; renderWaitMs?: number; maxScrolls?: number; maxNodes?: number } = {}) {}

  async discover(source: RegistryUrl, profile: AccessibilityProfile = DEFAULT_ACCESSIBILITY_PROFILE): Promise<AccessibilityReport> {
    this.browser ??= await chromium.launch({ headless: true });
    const context = await this.browser.newContext({ userAgent: "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.4; accessibility)" });
    const page = await context.newPage();
    let scrolls = 0;
    try {
      const response = await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: this.options.timeoutMs ?? 20_000 });
      await page.waitForTimeout(this.options.renderWaitMs ?? 1_200);
      scrolls = await revealLazyContent(page, { maxScrolls: this.options.maxScrolls ?? 4 });
      const session = await context.newCDPSession(page);
      await session.send("Accessibility.enable");
      const result = await session.send("Accessibility.getFullAXTree") as { nodes: Array<{ nodeId: string; parentId?: string; childIds?: string[]; role?: { value?: string }; name?: { value?: string }; ignored?: boolean }> };
      await session.detach();
      const maxNodes = Math.max(100, Math.min(this.options.maxNodes ?? 12_000, 25_000));
      const nodes: AxNode[] = result.nodes.slice(0, maxNodes).map((node) => ({ id: node.nodeId, parentId: node.parentId, childIds: node.childIds ?? [], role: node.role?.value ?? "unknown", name: String(node.name?.value ?? "").slice(0, 500), ignored: Boolean(node.ignored) }));
      const pageUrl = page.url();
      const extraction = extractAccessibility(nodes, { sourceUrl: pageUrl, sportsbook: `accessibility:${source.domain}`, sport: source.sports[0] ?? null, profile });
      const loaded = Boolean(response) && response!.status() < 400;
      const status = classifyAccessibility(nodes, extraction, loaded);
      const treeHash = createHash("sha256").update(JSON.stringify(nodes.map((node) => [node.role, node.name, node.ignored]))).digest("hex");
      const report: AccessibilityReport = { domain: source.domain, pageUrl, loaded, status, extraction, rawSaved: 0, normalizedRecords: extraction.records.length, nodeCount: nodes.length, scrolls, treeHash };
      if (loaded && nodes.length) {
        const raw: RawPayloadInput = { sportsbook: `accessibility:${source.domain}`, accountAlias: "accessibility", sourceType: "accessibility-extraction", sourceUrl: source.url, retrievedAt: new Date().toISOString(), parserVersion: profile.version, rawPayload: { status, sourceUrl: pageUrl, parserVersion: profile.version, treeHash, nodeCount: nodes.length, relevantNodes: extraction.relevantNodes, eventCandidates: extraction.eventCandidates, oddsCandidates: extraction.oddsCandidates, excludedIllustrative: extraction.excludedIllustrative, evidence: extraction.evidence }, normalizedRecordCount: extraction.records.length };
        await this.storage?.saveRawPayload(raw);
        report.rawSaved = Number(Boolean(this.storage));
      }
      if (extraction.records.length) await this.storage?.saveNormalizedRecords(extraction.records.map((record) => normalizeRecord(record)));
      return report;
    } catch (error) {
      return { domain: source.domain, pageUrl: source.url, loaded: false, status: "ACCESSIBILITY_UNAVAILABLE", extraction: empty(), rawSaved: 0, normalizedRecords: 0, nodeCount: 0, scrolls, treeHash: null, error: error instanceof Error ? error.message : String(error) };
    } finally { await context.close().catch(() => undefined); }
  }
  async close(): Promise<void> { await this.browser?.close(); this.browser = undefined; }
}

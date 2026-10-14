import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, unlink } from "node:fs/promises";
import { chromium, type Browser } from "playwright";
import { revealLazyContent } from "../dom/browser.js";
import { normalizeRecord } from "../normalization/normalize.js";
import type { NormalizedRecord, RawPayloadInput } from "../normalization/types.js";
import type { RegistryUrl } from "../sources/registry.js";
import { captureActionBoard } from "./browser.js";
import { ACTION_PROFILE, extractActionBoard, type VisualExtraction, type VisualProfile } from "./extractor.js";

export const VISUAL_STATUSES = ["VISUAL_RECOVERED", "VISUAL_PARTIAL", "NO_VISUAL_MARKETS", "VISUAL_BLOCKED", "VISUAL_UNRESOLVED"] as const;
export type VisualStatus = typeof VISUAL_STATUSES[number];
export type VisualReport = { domain: string; pageUrl: string; loaded: boolean; status: VisualStatus; pages: number; screenshotRegions: number; screenshotHashes: string[]; scrolls: number; boardHash: string | null; extraction: VisualExtraction; rawSaved: number; error?: string };
type Storage = { saveRawPayload(payload: RawPayloadInput): Promise<void>; saveNormalizedRecords(records: NormalizedRecord[]): Promise<void> };
const empty = (): VisualExtraction => ({ records: [], candidates: [], eventRegions: 0, marketRegions: 0, selectionCandidates: 0, oddsCandidates: 0, completeMarkets: 0, accepted: 0, rejected: 0, primaryRejection: null });

export class VisualDiscoveryEngine {
  private browser?: Browser;
  constructor(private readonly storage: Storage, private readonly options: { timeoutMs?: number; renderWaitMs?: number; evidenceDir?: string } = {}) {}
  async discover(source: RegistryUrl, profile: VisualProfile = ACTION_PROFILE): Promise<VisualReport> {
    this.browser ??= await chromium.launch({ headless: true });
    const context = await this.browser.newContext({ viewport: { width: profile.viewportWidth, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const base: VisualReport = { domain: source.domain, pageUrl: source.url, loaded: false, status: "VISUAL_BLOCKED", pages: 1, screenshotRegions: 0, screenshotHashes: [], scrolls: 0, boardHash: null, extraction: empty(), rawSaved: 0 };
    try {
      const response = await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: this.options.timeoutMs ?? 25_000 });
      await page.waitForTimeout(this.options.renderWaitMs ?? 1_500);
      base.pageUrl = page.url();
      const httpStatus = response?.status() ?? 0;
      const challenge = /just a moment|performing security verification|cf-chl-/i.test((await page.locator("body").innerText()).slice(0, 1_000));
      if (httpStatus >= 400 || challenge) {
        base.error = challenge ? `Browser security verification (HTTP ${httpStatus})` : `HTTP ${httpStatus}`;
        base.status = "VISUAL_BLOCKED";
        await this.captureScreenshots(page, base, 0);
        base.boardHash = createHash("sha256").update(`${base.pageUrl}|${httpStatus}|${challenge}`).digest("hex");
        await this.storage.saveRawPayload({ sportsbook: `visual:${source.domain}`, accountAlias: "visual", sourceType: "visual-extraction", sourceUrl: source.url, retrievedAt: new Date().toISOString(), parserVersion: profile.version, rawPayload: { status: base.status, sourceUrl: base.pageUrl, boardHash: base.boardHash, screenshotHashes: base.screenshotHashes, viewport: { width: profile.viewportWidth, height: 900 }, excerpt: base.error }, normalizedRecordCount: 0 });
        base.rawSaved = 1;
      } else if (source.domain.replace(/^www\./, "") === "actionnetwork.com") {
        base.loaded = true;
        const consentClose = page.locator('#onetrust-banner-sdk button[aria-label="Close"]');
        if (await consentClose.isVisible().catch(() => false)) await consentClose.click();
        const marketSelect = page.locator("select").filter({ has: page.locator(`option[value="${profile.marketSelectValue}"]`) });
        if (await marketSelect.count() === 1) await marketSelect.selectOption(profile.marketSelectValue);
        await page.waitForTimeout(800);
        base.scrolls = await revealLazyContent(page, { maxScrolls: profile.maxScrolls });
        await page.evaluate(() => scrollTo(0, 0));
        const board = await captureActionBoard(page);
        base.boardHash = createHash("sha256").update(JSON.stringify(board)).digest("hex");
        base.extraction = extractActionBoard(board, profile);
        base.status = base.extraction.accepted ? "VISUAL_RECOVERED" : board.rows.length ? "VISUAL_UNRESOLVED" : "NO_VISUAL_MARKETS";
        await this.captureScreenshots(page, base, Math.min(2, board.rows.length));
        await this.storage.saveRawPayload({ sportsbook: `visual:${source.domain}`, accountAlias: "visual", sourceType: "visual-extraction", sourceUrl: source.url, retrievedAt: new Date().toISOString(), parserVersion: profile.version, normalizedRecordCount: base.extraction.accepted, rawPayload: { status: base.status, sourceUrl: base.pageUrl, boardHash: base.boardHash, viewport: board.viewport, market: board.market, eventRegions: base.extraction.eventRegions, marketRegions: base.extraction.marketRegions, selectionCandidates: base.extraction.selectionCandidates, oddsCandidates: base.extraction.oddsCandidates, completeMarkets: base.extraction.completeMarkets, accepted: base.extraction.accepted, rejected: base.extraction.rejected, primaryRejection: base.extraction.primaryRejection, screenshotHashes: base.screenshotHashes, candidates: base.extraction.candidates } });
        base.rawSaved = 1;
        if (base.extraction.records.length) await this.storage.saveNormalizedRecords(base.extraction.records.map((record) => normalizeRecord(record)));
      } else {
        base.loaded = true;
        base.scrolls = await revealLazyContent(page, { maxScrolls: 2 });
        const body = (await page.locator("body").innerText()).slice(0, 10_000);
        base.status = /(?:betting odds|match winner|moneyline)/i.test(body) ? "VISUAL_UNRESOLVED" : "NO_VISUAL_MARKETS";
        await this.captureScreenshots(page, base, 1);
        base.boardHash = createHash("sha256").update(body).digest("hex");
        await this.storage.saveRawPayload({ sportsbook: `visual:${source.domain}`, accountAlias: "visual", sourceType: "visual-extraction", sourceUrl: source.url, retrievedAt: new Date().toISOString(), parserVersion: profile.version, rawPayload: { status: base.status, sourceUrl: base.pageUrl, boardHash: base.boardHash, screenshotHashes: base.screenshotHashes, viewport: { width: profile.viewportWidth, height: 900 }, excerpt: body.slice(0, 500) }, normalizedRecordCount: 0 });
        base.rawSaved = 1;
      }
      return base;
    } catch (error) { base.error = error instanceof Error ? error.message : String(error); return base; }
    finally { await context.close().catch(() => undefined); }
  }
  private async captureScreenshots(page: import("playwright").Page, report: VisualReport, eventCount: number): Promise<void> {
    const dir = this.options.evidenceDir ?? ".audit/visual";
    await mkdir(dir, { recursive: true });
    for (const name of await readdir(dir)) {
      if (!name.endsWith(".png")) continue;
      const path = `${dir}/${name}`;
      if (Date.now() - (await stat(path)).mtimeMs > 7 * 86_400_000) await unlink(path);
    }
    if (!eventCount) {
      const path = `${dir}/${report.domain.replace(/[^a-z0-9.-]/gi, "-")}-status.png`;
      await page.screenshot({ path });
      report.screenshotHashes.push(createHash("sha256").update(await readFile(path)).digest("hex"));
      report.screenshotRegions++;
      return;
    }
    const rows = page.locator("table").filter({ has: page.locator("thead th", { hasText: "SCHEDULED" }) }).first().locator("tbody tr").filter({ has: page.locator('a[href*="-game/"]') });
    for (let index = 0; index < Math.min(eventCount, await rows.count()); index++) {
      const path = `${dir}/${report.domain.replace(/[^a-z0-9.-]/gi, "-")}-event-${index + 1}.png`;
      await rows.nth(index).screenshot({ path });
      report.screenshotHashes.push(createHash("sha256").update(await readFile(path)).digest("hex"));
      report.screenshotRegions++;
    }
  }
  async close(): Promise<void> { await this.browser?.close(); this.browser = undefined; }
}

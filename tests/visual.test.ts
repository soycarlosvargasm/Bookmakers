import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { captureActionBoard, prepareActionBoard } from "../src/visual/browser.js";
import { sanitizeRawPayload } from "../src/collectors/raw-policy.js";
import { ACTION_PROFILE, INSPECTION_PROFILE, extractActionBoard, parseVisualProfile, recognizeOdds, type VisualBoard } from "../src/visual/extractor.js";

test("recovered visual navigation selects Moneyline automatically before capture", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<select><option value="spread" selected>Spread</option><option value="ml">Moneyline</option></select>');
    await prepareActionBoard(page);
    assert.equal(await page.locator("select").inputValue(), "ml");
    assert.equal((await captureActionBoard(page)).market, "Moneyline");
  } finally { await browser.close(); }
});

const box = (x: number, y: number, width = 80, height = 30) => ({ x, y, width, height });
const board = (): VisualBoard => ({
  pageUrl: "https://www.actionnetwork.com/nfl/odds", viewport: { width: 1440, height: 900 }, market: "Moneyline",
  headers: [{ label: "FanDuel NJ logo", box: box(400, 100), cell: box(397, 90, 86, 45), column: 3 }, { label: "BetMGM NJ logo", box: box(486, 100), cell: box(483, 90, 86, 45), column: 4 }],
  rows: [{ box: box(44, 135, 525, 105), eventHref: "/nfl-game/falcons-packers-score-odds-september-24-2026/290873", teams: [
    { name: { text: "Falcons", box: box(90, 150, 80, 20) }, iconLabel: "Falcons Team Icon", box: box(56, 148, 110, 25) },
    { name: { text: "Packers", box: box(90, 199, 80, 20) }, iconLabel: "Packers Team Icon", box: box(56, 197, 110, 25) }
  ], cells: [
    { box: box(397, 135, 86, 105), column: 3, prices: [{ text: "+210", box: box(400, 153, 80, 14) }, { text: "-260", box: box(400, 202, 80, 14) }] },
    { box: box(483, 135, 86, 105), column: 4, prices: [{ text: "+205", box: box(486, 153, 80, 14) }, { text: "-250", box: box(486, 202, 80, 14) }] }
  ] }]
});

test("visual geometry ties both selection rows to their named sportsbook columns", () => {
  const result = extractActionBoard(board(), ACTION_PROFILE, "2026-09-24T12:00:00Z");
  assert.equal(result.completeMarkets, 2);
  assert.equal(result.accepted, 4);
  assert.deepEqual(result.records.map((r) => [r.sportsbook, r.selection, r.rawOdds]), [["actionnetwork-fanduel", "Falcons", "+210"], ["actionnetwork-fanduel", "Packers", "-260"], ["actionnetwork-betmgm", "Falcons", "+205"], ["actionnetwork-betmgm", "Packers", "-250"]]);
  assert.equal(result.records[0]?.qualifiers?.observedVia, "visual-collector");
});

test("ambiguous price row or column cannot produce an observation", () => {
  const shifted = board(); shifted.rows[0]!.cells[0]!.prices[1]!.box.y = 160;
  shifted.rows[0]!.cells[1]!.box.x = 700;
  const result = extractActionBoard(shifted);
  assert.equal(result.accepted, 0); assert.equal(result.rejected, 2);
  assert.deepEqual(result.candidates.map((c) => c.reason), ["price and participant rows do not align", "missing or ambiguous sportsbook column"]);
});

test("odds recognition supports three formats without treating bare numbers as prices", () => {
  assert.equal(recognizeOdds("+120")?.decimal, 2.2);
  assert.equal(recognizeOdds("-110")?.format, "american");
  assert.equal(recognizeOdds("1.85")?.format, "decimal");
  assert.equal(recognizeOdds("5/2")?.decimal, 3.5);
  assert.equal(recognizeOdds("2026"), null);
  assert.equal(recognizeOdds("301"), null);
});

test("visual profiles enforce a conservative threshold", () => {
  assert.deepEqual(parseVisualProfile(ACTION_PROFILE), ACTION_PROFILE);
  assert.deepEqual(parseVisualProfile(INSPECTION_PROFILE), INSPECTION_PROFILE);
  assert.equal(parseVisualProfile({ ...ACTION_PROFILE, minConfidence: 0.5 }), null);
});

test("repeated board preserves identities and bounded RAW evidence for deduplication", () => {
  const a = extractActionBoard(board(), ACTION_PROFILE, "2026-09-24T12:00:00Z");
  const b = extractActionBoard(board(), ACTION_PROFILE, "2026-09-24T12:05:00Z");
  assert.deepEqual(a.records.map((r) => [r.sportsbook, r.sourceEventId, r.sourceMarketId, r.sourceSelectionId]), b.records.map((r) => [r.sportsbook, r.sourceEventId, r.sourceMarketId, r.sourceSelectionId]));
  const raw = sanitizeRawPayload({ sportsbook: "visual:www.actionnetwork.com", accountAlias: "visual", sourceType: "visual-extraction", sourceUrl: "https://www.actionnetwork.com/nfl/odds", parserVersion: ACTION_PROFILE.version, rawPayload: { status: "VISUAL_RECOVERED", boardHash: "abc", candidates: a.candidates, secret: "must not persist" } });
  assert.equal((raw.rawPayload as { capturePolicy: string }).capturePolicy, "visual-evidence-v1");
  assert.equal(JSON.stringify(raw.rawPayload).includes("must not persist"), false);
});

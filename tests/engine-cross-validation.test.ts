import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { AcquisitionOrchestrator } from "../src/engine/orchestrator.js";
import { EngineStorage } from "../src/engine/storage.js";
import { DomHandler } from "../src/engine/handlers.js";
import { compareAcquisitionLayers } from "../src/engine/cross-validation.js";
import type { AcquisitionMethod, Handler } from "../src/engine/types.js";
import type { ProviderRecord } from "../src/normalization/types.js";

const quote: ProviderRecord = { sportsbook: "local-test", eventName: "Alpha FC vs Beta FC", participants: ["Alpha FC", "Beta FC"], market: "Moneyline", selection: "Alpha FC", decimalOdds: 1.85, rawOdds: "1.85", rawOddsFormat: "decimal" };

test("Capa 6 confirms event, market, selection and odds; disagreement remains a conflict", () => {
  const result = compareAcquisitionLayers({ method: "network", records: [quote] }, [
    { method: "dom", records: [{ ...quote, market: "Winner" }] },
    { method: "accessibility", records: [{ ...quote, decimalOdds: 1.95 }] }
  ]);
  assert.equal(result.quotes[0]?.status, "CONFLICT");
  assert.deepEqual(result.quotes[0]?.matchingLayers, ["dom"]);
  assert.deepEqual(result.quotes[0]?.conflictingLayers, ["accessibility"]);
  assert.equal(compareAcquisitionLayers({ method: "visual", records: [quote] }, [{ method: "dom", records: [quote] }]).confirmed, 1);
});

test("conflicting network prices stay in rejected RAW and the cascade recovers confirmed DOM prices", { timeout: 20_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "cross-layer-conflict-"));
  const browser = await chromium.launch({ headless: true });
  try {
    const browserContext = await browser.newContext();
    const page = await browserContext.newPage();
    const html = '<main><section role="group" aria-label="Alpha FC vs Beta FC"><h2>Alpha FC vs Beta FC</h2><section role="group" aria-label="Moneyline"><h3>Moneyline</h3><button>Alpha FC 1.95</button><button>Beta FC 2.10</button></section></section></main>';
    await page.goto('data:text/html,' + encodeURIComponent(html));
    const source = { type: "local-test", url: "https://sports.example/odds" };
    const calls: AcquisitionMethod[] = [];
    const handlers: Handler[] = (["http", "network", "dom", "accessibility", "visual"] as AcquisitionMethod[]).map(method => ({ method, async run(context) {
      calls.push(method);
      if (method === "dom") return new DomHandler().run(context);
      if (method !== "network") return { kind: "miss", reason: "fixture" };
      context.page = page; context.browser = browser; context.browserContext = browserContext;
      return { kind: "data", records: [quote], evidence: { url: source.url, transport: "fetch", payload: {}, capturedAt: new Date().toISOString() } };
    } }));
    const outcome = await new AcquisitionOrchestrator({ handlers, storage: new EngineStorage(root) }).run(source);
    assert.equal(outcome.status, "SUCCEEDED");
    assert.deepEqual(calls, ["http", "network", "dom"]);
    if (outcome.status !== "SUCCEEDED") return;
    assert.equal(outcome.method, "dom");
    assert.equal(outcome.records.find(r => r.selection === "Alpha FC")?.decimalOdds, 1.95);
    const rejectedPath = (await readdir(join(root, "raw"))).find(path => path.endsWith("-network.json"));
    assert.ok(rejectedPath);
    const rejected = JSON.parse(await readFile(join(root, "raw", rejectedPath), "utf8"));
    assert.equal(rejected.recordCount, 0);
    assert.deepEqual(rejected.evidence.payload.records, []);
    assert.equal(rejected.evidence.payload.rejectedRecords[0].decimalOdds, 1.85);
    assert.equal(rejected.evidence.payload.crossValidation.conflicting, 1);
  } finally { await browser.close(); await rm(root, { recursive: true, force: true }); }
});

test("different event, book, market, period, line, start or outcome does not confirm an OCR quote", () => {
  for (const change of [
    { participants: ["Gamma FC", "Beta FC"] }, { sportsbook: "other-book" }, { market: "Total" },
    { marketPeriod: "1H" }, { line: "2.5" }, { eventStartTime: "2026-10-08T00:00:00Z" }, { selection: "Beta FC" }
  ]) {
    const result = compareAcquisitionLayers({ method: "visual", records: [quote] }, [{ method: "dom", records: [{ ...quote, ...change }] }]);
    assert.equal(result.quotes[0]?.status, "UNCONFIRMED");
  }
  assert.equal(compareAcquisitionLayers({ method: "network", records: [quote] }, []).unconfirmed, 1);
  assert.equal(compareAcquisitionLayers({ method: "visual", records: [quote] }, [{ method: "visual", records: [quote] }]).confirmed, 0);
});

test("one matching price cannot hide a contradictory duplicate", () => {
  const result = compareAcquisitionLayers({ method: "network", records: [quote] }, [{ method: "dom", records: [quote, { ...quote, decimalOdds: 1.95 }] }]);
  assert.equal(result.quotes[0]?.status, "CONFLICT");
});

test("network success reuses DOM and accessibility readers for Capa 6 without calling visual", { timeout: 20_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "cross-layer-"));
  const browser = await chromium.launch({ headless: true });
  try {
    const browserContext = await browser.newContext();
    const page = await browserContext.newPage();
    await page.setContent('<main><section role="group" aria-label="Alpha FC vs Beta FC"><h2>Alpha FC vs Beta FC</h2><section role="group" aria-label="Moneyline"><h3>Moneyline</h3><button>Alpha FC 1.85</button><button>Beta FC 2.10</button></section></section></main>');
    // setContent has no public source; the data URL keeps navigate() from navigating.
    await page.goto('data:text/html,' + encodeURIComponent(await page.content()));
    const source = { type: "local-test", url: "https://sports.example/odds" };
    const calls: AcquisitionMethod[] = [];
    const handlers: Handler[] = (["http", "network", "dom", "accessibility", "visual"] as AcquisitionMethod[]).map(method => ({ method, async run(context) {
      calls.push(method);
      if (method !== "network") return { kind: "miss", reason: "fixture" };
      context.page = page; context.browser = browser; context.browserContext = browserContext;
      return { kind: "data", records: [quote], evidence: { url: source.url, transport: "fetch", payload: {}, capturedAt: new Date().toISOString() } };
    } }));
    const outcome = await new AcquisitionOrchestrator({ handlers, storage: new EngineStorage(root) }).run(source);
    assert.equal(outcome.status, "SUCCEEDED");
    assert.deepEqual(calls, ["http", "network"]);
    if (outcome.status !== "SUCCEEDED") return;
    const raw = JSON.parse(await readFile(outcome.rawPath, "utf8"));
    assert.equal(raw.evidence.payload.crossValidation.confirmed, 1);
    assert.deepEqual(raw.evidence.payload.crossValidation.quotes[0].matchingLayers.sort(), ["accessibility", "dom"]);
    assert.equal(outcome.records[0]?.qualifiers?.crossValidation, "CONFIRMED");
  } finally { await browser.close(); await rm(root, { recursive: true, force: true }); }
});

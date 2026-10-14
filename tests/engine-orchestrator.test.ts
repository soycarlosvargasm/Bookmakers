import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import test from "node:test";
import { AcquisitionOrchestrator } from "../src/engine/orchestrator.js";
import { EngineStorage } from "../src/engine/storage.js";
import type { AcquisitionMethod, Handler, HandlerResult, Source } from "../src/engine/types.js";

const methods: AcquisitionMethod[] = ["http", "network", "dom", "accessibility", "visual"];
const source: Source = { url: "https://sports.example/odds", type: "sportsbook" };
const handler = (method: AcquisitionMethod, result: HandlerResult, calls: AcquisitionMethod[]): Handler => ({
  method,
  async run() { calls.push(method); return result; }
});
const miss: HandlerResult = { kind: "miss", reason: "No records" };

test("Group A HTTP challenges fall through to Chromium without a human HTTP confirmation", async () => {
  for (const type of ["retabet-pe", "bet9ja", "10cric"]) {
    const root = await mkdtemp(join(tmpdir(), "engine-group-a-"));
    try {
      const calls: AcquisitionMethod[] = [];
      const handlers: Handler[] = methods.map(method => handler(method, method === "http"
        ? { kind: "challenge", reason: "Challenge content (HTTP 403)", url: source.url }
        : method === "network" ? { kind: "data", records: [{ eventName: "A vs B", market: "Winner", selection: "A", decimalOdds: 1.8 }],
          evidence: { url: source.url, transport: "fetch", payload: {}, capturedAt: new Date().toISOString() } } : miss, calls));
      const outcome = await new AcquisitionOrchestrator({ storage: new EngineStorage(root), handlers, onHumanIntervention() { assert.fail("A Node HTTP challenge is not an interactive browser challenge"); } }).run({ ...source, type });
      assert.equal(outcome.status, "SUCCEEDED");
      assert.deepEqual(calls, ["http", "network"]);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

for (const forceBrowser of [false, true]) {
  test(`visual memory keeps OCR last (forceBrowser=${forceBrowser})`, async () => {
    const root = await mkdtemp(join(tmpdir(), "engine-ocr-order-"));
    try {
      const storage = new EngineStorage(root);
      await storage.memory.recordSuccess(source, "visual");
      const calls: AcquisitionMethod[] = [];
      const handlers = methods.map(method => handler(method, method === "visual" ? {
        kind: "data", records: [{ eventName: "A vs B", market: "Winner", selection: "A", rawOdds: "1.8" }],
        evidence: { url: source.url, transport: "visual", payload: {}, capturedAt: new Date().toISOString() }
      } : miss, calls));
      const outcome = await new AcquisitionOrchestrator({ storage, handlers, forceBrowser }).run(source);
      assert.equal(outcome.status, "SUCCEEDED");
      assert.deepEqual(calls, forceBrowser ? methods.slice(1) : methods);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

for (const successful of methods.filter(method => method !== "visual")) {
  test(`successful ${successful} never calls OCR even with visual memory`, async () => {
    const root = await mkdtemp(join(tmpdir(), "engine-no-ocr-"));
    try {
      const storage = new EngineStorage(root);
      await storage.memory.recordSuccess(source, "visual");
      const calls: AcquisitionMethod[] = [];
      const handlers = methods.map(method => handler(method, method === successful ? {
        kind: "data", records: [{ eventName: "A vs B", market: "Winner", selection: "A", rawOdds: "1.8" }],
        evidence: { url: source.url, transport: method, payload: {}, capturedAt: new Date().toISOString() }
      } : miss, calls));
      assert.equal((await new AcquisitionOrchestrator({ storage, handlers }).run(source)).status, "SUCCEEDED");
      assert.deepEqual(calls, methods.slice(0, methods.indexOf(successful) + 1));
      assert.ok(!calls.includes("visual"));
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

test("the cascade saves validated RAW and remembers the method that worked", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-"));
  try {
    const calls: AcquisitionMethod[] = [];
    const handlers = methods.map((method) => handler(method, method === "dom" ? {
      kind: "data",
      records: [{ eventName: "A vs B", market: "Winner", selection: "A", rawOdds: "1.80", decimalOdds: 1.8 }],
      evidence: { url: source.url, transport: "dom", capturedAt: new Date().toISOString(), payload: { odds: 1.8, authorization: "private" } }
    } : miss, calls));
    const storage = new EngineStorage(root);
    const outcome = await new AcquisitionOrchestrator({ storage, handlers }).run(source);
    assert.equal(outcome.status, "SUCCEEDED");
    assert.deepEqual(calls, ["http", "network", "dom"]);
    if (outcome.status !== "SUCCEEDED") return;
    assert.equal(outcome.method, "dom");
    assert.equal((await storage.readMemory(source))?.method, "dom");
    const raw = JSON.parse(await readFile(outcome.rawPath, "utf8")) as { evidence: { payload: Record<string, unknown> } };
    assert.equal(raw.evidence.payload.odds, 1.8);
    assert.equal(raw.evidence.payload.authorization, undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("invalid extraction advances through the cascade and returns controlled failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-"));
  try {
    const calls: AcquisitionMethod[] = [];
    const incomplete: HandlerResult = { kind: "data", records: [{ eventName: "A vs B" }], evidence: { url: source.url, transport: "http", payload: {}, capturedAt: new Date().toISOString() } };
    const handlers = methods.map((method) => handler(method, method === "http" ? incomplete : miss, calls));
    const result = await new AcquisitionOrchestrator({ storage: new EngineStorage(root), handlers }).run(source);
    assert.equal(result.status, "FAILED");
    assert.deepEqual(calls, methods);
    if (result.status === "FAILED") assert.equal(result.attempts[0]?.reason, "Validation rejected incomplete records");
    const [folder] = await readdir(join(root, "raw"));
    assert.ok(folder?.endsWith("-failure"));
    assert.deepEqual((await readdir(join(root, "raw", folder!))).sort(), ["accessibility.json", "context.json", "network.json", "page.html", "page.png"]);
    assert.equal(await readFile(join(root, "raw", folder!, "page.html"), "utf8"), "null");
    assert.equal(await readFile(join(root, "raw", folder!, "page.png"), "utf8"), "null");
    assert.deepEqual(JSON.parse(await readFile(join(root, "raw", folder!, "network.json"), "utf8")), []);
    const diagnostic = JSON.parse(await readFile(join(root, "raw", folder!, "context.json"), "utf8"));
    assert.equal(diagnostic.lastHandler, "visual");
    assert.match(diagnostic.unavailable["page.html"], /never opened/);
    assert.match(diagnostic.unavailable["network.json"], /did not run/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("direct HTTP JSON reaches extraction, validation, RAW and source memory", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-"));
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ events: [{ id: "event-1", name: "A vs B", sport: "football", markets: [{ id: "market-1", name: "Winner", selections: [{ id: "selection-1", name: "A", odds: 1.8 }] }] }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const liveSource = { url: `http://127.0.0.1:${address.port}/odds`, type: "sportsbook" };
    const storage = new EngineStorage(root);
    const outcome = await new AcquisitionOrchestrator({ storage }).run(liveSource);
    assert.equal(outcome.status, "SUCCEEDED");
    if (outcome.status !== "SUCCEEDED") return;
    assert.equal(outcome.method, "http");
    assert.equal(outcome.records[0]?.sourceEventId, "event-1");
    assert.equal((await storage.readMemory(liveSource))?.method, "http");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(root, { recursive: true, force: true });
  }
});

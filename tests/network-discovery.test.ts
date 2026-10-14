import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { NetworkDiscoveryEngine, classifyPayload, extractGenericSportsRecords } from "../src/network/discovery.js";

const payload = { sport: "Football", events: [{ eventId: "e1", eventName: "Alpha vs Beta", home: "Alpha", away: "Beta", startTime: "2026-10-01T12:00:00Z", markets: [{ marketId: "m1", name: "Moneyline", selections: [{ selectionId: "s1", name: "Alpha", odds: 1.85 }, { selectionId: "s2", name: "Beta", odds: 2.1 }] }] }] };

test("network discovery classifies an observed sports feed and emits verified generic records", () => {
  const candidate = classifyPayload(payload, "fetch", "https://example.test/api/markets");
  assert.equal(candidate.category, "ODDS_FEED");
  assert.ok(candidate.confidence >= .55);
  const rows = extractGenericSportsRecords(payload, "network:example", "https://example.test/api/markets");
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.sourceEventId, "e1");
  assert.equal(rows[0]?.decimalOdds, 1.85);
});

test("network discovery observes fetch traffic, saves bounded RAW and normalizes only complete records", async () => {
  const savedRaw: unknown[] = []; const savedRows: unknown[] = [];
  const server = createServer((request, response) => {
    if (request.url === "/feed") { response.setHeader("content-type", "application/json"); response.end(JSON.stringify(payload)); return; }
    response.setHeader("content-type", "text/html"); response.end('<script>fetch("/feed")</script>');
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve)); const address = server.address(); if (!address || typeof address === "string") throw new Error("no address");
  const base = `http://127.0.0.1:${address.port}`; const engine = new NetworkDiscoveryEngine({ async saveRawPayload(value) { savedRaw.push(value); }, async saveNormalizedRecords(value) { savedRows.push(...value); } }, { timeoutMs: 5_000, observeMs: 300 });
  try {
    const report = await engine.discover({ id: 1, url: base, domain: "127.0.0.1", adapterKey: "local", sports: ["Football"], sourceNames: ["Local"] });
    assert.equal(report.status, "RECOVERED"); assert.equal(report.normalizedRecords, 2); assert.equal(savedRaw.length, 1); assert.equal(savedRows.length, 2);
  } finally { await engine.close(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});

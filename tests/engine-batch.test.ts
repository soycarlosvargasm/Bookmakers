import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { catalogSources, runBatch } from "../src/batch.js";
import type { CatalogRow } from "../src/sources/registry.js";

test("batch reads distinct catalogue URLs in first-occurrence order and keeps BFO's engine type", () => {
  const row: CatalogRow = { sport: "MMA", sourceName: "BestFightOdds", sourceKind: "Agregador", catalogStatus: "ACTIVA", url: "https://www.bestfightodds.com/", domain: "www.bestfightodds.com", adapterKey: "bestfightodds-com" };
  const other = { ...row, url: "https://oddspedia.com/football/odds", domain: "oddspedia.com" };
  assert.deepEqual(catalogSources([row, other, { ...row, sport: "Boxeo" }]), [
    { url: row.url, type: "bestfightodds" }, { url: other.url, type: "oddspedia" }
  ]);
});

test("batch is sequential, continues after failure and pause, enforces the global timeout and saves its summary", async () => {
  const root = await mkdtemp(join(tmpdir(), "engine-batch-"));
  const arrivals: Array<{ url: string; at: number }> = [];
  const server = createServer((request, response) => {
    arrivals.push({ url: request.url!, at: Date.now() });
    if (request.url === "/slow") return;
    if (request.url === "/challenge") {
      response.writeHead(403, { "content-type": "text/html" });
      response.end("Verify you are human. Security verification required.");
    } else {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ events: [{ id: "event-1", name: "A vs B", markets: [{ id: "market-1", name: "Winner", selections: [{ id: "selection-1", name: "A", odds: 1.8 }] }] }] }));
    }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    const sources = ["/success", "invalid-url", "/challenge", "/slow", "/after"].map(url => ({ url: url.startsWith("/") ? base + url : url, type: "batch-test" }));
    const logs: string[] = [];
    const { summary, path } = await runBatch(sources, { dataDir: root, timeoutMs: 2_000, delayMs: 50, log: line => logs.push(line) });
    assert.deepEqual(summary.results.map(r => r.status), ["SUCCEEDED", "FAILED", "PAUSED", "FAILED", "SUCCEEDED"]);
    assert.deepEqual(summary.totals, { attempted: 5, succeeded: 2, failed: 2, paused: 1, totalRecords: 2 });
    assert.match(summary.results[3]!.reason!, /Global source timeout after 2000 ms/);
    assert.ok(summary.results[3]!.durationMs >= 2_000);
    assert.deepEqual(arrivals.map(a => a.url), ["/success", "/challenge", "/slow", "/after"]);
    assert.ok(arrivals[3]!.at - arrivals[2]!.at >= 1_500);
    assert.ok(summary.durationMs >= summary.results.reduce((sum, r) => sum + r.durationMs, 0) + 4 * 50);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), summary);
    assert.ok(logs.some(line => line.includes("Attempted: 5")));
    const memoryFiles = await import("node:fs/promises").then(fs => fs.readdir(join(root, "memory")));
    const memories = await Promise.all(memoryFiles.map(file => readFile(join(root, "memory", file), "utf8").then(JSON.parse)));
    const challenge = memories.find(memory => memory.source.url === base + "/challenge");
    assert.equal(challenge.requiresHumanIntervention, true);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(root, { recursive: true, force: true });
  }
});

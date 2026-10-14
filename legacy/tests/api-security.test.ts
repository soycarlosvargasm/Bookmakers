import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildServer } from "../src/api/server.js";
import { redactSecrets } from "../src/health/logger.js";
import { AppendOnlyOddsHistory } from "../src/normalization/deduplication.js";
import { normalizeRecord } from "../src/normalization/normalize.js";
import { SessionManager } from "../src/sessions/manager.js";

const record = normalizeRecord({
  sportsbook: "example", sport: "football", competition: "league", eventName: "Home v Away",
  sourceEventId: "event-1", market: "moneyline", marketPeriod: "full-game", selection: "Home",
  rawOdds: "+120", rawOddsFormat: "american", sourceUrl: "https://example.test/odds?token=hidden&market=1"
}, "2026-09-12T00:00:00.000Z");

test("API authentication rejects missing and invalid keys and accepts the local API key", async () => {
  const history = new AppendOnlyOddsHistory();
  history.record(record);
  const app = buildServer({ apiKey: "local-test-key", history });
  assert.equal((await app.inject({ method: "GET", url: "/health" })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: "/health", headers: { "x-api-key": "wrong" } })).statusCode, 401);
  const response = await app.inject({ method: "GET", url: "/events", headers: { "x-api-key": "local-test-key" } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json()[0].id, "event-1");
  const historyResponse = await app.inject({ method: "GET", url: "/odds/history", headers: { "x-api-key": "local-test-key" } });
  assert.equal(historyResponse.json()[0].sourceUrl.includes("hidden"), false);
  await app.close();
});

test("API returns 400 for invalid pagination and does not expose session routes", async () => {
  const app = buildServer({ apiKey: "local-test-key" });
  const headers = { "x-api-key": "local-test-key" };
  assert.equal((await app.inject({ method: "GET", url: "/events?limit=zero", headers })).statusCode, 400);
  assert.equal((await app.inject({ method: "GET", url: "/v1/sessions/book/personal", headers })).statusCode, 404);
  await app.close();
});

test("secret redaction removes secret-shaped fields and bearer values", () => {
  const result = redactSecrets({ password: "hidden", nested: { access_token: "hidden" }, authorization: "Bearer secret-value", normal: "ok" }) as Record<string, unknown>;
  assert.equal(result.password, "[REDACTED]");
  assert.deepEqual(result.nested, { access_token: "[REDACTED]" });
  assert.equal(result.authorization, "[REDACTED]");
  assert.equal(result.normal, "ok");
});

test("session storage is isolated by sportsbook and account alias", async () => {
  const root = await mkdtemp(join(tmpdir(), "sportsbook-session-isolation-"));
  try {
    const sessions = new SessionManager(root);
    await sessions.saveStorageState("book-a", "personal", { cookies: [{ name: "a" }] });
    await sessions.saveStorageState("book-b", "personal", { cookies: [{ name: "b" }] });
    assert.deepEqual(JSON.parse(await readFile(sessions.storageStatePath("book-a", "personal"), "utf8")), { cookies: [{ name: "a" }] });
    assert.deepEqual(JSON.parse(await readFile(sessions.storageStatePath("book-b", "personal"), "utf8")), { cookies: [{ name: "b" }] });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

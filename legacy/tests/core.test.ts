import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ConnectorRunner } from "../src/connectors/runner.js";
import type { SportsbookConnector } from "../src/connectors/types.js";
import { AppendOnlyOddsHistory } from "../src/normalization/deduplication.js";
import { CollectorService, type CollectorRunInput } from "../src/collectors/service.js";
import { marketIdentity, marketIdentityKey, selectionIdentity } from "../src/normalization/identity.js";
import { normalizeRecord } from "../src/normalization/normalize.js";
import { oddsToDecimal } from "../src/normalization/odds.js";
import { DEFAULT_SCHEDULER_CONFIG, nextDelayMs } from "../src/scheduler/scheduler.js";
import { SessionManager } from "../src/sessions/manager.js";

const sample = (overrides: Parameters<typeof normalizeRecord>[0] = {}) => normalizeRecord({
  sportsbook: "example", sport: "football", eventName: "A v B", sourceEventId: "evt-1",
  market: "spread", marketPeriod: "full-game", selection: "A", line: "-1.5",
  rawOdds: "+150", rawOddsFormat: "american", ...overrides
}, "2026-09-12T00:00:00.000Z");

test("normalization preserves source fields and uses null for unknown fields", () => {
  const record = sample();
  assert.equal(record.decimalOdds, 2.5);
  assert.equal(record.rawOdds, "+150");
  assert.equal(record.rawOddsFormat, "american");
  assert.equal(record.competition, null);
  assert.equal(record.eventStatus, null);
});

test("odds conversions support decimal, American and fractional formats", () => {
  assert.equal(oddsToDecimal("2.50", "decimal"), 2.5);
  assert.equal(oddsToDecimal(150, "american"), 2.5);
  assert.equal(oddsToDecimal("+150", "american"), 2.5);
  assert.equal(oddsToDecimal("-110", "american"), 1 + 100 / 110);
  assert.equal(oddsToDecimal("5/2", "fractional"), 3.5);
  assert.equal(oddsToDecimal("not-odds", "decimal"), null);
});

test("market identity groups outcomes while selection identity includes line", () => {
  const base = sample({ participantPlayer: "Player 1", qualifiers: { side: "home", boost: "none" } });
  const changedLine = sample({ participantPlayer: "Player 1", qualifiers: { side: "home", boost: "none" }, line: "-2.5" });
  const reorderedQualifiers = sample({ participantPlayer: "Player 1", qualifiers: { boost: "none", side: "home" } });
  assert.equal(marketIdentity(base), marketIdentity(changedLine));
  assert.notEqual(selectionIdentity(base), selectionIdentity(changedLine));
  assert.equal(marketIdentityKey(base), marketIdentityKey(reorderedQualifiers));
});

test("deduplication separates heartbeats from price changes and keeps history append-only", () => {
  const history = new AppendOnlyOddsHistory();
  assert.equal(history.record(sample()).kind, "price_change");
  assert.equal(history.record(sample({ collectedAt: "2026-09-12T00:00:01.000Z" })).kind, "heartbeat");
  assert.equal(history.record(sample({ rawOdds: "+125", collectedAt: "2026-09-12T00:00:02.000Z" })).kind, "price_change");
  assert.equal(history.all().length, 2);
  assert.equal(history.all()[0]?.rawOdds, "+150");
  assert.equal(history.all()[1]?.rawOdds, "+125");
});

test("session manager exposes all lifecycle states and writes private state with restrictive permissions", async () => {
  const root = await mkdtemp(join(tmpdir(), "sportsbook-session-"));
  try {
    const manager = new SessionManager(root);
    assert.equal(manager.get("book", "personal").state, "NOT_CONFIGURED");
    for (const state of ["AUTH_REQUIRED", "AUTHENTICATING", "ACTIVE", "EXPIRED", "LOCKED", "ERROR"] as const) {
      assert.equal((await manager.setState("book", "personal", state)).state, state);
    }
    await manager.saveStorageState("book", "personal", { cookies: [], origins: [] });
    assert.deepEqual(JSON.parse(await readFile(manager.storageStatePath("book", "personal"), "utf8")), { cookies: [], origins: [] });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scheduler picks the slower of mode interval and RPM guard", () => {
  assert.equal(nextDelayMs("live", { ...DEFAULT_SCHEDULER_CONFIG, liveIntervalMs: 100, maxRequestsPerMinute: 30 }), 100);
  assert.equal(nextDelayMs("idle", { ...DEFAULT_SCHEDULER_CONFIG, idleIntervalMs: 1_000, maxRequestsPerMinute: 120 }), 1_000);
});

const connector = (id: string, fail: boolean): SportsbookConnector => ({
  id, context: { sportsbook: id, accountAlias: "personal" },
  async initialize() {}, async login() {}, async restoreSession() {}, async validateSession() { return true; },
  async collectEvents() { if (fail) throw new Error("isolated failure"); return { normalizedRecords: [sample({ sportsbook: id })] }; },
  async collectPrematch() { return {}; }, async collectLive() { return {}; },
  async health() { return { status: "HEALTHY" as const }; }, async logout() {}, async shutdown() {}
});

test("connector runner isolates a failing connector", async () => {
  const runner = new ConnectorRunner();
  const [failed, healthy] = await Promise.all([
    runner.run(connector("broken", true), "events"),
    runner.run(connector("healthy", false), "events")
  ]);
  assert.equal(failed.ok, false);
  assert.equal(healthy.ok, true);
  if (healthy.ok) assert.equal(healthy.collection.normalizedRecords?.length, 1);
});

test("collector records successful and failed runs without changing connector behavior", async () => {
  const runs: Array<{ id: number; input: CollectorRunInput; completion?: { status: string; recordsSeen: number } }> = [];
  const sink = {
    async startCollectorRun(input: CollectorRunInput) { const id = runs.length + 1; runs.push({ id, input }); return id; },
    async finishCollectorRun(id: number, completion: { status: "SUCCEEDED" | "FAILED"; finishedAt: string; recordsSeen: number }) {
      const run = runs.find((item) => item.id === id);
      if (run) run.completion = completion;
    }
  };
  const service = new CollectorService(undefined, undefined, undefined, undefined, undefined, sink);
  await service.collect(connector("healthy", false), "events");
  await assert.rejects(service.collect(connector("broken", true), "events"));
  assert.deepEqual(runs.map((run) => ({ status: run.completion?.status, recordsSeen: run.completion?.recordsSeen })), [
    { status: "SUCCEEDED", recordsSeen: 1 }, { status: "FAILED", recordsSeen: 0 }
  ]);
});
